import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { runQuery, getQuery } from '../../infrastructure/persistence/DatabaseSetup';

/**
 * Profile配置服务类，负责管理Agent配置
 */
export class ProfileService {
  /**
   * 创建一个新的Profile服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {}
  
  /**
   * 初始化Profile配置
   * @param roleId Role ID
   * @param packageId Package ID
   */
  public async initProfile(
    roleId: string,
    packageId: string
  ): Promise<{ success: boolean; message: string; id?: number }> {
    try {
      // 检查是否已存在Profile配置
      const existingProfile = await this.getProfileData();
      
      if (existingProfile) {
        return {
          success: false,
          message: '配置文件已存在，不允许重复初始化'
        };
      }
      
      // 保存Profile配置到数据库
      const timestamp = new Date().toISOString();
      const result = await runQuery(
        'INSERT INTO profile (role_id, package_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [roleId, packageId, timestamp, timestamp]
      );
      
      // 发布Profile更新事件
      this.eventBus.publish(AgentEventType.PROFILE_UPDATED, {
        roleId,
        packageId
      });
      
      return {
        success: true,
        message: '配置文件初始化成功',
        id: result.lastID
      };
    } catch (error) {
      console.error('初始化Profile时出错:', error);
      return {
        success: false,
        message: '初始化Profile时出错'
      };
    }
  }
  
  /**
   * 获取Profile配置
   */
  public async getProfile(): Promise<{ success: boolean; profile?: any; message?: string }> {
    try {
      const profile = await this.getProfileData();
      
      if (!profile) {
        return {
          success: false,
          message: '未找到配置文件数据'
        };
      }
      
      return {
        success: true,
        profile
      };
    } catch (error) {
      console.error('获取Profile时出错:', error);
      return {
        success: false,
        message: '获取Profile时出错'
      };
    }
  }
  
  /**
   * 从数据库获取Profile数据
   */
  private async getProfileData(): Promise<any | null> {
    try {
      const profiles = await getQuery('SELECT * FROM profile LIMIT 1');
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('查询Profile数据时出错:', error);
      return null;
    }
  }
} 