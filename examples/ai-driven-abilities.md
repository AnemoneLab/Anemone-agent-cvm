# Anemone Agent 自主决策能力

本文档展示了Anemone Agent如何利用大语言模型(LLM)实现自主决策，自动选择和调用合适的能力来响应用户查询。

## 概述

传统的agent设计通常依赖硬编码的意图匹配模式，这种方式扩展性差，且难以处理复杂、模糊的用户请求。Anemone采用了基于LLM的自主决策架构，让AI根据上下文自主判断和调用合适的系统能力。

当用户提问时，系统不再预先定义"如果用户问X，就执行Y"的规则，而是：

1. 告诉LLM它拥有哪些能力
2. 让LLM自己决定是否需要调用这些能力
3. 执行LLM选择的能力，获取结果
4. 让LLM将结果转化为自然语言回复

## 示例：查询链上余额

### 用户交互示例

```
用户: 你好，请问你的余额还剩多少SUI？
Agent: 我目前在链上的余额是0.123456 SUI。如果您需要了解更多关于我的链上状态信息，如健康值或激活状态，也可以随时询问。
```

### 后台执行流程

在这个简单的交互背后，实际上有一个复杂的决策、执行和生成过程：

1. 用户发送问题"你的余额还剩多少SUI？"
2. 系统将用户问题、对话历史以及Agent能力清单提供给LLM
3. LLM理解用户想查询余额，决定调用查询Role数据的能力
4. 系统执行链上查询，获取Role数据包括余额
5. 系统将查询结果提供给LLM
6. LLM生成一个自然、友好的回复，展示余额信息

用户看不到后台的决策和执行过程，只看到最终清晰的回答。

## 代码实现与执行流程

### 1. 系统提供的能力描述

系统通过以下系统消息告诉LLM它拥有哪些能力：

```typescript
private getAgentCapabilities(): string {
  return `
作为Anemone Agent，你具有以下能力，可以根据用户的请求自主决定是否调用：

1. 查询链上Role数据能力:
   - 你可以查询自己在区块链上的角色信息，包括余额、健康值等
   - 使用 await execute("queryRoleData") 获取Role数据

2. 获取Profile配置:
   - 你可以查询自己的配置文件信息
   - 使用 await execute("getProfile") 获取Profile数据

3. 获取钱包信息:
   - 你可以查询与自己关联的钱包地址
   - 使用 await execute("getWallet") 获取钱包信息

当你需要调用这些能力时，在回复中包含特定的命令格式：
例如：当用户询问余额时，你可以使用：
"$execute:queryRoleData"

这些命令会被系统自动解析并执行，然后将结果提供给你，你需要将这些结果以自然语言形式整合到你的回复中。
  `;
}
```

### 2. 完整的执行流程

当用户询问"你的balance余额还有多少sui"时，以下是完整的执行流程：

#### 2.1 接收用户请求

```javascript
// 用户通过API或测试脚本发送消息
const response = await agentCoordinator.processChat(
  "你的balance余额还有多少sui", 
  userId, 
  roleId, 
  apiKey
);
```

#### 2.2 AgentCoordinator转发请求给ChatService

```typescript
// AgentCoordinator.ts
public async processChat(message, userId, roleId, apiKey, apiUrl): Promise<any> {
  return await this.chatService.processMessage(
    message,
    userId,
    roleId,
    apiKey,
    apiUrl
  );
}
```

#### 2.3 ChatService处理消息

```typescript
// ChatService.ts
public async processMessage(message, userId, roleId, apiKey, apiUrl): Promise<any> {
  // 保存用户消息到历史记录
  await this.memoryRepository.saveMessage({...});
  
  // 发布消息接收事件
  this.eventBus.publish(AgentEventType.MESSAGE_RECEIVED, {...});
  
  // 获取最近的对话历史
  const historyEntries = await this.memoryRepository.getConversationHistory(userId, 10);
  
  // 添加Agent能力描述作为系统消息
  const systemMessage = new Message(
    userId,
    MessageRole.SYSTEM,
    this.getAgentCapabilities(),
    new Date(),
    MessageType.TEXT,
    null
  );
  
  // 将系统消息添加到对话历史的开头
  const historyWithCapabilities = [systemMessage, ...historyEntries];
  
  // 第一轮LLM调用 - 决策阶段
  let completion = await this.openAIConnector.generateChatResponse(
    historyWithCapabilities,
    message,
    apiKey,
    apiUrl
  );
  
  // LLM的回答可能类似：
  // "我需要查询一下我的链上数据来回答您的问题。$execute:queryRoleData
  // 让我告诉您我的余额情况..."
  
  // 解析回复中的命令并执行
  const executionResults = await this.executeCommands(completion);
  
  // 如果有命令被执行，将结果提供给LLM生成最终回复
  if (executionResults.hasCommands) {
    const contextWithResults = `
你之前决定执行以下查询：
${executionResults.executedCommands.join('\n')}

查询结果：
${executionResults.resultsDescription}

