import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { setupDatabase } from './infrastructure/persistence/DatabaseSetup';
import { WalletService } from './application/usecases/WalletService';
import { EventBus } from './domain/events/EventBus';
import { AgentCoordinator } from './application/coordinator/AgentCoordinator';
import { setupRoutes } from './interfaces/api/routes';
import { MemoryEventHandlers } from './interfaces/eventHandlers/MemoryEventHandlers';
import { PlanEventHandlers } from './interfaces/eventHandlers/PlanEventHandlers';
import { SkillEventHandlers } from './interfaces/eventHandlers/SkillEventHandlers';

// 创建事件总线
const eventBus = new EventBus();

// 初始化事件处理器
MemoryEventHandlers.initialize(eventBus);
PlanEventHandlers.initialize(eventBus);
SkillEventHandlers.initialize(eventBus);

// 初始化应用程序
const app = express();

// 添加中间件
app.use(cors({
    origin: '*', // 开发环境中允许所有来源，生产环境中应指定前端域名
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

// 初始化并启动服务
const startServer = async () => {
    try {
        console.log('正在初始化服务...');
        
        // 初始化数据库
        await setupDatabase();
        console.log('数据库初始化完成');
        
        // 初始化Agent协调器
        const agentCoordinator = new AgentCoordinator(eventBus);
        
        // 初始化钱包服务和自动创建钱包
        const walletService = new WalletService(eventBus);
        console.log('正在检查/生成初始钱包...');
        await walletService.initializeWallet();
        
        // 设置路由
        setupRoutes(app, walletService, agentCoordinator, eventBus);
        
        // 启动服务器
        app.listen(PORT, () => {
            console.log(`CVM 服务运行在端口 ${PORT}`);
        });
    } catch (error) {
        console.error('服务启动失败:', error);
        process.exit(1);
    }
};

console.log('启动 Anemone Agent CVM 服务...');
startServer().catch(error => {
    console.error('致命错误:', error);
    process.exit(1);
});
