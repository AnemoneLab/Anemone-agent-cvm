/**
 * 代理事件类型枚举
 */
export enum AgentEventType {
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  TASK_CREATED = 'TASK_CREATED',
  ACTION_EXECUTED = 'ACTION_EXECUTED',
  SKILL_EXECUTED = 'SKILL_EXECUTED',
  MEMORY_UPDATED = 'MEMORY_UPDATED',
  PLAN_UPDATED = 'PLAN_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  BLOCKCHAIN_DATA_FETCHED = 'BLOCKCHAIN_DATA_FETCHED',
  
  // 任务计划相关事件
  TASK_PLAN_STARTED = 'TASK_PLAN_STARTED',
  TASK_PLAN_UPDATED = 'TASK_PLAN_UPDATED',
  TASK_PLAN_COMPLETED = 'TASK_PLAN_COMPLETED',
  
  // 单个任务相关事件
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_FAILED = 'TASK_FAILED',
  
  // 消息处理状态事件
  MESSAGE_PROCESSING_STARTED = 'MESSAGE_PROCESSING_STARTED',
  MESSAGE_PROCESSING_COMPLETED = 'MESSAGE_PROCESSING_COMPLETED'
}

/**
 * 代理事件接口
 */
export interface AgentEvent {
  type: AgentEventType;
  timestamp: string;
  data: any;
}

/**
 * 事件处理器类型
 */
export type EventHandler = (event: AgentEvent) => void;

/**
 * 消息处理状态
 */
export interface MessageProcessingStatus {
  messageId: string;
  userId: string;
  processor: string;
  startTime: Date;
  completed: boolean;
  completedTime?: Date;
}

/**
 * 事件总线类
 * 实现发布-订阅模式，用于组件间通信
 */
export class EventBus {
  private handlers: Map<AgentEventType, EventHandler[]>;
  private messageProcessingStatus: Map<string, MessageProcessingStatus>;

  /**
   * 创建一个新的事件总线实例
   */
  constructor() {
    this.handlers = new Map();
    this.messageProcessingStatus = new Map();
    
    // 初始化所有事件类型的处理器数组
    Object.values(AgentEventType).forEach(type => {
      this.handlers.set(type as AgentEventType, []);
    });
  }

  /**
   * 订阅事件
   * @param type 事件类型
   * @param handler 事件处理器
   */
  public subscribe(type: AgentEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  /**
   * 取消订阅事件
   * @param type 事件类型
   * @param handler 事件处理器
   */
  public unsubscribe(type: AgentEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type) || [];
    this.handlers.set(
      type,
      handlers.filter(h => h !== handler)
    );
  }

