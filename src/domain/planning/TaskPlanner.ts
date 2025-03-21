import { TaskPlan } from './TaskPlan';

/**
 * 任务规划器接口
 * 定义了规划器的基本功能
 */
export interface TaskPlanner {
  /**
   * 创建任务计划
   * @param userId 用户ID
   * @param userMessage 用户消息
   * @returns 任务计划
   */
  createPlan(userId: string, userMessage: string): Promise<TaskPlan>;
}

/**
 * LLM任务规划器
 * 使用大语言模型分析用户消息并生成任务
 */
export class LLMTaskPlanner implements TaskPlanner {
  private readonly availableTools = [
    {
      name: 'getWallet',
      description: 'Retrieves wallet address and information. Use when the user asks about wallet address or general wallet information.'
    },
    {
      name: 'queryRoleData',
      description: 'Queries role data from blockchain, including health, balance and skills list. Use when the user asks about role status, health, or general role information.'
    },
    {
      name: 'getTokens',
      description: 'Gets a detailed list of all tokens in the wallet with their amounts and values. Use when the user asks for detailed token information or specific token balances.'
    },
    {
      name: 'getTokensSummary', 
      description: 'Gets a summary of tokens in the wallet, including total USD value and SUI balance. Use when the user asks about total balance or general balance information.'
    },
    {
      name: 'querySkillDetails',
      description: 'Gets detailed information about all skills the role has. Use when the user asks about skills or their capabilities.'
    },
    {
      name: 'getProfile',
      description: 'Gets profile configuration information. Use when the user asks about profile settings or configuration.'
    },
    {
      name: 'none',
      description: 'Do not execute any specific command. Use this when the user is just chatting or asking general questions that do not require any specific data retrieval.'
    }
  ];

  /**
   * 构造函数
   * @param openAIConnector OpenAI连接器
   * @param apiKey OpenAI API密钥（可选）
   * @param apiUrl OpenAI API URL（可选）
   */
  constructor(
    private readonly openAIConnector?: any,
    private readonly apiKey?: string,
    private readonly apiUrl?: string
  ) {}

  /**
   * 创建任务计划
   * @param userId 用户ID
   * @param userMessage 用户消息
   * @returns 任务计划
   */
  public async createPlan(userId: string, userMessage: string, chatHistory: any[] = []): Promise<TaskPlan> {
    // 创建新的任务计划
    const plan = new TaskPlan(userId, userMessage);
    
    // 添加任务：解析用户意图
    plan.addTask('解析用户意图，确定需要执行的操作');
    
    // 使用LLM确定命令
    let commandsToExecute: string[] = [];
    
    if (this.openAIConnector && this.apiKey) {
      try {
        // 使用LLM确定命令，传入聊天历史
        commandsToExecute = await this.determineCommandsWithLLM(userMessage, chatHistory);
        console.log(`[LLMTaskPlanner] LLM分析用户意图结果: ${JSON.stringify(commandsToExecute)}`);
      } catch (error) {
        console.error('LLM分析失败:', error);
        // 如果LLM分析失败，添加默认的none命令
        commandsToExecute = ['none'];
      }
    } else {
      console.log('[LLMTaskPlanner] 没有提供OpenAI API密钥，无法进行LLM分析，使用空命令列表');
      // 如果没有OpenAI连接器或API密钥，添加none命令
      commandsToExecute = ['none'];
    }
    
    // 如果没有生成任何命令，添加none命令
    if (commandsToExecute.length === 0) {
      commandsToExecute = ['none'];
    }
    
    // 添加命令执行任务
    for (const command of commandsToExecute) {
      plan.addTask(`获取${this.getCommandDescription(command)}`, command);
    }
    
    // 添加任务：处理数据并准备回复
    plan.addTask('整合收集的信息，准备回复');
    
    // 添加任务：生成最终回复
    plan.addTask('生成对用户的最终回复');
    
    return plan;
  }
  
