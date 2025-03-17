import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { ActionRegistry, AgentContext } from '../../domain/actions/ActionRegistry';
import { SkillRegistry } from '../../domain/skill/SkillRegistry';
import { ProfileService } from '../usecases/ProfileService';
import { ChatService } from '../usecases/ChatService';
import { WalletService } from '../usecases/WalletService';
import { RoleData } from '../../domain/profile/RoleData';

/**
 * 代理协调器上下文实现
 */
class AgentContextImpl implements AgentContext {
  private permissions: Set<string> = new Set(['BASIC_OPERATION']);
  
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
    
    // 订阅相关事件
    this.eventBus.subscribe(AgentEventType.MESSAGE_RECEIVED, this.onMessageReceived.bind(this));
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
    return await this.chatService.processMessage(
      message,
      userId,
      roleId,
      apiKey,
      apiUrl
    );
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
   * 消息接收事件处理函数
   * @param event 事件对象
   */
  private onMessageReceived(event: any): void {
    console.log(`[AgentCoordinator] 收到消息事件: ${JSON.stringify(event.data)}`);
    // TODO: 在这里实现更复杂的代理决策逻辑
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
   * 生成对用户消息的响应
   * @param message 用户消息
   * @param userId 用户ID
   */
  public async generateResponse(message: string, userId: string): Promise<string> {
    try {
      // 获取当前配置
      const profileResult = await this.getProfile();
      const roleId = profileResult.success ? profileResult.profile.role_id : 'default';
      
      // 获取API Key (假设从环境变量中获取)
      const apiKey = process.env.OPENAI_API_KEY;
      const apiUrl = process.env.OPENAI_API_URL;
      
      // 处理消息并生成响应
      const result = await this.processChat(message, userId, roleId, apiKey, apiUrl);
      
      if (result.success && result.response) {
        return result.response.text;
      } else {
        return "抱歉，我无法生成回复。";
      }
    } catch (error) {
      console.error('生成响应时出错:', error);
      return "生成回复时发生错误。";
    }
  }
  
  /**
   * 获取钱包信息
   */
  public async getWalletInfo(): Promise<{ success: boolean, address?: string, created_at?: string, error?: string }> {
    return await this.walletService.getWalletInfo();
  }

  /**
   * 获取ChatService实例
   * 便于外部设置AgentCoordinator
   */
  public getChatService(): ChatService {
    return this.chatService;
  }
} 