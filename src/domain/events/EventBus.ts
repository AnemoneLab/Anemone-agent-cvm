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
  PROFILE_UPDATED = 'PROFILE_UPDATED'
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
 * 事件总线类
 * 实现发布-订阅模式，用于组件间通信
 */
export class EventBus {
  private handlers: Map<AgentEventType, EventHandler[]>;

  /**
   * 创建一个新的事件总线实例
   */
  constructor() {
    this.handlers = new Map();
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
} 