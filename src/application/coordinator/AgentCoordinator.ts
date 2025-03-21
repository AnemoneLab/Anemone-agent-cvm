import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { ActionRegistry, AgentContext } from '../../domain/actions/ActionRegistry';
import { SkillRegistry } from '../../domain/skill/SkillRegistry';
import { ProfileService } from '../usecases/ProfileService';
import { ChatService } from '../usecases/ChatService';
import { WalletService } from '../usecases/WalletService';
import { BlockberryService } from '../usecases/BlockberryService';
import { RoleData } from '../../domain/profile/RoleData';
import { TokenBalance } from '../../infrastructure/blockchain/BlockberryConnector';
import { PlanningService } from '../usecases/PlanningService';
import { OpenAIConnector } from '../../infrastructure/llm/OpenAIConnector';
import { Message, MessageRole, MessageType } from '../../domain/memory/ShortTermMemory';

/**
 * 代理协调器上下文实现
 */
class AgentContextImpl implements AgentContext {
  private permissions: Set<string> = new Set(['BASIC_OPERATION', 'BLOCKCHAIN_QUERY']);
  
  /**
   * 授予权限
   * @param permission 权限名称
   */
  public grantPermission(permission: string): void {
    this.permissions.add(permission);
  }
  
  /**
   * 检查是否具有指定权限
   * @param permission 权限名称
   */
  public hasPermission(permission: string): boolean {
    return this.permissions.has(permission);
  }
}

/**
 * 代理协调器类，负责协调各项服务的工作
 */
export class AgentCoordinator {
  private actionRegistry: ActionRegistry;
  private skillRegistry: SkillRegistry;
  private agentContext: AgentContextImpl;
  private profileService: ProfileService;
  private chatService: ChatService;
  private walletService: WalletService;
  private blockberryService: BlockberryService;
  private planningService: PlanningService;
  private openAIConnector: OpenAIConnector;
  
  /**
   * 创建一个新的代理协调器实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.actionRegistry = new ActionRegistry();
    this.skillRegistry = new SkillRegistry();
    this.agentContext = new AgentContextImpl();
    
    // 初始化服务
    this.profileService = new ProfileService(eventBus);
    this.chatService = new ChatService(eventBus);
    this.walletService = new WalletService(eventBus);
    this.blockberryService = new BlockberryService(eventBus);
    this.planningService = new PlanningService(eventBus);
    this.openAIConnector = new OpenAIConnector();
    
    // 不再订阅 MESSAGE_RECEIVED 事件，由 PlanningService 处理
    this.eventBus.subscribe(AgentEventType.TASK_PLAN_COMPLETED, this.onTaskPlanCompleted.bind(this));
  }
  
  /**
   * 处理聊天消息
   * @param message 消息内容
   * @param userId 用户ID
   * @param roleId 角色ID
   * @param apiKey OpenAI API密钥
   * @param apiUrl OpenAI API URL (可选)
   */
  public async processChat(
    message: string,
    userId: string,
    roleId: string,
    apiKey?: string,
    apiUrl?: string
  ): Promise<any> {
    console.log(`[AgentCoordinator] 处理消息: ${message}, 用户: ${userId}, 角色: ${roleId}`);
    
    // 生成消息ID
    const messageId = new Date().toISOString();
    
    // 保存用户消息到历史记录
    await this.saveMessage({
      userId,
      content: message,
      sender: 'user'
    });

    try {
      // 发布消息接收事件，通知 PlanningService 处理
      this.eventBus.publish(AgentEventType.MESSAGE_RECEIVED, {
        userId,
        roleId,
        message,
        timestamp: messageId,
        apiKey,
        apiUrl
      });
      
      // 等待消息处理完成，最多等待60秒
      console.log(`[AgentCoordinator] 等待消息处理完成: ${messageId}`);
      const processingCompleted = await this.eventBus.waitForProcessingCompleted(messageId, userId, 60000);
      
      if (processingCompleted) {
        console.log(`[AgentCoordinator] 消息处理已完成，正在获取最新回复`);
        
        // 获取最新的聊天历史（限制为2条，只获取当前用户消息和助手回复）
        const historyResult = await this.getChatHistory(userId, 2);
        
        if (historyResult.success && historyResult.messages && historyResult.messages.length > 0) {
          // 找出助手的回复（最新的消息可能是助手回复）
          const assistantMessage = historyResult.messages.find((msg: any) => msg.role === 'assistant');
          
          if (assistantMessage) {
            return {
              success: true,
              response: {
                text: assistantMessage.content,
                roleId,
                userId,
                timestamp: assistantMessage.timestamp
              }
            };
          }
        }
      }
      
      // 如果处理没有完成或无法获取回复，返回默认响应
      console.log(`[AgentCoordinator] 无法获取助手回复，返回默认响应`);
      return {
        success: true,
        response: {
          text: "正在思考中，请稍后查看回复...",
          roleId,
          userId,
          timestamp: messageId,
          pending: true
        }
      };
    } catch (error) {
      console.error('[AgentCoordinator] 处理消息时出错:', error);
      return {
        success: false,
        error: `处理消息时出错: ${error}`
      };
    }
  }
  
