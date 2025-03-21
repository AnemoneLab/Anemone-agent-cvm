import { TaskPlan, Task, TaskStatus } from './TaskPlan';
import { EventBus, AgentEventType } from '../events/EventBus';

/**
 * 命令执行接口
 * 定义了命令执行的基本方法
 */
export interface CommandExecutor {
  /**
   * 执行命令
   * @param command 命令名称
   * @param userId 用户ID
   * @param context 上下文信息
   * @returns 执行结果
   */
  executeCommand(command: string, userId: string, context?: any): Promise<string>;
}

/**
 * 任务执行器
 * 负责执行任务计划中的任务
 */
export class TaskExecutor {
  /**
   * 创建一个新的任务执行器
   * @param commandExecutor 命令执行器
   * @param eventBus 事件总线
   */
  constructor(
    private readonly commandExecutor: CommandExecutor,
    private readonly eventBus: EventBus
  ) {}

  /**
   * 执行任务计划
   * @param plan 任务计划
   * @returns 执行结果
   */
  public async executePlan(plan: TaskPlan): Promise<string> {
    // 记录开始执行任务计划
    console.log(`[TaskExecutor] 开始执行任务计划: ${plan.getPlanId()}`);
    console.log(plan.toMarkdown());
    
    this.eventBus.publish(AgentEventType.TASK_PLAN_STARTED, {
      planId: plan.getPlanId(),
      userId: plan.getUserId(),
      message: plan.getUserMessage(),
      markdown: plan.toMarkdown()
    });
    
    let task: Task | undefined;
    const results: string[] = [];
    
    // 循环执行任务直到没有更多任务
    while ((task = plan.getNextTask()) !== undefined) {
      const result = await this.executeTask(task, plan);
      results.push(result);
      
      // 发布任务进度更新事件
      this.eventBus.publish(AgentEventType.TASK_PLAN_UPDATED, {
        planId: plan.getPlanId(),
        userId: plan.getUserId(),
        message: plan.getUserMessage(),
        markdown: plan.toMarkdown()
      });
    }
    
    // 记录任务计划执行完成
    console.log(`[TaskExecutor] 任务计划执行完成: ${plan.getPlanId()}`);
    console.log(plan.toMarkdown());
    
    // 注意：我们不在这里发布TASK_PLAN_COMPLETED事件
    // 而是返回结果给PlanningService，让它在生成最终回复后发布事件
    
    return results.join('\n\n');
  }
  
  /**
   * 执行单个任务
   * @param task 任务
   * @param plan 任务计划
   * @returns 执行结果
   */
  private async executeTask(task: Task, plan: TaskPlan): Promise<string> {
    try {
      // 记录开始执行任务
      console.log(`[TaskExecutor] 开始执行任务: ${task.id} - ${task.description}`);
      
      // 将任务状态更新为执行中
      plan.startCurrentTask();
      
      // 发布任务开始事件
      this.eventBus.publish(AgentEventType.TASK_STARTED, {
        taskId: task.id,
        planId: plan.getPlanId(),
        description: task.description,
        command: task.command
      });
      
      let result: string = '';
      
      // 如果任务有关联命令，则执行命令
      if (task.command) {
        console.log(`[TaskExecutor] 执行命令: ${task.command}`);
        result = await this.commandExecutor.executeCommand(task.command, plan.getUserId());
        console.log(`[TaskExecutor] 命令执行结果: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
      } else {
        // 没有命令的任务直接标记为完成
        result = `任务 "${task.description}" 已完成，无需执行命令`;
      }
      
      // 将任务状态更新为完成
      plan.completeCurrentTask(result);
      
      // 发布任务完成事件
      this.eventBus.publish(AgentEventType.TASK_COMPLETED, {
        taskId: task.id,
        planId: plan.getPlanId(),
        description: task.description,
        result: result
      });
      
      return result;
    } catch (error) {
      // 记录任务执行错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskExecutor] 任务执行失败: ${task.id} - ${errorMessage}`);
      
      // 将任务状态更新为失败
      plan.failCurrentTask(errorMessage);
      
      // 发布任务失败事件
      this.eventBus.publish(AgentEventType.TASK_FAILED, {
        taskId: task.id,
        planId: plan.getPlanId(),
        description: task.description,
        error: errorMessage
      });
      
      return `执行失败: ${errorMessage}`;
    }
  }
} 