  /**
   * 使用LLM确定需要执行的命令
   * @param userMessage 用户消息
   * @param chatHistory 聊天历史
   * @returns 命令列表
   */
  private async determineCommandsWithLLM(userMessage: string, chatHistory: any[] = []): Promise<string[]> {
    if (!this.openAIConnector || !this.apiKey) {
      return ['none'];
    }
    
    // 构建提示
    const toolsDescription = this.availableTools.map(tool => 
      `${tool.name}: ${tool.description}`
    ).join('\n');
    
    // 格式化聊天历史
    const formattedHistory = chatHistory.length > 0 
      ? "Previous conversation context:\n" + 
        chatHistory.map((msg) => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
      : "No previous conversation.";
    
    const prompt = `
I need to determine which tools to use based on a user message.

Available tools:
${toolsDescription}

${formattedHistory}

User message: "${userMessage}"

Please analyze the user's intent and determine which tools I should use. Consider the following:
1. Only select tools that are directly relevant to answering the user's question
2. If the user is just greeting or making small talk, use the "none" tool
3. If the question is about balances or tokens, you MUST include BOTH queryRoleData AND getTokens/getTokensSummary tools
4. If no specific data is needed, use the "none" tool
5. Consider the conversation context when determining the appropriate tools

Explain your reasoning first, then list the selected tools with a '$' prefix in a new paragraph.
For example:

The user is asking about their wallet balance. I need to check both the role balance and token information.

Tools to use:
$queryRoleData
$getTokensSummary

If no specific tools are needed:

The user is just greeting me, no specific data is required.

Tools to use:
$none

Your response:`;
    
    try {
      // 调用OpenAI API
      const response = await this.openAIConnector.generateChatResponse(
        [],
        prompt,
        this.apiKey,
        this.apiUrl
      );
      
      // 解析响应，提取带有$前缀的命令
      const toolNames: string[] = [];
      const lines = response.split('\n');
      
      let toolSection = false;
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 检查是否进入了工具列表部分
        if (trimmedLine === 'Tools to use:') {
          toolSection = true;
          continue;
        }
        
        // 如果在工具列表部分，检查是否有带$前缀的命令
        if (toolSection && trimmedLine.startsWith('$')) {
          const toolName = trimmedLine.substring(1).trim(); // 移除$前缀
          
          // 验证这是一个有效的工具名称
          if (this.availableTools.some(tool => tool.name === toolName)) {
            toolNames.push(toolName);
          }
        }
      }
      
      console.log('LLM建议的工具:', toolNames);
      
      // 如果是余额相关查询，确保同时包含 queryRoleData 和 getTokens/getTokensSummary
      const isBalanceQuery = userMessage.toLowerCase().includes('余额') || 
                            userMessage.toLowerCase().includes('balance') ||
                            userMessage.toLowerCase().includes('token') ||
                            userMessage.toLowerCase().includes('代币');
      
      if (isBalanceQuery) {
        // 确保包含 queryRoleData
        if (!toolNames.includes('queryRoleData')) {
          toolNames.push('queryRoleData');
        }
        
        // 确保包含至少一个钱包余额查询工具
        if (!toolNames.includes('getTokens') && !toolNames.includes('getTokensSummary')) {
          toolNames.push('getTokensSummary');
        }
      }
      
      return toolNames.length > 0 ? toolNames : ['none'];
    } catch (error) {
      console.error('调用LLM确定命令失败:', error);
      return ['none'];
    }
  }
  
  /**
   * 获取命令描述
   * @param command 命令名称
   * @returns 命令描述
   */
  private getCommandDescription(command: string): string {
    switch (command) {
      case 'getWallet':
        return '钱包信息';
      case 'queryRoleData':
        return '角色数据';
      case 'getTokens':
        return '详细代币列表';
      case 'getTokensSummary':
        return '代币余额汇总';
      case 'querySkillDetails':
        return '技能详细信息';
      case 'getProfile':
        return 'Profile配置';
      case 'none':
        return '无需查询数据';
      default:
        return command;
    }
  }
} 