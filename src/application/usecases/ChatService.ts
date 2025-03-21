import { EventBus } from '../../domain/events/EventBus';
import { MemoryRepository } from '../../domain/memory/MemoryRepository';
import { Message, MessageRole, MessageType } from '../../domain/memory/ShortTermMemory';
import { SQLiteMemoryRepository } from '../../infrastructure/persistence/SQLiteMemoryRepository';

/**
 * 聊天服务类，负责处理聊天历史记录
 */
export class ChatService {
  private memoryRepository: MemoryRepository;
  
  /**
   * 创建一个新的聊天服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.memoryRepository = new SQLiteMemoryRepository();
  }
  
  /**
   * 获取聊天历史记录
   * @param userId 用户ID
   * @param limit 消息数量限制
   * @param beforeTimestamp 指定时间戳之前的消息
   * @returns 聊天历史记录
   */
  public async getChatHistory(
    userId: string,
    limit: number = 5,
    beforeTimestamp?: string
  ): Promise<{ success: boolean, messages?: any[], error?: string }> {
    try {
      const messages = await this.memoryRepository.getRecentMessages(userId, limit, beforeTimestamp);
      
      return {
        success: true,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.getTimestampISOString(),
          message_type: msg.messageType,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null
        }))
      };
    } catch (error) {
      console.error('获取聊天历史记录时出错:', error);
      return {
        success: false,
        error: `获取聊天历史记录失败: ${error}`
      };
    }
  }
  
  /**
   * 保存消息到聊天历史记录
   * @param messageData 消息数据
   */
  public async saveMessage(messageData: { 
    user_id: string, 
    role: string, 
    content: string, 
    timestamp: string 
  }): Promise<void> {
    try {
      await this.memoryRepository.saveMessage({
        user_id: messageData.user_id,
        role: messageData.role as MessageRole,
        content: messageData.content,
        timestamp: messageData.timestamp
      });
    } catch (error) {
      console.error('保存消息时出错:', error);
    }
  }
} 