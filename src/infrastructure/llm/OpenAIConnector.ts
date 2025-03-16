import axios from 'axios';
import { Message, MessageRole } from '../../domain/memory/ShortTermMemory';

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
      const url = apiUrl || 'https://api.openai.com/v1/chat/completions';
      
      // 构建消息列表，包括历史消息和当前消息
      const messages = history.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content
      }));
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: currentMessage
      });
      
      // 请求OpenAI API
      const response = await axios.post(
        url,
        {
          model: 'gpt-4-turbo',
          messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 返回生成的文本
      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content;
      } else {
        console.error('OpenAI response did not contain expected content:', response.data);
        return undefined;
      }
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw error;
    }
  }
} 