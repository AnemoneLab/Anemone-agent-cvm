import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { TEEManager } from '../../infrastructure/security/TEEManager';
import { PrivateKeyManager } from '../../infrastructure/security/PrivateKeyManager';
import { Wallet, WalletDTO } from '../../domain/wallet/Wallet';
import { WalletRepository } from '../../domain/wallet/WalletRepository';
import { SQLiteWalletRepository } from '../../infrastructure/persistence/SQLiteWalletRepository';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * 钱包服务类，负责管理Sui区块链钱包
 */
export class WalletService {
  private teeManager: TEEManager;
  private privateKeyManager: PrivateKeyManager;
  private walletRepository: WalletRepository;
  
  /**
   * 创建一个新的钱包服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.teeManager = new TEEManager();
    this.privateKeyManager = new PrivateKeyManager(this.teeManager);
    this.walletRepository = new SQLiteWalletRepository();
  }
  
  /**
   * 初始化钱包（如果不存在）
   */
  public async initializeWallet(): Promise<{ address: string }> {
    try {
      // 检查钱包是否已存在
      const wallets = await this.walletRepository.getWallets();
      const existingWallet = wallets.length > 0 ? wallets[0] : null;
      
      if (existingWallet) {
        console.log('已存在钱包，无需创建新钱包。现有钱包地址:', existingWallet.getAddress());
        return { address: existingWallet.getAddress() };
      }
      
      // 创建新钱包
      console.log('未找到钱包，正在创建新钱包...');
      
      // 生成新的SUI地址
      const keypair = new Ed25519Keypair();
      const address = keypair.getPublicKey().toSuiAddress();
      const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex');
      
      // 存储地址和私钥到数据库
      const walletDTO: WalletDTO = {
        address,
        private_key: privateKey
      };
      
      const result = await this.walletRepository.createWallet(walletDTO);
      
      if (!result.success) {
        throw new Error('创建钱包失败');
      }
      
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
      const wallets = await this.walletRepository.getWallets();
      const wallet = wallets.length > 0 ? wallets[0] : null;
      
      return wallet ? wallet.getAddress() : null;
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
      const wallets = await this.walletRepository.getWallets();
      const wallet = wallets.length > 0 ? wallets[0] : null;
      
      if (wallet) {
        return {
          success: true,
          address: wallet.getAddress(),
          created_at: wallet.getCreatedAtISOString()
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
} 