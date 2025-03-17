import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { MemoryRepository } from '../../domain/memory/MemoryRepository';
import { Message, MessageRole, MessageType } from '../../domain/memory/ShortTermMemory';
import { SQLiteMemoryRepository } from '../../infrastructure/persistence/SQLiteMemoryRepository';
import { OpenAIConnector } from '../../infrastructure/llm/OpenAIConnector';
import { PlanningService } from './PlanningService';

/**
 * 聊天服务类，负责处理聊天消息
 */
export class ChatService {
  private memoryRepository: MemoryRepository;
  private openAIConnector: OpenAIConnector;
  private planningService: PlanningService;
  private agentCoordinator: any = null;
  
  /**
   * 创建一个新的聊天服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.memoryRepository = new SQLiteMemoryRepository();
    this.openAIConnector = new OpenAIConnector();
    this.planningService = new PlanningService(eventBus);
  }
  
  /**
   * 设置AgentCoordinator引用，用于访问其他服务
   * @param coordinator AgentCoordinator实例
   */
  public setAgentCoordinator(coordinator: any): void {
    this.agentCoordinator = coordinator;
  }

  /**
   * 获取可用的Agent能力描述
   * 这些描述将被添加到LLM的上下文中
   */
  private getAgentCapabilities(): string {
    // 使用PlanningService获取系统提示词
    return this.planningService.getSystemPrompt();
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
      
      let responseText: string = '';
      
      // 如果提供了OpenAI API密钥，使用OpenAI生成回复
      if (apiKey) {
        try {
          // 获取最近的对话历史
          const historyEntries = await this.memoryRepository.getConversationHistory(userId, 10);
          
          // 添加Agent能力描述作为系统消息
          const systemMessage = new Message(
            userId, // 使用相同的用户ID
            MessageRole.SYSTEM,
            this.getAgentCapabilities(),
            new Date(),
            MessageType.TEXT,
            null
          );
          
          // 将系统消息添加到对话历史的开头
          const historyWithCapabilities = [systemMessage, ...historyEntries];
          
          // 循环尝试生成包含命令的回复，最多尝试3次
          let completion = '';
          let executionResults = {
            hasCommands: false,
            isNoneCommand: false,
            executedCommands: [] as string[],
            resultsDescription: ""
          };
          let attempts = 0;
          const maxAttempts = 3;
          
          do {
            attempts++;
            
            // 添加重试提示
            let retryMessage = message;
            if (attempts > 1) {
              console.log(`[ChatService] 第${attempts}次尝试生成包含命令的回复`);
              // 使用PlanningService获取重试提示
              retryMessage = this.planningService.getRetryPrompt(message);
            }
            
            // 调用OpenAI API获取初始回复
            completion = await this.openAIConnector.generateChatResponse(
              historyWithCapabilities,
              retryMessage,
              apiKey,
              apiUrl
            ) || '';  // 确保completion不会是undefined
            
            if (!completion) {
              console.error('[ChatService] OpenAI返回空回复');
              break;
            }
            
            console.log(`[ChatService] 第${attempts}次尝试收到LLM初始回复:`, completion);
            console.log('[ChatService] 开始解析回复中的命令');
            
            // 解析回复中的命令
            executionResults = await this.executeCommands(completion);
            
            console.log('[ChatService] 命令执行结果:', { 
              hasCommands: executionResults.hasCommands,
              commandsCount: executionResults.executedCommands.length,
              isNoneCommand: executionResults.isNoneCommand
            });
            
            // 如果回复中有命令或者已经尝试了最大次数，则退出循环
          } while (!executionResults.hasCommands && attempts < maxAttempts);
          
          // 处理执行结果
          if (!completion) {
            responseText = "无法从OpenAI获取有效回复";
          } else if (executionResults.hasCommands && !executionResults.isNoneCommand) {
            // 如果有命令被执行（且不是none命令），将结果作为上下文发送给LLM生成最终回复
            // 使用PlanningService获取结果格式化提示词
            const contextWithResults = this.planningService.getResultFormattingPrompt(
              executionResults.resultsDescription,
              message
            );

            // 再次调用OpenAI以生成包含查询结果的最终回复
            const finalCompletion = await this.openAIConnector.generateChatResponse(
              historyEntries, // 使用原始历史，不包含系统能力描述
              message + "\n\n" + contextWithResults, // 在用户消息后附加结果上下文
              apiKey,
              apiUrl
            );
            
            responseText = finalCompletion || completion;
          } else if (executionResults.isNoneCommand) {
            // 如果是NONE命令，直接使用原始回复（不添加警告）
            console.log('[ChatService] 使用$execute:none命令，直接使用原始回复');
            
            // 移除$execute:none命令从回复中
            responseText = completion.replace(/\$execute:none/gi, '').trim();
          } else {
            // 如果没有命令且已尝试最大次数，添加警告并使用原始回复
            console.warn('[ChatService] 多次尝试后仍未找到命令，使用原始回复');
            responseText = "注意：系统无法确认此回复是否包含准确数据。请明确要求我执行查询命令以获取准确信息。\n\n" + completion;
          }
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
   * 执行LLM回复中包含的命令
   * @param llmResponse LLM生成的回复文本
   * @returns 执行结果信息
   */
  private async executeCommands(llmResponse: string): Promise<{
    hasCommands: boolean;
    isNoneCommand: boolean;
    executedCommands: string[];
    resultsDescription: string;
  }> {
    const result = {
      hasCommands: false,
      isNoneCommand: false,
      executedCommands: [] as string[],
      resultsDescription: ""
    };
    
    // 检测可能的数据编造情况
    const fabricationPatterns = [
      /余额[:：]\s*\d+/i,
      /balance[:：]\s*\d+/i,
      /(\d+)\s*SUI/i,
      /(\d+)\s*余额/i,
      /健康值[:：]\s*\d+/i,
      /health[:：]\s*\d+/i
    ];
    
    // 检查回复中是否包含编造数据的模式
    let hasFabricatedData = false;
    for (const pattern of fabricationPatterns) {
      if (pattern.test(llmResponse)) {
        console.warn('[ChatService] 检测到可能的数据编造模式:', pattern);
        hasFabricatedData = true;
        break;
      }
    }
    
    // 检查是否有$execute:none命令
    const noneCommandRegex = /\$execute:none/i;
    if (noneCommandRegex.test(llmResponse)) {
      console.log('[ChatService] 检测到$execute:none命令');
      result.hasCommands = true;
      result.isNoneCommand = true;
      result.executedCommands.push('$execute:none');
      return result;
    }
    
    // 如果AgentCoordinator未设置，直接返回
    if (!this.agentCoordinator) {
      console.warn('[ChatService] executeCommands: AgentCoordinator未设置，无法执行命令');
      // 如果检测到可能编造的数据，标记为NONE命令
      if (hasFabricatedData) {
        result.hasCommands = true;
        result.isNoneCommand = true;
        result.executedCommands.push('$execute:none');
      }
      return result;
    }
    
    console.log('[ChatService] 开始使用正则表达式查找命令');
    // 查找命令模式: $execute:commandName
    const commandRegex = /\$execute:(\w+)/g;
    let match;
    let resultsArray = [];
    
    // 记录全部匹配尝试
    const allMatches = [...llmResponse.matchAll(commandRegex)];
    console.log('[ChatService] 正则表达式匹配结果数量:', allMatches.length);
    if (allMatches.length > 0) {
      console.log('[ChatService] 匹配到的命令:', allMatches.map(m => m[1]));
    } else if (hasFabricatedData) {
      // 如果没有匹配到命令但检测到编造数据，标记为NONE命令
      console.warn('[ChatService] 未匹配到命令但检测到可能编造的数据，标记为NONE命令');
      result.hasCommands = true;
      result.isNoneCommand = true;
      result.executedCommands.push('$execute:none');
      return result;
    }
    
    while ((match = commandRegex.exec(llmResponse)) !== null) {
      const command = match[1];
      console.log('[ChatService] 解析到命令:', command);
      result.hasCommands = true;
      result.executedCommands.push(`$execute:${command}`);
      
      // 根据命令执行相应操作
      try {
        let commandResult: any;
        
        switch (command) {
          case 'queryRoleData':
            console.log('[ChatService] 开始执行queryRoleData命令');
            try {
              commandResult = await this.agentCoordinator.getRoleOnChainData();
              console.log('[ChatService] queryRoleData命令执行结果:', { 
                success: commandResult.success,
                hasRole: commandResult.role ? true : false
              });
            } catch (error) {
              console.error('[ChatService] queryRoleData命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.role) {
              const roleData = commandResult.role;
              const suiBalance = Number(roleData.balance) / 1_000_000_000;
              const healthValue = Number(roleData.health) / 1_000_000_000;
              
              // 构建基本角色信息 - 只包含基本属性和技能ID列表，不包含技能详细信息
              let roleInfo = `
Role数据查询结果:
- 余额: ${suiBalance.toFixed(6)} SUI
- 健康值: ${healthValue.toFixed(2)}
- 激活状态: ${roleData.is_active ? '已激活' : '未激活'}
- 锁定状态: ${roleData.is_locked ? '已锁定' : '未锁定'}
`;

              // 添加技能ID列表
              if (roleData.skills && roleData.skills.length > 0) {
                roleInfo += `- 技能数量: ${roleData.skills.length}个\n- 技能ID列表: ${roleData.skills.join(', ')}`;
              } else {
                roleInfo += `- 暂无技能`;
              }
              
              resultsArray.push(roleInfo);
            } else {
              resultsArray.push(`Role数据查询失败: ${commandResult.message || '未知错误'}`);
            }
            break;
            
          case 'querySkillDetails':
            console.log('[ChatService] 开始执行querySkillDetails命令');
            try {
              commandResult = await this.agentCoordinator.getRoleOnChainData();
              console.log('[ChatService] querySkillDetails命令执行结果:', { 
                success: commandResult.success,
                skillCount: commandResult.skillDetails ? commandResult.skillDetails.length : 0
              });
            } catch (error) {
              console.error('[ChatService] querySkillDetails命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.skillDetails && commandResult.skillDetails.length > 0) {
              let skillsInfo = `技能详细信息查询结果 (共${commandResult.skillDetails.length}个技能):\n`;
              
              commandResult.skillDetails.forEach((skill: any, index: number) => {
                skillsInfo += `
技能 ${index + 1}: ${skill.name}
- ID: ${skill.id}
- 描述: ${skill.description}
- 状态: ${skill.is_enabled ? '已启用' : '已禁用'}
- 费用: ${skill.fee} SUI
- 作者: ${skill.author || '未知'}
${skill.github_repo ? `- GitHub: ${skill.github_repo}` : ''}
`;
              });
              
              resultsArray.push(skillsInfo);
            } else if (commandResult.success && commandResult.role && commandResult.role.skills && commandResult.role.skills.length > 0) {
              resultsArray.push(`找到${commandResult.role.skills.length}个技能ID，但无法获取详细信息: ${commandResult.role.skills.join(', ')}`);
            } else {
              resultsArray.push(`技能查询失败或未找到技能: ${commandResult.message || '未知错误'}`);
            }
            break;
            
          case 'getProfile':
            console.log('[ChatService] 开始执行getProfile命令');
            try {
              commandResult = await this.agentCoordinator.getProfile();
              console.log('[ChatService] getProfile命令执行结果:', { 
                success: commandResult.success,
                hasProfile: commandResult.profile ? true : false 
              });
            } catch (error) {
              console.error('[ChatService] getProfile命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.profile) {
              resultsArray.push(`
Profile查询结果:
- Role ID: ${commandResult.profile.role_id}
- Package ID: ${commandResult.profile.package_id}
- 创建时间: ${commandResult.profile.created_at || '未知'}
              `);
            } else {
              resultsArray.push(`Profile查询失败: ${commandResult.message || '未知错误'}`);
            }
            break;
            
          case 'getWallet':
            console.log('[ChatService] 开始执行getWallet命令');
            try {
              commandResult = await this.agentCoordinator.getWalletAddress();
              console.log('[ChatService] getWallet命令执行结果:', {
                success: commandResult.success,
                hasAddress: commandResult.address ? true : false
              });
            } catch (error) {
              console.error('[ChatService] getWallet命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.address) {
              resultsArray.push(`
钱包查询结果:
- 地址: ${commandResult.address}
- 创建时间: ${commandResult.created_at || '未知'}
              `);
            } else {
              resultsArray.push(`钱包查询失败: ${commandResult.error || '未知错误'}`);
            }
            break;
            
          case 'getTokens':
            console.log('[ChatService] 开始执行getTokens命令');
            try {
              commandResult = await this.agentCoordinator.getAccountTokens();
              console.log('[ChatService] getTokens命令执行结果:', { 
                success: commandResult.success,
                hasData: commandResult.data ? true : false 
              });
            } catch (error) {
              console.error('[ChatService] getTokens命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.data) {
              const tokens = commandResult.data;
              if (tokens.length === 0) {
                resultsArray.push('未找到任何代币');
              } else {
                let tokensInfo = `找到 ${tokens.length} 种代币:\n\n`;
                
                // 先提取SUI代币信息
                const suiToken = tokens.find((token: any) => token.coinType === '0x2::sui::SUI');
                if (suiToken) {
                  tokensInfo += `SUI余额: ${suiToken.balance} (价值约 $${suiToken.balanceUsd || '未知'})\n\n`;
                }
                
                // 按照美元价值排序（从高到低）
                const sortedTokens = [...tokens].sort((a: any, b: any) => {
                  if (a.balanceUsd === null && b.balanceUsd === null) return 0;
                  if (a.balanceUsd === null) return 1;
                  if (b.balanceUsd === null) return -1;
                  return b.balanceUsd - a.balanceUsd;
                });
                
                // 最多显示10种代币详情
                const topTokens = sortedTokens.slice(0, 10);
                
                tokensInfo += `前${Math.min(10, sortedTokens.length)}种代币详情:\n`;
                
                topTokens.forEach((token: any, index: number) => {
                  tokensInfo += `
${index + 1}. ${token.coinSymbol || token.coinName || token.coinType}
   余额: ${token.balance}
   美元价值: ${token.balanceUsd !== null ? '$' + token.balanceUsd : '未知'}
   代币价格: ${token.coinPrice !== null ? '$' + token.coinPrice : '未知'}
`;
                });
                
                if (sortedTokens.length > 10) {
                  tokensInfo += `\n还有 ${sortedTokens.length - 10} 种代币未显示`;
                }
                
                resultsArray.push(tokensInfo);
              }
            } else {
              resultsArray.push(`代币查询失败: ${commandResult.message || '未知错误'}`);
            }
            break;
            
          case 'getTokensSummary':
            console.log('[ChatService] 开始执行getTokensSummary命令');
            try {
              commandResult = await this.agentCoordinator.getAccountTokensSummary();
              console.log('[ChatService] getTokensSummary命令执行结果:', { 
                success: commandResult.success,
                hasData: commandResult.data ? true : false 
              });
            } catch (error) {
              console.error('[ChatService] getTokensSummary命令执行出错:', error);
              throw error;
            }
            
            if (commandResult.success && commandResult.data) {
              const summary = commandResult.data;
              resultsArray.push(`
代币余额汇总:
- 总美元价值: $${summary.totalUsdValue.toFixed(2)}
- SUI余额: ${summary.suiBalance.toFixed(6)} SUI (价值约 $${summary.suiUsdValue.toFixed(2)})
- 代币种类: ${summary.tokensCount} 种
`);
            } else {
              resultsArray.push(`代币汇总查询失败: ${commandResult.message || '未知错误'}`);
            }
            break;
            
          default:
            console.warn('[ChatService] 未知命令:', command);
            resultsArray.push(`未知命令: ${command}`);
        }
      } catch (error) {
        console.error(`[ChatService] 执行命令 ${command} 时出错:`, error);
        resultsArray.push(`执行命令 ${command} 时出错: ${error}`);
      }
    }
    
    // 组合所有结果
    result.resultsDescription = resultsArray.join("\n\n");
    console.log('[ChatService] 命令执行完成, 结果长度:', result.resultsDescription.length);
    
    return result;
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