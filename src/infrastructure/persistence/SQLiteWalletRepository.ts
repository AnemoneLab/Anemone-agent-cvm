import { Wallet, WalletDTO } from '../../domain/wallet/Wallet';
import { WalletRepository } from '../../domain/wallet/WalletRepository';
import { getDatabase, runQuery, getQuery, getOneQuery } from './DatabaseSetup';

/**
 * SQLite钱包存储库实现
 */
export class SQLiteWalletRepository implements WalletRepository {
  /**
   * 创建一个新钱包
   * @param walletData 钱包数据
   */
  public async createWallet(walletData: WalletDTO): Promise<{ success: boolean, id?: number }> {
    const query = `
      INSERT INTO wallet (address, private_key)
      VALUES (?, ?)
    `;
    
    try {
      const result: any = await runQuery(query, [walletData.address, walletData.private_key]);
      return { success: true, id: result.lastID };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return { success: false };
    }
  }
  
  /**
   * 根据地址获取钱包
   * @param address 钱包地址
   */
  public async getWalletByAddress(address: string): Promise<Wallet | null> {
    const query = `
      SELECT id, address, private_key, created_at 
      FROM wallet 
      WHERE address = ?
    `;
    
    try {
      const result = await getOneQuery(query, [address]);
      return result ? Wallet.fromDTO(result) : null;
    } catch (error) {
      console.error('Error getting wallet by address:', error);
      return null;
    }
  }
  
  /**
   * 获取所有钱包
   */
  public async getWallets(): Promise<Wallet[]> {
    const query = `
      SELECT id, address, private_key, created_at 
      FROM wallet
    `;
    
    try {
      const results = await getQuery(query);
      return results.map(result => Wallet.fromDTO(result));
    } catch (error) {
      console.error('Error getting wallets:', error);
      return [];
    }
  }
} 