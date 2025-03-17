import axios, { AxiosRequestConfig } from 'axios';

/**
 * 代币余额信息接口
 */
export interface TokenBalance {
  coinType: string;
  coinName: string | null;
  coinSymbol: string | null;
  balance: number;
  balanceUsd: number | null;
  decimals: number | null;
  coinPrice: number | null;
}

/**
 * Blockberry API连接器
 * 用于与Blockberry API交互，获取Sui链上数据
 */
export class BlockberryConnector {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.blockberry.one';
  
  /**
   * 创建BlockberryConnector实例
   * @param apiKey API密钥，默认从环境变量获取
   */
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BLOCKBERRY_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('BlockberryConnector: BLOCKBERRY_API_KEY环境变量未设置，API调用可能会失败');
    }
  }
  
  /**
   * 获取账户的所有代币余额
   * @param address 账户地址
   * @returns 代币余额数组
   */
  public async getAccountBalance(address: string): Promise<TokenBalance[]> {
    try {
      // 验证地址格式
      if (!address || !address.startsWith('0x')) {
        throw new Error('无效的Sui地址格式');
      }
      
      const options: AxiosRequestConfig = {
        method: 'GET',
        url: `${this.baseUrl}/sui/v1/accounts/${address}/balance`,
        headers: {
          'accept': '*/*',
          'x-api-key': this.apiKey
        }
      };
      
      console.log(`正在查询地址 ${address} 的代币余额...`);
      const response = await axios.request(options);
      
      // 检查响应状态
      if (response.status !== 200) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      // 返回代币余额数组
      return response.data as TokenBalance[];
    } catch (error: any) {
      console.error('获取账户余额时出错:', error.message);
      
      // 处理具体错误类型
      if (error.response) {
        // API返回了错误响应
        console.error(`API错误: ${error.response.status}`, error.response.data);
        throw new Error(`Blockberry API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('无法连接到Blockberry API服务');
        throw new Error('无法连接到Blockberry API服务，请检查网络连接');
      }
      
      // 重新抛出原始错误
      throw error;
    }
  }
  
  /**
   * 获取账户余额汇总信息
   * @param address 账户地址
   * @returns 余额汇总信息，包含总美元价值和SUI余额
   */
  public async getAccountBalanceSummary(address: string): Promise<{
    totalUsdValue: number;
    suiBalance: number;
    suiUsdValue: number;
    tokensCount: number;
  }> {
    const balances = await this.getAccountBalance(address);
    
    // 初始化汇总信息
    let totalUsdValue = 0;
    let suiBalance = 0;
    let suiUsdValue = 0;
    
    // 计算总美元价值
    for (const token of balances) {
      if (token.balanceUsd) {
        totalUsdValue += token.balanceUsd;
      }
      
      // 记录SUI代币信息
      if (token.coinType === '0x2::sui::SUI') {
        suiBalance = token.balance;
        suiUsdValue = token.balanceUsd || 0;
      }
    }
    
    return {
      totalUsdValue,
      suiBalance,
      suiUsdValue,
      tokensCount: balances.length
    };
  }
} 