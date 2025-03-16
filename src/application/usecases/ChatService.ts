import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { MemoryRepository } from '../../domain/memory/MemoryRepository';
import { Message, MessageRole, MessageType } from '../../domain/memory/ShortTermMemory';
import { SQLiteMemoryRepository } from '../../infrastructure/persistence/SQLiteMemoryRepository';
import { OpenAIConnector } from '../../infrastructure/llm/OpenAIConnector';

/**
 * 聊天服务类，负责处理聊天消息
 */
export class ChatService {
  private memoryRepository: MemoryRepository;
  private openAIConnector: OpenAIConnector;
  
  /**
   * 创建一个新的聊天服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.memoryRepository = new SQLiteMemoryRepository();
    this.openAIConnector = new OpenAIConnector();
  }
  
  /**
   * 处理聊天消息
   * @param message 消息内容
   * @param userId 用户ID
   * @param roleId 角色ID
   * @param apiKey OpenAI API密钥
   * @param apiUrl OpenAI API URL（可选）
   */
  public async processMessage(
    message: string,
    userId: string,
    roleId: string,
    apiKey?: string,
    apiUrl?: string
  ): Promise<{ success: boolean, response?: any, error?: string }> {
    try {
      // 生成当前时间戳
      const timestamp = new Date();
      
      // 保存用户消息到历史记录
      await this.memoryRepository.saveMessage({
        user_id: userId,
        role: MessageRole.USER,
        content: message,
        timestamp: timestamp.toISOString()
      });
      
      // 发布消息接收事件
      this.eventBus.publish(AgentEventType.MESSAGE_RECEIVED, {
        userId,
        roleId,
        message,
        timestamp: timestamp.toISOString()
      });
      
      let responseText: string;
      
      // 如果提供了OpenAI API密钥，使用OpenAI生成回复
      if (apiKey) {
        try {
          // 获取最近的对话历史
          const historyEntries = await this.memoryRepository.getConversationHistory(userId, 10);
          
          // 调用OpenAI API
          const completion = await this.openAIConnector.generateChatResponse(
            historyEntries,
            message,
            apiKey,
            apiUrl
          );
          
          responseText = completion || "无法从OpenAI获取有效回复";
        } catch (openaiError: any) {
          console.error('[CVM Chat] OpenAI API error:', openaiError);
          responseText = `OpenAI API调用失败: ${openaiError.message || '未知错误'}`;
        }
      } else {
        // 如果没有提供API密钥，使用默认回复
        responseText = `This is a response from Agent CVM. I received your message: "${message}" at ${timestamp.toISOString()}`;
      }
      
      // 保存助手回复到历史记录
      const assistantTimestamp = new Date();
      await this.memoryRepository.saveMessage({
        user_id: userId,
        role: MessageRole.ASSISTANT,
        content: responseText,
        timestamp: assistantTimestamp.toISOString()
      });
      
      // 构建响应对象
      const response = {
        text: responseText,
        roleId,
        userId,
        timestamp: timestamp.toISOString()
      };
      
      return { success: true, response };
    } catch (error) {
      console.error('[CVM Chat] Error processing message:', error);
      return { success: false, error: '处理消息时出错' };
    }
  }
  
  /**
   * 获取聊天历史记录
   * @param userId 用户ID
   * @param limit 消息数量限制
   * @param beforeTimestamp 指定时间戳之前的消息
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
      console.error('[CVM Chat] Error retrieving chat history:', error);
      return { success: false, error: '获取聊天历史记录时出错' };
    }
  }
  
  /**
   * 保存消息到聊天历史
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
      console.error('[CVM Chat] Error saving message:', error);
      throw error;
    }
  }
} 