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
   * 生成任务计划的Markdown格式输出
   * @returns Markdown格式字符串
   */
  public toMarkdown(): string {
    const tasks = this.getTasks();
    
    // 创建任务列表的Markdown表示
    let markdown = `## 任务计划\n\n`;
    
    tasks.forEach((task, index) => {
      const statusIcon = task.status === TaskStatus.COMPLETED ? '✅' : '[ ]';
      const taskNumber = index + 1;
      let taskLine = `${taskNumber}. [${statusIcon}] ${task.description}`;
      
      // 如果任务有关联命令，则添加命令信息
      if (task.command && task.command !== 'none') {
        taskLine += ` (命令: \`$${task.command}\`)`;
      }
      
      markdown += taskLine + '\n';
    });
    
    return markdown;
  }

  /**
   * 生成任务进度日志
   * 包含每个任务的执行时间和状态
   * @returns 包含任务进度的日志字符串
   */
  public toProgressLog(): string {
    const tasks = this.getTasks();
    let log = '';
    
    tasks.forEach((task, index) => {
      const taskNumber = index + 1;
      const statusIcon = task.status === TaskStatus.COMPLETED ? '✅' : '[ ]';
      
      log += `${taskNumber}. [${statusIcon}] ${task.description}\n`;
      
      // 添加命令信息（如果有）
      if (task.command && task.command !== 'none') {
        log += `   - 命令: \`$${task.command}\`\n`;
      }
      
      // 添加执行结果（如果有）
      if (task.result) {
        log += `   - 结果: ${task.result}\n`;
      }
      
      // 添加开始时间
      if (task.startTime) {
        log += `   - 开始: ${task.startTime}\n`;
      }
      
      // 添加结束时间（如果任务已完成）
      if (task.status === TaskStatus.COMPLETED && task.endTime) {
        log += `   - 结束: ${task.endTime}\n`;
      }
      
      log += '\n';
    });
    
    return log;
  }
} 