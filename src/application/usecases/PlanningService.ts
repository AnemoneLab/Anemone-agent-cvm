import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { AgentPrompt } from '../../domain/planning/AgentPrompt';
import { LLMTaskPlanner } from '../../domain/planning/TaskPlanner';
import { TaskExecutor, CommandExecutor } from '../../domain/planning/TaskExecutor';
import { TaskPlan } from '../../domain/planning/TaskPlan';
import { BlockberryService } from './BlockberryService';
import { ProfileService } from './ProfileService';
import { WalletService } from './WalletService';
import { OpenAIConnector } from '../../infrastructure/llm/OpenAIConnector';

/**
 * 命令执行器实现
 * 实现CommandExecutor接口，用于执行实际命令
 */
class DefaultCommandExecutor implements CommandExecutor {
  private blockberryService: BlockberryService;
  private profileService: ProfileService;
  private walletService: WalletService;
  
  /**
   * 创建一个新的命令执行器
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.blockberryService = new BlockberryService(eventBus);
    this.profileService = new ProfileService(eventBus);
    this.walletService = new WalletService(eventBus);
  }
  
  /**
   * 执行命令
   * @param command 命令名称
   * @param userId 用户ID
   * @param context 上下文信息
   * @returns 执行结果
   */
  public async executeCommand(command: string, userId: string, context?: any): Promise<string> {
    console.log(`[DefaultCommandExecutor] 执行命令: ${command}, 用户ID: ${userId}`);
    
    try {
      // 根据命令类型调用不同的服务
      switch (command) {
        case 'getWallet': {
          const walletResult = await this.walletService.getWalletInfo();
          return JSON.stringify(walletResult);
        }
        
        case 'queryRoleData': {
          const roleDataResult = await this.profileService.getRoleOnChainData();
          if (!roleDataResult.success) {
            throw new Error(roleDataResult.message || '获取角色数据失败');
          }
          
          // 确保 BigInt 类型被转换为字符串
          return JSON.stringify({
            roleId: roleDataResult.role?.id || '',
            health: roleDataResult.role?.health ? roleDataResult.role.health.toString() : '0',
            balance: roleDataResult.role?.balance ? roleDataResult.role.balance.toString() : '0',
            skills: roleDataResult.role?.skills || []
          });
        }
        
        case 'getTokens': {
          // 先获取钱包地址
          const walletResult = await this.walletService.getWalletInfo();
          if (!walletResult.success || !walletResult.address) {
            throw new Error('获取钱包地址失败');
          }
          
          const address = walletResult.address;
          const tokenResult = await this.blockberryService.getAccountBalance(address);
          if (!tokenResult.success) {
            throw new Error(tokenResult.message || '获取代币列表失败');
          }
          
          // 处理潜在的 BigInt 值
          const processedBalances = tokenResult.balances?.map(token => ({
            ...token,
            // 安全地将任何值转换为字符串
            balance: typeof token.balance === 'bigint' || typeof token.balance === 'number' ? 
              String(token.balance) : token.balance,
            balanceUsd: typeof token.balanceUsd === 'bigint' || typeof token.balanceUsd === 'number' ? 
              String(token.balanceUsd) : token.balanceUsd,
            coinPrice: typeof token.coinPrice === 'bigint' || typeof token.coinPrice === 'number' ? 
              String(token.coinPrice) : token.coinPrice
          })) || [];
          
          return JSON.stringify({
            tokens: processedBalances
          });
        }
        
        case 'getTokensSummary': {
          // 先获取钱包地址
          const walletResult = await this.walletService.getWalletInfo();
          if (!walletResult.success || !walletResult.address) {
            throw new Error('获取钱包地址失败');
          }
          
          const address = walletResult.address;
          const summaryResult = await this.blockberryService.getAccountBalanceSummary(address);
          if (!summaryResult.success) {
            throw new Error(summaryResult.message || '获取代币汇总失败');
          }
          
          // 处理潜在的 BigInt 值
          const processedSummary = summaryResult.summary ? {
            totalUsdValue: typeof summaryResult.summary.totalUsdValue === 'bigint' || typeof summaryResult.summary.totalUsdValue === 'number' ? 
              String(summaryResult.summary.totalUsdValue) : summaryResult.summary.totalUsdValue,
            suiBalance: typeof summaryResult.summary.suiBalance === 'bigint' || typeof summaryResult.summary.suiBalance === 'number' ? 
              String(summaryResult.summary.suiBalance) : summaryResult.summary.suiBalance,
            suiUsdValue: typeof summaryResult.summary.suiUsdValue === 'bigint' || typeof summaryResult.summary.suiUsdValue === 'number' ? 
              String(summaryResult.summary.suiUsdValue) : summaryResult.summary.suiUsdValue,
            tokensCount: summaryResult.summary.tokensCount
          } : {
            totalUsdValue: 0,
            suiBalance: 0,
            suiUsdValue: 0,
            tokensCount: 0
          };
          
          return JSON.stringify(processedSummary);
        }
        
        case 'querySkillDetails': {
          const roleDataResult = await this.profileService.getRoleOnChainData();
          if (!roleDataResult.success) {
            throw new Error(roleDataResult.message || '获取角色数据失败');
          }
          
          // 处理技能详情中可能存在的 BigInt 值
          const processedSkillDetails = roleDataResult.skillDetails?.map(skill => {
            if (!skill) return skill;
            
            // 创建一个新对象来存储处理后的技能详情
            const processedSkill = { ...skill };
            
            // 处理可能存在的 BigInt 值，例如 fee 字段
            if (typeof processedSkill.fee === 'bigint') {
              processedSkill.fee = String(processedSkill.fee);
            }
            
            // 递归处理对象中的所有 BigInt 值
            const processObject = (obj: any): any => {
              if (!obj || typeof obj !== 'object') return obj;
              
              Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'bigint') {
                  obj[key] = String(obj[key]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                  obj[key] = processObject(obj[key]);
                }
              });
              
              return obj;
            };
            
            return processObject(processedSkill);
          }) || [];
          
          return JSON.stringify({
            skills: processedSkillDetails
          });
        }
        
        case 'getProfile': {
          const profileResult = await this.profileService.getProfile();
          if (!profileResult.success) {
            throw new Error(profileResult.message || '获取Profile配置失败');
          }
          
          // 处理配置中可能存在的 BigInt 值
          const processProfile = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;
            
            const processed = { ...obj };
            
            Object.keys(processed).forEach(key => {
              if (typeof processed[key] === 'bigint') {
                processed[key] = String(processed[key]);
              } else if (typeof processed[key] === 'object' && processed[key] !== null) {
                processed[key] = processProfile(processed[key]);
              }
            });
            
            return processed;
          };
          
          const processedProfile = processProfile(profileResult.profile || {});
          
          return JSON.stringify(processedProfile);
        }
        