  /**
   * 任务计划完成事件处理函数
   * @param event 事件对象
   */
  private async onTaskPlanCompleted(event: any): Promise<void> {
    try {
      // 检查事件数据是否存在
      if (!event || !event.data) {
        console.error('[AgentCoordinator] 收到无效的任务计划完成事件：数据缺失');
        return;
      }
      
      const userId = event.data.userId;
      const message = event.data.message || ''; // 提供默认空字符串，避免undefined
      const results = event.data.results;
      const markdown = event.data.markdown;
      
      // 检查用户ID是否存在
      if (!userId) {
        console.error('[AgentCoordinator] 收到无效的任务计划完成事件：缺少用户ID');
        return;
      }
      
      // 安全地截取消息内容
      const messagePreview = message ? (message.substring(0, 20) + '...') : '(无消息内容)';
      
      console.log(`[AgentCoordinator] 收到任务计划完成事件: ${JSON.stringify({
        userId,
        messagePreview,
        hasResults: !!results
      })}`);
      
      // 保存助手回复到历史记录
      if (results && results.finalResponse) {
        await this.saveMessage({
          userId,
          content: results.finalResponse,
          sender: 'bot'
        });
        
        const responsePreview = results.finalResponse.substring(0, 30) + '...';
        console.log(`[AgentCoordinator] 已保存助手回复到历史记录: ${responsePreview}`);
      } else {
        console.warn(`[AgentCoordinator] 任务计划完成事件中没有找到有效的回复内容`);
      }
    } catch (error) {
      console.error('[AgentCoordinator] 处理任务计划完成事件时出错:', error);
    }
  }
  
