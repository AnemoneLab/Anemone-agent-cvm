import { TEEManager } from './TEEManager';

/**
 * 私钥管理器类，负责安全地管理私钥
 */
export class PrivateKeyManager {
  private teeManager: TEEManager;

  /**
   * 创建一个新的私钥管理器实例
   * @param teeManager TEE管理器
   */
  constructor(teeManager: TEEManager) {
    this.teeManager = teeManager;
  }

  /**
   * 安全地处理私钥（将在TEE环境中使用）
   * @param privateKey 私钥
   * @param action 处理私钥的函数
   */
  public async securelyHandlePrivateKey<T>(
    privateKey: string,
    action: (privateKey: string) => Promise<T>
  ): Promise<T | null> {
    // 验证TEE环境
    if (!this.teeManager.performSecurityCheck()) {
      console.error('无法在非TEE环境下处理私钥');
      return null;
    }

    try {
      // 在实际产品中，应该对私钥进行额外的保护措施
      return await action(privateKey);
    } catch (error) {
      console.error('私钥操作失败:', error);
      return null;
    } finally {
      // 确保内存中不保留私钥数据
      // 实际产品中应该有更完善的内存清理机制
    }
  }
} 