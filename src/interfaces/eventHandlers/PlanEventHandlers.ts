import { EventBus, AgentEventType, AgentEvent } from '../../domain/events/EventBus';

/**
 * 计划相关事件处理器类
 */
export class PlanEventHandlers {
  /**
   * 初始化计划事件处理器
   * @param eventBus 事件总线
   */
  public static initialize(eventBus: EventBus): void {
    // 注册事件处理函数
    eventBus.subscribe(AgentEventType.TASK_CREATED, PlanEventHandlers.onTaskCreated);
    eventBus.subscribe(AgentEventType.PLAN_UPDATED, PlanEventHandlers.onPlanUpdated);
  }
  
  /**
   * 任务创建事件处理函数
   * @param event 事件对象
   */
  private static onTaskCreated(event: AgentEvent): void {
    console.log(`[PlanEventHandlers] 任务创建事件: ${JSON.stringify(event.data)}`);
    // 实际实现将在未来添加
  }
  
  /**
   * 计划更新事件处理函数
   * @param event 事件对象
   */
  private static onPlanUpdated(event: AgentEvent): void {
    console.log(`[PlanEventHandlers] 计划更新事件: ${JSON.stringify(event.data)}`);
    // 实际实现将在未来添加
  }
} 