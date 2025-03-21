/**
 * 表示任务的状态
 */
export enum TaskStatus {
  PENDING = 'pending',   // 待执行
  RUNNING = 'running',   // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed'      // 执行失败
}

/**
 * 表示单个任务
 */
export interface Task {
  id: string;           // 任务ID
  description: string;  // 任务描述
  status: TaskStatus;   // 任务状态
  command?: string;     // 关联的命令（如果有）
  result?: string;      // 执行结果
  startTime?: Date;     // 开始时间
  endTime?: Date;       // 结束时间
}

/**
 * 表示一个完整的任务计划
 */
export class TaskPlan {
  private tasks: Task[] = [];
  private currentTaskIndex: number = -1;
  private readonly planId: string;
  private readonly userId: string;
  private readonly userMessage: string;
  private readonly createdAt: Date;

  /**
   * 创建一个新的任务计划
   * @param userId 用户ID
   * @param userMessage 用户消息
   */
  constructor(userId: string, userMessage: string) {
    this.planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.userId = userId;
    this.userMessage = userMessage;
    this.createdAt = new Date();
  }

  /**
   * 添加任务到计划
   * @param description 任务描述
   * @param command 关联命令（可选）
   * @returns 添加的任务
   */
  public addTask(description: string, command?: string): Task {
    const task: Task = {
      id: `task-${this.tasks.length + 1}`,
      description,
      status: TaskStatus.PENDING,
      command
    };
    this.tasks.push(task);
    return task;
  }

  /**
   * 获取下一个待执行的任务
   * @returns 下一个任务，如果没有则返回undefined
   */
  public getNextTask(): Task | undefined {
    const nextTaskIndex = this.tasks.findIndex(t => t.status === TaskStatus.PENDING);
    if (nextTaskIndex !== -1) {
      this.currentTaskIndex = nextTaskIndex;
      return this.tasks[nextTaskIndex];
    }
    return undefined;
  }

  /**
   * 开始执行当前任务
   */
  public startCurrentTask(): void {
    if (this.currentTaskIndex !== -1) {
      const task = this.tasks[this.currentTaskIndex];
      task.status = TaskStatus.RUNNING;
      task.startTime = new Date();
    }
  }

  /**
   * 完成当前任务
   * @param result 任务执行结果
   */
  public completeCurrentTask(result?: string): void {
    if (this.currentTaskIndex !== -1) {
      const task = this.tasks[this.currentTaskIndex];
      task.status = TaskStatus.COMPLETED;
      task.result = result;
      task.endTime = new Date();
    }
  }

  /**
   * 标记当前任务失败
   * @param error 错误信息
   */
  public failCurrentTask(error: string): void {
    if (this.currentTaskIndex !== -1) {
      const task = this.tasks[this.currentTaskIndex];
      task.status = TaskStatus.FAILED;
      task.result = error;
      task.endTime = new Date();
    }
  }

  /**
   * 判断计划是否已完成（所有任务都已完成或失败）
   * @returns 是否已完成
   */
  public isCompleted(): boolean {
    return this.tasks.every(task => 
      task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED
    );
  }

  /**
   * 获取用户ID
   * @returns 用户ID
   */
  public getUserId(): string {
    return this.userId;
  }
  
  /**
   * 获取用户原始消息
   * @returns 用户消息
   */
  public getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * 获取计划ID
   * @returns 计划ID
   */
  public getPlanId(): string {
    return this.planId;
  }

  /**
   * 获取创建时间
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 获取所有任务
   */
  public getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * 将任务计划转换为Markdown格式的任务清单
   * @returns Markdown格式的任务清单
   */
  public toMarkdown(): string {
    let markdown = `## 任务清单 [Plan ID: ${this.planId}]\n\n`;
    markdown += `* 用户消息: "${this.userMessage}"\n`;
    markdown += `* 创建时间: ${this.createdAt.toISOString()}\n\n`;
    
    this.tasks.forEach((task, index) => {
      const checkbox = task.status === TaskStatus.COMPLETED ? '[x]' : '[ ]';
      const statusEmoji = this.getStatusEmoji(task.status);
      markdown += `${index + 1}. ${checkbox} ${statusEmoji} ${task.description}\n`;
      
      if (task.command) {
        markdown += `   - 命令: \`${task.command}\`\n`;
      }
      
      if (task.result) {
        markdown += `   - 结果: ${task.result.substring(0, 100)}${task.result.length > 100 ? '...' : ''}\n`;
      }
      
      if (task.startTime) {
        markdown += `   - 开始: ${task.startTime.toISOString()}\n`;
      }
      
      if (task.endTime) {
        markdown += `   - 结束: ${task.endTime.toISOString()}\n`;
      }
      
      markdown += '\n';
    });
    
    return markdown;
  }

  /**
   * 获取状态对应的表情符号
   * @param status 任务状态
   * @returns 表情符号
   */
  private getStatusEmoji(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING:
        return '⏳';
      case TaskStatus.RUNNING:
        return '🔄';
      case TaskStatus.COMPLETED:
        return '✅';
      case TaskStatus.FAILED:
        return '❌';
      default:
        return '';
    }
  }
} 