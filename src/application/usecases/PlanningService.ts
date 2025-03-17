import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { AgentPrompt } from '../../domain/planning/AgentPrompt';

/**
 * Planning服务类
 * 负责Agent的规划和决策逻辑
 */
export class PlanningService {
  /**
   * 创建一个新的Planning服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
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
  private onMessageReceived(event: any): void {
    console.log(`[PlanningService] 收到消息事件: ${JSON.stringify(event.data)}`);
    // TODO: 实现基于用户消息的规划逻辑
    // 可以在这里进行任务分解、规划等操作
    
    // 发布规划完成事件
    this.eventBus.publish(AgentEventType.PLAN_UPDATED, {
      userId: event.data.userId,
      message: event.data.message,
      timestamp: new Date().toISOString(),
      plan: {
        // 这里可以添加规划的详细信息
        needsDataQuery: true,
        suggestedCommands: this.analyzePotentialCommands(event.data.message)
      }
    });
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