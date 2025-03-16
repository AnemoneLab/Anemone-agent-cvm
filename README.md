# Anemone Agent CVM

这是Anemone项目中的Agent CVM组件，运行在TEE环境中，负责安全地管理钱包私钥。

## 功能

- 自动创建并管理单个Sui区块链钱包
- 在TEE环境中安全存储私钥
- 提供API接口用于获取钱包地址
- 短期记忆功能，存储和检索历史对话记录
- 配置文件功能，存储Sui区块链上的Role ID和Package ID

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

服务器默认在3001端口运行。

## API接口

### 获取钱包地址

```
GET /wallet
```

获取系统唯一钱包的地址信息。

### 发送聊天消息

```
POST /chat
```

发送聊天消息并获取回复。

**请求参数:**
```json
{
  "message": "你好，请问你是谁？",
  "roleId": "assistant",
  "userId": "user123",
  "openai_api_key": "sk-xxxx",
  "openai_api_url": "https://api.openai.com/v1" // 可选
}
```

**响应:**
```json
{
  "success": true,
  "response": {
    "text": "我是Anemone Agent，一个智能助手。有什么我可以帮助你的吗？",
    "roleId": "assistant",
    "userId": "user123",
    "timestamp": "2023-10-25T12:34:56.789Z"
  }
}
```

### 获取聊天历史

```
GET /chat/history?userId=user123&limit=5&before=2023-10-25T12:34:56.789Z
```

获取指定用户的聊天历史记录。

**查询参数:**
- `userId`: 用户ID (必填)
- `limit`: 返回的消息数量 (可选，默认5)
- `before`: 返回此时间戳之前的消息 (可选)

**响应:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "你好，请问你是谁？",
      "timestamp": "2023-10-25T12:34:55.789Z",
      "message_type": "text",
      "metadata": null
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "我是Anemone Agent，一个智能助手。有什么我可以帮助你的吗？",
      "timestamp": "2023-10-25T12:34:56.789Z",
      "message_type": "text",
      "metadata": null
    }
  ]
}
```

### 设置Profile配置

```
POST /profile
```

设置Agent在Sui区块链上的Role ID和Package ID，注意这些ID只能设置一次，设置后不能再修改。

**请求参数:**
```json
{
  "role_id": "0x123...",
  "package_id": "0x456..."
}
```

**响应:**
```json
{
  "success": true,
  "message": "配置文件设置成功",
  "id": 1
}
```

**错误响应** (如果已存在配置):
```json
{
  "success": false,
  "message": "配置文件已存在，不允许重复设置"
}
```

### 获取Profile配置

```
GET /profile
```

获取Agent当前的Profile配置信息，包括Sui区块链上的Role ID和Package ID。

**响应:**
```json
{
  "success": true,
  "profile": {
    "role_id": "0x123...",
    "package_id": "0x456...",
    "created_at": "2023-10-25T12:34:56.789Z",
    "updated_at": "2023-10-25T12:34:56.789Z"
  }
}
```

**错误响应** (如果不存在配置):
```json
{
  "success": false,
  "message": "未找到配置文件数据"
}
```

## Agent架构设计

Anemone Agent采用了模块化的架构设计，由四个核心组件构成，使其能够自主决策并执行任务。

### 核心组件

#### 1. Profile（配置文件）
- 定义Agent的身份、目标和基本行为特征
- 包含Agent的权限范围和操作限制
- 存储用户设定的偏好和约束条件
- 存储Sui区块链上的Role ID和Package ID

#### 2. Memory（记忆系统）
- 短期记忆：存储当前会话中的交互历史
- 长期记忆：保存跨会话的重要信息和学习成果
- 向量存储：高效检索相关上下文信息

#### 3. Plan（规划系统）
- 任务分解：将复杂目标拆分为可执行的子任务
- 优先级排序：根据重要性和紧急性安排任务执行顺序
- 动态调整：根据执行结果和新信息更新计划

#### 4. Skill（技能系统）
- 替代传统的Action组件，采用可插拔设计
- 通过读取Sui区块链上的skill数组动态加载可用技能
- 每个skill对象包含API文档，指导Agent如何调用该技能
- Agent根据API文档自动构建JSON输入并解析JSON输出

### 决策机制

Agent采用任务清单模式进行决策：

1. **任务识别**：根据用户指令或自主判断，确定需要完成的目标
2. **资源评估**：检查可用的技能(Skill)列表和记忆库(Memory)
3. **任务规划**：生成详细的任务清单，包括每个任务的执行步骤
4. **执行循环**：按顺序执行任务清单中的各项任务
   - 为每个任务选择合适的Skill
   - 根据API文档构造输入参数
   - 调用Skill并解析返回结果
   - 更新记忆和任务状态
5. **反馈优化**：根据执行结果调整后续任务

这种设计使Agent具备自我规划能力，不依赖预定义的工作流，能够根据实际情况灵活应对各种任务。

### Skill集成机制

1. **技能发现**：从Sui区块链读取可用skill数组
2. **技能解析**：解析每个skill对象中的API文档
3. **参数构建**：根据API要求构建JSON格式的输入参数
4. **结果处理**：解析skill返回的JSON输出并据此更新计划

## 实现计划

### 当前开发任务

#### 已实现功能

1. **数据库设计与集成** ✅
   - 创建`message_history`表用于存储对话历史记录
   - 实现数据库连接和操作的工具函数
   - 保留原有的钱包数据表结构

2. **历史对话存储功能** ✅
   - 修改现有chat接口，将用户消息和助手回复存储到数据库
   - 每条记录包含：用户ID、角色(user/assistant)、消息内容、时间戳等信息
   - 确保数据存储过程的安全性和可靠性

3. **历史对话检索接口** ✅
   - 实现`GET /chat/history`接口，支持分页加载
   - 默认返回最近5条消息
   - 支持基于时间戳的分页加载更早的消息

4. **聊天接口增强** ✅
   - 修改chat处理函数，在调用OpenAI API时包含近5条历史记录
   - 确保历史记录按时间顺序正确排列
   - 增加userId参数，用于关联用户的对话历史

5. **前端集成支持** ✅
   - 提供前端所需的API接口文档
   - 支持前端实现"向上滑动加载更多历史消息"的功能

6. **Profile配置功能** ✅
   - 创建`profile`表用于存储Agent在Sui区块链上的配置
   - 实现配置的一次性设置机制，确保安全性
   - 添加获取和设置配置的API接口

### 未来计划

1. **长期记忆功能**
   - 实现重要信息的持久化存储
   - 基于向量数据库的语义检索
   - 信息重要性评分机制

2. **规划系统**
   - 实现任务分解和执行机制
   - 优先级排序算法
   - 任务执行状态跟踪

3. **技能系统**
   - Sui区块链上技能对象的解析和调用
   - 技能文档标准化格式定义
   - 技能调用结果的处理机制
