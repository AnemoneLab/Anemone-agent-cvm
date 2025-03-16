import { Profile, ProfileDTO } from '../../domain/profile/Profile';
import { ProfileRepository } from '../../domain/profile/ProfileRepository';
import { getDatabase, runQuery, getOneQuery } from './DatabaseSetup';

/**
 * SQLite配置文件存储库实现
 */
export class SQLiteProfileRepository implements ProfileRepository {
  /**
   * 初始化Profile配置
   * @param profileData Profile数据
   */
  public async initProfile(profileData: ProfileDTO): Promise<{ success: boolean, message: string, id?: number }> {
    try {
      // 检查是否已存在配置
      const existingProfile = await this.getProfile();
      
      if (existingProfile) {
        return { 
          success: false, 
          message: '配置文件已存在，不允许重复初始化' 
        };
      }
      
      // 插入新配置
      const query = `
        INSERT INTO profile (role_id, package_id)
        VALUES (?, ?)
      `;
      
      const result: any = await runQuery(query, [profileData.role_id, profileData.package_id]);
      
      return { 
        success: true, 
        message: '配置文件初始化成功', 
        id: result.lastID 
      };
    } catch (error) {
      console.error('Error initializing profile:', error);
      return { 
        success: false, 
        message: '初始化配置文件时出错' 
      };
    }
  }
  
  /**
   * 获取当前Profile配置
   */
  public async getProfile(): Promise<Profile | null> {
    const query = `
      SELECT id, role_id, package_id, created_at, updated_at
      FROM profile
      LIMIT 1
    `;
    
    try {
      const result = await getOneQuery(query);
      return result ? Profile.fromDTO(result) : null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }
} 