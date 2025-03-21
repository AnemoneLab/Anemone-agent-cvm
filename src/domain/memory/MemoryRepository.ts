import { Message } from './ShortTermMemory';

/**
 * 消息数据传输对象接口
 */
export interface MessageDTO {
  user_id: string;
  role: string;
  content: string;
  timestamp: string;
  message_type?: string;
  metadata?: string;
  conversation_round?: number;
  related_message_id?: number;
}

/**
 * 记忆存储库接口
 */
export interface MemoryRepository {
  /**
   * 保存消息
   * @param message 消息对象
   */
  saveMessage(message: MessageDTO): Promise<{ success: boolean; id?: number }>;
  
  /**
   * 获取最近的消息
   * @param userId 用户ID
   * @param limit 消息数量限制
   * @param beforeTimestamp 指定时间戳之前的消息
   */
  getRecentMessages(
    userId: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<Message[]>;
  
  /**
   * 获取对话历史
   * @param userId 用户ID
   * @param limit 消息数量限制
   */
  getConversationHistory(
    userId: string,
    limit?: number
  ): Promise<Message[]>;
  
  /**
   * 获取特定会话轮次的消息
   * @param userId 用户ID
   * @param rounds 轮次数量
   */
  getMessagesByRounds(
    userId: string,
    rounds?: number
  ): Promise<Message[]>;
  
  /**
   * 获取下一个会话轮次
   * @param userId 用户ID
   */
  getNextConversationRound(userId: string): Promise<number>;
  
  /**
   * 删除用户的所有消息
   * @param userId 用户ID
   */
  deleteAllUserMessages(userId: string): Promise<void>;
} 