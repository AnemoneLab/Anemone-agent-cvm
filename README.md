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
2. **资源评估**：检查可用的技能(Skill)和预定义操作(Action)列表以及记忆库(Memory)
3. **任务规划**：生成详细的任务清单，包括每个任务的执行步骤
4. **执行循环**：按顺序执行任务清单中的各项任务
   - 为每个任务选择合适的Skill或Action
   - 根据API文档构造输入参数
   - 调用Skill/Action并解析返回结果
   - 更新记忆和任务状态
5. **反馈优化**：根据执行结果调整后续任务


## 代码架构设计

Anemone Agent采用**事件驱动的领域模型**架构，结合Action和Skill两种模式，既保证关键操作的安全性，又提供足够的灵活性。

### 当前项目结构

以下是项目目录结构，对应了四层架构设计：

```
/src
  /domain                # 领域层 - 包含核心业务实体和领域规则
    /actions             # 预定义操作
      Action.ts          # 操作基类
      ActionRegistry.ts  # 操作注册表
      /financialActions  # 财务相关操作
        BalanceWithdraw.ts  # 余额提取操作
      /systemActions     # 系统相关操作  
        ProfileUpdate.ts   # 配置更新操作
    /events              # 事件相关
      EventBus.ts        # 事件总线
    /memory              # 记忆系统
      MemoryRepository.ts # 记忆存储接口
      ShortTermMemory.ts  # 短期记忆实体
    /profile             # 配置文件
      Profile.ts          # 配置文件实体
      ProfileRepository.ts # 配置文件存储接口
    /skill               # 技能系统
      Skill.ts            # 技能实体
      SkillRegistry.ts    # 技能注册表
    /wallet              # 钱包
      Wallet.ts           # 钱包实体
      WalletRepository.ts # 钱包存储接口
      
  /application           # 应用层 - 处理用例和业务逻辑
    /coordinator         # 协调器
      AgentCoordinator.ts # 代理协调器
    /usecases            # 用例
      ChatService.ts      # 聊天服务
      ProfileService.ts   # 配置文件服务
      WalletService.ts    # 钱包服务
      
  /infrastructure        # 基础设施层 - 技术实现，如数据存储、外部服务连接
    /blockchain          # 区块链相关
      SkillFetcher.ts     # 技能获取器
      SuiConnector.ts     # Sui区块链连接器
    /llm                 # 大语言模型
      OpenAIConnector.ts  # OpenAI连接器
    /persistence         # 持久化存储
      DatabaseSetup.ts    # 数据库设置
      SQLiteMemoryRepository.ts  # SQLite记忆存储实现
      SQLiteProfileRepository.ts # SQLite配置文件存储实现
      SQLiteWalletRepository.ts  # SQLite钱包存储实现
    /security            # 安全相关
      PrivateKeyManager.ts  # 私钥管理
      TEEManager.ts         # TEE环境管理
      
  /interfaces           # 接口层 - 处理与外部系统的交互
    /api                # API接口
      routes.ts         # API路由
    /eventHandlers      # 事件处理器
      MemoryEventHandlers.ts  # 记忆事件处理器
      PlanEventHandlers.ts    # 计划事件处理器
      SkillEventHandlers.ts   # 技能事件处理器
      
  index.ts              # 应用入口文件
```

### Action与Skill的区别与协作

#### Action（预定义操作）

- 系统核心功能，需要特定权限
- 直接内置在代码中，不可动态变更
- 通常涉及关键资源如钱包余额、系统配置等
- 执行过程受到严格监控和限制

示例：从role object的balance中取出资金

#### Skill（动态技能）

- 从区块链动态加载
- 功能可扩展，由社区贡献
- 执行环境受到沙箱限制
- 通过标准化API与系统交互

### 决策协调流程

Agent的决策流程如下：

1. **事件触发**：用户请求或系统事件触发Agent
2. **上下文构建**：`AgentCoordinator`收集必要信息（Profile、Memory）
3. **任务规划**：`TaskPlanner`生成任务列表
4. **执行策略选择**：
   - 对于关键操作，使用预定义的Action
   - 对于扩展功能，使用动态加载的Skill
5. **执行循环**：依次执行任务，处理结果
6. **记忆更新**：将重要信息存入记忆系统
7. **事件发布**：通过`EventBus`发布执行结果事件

### 事件驱动机制

系统内部通过事件总线进行通信，降低组件间耦合：

```typescript
// 示例：事件定义
export enum AgentEventType {
  MESSAGE_RECEIVED,
  TASK_CREATED,
  ACTION_EXECUTED,
  SKILL_EXECUTED,
  MEMORY_UPDATED,
  PLAN_UPDATED
}

// 示例：事件订阅
eventBus.subscribe(AgentEventType.MESSAGE_RECEIVED, (event) => {
  // 触发Agent决策循环
  agentCoordinator.processMessage(event.data);
});
```

### 架构优势

1. **安全与灵活性平衡**：关键操作通过Action保证安全性，非核心功能通过Skill提供扩展性
2. **松耦合设计**：各组件通过接口和事件通信，降低直接依赖
3. **可测试性**：领域逻辑与基础设施分离，便于单元测试
4. **扩展性**：新技能可动态添加，不影响核心逻辑
5. **自主决策支持**：事件驱动设计支持Agent根据情况自主决策
6. **清晰的关注点分离**：每个模块职责明确
7. **权限控制精细化**：Action关联明确的权限要求



## 实现计划

### 当前开发状态

目前已经完成了基础架构和核心接口的实现。主要功能包括：

#### 数据库和存储

- SQLite数据库设置和表结构
- 钱包、配置文件、聊天记录的存储与检索
- 存储库接口的抽象和实现

#### API接口

- 钱包接口 (`/wallet`) - 获取钱包地址信息
- 聊天接口 (`/chat` 和 `/chat/history`) - 处理消息和获取历史记录
- 配置文件接口 (`/profile` 和 `/profile/init`) - 初始化和获取配置信息

#### 事件处理系统

- 事件总线实现
- 事件处理器的设计和注册
- 消息、技能、记忆相关事件的处理

#### 安全与区块链集成

- TEE环境管理
- 私钥安全处理
- Sui区块链连接器

### 未来计划

1. **增强规划系统** ⏳
   - 实现任务分解和执行机制
   - 优先级排序算法
   - 任务执行状态跟踪

2. **长期记忆功能** ⏳
   - 实现重要信息的持久化存储
   - 基于向量数据库的语义检索
   - 信息重要性评分机制

3. **技能系统扩展** ⏳
   - Sui区块链上技能对象的解析和调用
   - 技能文档标准化格式定义
   - 技能调用结果的处理机制

4. **高级决策机制** ⏳
   - 自主决策能力增强
   - 上下文感知和理解能力
   - 多轮对话管理优化


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

### 初始化Profile配置

```
POST /profile/init
```

初始化Agent在Sui区块链上的Role ID和Package ID，注意这些ID只能初始化一次，设置后不能再修改。

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
  "message": "配置文件初始化成功",
  "id": 1
}
```

**错误响应** (如果已存在配置):
```json
{
  "success": false,
  "message": "配置文件已存在，不允许重复初始化"
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