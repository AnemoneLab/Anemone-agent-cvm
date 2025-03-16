import { EventBus, AgentEventType, AgentEvent } from '../../domain/events/EventBus';

/**
 * 技能相关事件处理器类
 */
export class SkillEventHandlers {
  /**
   * 初始化技能事件处理器
   * @param eventBus 事件总线
   */
  public static initialize(eventBus: EventBus): void {
    // 注册事件处理函数
    eventBus.subscribe(AgentEventType.SKILL_EXECUTED, SkillEventHandlers.onSkillExecuted);
    eventBus.subscribe(AgentEventType.ACTION_EXECUTED, SkillEventHandlers.onActionExecuted);
  }
  
  /**
   * 技能执行事件处理函数
   * @param event 事件对象
   */
  private static onSkillExecuted(event: AgentEvent): void {
    console.log(`[SkillEventHandlers] 技能执行事件: ${JSON.stringify(event.data)}`);
    // 实际实现将在未来添加
  }
  
  /**
   * Action执行事件处理函数
   * @param event 事件对象
   */
  private static onActionExecuted(event: AgentEvent): void {
    console.log(`[SkillEventHandlers] Action执行事件: ${JSON.stringify(event.data)}`);
    // 实际实现将在未来添加
  }
} 