  /**
   * 获取聊天历史
   * @param userId 用户ID
   * @param limit 消息数量限制
   * @param beforeTimestamp 指定时间戳之前的消息
   */
  public async getChatHistory(
    userId: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<any> {
    return await this.chatService.getChatHistory(userId, limit, beforeTimestamp);
  }
  
  /**
   * 按会话轮次获取消息
   * @param userId 用户ID
   * @param rounds 轮次数量
   */
  public async getMessagesByRounds(
    userId: string,
    rounds: number = 3
  ): Promise<any[]> {
    return await this.chatService.getMessagesByRounds(userId, rounds);
  }
  
  /**
   * 获取下一个会话轮次
   * @param userId 用户ID
   */
  public async getNextConversationRound(userId: string): Promise<number> {
    return await this.chatService.getNextConversationRound(userId);
  }
  
  /**
   * 保存消息到聊天历史
   * @param messageData 消息数据
   */
  public async saveMessage(messageData: { userId: string, content: string, sender: 'user' | 'bot' }): Promise<void> {
    const { userId, content, sender } = messageData;
    const role = sender === 'user' ? 'user' : 'assistant';
    
    // 调用ChatService的方法保存消息
    await this.chatService.saveMessage({
      user_id: userId,
      role,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 执行指定的Action
   * @param actionId Action ID
   * @param params Action参数
   */
  public async executeAction(actionId: string, params: any): Promise<{ success: boolean, data?: any, error?: string }> {
    try {
      // 检查权限
      if (!this.actionRegistry.canExecute(actionId, this.agentContext)) {
        return { success: false, error: `无权执行操作: ${actionId}` };
      }
      
      // 获取Action并执行
      const action = this.actionRegistry.getAction(actionId);
      if (!action) {
        return { success: false, error: `未找到Action: ${actionId}` };
      }
      
      const result = await action.execute(params);
      
      // 发布Action执行事件
      this.eventBus.publish(AgentEventType.ACTION_EXECUTED, {
        actionId,
        params,
        result
      });
      
      return result;
    } catch (error) {
      console.error(`执行Action ${actionId} 时出错:`, error);
      return { success: false, error: `执行Action时出错: ${error}` };
    }
  }
  
  /**
   * 执行指定的Skill
   * @param skillId Skill ID
   * @param params Skill参数
   */
  public async executeSkill(skillId: string, params: any): Promise<{ success: boolean, data?: any, error?: string }> {
    try {
      const skill = this.skillRegistry.getSkill(skillId);
      if (!skill) {
        return { success: false, error: `未找到Skill: ${skillId}` };
      }
      
      const result = await skill.execute(params);
      
      // 发布Skill执行事件
      this.eventBus.publish(AgentEventType.SKILL_EXECUTED, {
        skillId,
        params,
        result
      });
      
      return result;
    } catch (error) {
      console.error(`执行Skill ${skillId} 时出错:`, error);
      return { success: false, error: `执行Skill时出错: ${error}` };
    }
  }
  
  /**
   * 初始化Profile配置
   * @param roleId Role ID
   * @param packageId Package ID
   */
  public async initProfile(roleId: string, packageId: string): Promise<{ success: boolean, message: string, id?: number }> {
    return this.profileService.initProfile(roleId, packageId);
  }
  
  /**
   * 获取Profile配置
   */
  public async getProfile(): Promise<{ success: boolean, profile?: any, message?: string }> {
    return this.profileService.getProfile();
  }
  
  /**
   * 获取区块链上的Role对象数据
   * 只有Agent自己可以执行此操作，用于查看自己绑定的链上role object内容
   */
  public async getRoleOnChainData(): Promise<{ success: boolean, role?: RoleData, skillDetails?: any[], message?: string }> {
    console.log('[AgentCoordinator] 开始获取链上Role数据');
    try {
      const result = await this.profileService.getRoleOnChainData();
      console.log('[AgentCoordinator] 获取链上Role数据结果:', { 
        success: result.success,
        hasRole: result.role ? true : false,
        skillCount: result.skillDetails ? result.skillDetails.length : 0
      });
      
      return result;
    } catch (error) {
      console.error('[AgentCoordinator] 获取链上Role数据出错:', error);
      return {
        success: false,
        message: '获取链上Role数据时发生错误: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
  
  /**
   * 获取钱包地址
   */
  public async getWalletAddress(): Promise<{ success: boolean, address?: string, created_at?: string, error?: string }> {
    const address = await this.walletService.getWalletAddress();
    if (address) {
      return {
        success: true,
        address,
        created_at: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: '钱包未初始化'
      };
    }
  }
  
  /**
   * 获取钱包信息
   */
  public async getWalletInfo(): Promise<{ success: boolean, address?: string, created_at?: string, error?: string }> {
    return await this.walletService.getWalletInfo();
  }

  /**
   * 获取链上代币余额
   * @param address 钱包地址，如果不提供则使用当前钱包地址
   * @returns 包含代币余额的对象
   */
  public async getAccountTokens(address?: string): Promise<{ success: boolean, data?: any, message?: string }> {
    try {
      // 如果没有提供地址，则获取当前钱包地址
      if (!address) {
        const walletInfo = await this.walletService.getWalletInfo();
        if (!walletInfo.success || !walletInfo.address) {
          return {
            success: false,
            message: '无法获取钱包地址'
          };
        }
        address = walletInfo.address;
      }
      
      // 调用token_balance Action获取代币余额
      return await this.executeAction('token_balance', { address, summary: false });
    } catch (error: any) {
      console.error('获取链上代币余额时出错:', error);
      return {
        success: false,
        message: `获取代币余额失败: ${error.message}`
      };
    }
  }
  
  /**
   * 获取链上代币余额汇总
   * @param address 钱包地址，如果不提供则使用当前钱包地址
   * @returns 包含代币余额汇总的对象
   */
  public async getAccountTokensSummary(address?: string): Promise<{ success: boolean, data?: any, message?: string }> {
    try {
      // 如果没有提供地址，则获取当前钱包地址
      if (!address) {
        const walletInfo = await this.walletService.getWalletInfo();
        if (!walletInfo.success || !walletInfo.address) {
          return {
            success: false,
            message: '无法获取钱包地址'
          };
        }
        address = walletInfo.address;
      }
      
      // 调用token_balance Action获取代币余额汇总
      return await this.executeAction('token_balance', { address, summary: true });
    } catch (error: any) {
      console.error('获取链上代币余额汇总时出错:', error);
      return {
        success: false,
        message: `获取代币余额汇总失败: ${error.message}`
      };
    }
  }
} 