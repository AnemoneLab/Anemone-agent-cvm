import { Profile, ProfileDTO } from './Profile';

/**
 * Profile存储库接口
 */
export interface ProfileRepository {
  /**
   * 初始化Profile配置
   * @param profileData Profile数据
   */
  initProfile(profileData: ProfileDTO): Promise<{ success: boolean, message: string, id?: number }>;
  
  /**
   * 获取当前Profile配置
   */
  getProfile(): Promise<Profile | null>;
} 