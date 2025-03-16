import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { initializeDatabase, createWallet, getWallets } from './db/database';
import { getWalletAddressHandler } from './controllers/walletController';
import { chatHandler, historyHandler } from './controllers/chatController';
import { getProfileHandler, initProfileHandler } from './controllers/profileController';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

// 初始化数据库
const setupDatabase = async () => {
    try {
        await initializeDatabase();
        console.log('数据库初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
};

// 启动时自动创建一个钱包（如果不存在）
const generateInitialWallet = async () => {
    try {
        // 先检查是否已有钱包
        const existingWallets = await getWallets();
        if (existingWallets.length > 0) {
            console.log('已存在钱包，无需创建新钱包。现有钱包地址:', existingWallets[0].address);
            return;
        }
        
        // 生成新的SUI地址
        const keypair = new Ed25519Keypair();
        const address = keypair.getPublicKey().toSuiAddress();
        const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex');
        
        // 存储地址和私钥到数据库
        const result = await createWallet({
            address,
            private_key: privateKey
        });
        
        if (result.success) {
            console.log('初始钱包创建成功，地址:', address);
        } else {
            console.log('钱包创建失败，请检查数据库');
        }
    } catch (error) {
        console.error('创建初始钱包失败:', error);
        
        // 尝试再次检查是否已有钱包
        try {
            const existingWallets = await getWallets();
            if (existingWallets.length > 0) {
                console.log('检测到已有钱包，继续启动服务。现有钱包地址:', existingWallets[0].address);
            } else {
                console.log('无法创建钱包且没有检测到现有钱包，但将继续启动服务');
            }
        } catch (checkError) {
            console.error('检查现有钱包也失败:', checkError);
            console.log('继续启动服务...');
        }
    }
};

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

// 设置路由 - 只提供获取钱包地址的API
app.get('/wallet', getWalletAddressHandler);

// 添加聊天路由
app.post('/chat', chatHandler);

// 添加聊天历史记录路由
app.get('/chat/history', historyHandler);

// Profile配置接口
app.post('/profile/init', initProfileHandler);
app.get('/profile', getProfileHandler);

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
        await setupDatabase();
        console.log('正在生成初始钱包...');
        await generateInitialWallet();
        
        app.listen(PORT, () => {
            console.log(`CVM 钱包服务运行在端口 ${PORT}`);
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