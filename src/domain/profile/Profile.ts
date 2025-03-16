/**
 * Profile实体类
 */
export class Profile {
  /**
   * 创建一个新的Profile实例
   * @param id Profile ID（数据库中的ID）
   * @param roleId 区块链上的Role ID
   * @param packageId 区块链上的Package ID
   * @param createdAt 创建时间
   * @param updatedAt 更新时间
   */
  constructor(
    public readonly id: number | undefined,
    public readonly roleId: string,
    public readonly packageId: string,
    public readonly createdAt: Date | undefined,
    public readonly updatedAt: Date | undefined
  ) {}

  /**
   * 获取创建时间的ISO字符串
   */
  public getCreatedAtISOString(): string | undefined {
    return this.createdAt?.toISOString();
  }

  /**
   * 获取更新时间的ISO字符串
   */
  public getUpdatedAtISOString(): string | undefined {
    return this.updatedAt?.toISOString();
  }

  /**
   * 从数据传输对象创建Profile实体
   * @param dto 数据传输对象
   */
  public static fromDTO(dto: ProfileDTO): Profile {
    return new Profile(
      dto.id,
      dto.role_id,
      dto.package_id,
      dto.created_at ? new Date(dto.created_at) : undefined,
      dto.updated_at ? new Date(dto.updated_at) : undefined
    );
  }

  /**
   * 转换为数据传输对象
   */
  public toDTO(): ProfileDTO {
    return {
      id: this.id,
      role_id: this.roleId,
      package_id: this.packageId,
      created_at: this.createdAt?.toISOString(),
      updated_at: this.updatedAt?.toISOString()
    };
  }
}

/**
 * Profile数据传输对象接口
 */
export interface ProfileDTO {
  id?: number;
  role_id: string;
  package_id: string;
  created_at?: string;
  updated_at?: string;
} 