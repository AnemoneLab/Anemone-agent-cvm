import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { BlockberryConnector, TokenBalance } from '../../infrastructure/blockchain/BlockberryConnector';

/**
 * Blockberry服务类，负责处理与Blockberry API的交互
 */
export class BlockberryService {
  private blockberryConnector: BlockberryConnector;
  
  /**
   * 创建一个新的Blockberry服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.blockberryConnector = new BlockberryConnector();
  }
  
  /**
   * 获取账户的所有代币余额
   * @param address 账户地址
   * @returns 包含操作结果和代币余额的对象
   */
  public async getAccountBalance(address: string): Promise<{
    success: boolean;
    balances?: TokenBalance[];
    message?: string;
  }> {
    try {
      // 验证地址
      if (!address || !address.startsWith('0x')) {
        return {
          success: false,
          message: '无效的Sui地址格式'
        };
      }
      
      // 调用连接器获取余额
      const balances = await this.blockberryConnector.getAccountBalance(address);
      
      // 发布余额获取事件
      this.eventBus.publish(AgentEventType.BLOCKCHAIN_DATA_FETCHED, {
        type: 'account_balance',
        address,
        balances
      });
      
      return {
        success: true,
        balances
      };
    } catch (error: any) {
      console.error('获取账户余额时出错:', error);
      return {
        success: false,
        message: `获取余额失败: ${error.message}`
      };
    }
  }
  
  /**
   * 获取账户余额汇总信息
   * @param address 账户地址
   * @returns 包含操作结果和余额汇总的对象
   */
  public async getAccountBalanceSummary(address: string): Promise<{
    success: boolean;
    summary?: {
      totalUsdValue: number;
      suiBalance: number;
      suiUsdValue: number;
      tokensCount: number;
    };
    message?: string;
  }> {
    try {
      // 验证地址
      if (!address || !address.startsWith('0x')) {
        return {
          success: false,
          message: '无效的Sui地址格式'
        };
      }
      
      // 调用连接器获取余额汇总
      const summary = await this.blockberryConnector.getAccountBalanceSummary(address);
      
      return {
        success: true,
        summary
      };
    } catch (error: any) {
      console.error('获取账户余额汇总时出错:', error);
      return {
        success: false,
        message: `获取余额汇总失败: ${error.message}`
      };
    }
  }
} 