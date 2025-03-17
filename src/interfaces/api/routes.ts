import { Router, Request, Response } from 'express';
import { WalletService } from '../../application/usecases/WalletService';
import { AgentCoordinator } from '../../application/coordinator/AgentCoordinator';

/**
 * 设置API路由
 * @param app Express应用实例
 * @param walletService 钱包服务实例
 * @param agentCoordinator 代理协调器实例
 */
export function setupRoutes(
  app: any,
  walletService: WalletService,
  agentCoordinator: AgentCoordinator
): void {
  // 设置钱包相关路由
  setupWalletRoutes(app, walletService);
  
  // 设置聊天相关路由
  setupChatRoutes(app, agentCoordinator);
  
  // Profile初始化路由
  app.post('/profile/init', async (req: Request, res: Response) => {
    try {
      const { role_id, package_id } = req.body;
      
      // 验证参数
      if (!role_id || !package_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: role_id 或 package_id'
        });
      }
      
      const result = await agentCoordinator.initProfile(role_id, package_id);
      
      if (result.success) {
        return res.status(201).json({
          success: true,
          message: result.message,
          id: result.id
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('初始化配置文件时出错:', error);
      return res.status(500).json({
        success: false,
        message: '初始化配置文件时发生内部服务器错误'
      });
    }
  });
  
  // 获取Profile配置
  app.get('/profile', async (req: Request, res: Response) => {
    try {
      const result = await agentCoordinator.getProfile();
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          profile: {
            role_id: result.profile.role_id,
            package_id: result.profile.package_id,
            created_at: result.profile.created_at,
            updated_at: result.profile.updated_at
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('获取配置文件时出错:', error);
      return res.status(500).json({
        success: false,
        message: '获取配置文件时发生内部服务器错误'
      });
    }
  });
}

/**
 * 设置钱包相关路由
 * @param app Express应用实例
 * @param walletService 钱包服务实例
 */
function setupWalletRoutes(app: any, walletService: WalletService): void {
  // 获取钱包地址
  app.get('/wallet', async (req: Request, res: Response) => {
    try {
      const walletInfo = await walletService.getWalletInfo();
      
      if (walletInfo.success) {
        res.json({
          success: true,
          address: walletInfo.address,
          created_at: walletInfo.created_at
        });
      } else {
        // 旧版本在钱包不存在时返回的是 { error: ... } 而不是 { success: false, error: ... }
        res.status(404).json({
          error: walletInfo.error
        });
      }
    } catch (error) {
      console.error('获取钱包地址出错:', error);
      res.status(500).json({
        error: '获取钱包地址时出错'
      });
    }
  });
}

/**
 * 设置聊天相关路由
 * @param app Express应用实例
 * @param agentCoordinator 代理协调器实例
 */
function setupChatRoutes(app: any, agentCoordinator: AgentCoordinator): void {
  // 确保ChatService中的agentCoordinator被正确设置
  console.log('[API Routes] 设置ChatService的AgentCoordinator实例');
  const chatService = agentCoordinator.getChatService();
  if (chatService) {
    console.log('[API Routes] 成功获取ChatService实例并设置AgentCoordinator');
    chatService.setAgentCoordinator(agentCoordinator);
  } else {
    console.error('[API Routes] 无法获取ChatService实例，命令执行功能可能无法正常工作');
  }
  
  // 聊天路由
  app.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message, userId, roleId, openai_api_key, openai_api_url } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数: userId'
        });
      }
      
      const result = await agentCoordinator.processChat(
        message,
        userId,
        roleId,
        openai_api_key,
        openai_api_url
      );
      
      res.json(result);
    } catch (error) {
      console.error('处理聊天消息时出错:', error);
      res.status(500).json({
        success: false,
        error: '处理聊天消息时出错'
      });
    }
  });
  
  // 获取聊天历史
  app.get('/chat/history', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const beforeTimestamp = req.query.before as string;
      
      // 验证用户ID
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数: userId'
        });
      }
      
      const result = await agentCoordinator.getChatHistory(
        userId,
        limit,
        beforeTimestamp
      );
      
      return res.json(result);
    } catch (error) {
      console.error('获取聊天历史时出错:', error);
      return res.status(500).json({
        success: false,
        error: '获取聊天历史时出错'
      });
    }
  });
} 