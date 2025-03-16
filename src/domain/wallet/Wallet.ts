/**
 * 钱包实体类
 */
export class Wallet {
  /**
   * 创建一个新的钱包实例
   * @param id 钱包ID（数据库中的ID）
   * @param address 钱包地址
   * @param privateKey 私钥
   * @param createdAt 创建时间
   */
  constructor(
    public readonly id: number | undefined,
    public readonly address: string,
    private readonly privateKey: string,
    public readonly createdAt: Date | undefined
  ) {}

  /**
   * 获取创建时间的ISO字符串
   */
  public getCreatedAtISOString(): string | undefined {
    return this.createdAt?.toISOString();
  }

  /**
   * 获取钱包地址
   */
  public getAddress(): string {
    return this.address;
  }

  /**
   * 获取钱包私钥（仅在TEE环境中使用）
   */
  protected getPrivateKey(): string {
    return this.privateKey;
  }

  /**
   * 从数据传输对象创建钱包实体
   * @param dto 数据传输对象
   */
  public static fromDTO(dto: WalletDTO): Wallet {
    return new Wallet(
      dto.id,
      dto.address,
      dto.private_key,
      dto.created_at ? new Date(dto.created_at) : undefined
    );
  }

  /**
   * 转换为数据传输对象
   */
  public toDTO(): WalletDTO {
    return {
      id: this.id,
      address: this.address,
      private_key: this.privateKey,
      created_at: this.createdAt?.toISOString()
    };
  }
}

/**
 * 钱包数据传输对象接口
 */
export interface WalletDTO {
  id?: number;
  address: string;
  private_key: string;
  created_at?: string;
} 