# Anemone Agent CVM 新架构实现

本目录包含了按照事件驱动领域模型架构重构的 Anemone Agent CVM 代码。

## 架构概览

新架构采用分层设计：

1. **领域层 (Domain Layer)** - 包含核心业务实体和接口
2. **应用层 (Application Layer)** - 包含业务用例和协调器
3. **基础设施层 (Infrastructure Layer)** - 包含技术实现细节
4. **接口层 (Interface Layer)** - 包含与外部系统的交互

## 完成项与待办项

### 已完成

- [x] 基本架构设计和目录结构
- [x] 领域实体定义 (Wallet, Profile, Message等)
- [x] 核心存储库接口
- [x] 主要服务实现 (WalletService, ProfileService, ChatService)
- [x] 事件总线系统
- [x] 数据库访问层
- [x] API路由接口

### 待完成

- [ ] 实现完整的Skill加载和执行系统
- [ ] 实现预定义Action的具体实现
- [ ] 添加更多单元测试
- [ ] 完善事件处理机制
- [ ] 实现长期记忆功能
- [ ] 完善规划系统

## 如何完成剩余实现

1. **实现预定义Action**:
   - 在 `domain/actions/financialActions` 和 `domain/actions/systemActions` 中添加具体的Action实现
   - 在 `AgentCoordinator` 构造函数中注册这些Action

2. **实现Skill系统**:
   - 完善 `infrastructure/blockchain/SuiConnector.ts` 以从区块链加载Skills
   - 实现 `SkillRegistry.loadSkillsFromBlockchain` 方法

3. **添加单元测试**:
   - 为每个核心组件创建单元测试
   - 创建集成测试验证整体流程

## 如何切换到新架构

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **编译代码**:
   ```bash
   npm run build
   ```

3. **替换旧实现**:
   ```bash
   mv src src-old
   mv src-new src
   ```

4. **运行服务**:
   ```bash
   npm run dev
   ```

## 注意事项

- 新架构中的API接口与旧架构保持一致，因此不会影响现有前端或其他依赖
- 在数据库结构上保持了兼容性，可以平滑迁移
- 事件驱动架构将为未来的功能扩展提供更好的支持 