请将这些结果以自然、友好的方式整合到你的回复中，直接回答用户的问题。不要提及命令格式或系统操作的细节。
`;

    // 第二轮LLM调用 - 回复生成阶段
    const finalCompletion = await this.openAIConnector.generateChatResponse(
      historyEntries,
      message + "\n\n" + contextWithResults,
      apiKey,
      apiUrl
    );
    
    responseText = finalCompletion || completion;
  } else {
    // 如果没有命令，直接使用原始回复
    responseText = completion;
  }
  
  // 保存回复并返回
  await this.memoryRepository.saveMessage({...});
  return { success: true, response: {...} };
}
```

#### 2.4 执行命令的实现

```typescript
private async executeCommands(llmResponse: string): Promise<{
  hasCommands: boolean;
  executedCommands: string[];
  resultsDescription: string;
}> {
  // 查找命令模式: $execute:commandName
  const commandRegex = /\$execute:(\w+)/g;
  let match;
  let resultsArray = [];
  
  while ((match = commandRegex.exec(llmResponse)) !== null) {
    const command = match[1]; // 提取出"queryRoleData"
    
    // 调用相应的服务
    switch (command) {
      case 'queryRoleData':
        commandResult = await this.agentCoordinator.getRoleOnChainData();
        if (commandResult.success && commandResult.role) {
          const roleData = commandResult.role;
          const suiBalance = Number(roleData.balance) / 1_000_000_000;
          
          resultsArray.push(`
Role数据查询结果:
- 余额: ${suiBalance.toFixed(6)} SUI
- 健康值: ${Number(roleData.health) / 1_000_000_000}
- 激活状态: ${roleData.is_active ? '已激活' : '未激活'}
...`);
        }
        break;
      // 其他命令处理...
    }
  }
  
  // 返回执行结果
  return {
    hasCommands: resultsArray.length > 0,
    executedCommands: [...],
    resultsDescription: resultsArray.join("\n\n")
  };
}
```

#### 2.5 链上数据查询实现

```typescript
// ProfileService.ts
public async getRoleOnChainData(): Promise<{ success: boolean, role?: RoleData, message?: string }> {
  // 获取Role ID
  const profileResult = await this.getProfile();
  const roleId = profileResult.profile.role_id;
  
  // 调用SUI区块链API获取Role数据
  const roleData = await this.suiConnector.getRoleData(roleId);
  
  return { success: true, role: roleData };
}

// SuiConnector.ts
public async getRoleData(roleId: string): Promise<RoleData | undefined> {
  const response = await this.suiClient.getObject({
    id: roleId,
    options: {
      showContent: true,
      showOwner: true
    }
  });
  
  // 解析响应数据，提取Role信息
  const fields = response.data.content.fields;
  
  return {
    id: roleId,
    bot_nft_id: fields.bot_nft_id,
    health: BigInt(fields.health || 0),
    is_active: fields.is_active || false,
    is_locked: fields.is_locked || false,
    last_epoch: BigInt(fields.last_epoch || 0),
    inactive_epochs: BigInt(fields.inactive_epochs || 0),
    balance: BigInt(fields.balance?.value || 0),
    bot_address: fields.bot_address || '',
    skills: fields.skills || [],
    app_id: fields.app_id
  };
}
```

## 系统架构优势

这种基于LLM的自主决策架构有以下优势：

1. **高度灵活性**：无需预定义所有可能的用户问题模式
2. **可扩展性**：添加新能力只需在能力描述中添加，不需要修改意图匹配逻辑
3. **自然交互**：用户可以用自然语言提问，不需要学习特定命令
4. **上下文感知**：LLM可以理解对话上下文，做出更合适的决策
5. **自主性**：Agent可以自行判断需要调用哪些能力来解决问题

## 扩展能力的方法

要给Agent添加新能力，只需三步：

1. 在`getAgentCapabilities()`方法中添加新能力的描述
2. 在`executeCommands()`方法中添加新命令的处理逻辑
3. 在相关服务中实现具体功能

例如，添加一个查询链上技能的功能：

```typescript
// 1. 在能力描述中添加
private getAgentCapabilities(): string {
  return `
...
4. 查询技能列表:
   - 你可以查询自己拥有的所有技能
   - 使用 await execute("getSkills") 获取技能列表
...
  `;
}

// 2. 在命令处理中添加
private async executeCommands(llmResponse: string): Promise<any> {
  ...
  switch (command) {
    ...
    case 'getSkills':
      commandResult = await this.agentCoordinator.getSkills();
      // 处理技能列表结果
      break;
  }
  ...
}

// 3. 在AgentCoordinator中实现功能
public async getSkills(): Promise<{ success: boolean, skills?: any[], error?: string }> {
  // 实现技能查询逻辑
}
```

## 结论

Anemone Agent的自主决策能力架构让Agent更加智能、灵活和可扩展。它不仅能够理解用户的自然语言请求，还能根据上下文自主选择和调用合适的能力，提供流畅的用户体验。

这种设计使得Agent能够随着能力的增加而变得更加强大，而不需要改变核心的决策逻辑，为未来的功能扩展提供了坚实的基础。 