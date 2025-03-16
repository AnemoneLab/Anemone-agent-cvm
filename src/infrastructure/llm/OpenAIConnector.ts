import { OpenAI } from 'openai';
import { Message } from '../../domain/memory/ShortTermMemory';

/**
 * OpenAI连接器类，负责与OpenAI API通信
 */
export class OpenAIConnector {
  /**
   * 生成聊天响应
   * @param history 历史消息
   * @param currentMessage 当前消息
   * @param apiKey OpenAI API密钥
   * @param apiUrl OpenAI API URL (可选)
   */
  public async generateChatResponse(
    history: Message[],
    currentMessage: string,
    apiKey: string,
    apiUrl?: string
  ): Promise<string | undefined> {
    try {
      // 创建OpenAI客户端实例
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: apiUrl || undefined
      });
      
      // 构建消息列表，包括历史消息和当前消息
      const messages = history.map(msg => ({
        role: msg.role.toLowerCase() as 'system' | 'user' | 'assistant',
        content: msg.content
      }));
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: currentMessage
      });
      
      // 调用OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // 返回生成的文本
      if (completion.choices[0]?.message?.content) {
        return completion.choices[0].message.content;
      } else {
        console.error('OpenAI response did not contain expected content:', completion);
        return undefined;
      }
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw error;
    }
  }
} 