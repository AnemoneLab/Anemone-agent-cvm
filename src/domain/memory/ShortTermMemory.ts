/**
 * 消息类型枚举
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file'
}

/**
 * 消息角色枚举
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

/**
 * 消息实体类
 */
export class Message {
  id?: number;
  user_id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  messageType: MessageType;
  metadata: string | null;
  
  /**
   * 创建一个新的消息实例
   */
  constructor(
    user_id: string,
    role: MessageRole,
    content: string,
    timestamp: Date = new Date(),
    messageType: MessageType = MessageType.TEXT,
    metadata: string | null = null,
    id?: number
  ) {
    this.id = id;
    this.user_id = user_id;
    this.role = role;
    this.content = content;
    this.timestamp = timestamp;
    this.messageType = messageType;
    this.metadata = metadata;
  }
  
  /**
   * 获取ISO格式的时间戳字符串
   */
  public getTimestampISOString(): string {
    return this.timestamp.toISOString();
  }
  
  /**
   * 从DTO创建消息对象
   * @param dto 数据传输对象
   */
  public static fromDTO(dto: any): Message {
    return new Message(
      dto.user_id,
      dto.role as MessageRole,
      dto.content,
      new Date(dto.timestamp),
      (dto.message_type as MessageType) || MessageType.TEXT,
      dto.metadata,
      dto.id
    );
  }

  /**
   * 转换为数据传输对象
   */
  public toDTO(): MessageDTO {
    return {
      id: this.id,
      user_id: this.user_id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      message_type: this.messageType,
      metadata: this.metadata
    };
  }

  /**
   * 转换为OpenAI消息格式
   */
  public toOpenAIMessage(): { role: string, content: string } {
    return {
      role: this.role,
      content: this.content
    };
  }
}

/**
 * 消息数据传输对象接口
 */
export interface MessageDTO {
  id?: number;
  user_id: string;
  role: string;
  content: string;
  timestamp?: string;
  message_type?: string;
  metadata?: string | null;
}

/**
 * 短期记忆类
 */
export class ShortTermMemory {
  private messages: Message[] = [];
  
  /**
   * 添加消息到短期记忆
   * @param message 消息对象
   */
  public addMessage(message: Message): void {
    this.messages.push(message);
    
    // 保持短期记忆在合理大小
    if (this.messages.length > 100) {
      this.messages.shift(); // 移除最旧的消息
    }
  }
  
  /**
   * 获取最近的消息
   * @param limit 消息数量限制
   */
  public getRecentMessages(limit: number = 10): Message[] {
    return this.messages.slice(-limit);
  }
  
  /**
   * 获取特定用户的消息
   * @param userId 用户ID
   * @param limit 消息数量限制
   */
  public getUserMessages(userId: string, limit: number = 10): Message[] {
    return this.messages
      .filter(msg => msg.user_id === userId)
      .slice(-limit);
  }
  
  /**
   * 清空短期记忆
   */
  public clear(): void {
    this.messages = [];
  }
} 