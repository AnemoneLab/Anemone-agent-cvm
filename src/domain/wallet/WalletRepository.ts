import { Wallet, WalletDTO } from './Wallet';

/**
 * 钱包存储库接口
 */
export interface WalletRepository {
  /**
   * 创建一个新钱包
   * @param walletData 钱包数据
   */
  createWallet(walletData: WalletDTO): Promise<{ success: boolean, id?: number }>;
  
  /**
   * 根据地址获取钱包
   * @param address 钱包地址
   */
  getWalletByAddress(address: string): Promise<Wallet | null>;
  
  /**
   * 获取所有钱包
   */
  getWallets(): Promise<Wallet[]>;
} 