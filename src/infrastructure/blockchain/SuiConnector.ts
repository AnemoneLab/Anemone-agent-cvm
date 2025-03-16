/**
 * Sui区块链连接器类，负责与Sui区块链交互
 */
export class SuiConnector {
  private rpcUrl: string;

  /**
   * 创建一个新的Sui连接器实例
   * @param rpcUrl Sui RPC URL
   */
  constructor(rpcUrl: string = 'https://fullnode.devnet.sui.io:443') {
    this.rpcUrl = rpcUrl;
  }

  /**
   * 获取当前RPC URL
   */
  public getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * 设置RPC URL
   * @param rpcUrl 新的RPC URL
   */
  public setRpcUrl(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }

  /**
   * 从区块链获取Skills（暂未实现，仅为占位）
   * @param packageId 包ID
   */
  public async getSkills(packageId: string): Promise<any[]> {
    console.log(`[SuiConnector] 将从包 ${packageId} 加载技能（尚未实现）`);
    return [];
  }
} 