  /**
   * 发布事件
   * @param type 事件类型
   * @param data 事件数据
   */
  public publish(type: AgentEventType, data: any): void {
    const event: AgentEvent = {
      type,
      timestamp: new Date().toISOString(),
      data
    };

    // 获取该事件类型的所有处理器并调用
    const handlers = this.handlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${type}:`, error);
      }
    });
  }
  
  /**
   * 开始处理消息
   * @param messageId 消息ID
   * @param userId 用户ID
   * @param processor 处理器名称
   * @returns 是否成功标记（如果已有其他处理器在处理，则返回false）
   */
  public startMessageProcessing(messageId: string, userId: string, processor: string): boolean {
    // 生成唯一的消息处理标识符
    const key = `${userId}:${messageId}`;
    
    // 检查是否已有处理器在处理该消息
    if (this.messageProcessingStatus.has(key)) {
      const status = this.messageProcessingStatus.get(key);
      if (status && !status.completed) {
        console.log(`[EventBus] 消息 ${messageId} 已经被 ${status.processor} 处理中，${processor} 将忽略此消息`);
        return false;
      }
    }
    
    // 标记消息为正在处理
    const status: MessageProcessingStatus = {
      messageId,
      userId,
      processor,
      startTime: new Date(),
      completed: false
    };
    
    this.messageProcessingStatus.set(key, status);
    
    // 发布消息处理开始事件
    this.publish(AgentEventType.MESSAGE_PROCESSING_STARTED, {
      messageId,
      userId,
      processor,
      timestamp: status.startTime.toISOString()
    });
    
    console.log(`[EventBus] ${processor} 开始处理消息 ${messageId}`);
    
    return true;
  }
  
  /**
   * 完成消息处理
   * @param messageId 消息ID
   * @param userId 用户ID
   * @param processor 处理器名称
   */
  public completeMessageProcessing(messageId: string, userId: string, processor: string): void {
    const key = `${userId}:${messageId}`;
    
    // 检查是否存在该消息的处理状态
    if (this.messageProcessingStatus.has(key)) {
      const status = this.messageProcessingStatus.get(key);
      
      if (status && status.processor === processor) {
        status.completed = true;
        status.completedTime = new Date();
        
        this.messageProcessingStatus.set(key, status);
        
        // 发布消息处理完成事件
        this.publish(AgentEventType.MESSAGE_PROCESSING_COMPLETED, {
          messageId,
          userId,
          processor,
          startTime: status.startTime.toISOString(),
          completedTime: status.completedTime.toISOString(),
          processingTime: status.completedTime.getTime() - status.startTime.getTime()
        });
        
        console.log(`[EventBus] ${processor} 完成处理消息 ${messageId}`);
        
        // 清理旧的消息状态（超过30分钟的）
        this.cleanupOldMessageStatus();
      }
    }
  }
  
  /**
   * 清理旧的消息处理状态
   * 删除超过30分钟的消息状态记录
   */
  private cleanupOldMessageStatus(): void {
    const now = new Date().getTime();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    
    for (const [key, status] of this.messageProcessingStatus.entries()) {
      // 如果消息状态超过30分钟，则删除
      if (now - status.startTime.getTime() > thirtyMinutesInMs) {
        this.messageProcessingStatus.delete(key);
      }
    }
  }

  /**
   * 等待消息处理完成
   * @param messageId 消息ID
   * @param userId 用户ID
   * @param timeoutMs 超时时间(毫秒)，默认60秒
   * @returns 处理是否完成
   */
  public async waitForProcessingCompleted(messageId: string, userId: string, timeoutMs: number = 60000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const key = `${userId}:${messageId}`;
      
      // 先检查是否已经完成
      if (this.messageProcessingStatus.has(key)) {
        const status = this.messageProcessingStatus.get(key);
        if (status && status.completed) {
          return resolve(true);
        }
      } else {
        // 如果没有处理记录，直接返回false
        return resolve(false);
      }
      
      // 设置定时器，用于超时处理
      const timeoutId = setTimeout(() => {
        // 移除事件监听器
        this.unsubscribe(AgentEventType.MESSAGE_PROCESSING_COMPLETED, handleCompletion);
        console.log(`[EventBus] 等待消息 ${messageId} 处理完成超时`);
        resolve(false);
      }, timeoutMs);
      
      // 定义事件处理函数
      const handleCompletion = (event: AgentEvent) => {
        if (event.data.messageId === messageId && event.data.userId === userId) {
          // 清除超时定时器
          clearTimeout(timeoutId);
          
          // 移除事件监听器
          this.unsubscribe(AgentEventType.MESSAGE_PROCESSING_COMPLETED, handleCompletion);
          
          console.log(`[EventBus] 消息 ${messageId} 处理已完成`);
          resolve(true);
        }
      };
      
      // 订阅消息处理完成事件
      this.subscribe(AgentEventType.MESSAGE_PROCESSING_COMPLETED, handleCompletion);
    });
  }

  /**
   * 获取消息处理状态
   * @param messageId 消息ID
   * @param userId 用户ID
   * @returns 消息处理状态，如果不存在则返回null
   */
  public getMessageProcessingStatus(messageId: string, userId: string): MessageProcessingStatus | null {
    const key = `${userId}:${messageId}`;
    return this.messageProcessingStatus.get(key) || null;
  }
} 