import { MemoryRepository } from '../../domain/memory/MemoryRepository';
import { Message, MessageRole, MessageType } from '../../domain/memory/ShortTermMemory';
import { getDatabase, runQuery, getQuery } from './DatabaseSetup';

/**
 * Message数据传输对象类型
 */
interface MessageDTO {
  user_id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  message_type?: MessageType;
  metadata?: string;
  conversation_round?: number;
  related_message_id?: number;
}

/**
 * SQLite记忆存储库，实现记忆存储接口
 */
export class SQLiteMemoryRepository implements MemoryRepository {
  /**
   * 创建一个新的SQLite记忆存储库实例
   */
  constructor() {
    // 使用DatabaseSetup中的共享数据库连接
  }

  /**
   * 保存消息到数据库
   * @param message 要保存的消息
   */
  public async saveMessage(message: MessageDTO): Promise<{ success: boolean, id?: number }> {
    try {
      const query = `
        INSERT INTO message_history (user_id, role, content, timestamp, message_type, metadata, conversation_round, related_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result: any = await runQuery(query, [
        message.user_id,
        message.role,
        message.content,
        message.timestamp,
        message.message_type || 'text',
        message.metadata ? JSON.stringify(message.metadata) : null,
        message.conversation_round || null,
        message.related_message_id || null
      ]);
      
      return { success: true, id: result.lastID };
    } catch (error) {
      console.error('Error saving message:', error);
      return { success: false };
    }
  }
  
  /**
   * 获取最近的消息
   * @param userId 用户ID
   * @param limit 消息数量限制
   * @param beforeTimestamp 指定时间戳之前的消息
   */
  public async getRecentMessages(
    userId: string, 
    limit: number = 5, 
    beforeTimestamp?: string
  ): Promise<Message[]> {
    try {
      let query = `
        SELECT id, user_id, role, content, timestamp, message_type, metadata, conversation_round, related_message_id
        FROM message_history
        WHERE user_id = ?
      `;
      
      const params: any[] = [userId];
      
      if (beforeTimestamp) {
        query += ` AND timestamp < ?`;
        params.push(beforeTimestamp);
      }
      
      query += `
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      params.push(limit);
      
      const results = await getQuery(query, params);
      
      // 使用静态工厂方法创建Message对象
      return results.map(row => Message.fromDTO({
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        message_type: row.message_type,
        metadata: row.metadata,
        conversation_round: row.conversation_round,
        related_message_id: row.related_message_id
      }));
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }
  
  /**
   * 获取对话历史
   * @param userId 用户ID
   * @param limit 消息数量限制
   */
  public async getConversationHistory(
    userId: string,
    limit: number = 10
  ): Promise<Message[]> {
    try {
      const query = `
        SELECT id, user_id, role, content, timestamp, message_type, metadata, conversation_round, related_message_id
        FROM message_history
        WHERE user_id = ?
        ORDER BY timestamp ASC
        LIMIT ?
      `;
      
      const results = await getQuery(query, [userId, limit]);
      
      return results.map(row => Message.fromDTO({
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        message_type: row.message_type,
        metadata: row.metadata,
        conversation_round: row.conversation_round,
        related_message_id: row.related_message_id
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * 获取特定会话轮次的消息
   * @param userId 用户ID
   * @param rounds 轮次数量
   */
  public async getMessagesByRounds(
    userId: string,
    rounds: number = 3
  ): Promise<Message[]> {
    try {
      // 首先获取最大会话轮次
      const maxRoundQuery = `
        SELECT MAX(conversation_round) as max_round
        FROM message_history
        WHERE user_id = ? AND conversation_round IS NOT NULL
      `;
      
      const maxRoundResult = await getQuery(maxRoundQuery, [userId]);
      const maxRound = maxRoundResult[0]?.max_round || 0;
      
      // 计算要获取的最小轮次
      const minRound = Math.max(1, maxRound - rounds + 1);
      
      // 获取指定轮次范围的所有消息
      const query = `
        SELECT id, user_id, role, content, timestamp, message_type, metadata, conversation_round, related_message_id
        FROM message_history
        WHERE user_id = ? AND conversation_round >= ? AND conversation_round <= ?
        ORDER BY conversation_round ASC, timestamp ASC
      `;
      
      const results = await getQuery(query, [userId, minRound, maxRound]);
      
      return results.map(row => Message.fromDTO({
        id: row.id,
        user_id: row.user_id,
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
        message_type: row.message_type,
        metadata: row.metadata,
        conversation_round: row.conversation_round,
        related_message_id: row.related_message_id
      }));
    } catch (error) {
      console.error('Error getting messages by rounds:', error);
      return [];
    }
  }

  /**
   * 获取下一个会话轮次
   * @param userId 用户ID
   */
  public async getNextConversationRound(userId: string): Promise<number> {
    try {
      const query = `
        SELECT MAX(conversation_round) as max_round
        FROM message_history
        WHERE user_id = ?
      `;
      
      const result = await getQuery(query, [userId]);
      const maxRound = result[0]?.max_round || 0;
      
      return maxRound + 1;
    } catch (error) {
      console.error('Error getting next conversation round:', error);
      return 1; // 如果出错，默认从第1轮开始
    }
  }

  /**
   * 删除指定用户的所有消息
   * @param userId 用户ID
   */
  public async deleteAllUserMessages(userId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM message_history
        WHERE user_id = ?
      `;
      
      await runQuery(query, [userId]);
      console.log(`已删除用户 ${userId} 的所有消息`);
    } catch (error) {
      console.error(`删除用户 ${userId} 消息时出错:`, error);
    }
  }
} 