        case 'none':
          return '没有执行任何命令，因为不需要查询数据';
          
        default:
          return `未知命令: ${command}`;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[DefaultCommandExecutor] 执行命令失败: ${command} - ${errorMessage}`);
      return `执行命令失败: ${errorMessage}`;
    }
  }
}

/**
 * Planning服务类
 * 负责Agent的规划和决策逻辑
 */
export class PlanningService {
  private taskPlanner: LLMTaskPlanner;
  private readonly taskExecutor: TaskExecutor;
  public readonly commandExecutor: DefaultCommandExecutor;
  private openAIConnector: OpenAIConnector;
  
  /**
   * 创建一个新的Planning服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    // 创建命令执行器
    this.commandExecutor = new DefaultCommandExecutor(this.eventBus);
    
    // 创建OpenAI连接器
    this.openAIConnector = new OpenAIConnector();
    
    // 创建任务规划器 - 使用 LLMTaskPlanner 替代 RuleBasedTaskPlanner
    this.taskPlanner = new LLMTaskPlanner(this.openAIConnector);
    
    // 创建任务执行器
    this.taskExecutor = new TaskExecutor(this.commandExecutor, this.eventBus);
    
    // 订阅消息接收事件，用于触发规划逻辑
    this.eventBus.subscribe(AgentEventType.MESSAGE_RECEIVED, this.onMessageReceived.bind(this));
  }

  /**
   * 获取Agent系统提示词
   * @returns 系统提示词字符串
   */
  public getSystemPrompt(): string {
    return AgentPrompt.getSystemPrompt();
  }

  /**
   * 获取结果格式化提示词
   * @param commandResults 命令执行结果
   * @param originalMessage 用户原始消息
   * @returns 格式化提示词字符串
   */
  public getResultFormattingPrompt(commandResults: string, originalMessage: string): string {
    return AgentPrompt.getResultFormattingPrompt(commandResults, originalMessage);
  }

  /**
   * 获取重试提示词
   * @param originalMessage 用户原始消息
   * @returns 重试提示词字符串
   */
  public getRetryPrompt(originalMessage: string): string {
    return AgentPrompt.getRetryPrompt(originalMessage);
  }

  /**
   * 消息接收事件处理函数
   * @param event 事件对象
   */
  private async onMessageReceived(event: any): Promise<void> {
    const userId = event.data.userId;
    const roleId = event.data.roleId;
    const messageId = event.data.timestamp || new Date().toISOString();
    const message = event.data.message;
    const apiKey = event.data.apiKey;
    const apiUrl = event.data.apiUrl;
    
    console.log(`[PlanningService] 收到消息事件: ${JSON.stringify({
      userId,
      messageId,
      message: message.substring(0, 20) + '...'
    })}`);
    
    // 尝试标记消息为正在处理，如果已有其他处理器在处理则忽略
    if (!this.eventBus.startMessageProcessing(messageId, userId, 'PlanningService')) {
      console.log(`[PlanningService] 消息已被其他处理器处理，忽略此消息: ${message}`);
      return;
    }
    
    try {
      // 设置 LLMTaskPlanner 的 API Key 和 API URL
      if (apiKey) {
        // 更新 taskPlanner 的 API Key 和 URL
        this.taskPlanner = new LLMTaskPlanner(this.openAIConnector, apiKey, apiUrl);
      }
      
      // 1. 创建任务计划
      const taskPlan = await this.taskPlanner.createPlan(
        userId,
        message
      );
      
      // 2. 发布计划创建事件
      this.eventBus.publish(AgentEventType.PLAN_UPDATED, {
        userId: userId,
        message: message,
        timestamp: new Date().toISOString(),
        plan: {
          planId: taskPlan.getPlanId(),
          tasks: taskPlan.getTasks(),
          markdown: taskPlan.toMarkdown()
        }
      });
      
      // 3. 执行任务计划
      const executionResults = await this.taskExecutor.executePlan(taskPlan);
      
      // 4. 生成最终回复
      let finalResponse = '';
      if (apiKey) {
        finalResponse = await this.generateFinalResponse(
          message,
          executionResults,
          apiKey,
          apiUrl
        );
      } else {
        finalResponse = "请提供 API 密钥以启用 AI 回复功能。";
      }
      
      // 5. 任务完成后，发布任务计划完成事件
      const results = {
        commandResults: executionResults.split('\n\n'),
        finalResponse: finalResponse
      };
      
      this.eventBus.publish(AgentEventType.TASK_PLAN_COMPLETED, {
        userId: userId,
        roleId: roleId,
        message: message,
        timestamp: new Date().toISOString(),
        results: results,
        markdown: taskPlan.toMarkdown()
      });
      
      // 标记消息处理完成
      this.eventBus.completeMessageProcessing(messageId, userId, 'PlanningService');
    } catch (error) {
      console.error('[PlanningService] 任务规划或执行错误:', error);
      
      // 发布错误事件
      this.eventBus.publish(AgentEventType.PLAN_UPDATED, {
        userId: userId,
        message: message,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      // 即使出错也标记处理完成
      this.eventBus.completeMessageProcessing(messageId, userId, 'PlanningService');
    }
  }

  /**
   * 生成最终回复
   * @param userMessage 用户消息
   * @param executionResults 执行结果字符串
   * @param apiKey API 密钥
   * @param apiUrl API URL(可选)
   * @returns 最终回复文本
   */
  private async generateFinalResponse(
    userMessage: string, 
    executionResults: string, 
    apiKey: string, 
    apiUrl?: string
  ): Promise<string> {
    try {
      // 获取结果格式化提示词
      const formattingPrompt = this.getResultFormattingPrompt(executionResults, userMessage);
      
      // 直接调用 OpenAI 生成回复，不使用 Message 对象
      try {
        // 将提示词和用户消息拼接到一起
        const combinedPrompt = `${formattingPrompt}\n\n用户消息: ${userMessage}\n\n执行结果: ${executionResults}\n\n请根据以上信息生成回复:`;
        
        const response = await this.openAIConnector.generateChatResponse(
          [], // 空历史，因为我们将所有内容放在了 combinedPrompt 中
          combinedPrompt,
          apiKey,
          apiUrl
        );
        
        return response || '抱歉，我无法处理您的请求。';
      } catch (error) {
        console.error('[PlanningService] OpenAI 调用失败:', error);
        return `抱歉，生成回复时发生错误: ${error}`;
      }
    } catch (error) {
      console.error('[PlanningService] 生成最终回复出错:', error);
      return `抱歉，生成回复时发生错误: ${error}`;
    }
  }

  /**
   * 分析用户消息，确定可能需要执行的命令
   * @param message 用户消息
   * @returns 建议的命令列表
   */
  private analyzePotentialCommands(message: string): string[] {
    const commands: string[] = [];
    const lowerMessage = message.toLowerCase();

    // 如果消息中包含余额相关词汇，建议查询余额
    if (lowerMessage.includes('余额') || 
        lowerMessage.includes('balance') || 
        lowerMessage.includes('代币') || 
        lowerMessage.includes('token') ||
        lowerMessage.includes('持有') ||
        lowerMessage.includes('币')) {
      commands.push('getTokens');
      commands.push('getTokensSummary');
    }

    // 如果消息中包含角色相关词汇，建议查询角色数据
    if (lowerMessage.includes('角色') || 
        lowerMessage.includes('role') || 
        lowerMessage.includes('健康') || 
        lowerMessage.includes('health')) {
      commands.push('queryRoleData');
    }

    // 如果消息中包含技能相关词汇，建议查询技能
    if (lowerMessage.includes('技能') || 
        lowerMessage.includes('skill')) {
      commands.push('querySkillDetails');
    }

    // 如果消息中包含钱包相关词汇，建议查询钱包
    if (lowerMessage.includes('钱包') || 
        lowerMessage.includes('wallet') || 
        lowerMessage.includes('地址') || 
        lowerMessage.includes('address')) {
      commands.push('getWallet');
    }

    // 如果没有找到任何匹配的命令，返回none
    if (commands.length === 0) {
      commands.push('none');
    }

    return commands;
  }
} 