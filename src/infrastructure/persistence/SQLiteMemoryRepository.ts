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
        INSERT INTO message_history (user_id, role, content, timestamp, message_type, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const result: any = await runQuery(query, [
        message.user_id,
        message.role,
        message.content,
        message.timestamp,
        message.message_type || 'text',
        message.metadata ? JSON.stringify(message.metadata) : null
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
        SELECT id, user_id, role, content, timestamp, message_type, metadata
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
        metadata: row.metadata
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
        SELECT id, user_id, role, content, timestamp, message_type, metadata
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
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
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