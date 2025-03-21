import { EventBus } from '../../domain/events/EventBus';
import { MemoryRepository, MessageDTO } from '../../domain/memory/MemoryRepository';
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
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          conversation_round: msg.conversation_round,
          related_message_id: msg.related_message_id
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
   * 按会话轮次获取消息
   * @param userId 用户ID
   * @param rounds 轮次数量（默认3轮）
   * @returns 特定轮次的消息
   */
  public async getMessagesByRounds(
    userId: string,
    rounds: number = 3
  ): Promise<any[]> {
    try {
      const messages = await this.memoryRepository.getMessagesByRounds(userId, rounds);
      
      return messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.getTimestampISOString(),
        message_type: msg.messageType,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
        conversation_round: msg.conversation_round,
        related_message_id: msg.related_message_id
      }));
    } catch (error) {
      console.error('按轮次获取消息时出错:', error);
      return [];
    }
  }
  
  /**
   * 获取下一个会话轮次
   * @param userId 用户ID
   * @returns 下一个会话轮次
   */
  public async getNextConversationRound(userId: string): Promise<number> {
    try {
      return await this.memoryRepository.getNextConversationRound(userId);
    } catch (error) {
      console.error('获取下一个会话轮次时出错:', error);
      return 1; // 默认从第1轮开始
    }
  }
  
  /**
   * 保存消息到聊天历史记录
   * @param messageData 消息数据
   * @returns 保存结果，包含消息ID
   */
  public async saveMessage(messageData: MessageDTO): Promise<{ success: boolean; id?: number }> {
    try {
      // 使用MessageDTO接口来传递所有字段
      return await this.memoryRepository.saveMessage(messageData);
    } catch (error) {
      console.error('保存消息时出错:', error);
      return { success: false };
    }
  }
} 