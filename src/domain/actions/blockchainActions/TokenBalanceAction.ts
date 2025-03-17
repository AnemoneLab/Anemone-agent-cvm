import { Action } from '../Action';
import { AgentContext } from '../ActionRegistry';
import { BlockberryConnector, TokenBalance } from '../../../infrastructure/blockchain/BlockberryConnector';

/**
 * 代币余额查询Action
 * 用于查询指定地址或当前钱包地址的代币余额
 */
export class TokenBalanceAction implements Action {
  readonly id: string = 'token_balance';
  readonly requiredPermissions: string[] = ['BLOCKCHAIN_QUERY'];
  
  private readonly blockberryConnector: BlockberryConnector;
  
  /**
   * 构造函数
   */
  constructor() {
    this.blockberryConnector = new BlockberryConnector();
  }
  
  /**
   * 检查是否可以执行此Action
   * @param context 代理上下文
   */
  public canExecute(context: AgentContext): boolean {
    return context.hasPermission('BLOCKCHAIN_QUERY');
  }
  
  /**
   * 执行Action
   * @param params 参数对象，可以包含钱包地址
   * @returns 执行结果
   */
  public async execute(params: {
    address?: string;
    summary?: boolean;
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { address, summary = false } = params;
      
      // 验证地址格式（如果提供了地址）
      if (address && !address.startsWith('0x')) {
        return {
          success: false,
          error: '无效的Sui地址格式'
        };
      }
      
      // 根据参数决定调用哪个方法
      if (summary) {
        // 获取余额汇总
        const result = await this.blockberryConnector.getAccountBalanceSummary(address!);
        return {
          success: true,
          data: result
        };
      } else {
        // 获取详细余额列表
        const balances = await this.blockberryConnector.getAccountBalance(address!);
        return {
          success: true,
          data: balances
        };
      }
    } catch (error: any) {
      console.error('TokenBalanceAction执行失败:', error);
      return {
        success: false,
        error: `获取代币余额失败: ${error.message}`
      };
    }
  }
} 