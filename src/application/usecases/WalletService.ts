import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { TEEManager } from '../../infrastructure/security/TEEManager';
import { PrivateKeyManager } from '../../infrastructure/security/PrivateKeyManager';
import { runQuery, getQuery } from '../../infrastructure/persistence/DatabaseSetup';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

/**
 * 钱包服务类，负责管理Sui区块链钱包
 */
export class WalletService {
  private teeManager: TEEManager;
  private privateKeyManager: PrivateKeyManager;
  
  /**
   * 创建一个新的钱包服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.teeManager = new TEEManager();
    this.privateKeyManager = new PrivateKeyManager(this.teeManager);
  }
  
  /**
   * 初始化钱包（如果不存在）
   */
  public async initializeWallet(): Promise<{ address: string }> {
    try {
      // 检查钱包是否已存在
      const existingWallet = await this.getWallet();
      
      if (existingWallet) {
        console.log('已存在钱包，无需创建新钱包。现有钱包地址:', existingWallet.address);
        return { address: existingWallet.address };
      }
      
      // 创建新钱包
      console.log('未找到钱包，正在创建新钱包...');
      
      // 生成新的SUI地址
      const keypair = new Ed25519Keypair();
      const address = keypair.getPublicKey().toSuiAddress();
      const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex');
      
      // 存储地址和私钥到数据库
      await runQuery(
        'INSERT INTO wallet (address, private_key) VALUES (?, ?)',
        [address, privateKey]
      );
      
      console.log('初始钱包创建成功，地址:', address);
      
      return { address };
    } catch (error) {
      console.error('创建初始钱包失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取钱包地址
   */
  public async getWalletAddress(): Promise<string | null> {
    try {
      const wallet = await this.getWallet();
      return wallet ? wallet.address : null;
    } catch (error) {
      console.error('获取钱包地址时出错:', error);
      return null;
    }
  }
  
  /**
   * 获取钱包信息
   * @returns 钱包信息，包括地址和创建时间
   */
  public async getWalletInfo(): Promise<{ success: boolean, address?: string, created_at?: string, error?: string }> {
    try {
      const walletInfo = await this.getWallet();
      
      if (walletInfo) {
        return {
          success: true,
          address: walletInfo.address,
          created_at: walletInfo.created_at
        };
      } else {
        return {
          success: false,
          error: '钱包未初始化'
        };
      }
    } catch (error) {
      console.error('获取钱包信息时出错:', error);
      return {
        success: false,
        error: `获取钱包信息时出错: ${error}`
      };
    }
  }
  
  /**
   * 从数据库获取钱包信息
   */
  private async getWallet(): Promise<{ id: number, address: string, private_key: string, created_at: string } | null> {
    try {
      const wallets = await getQuery('SELECT * FROM wallet LIMIT 1');
      return wallets.length > 0 ? wallets[0] : null;
    } catch (error) {
      console.error('获取钱包时出错:', error);
      return null;
    }
  }
} 