import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { Profile, ProfileDTO } from '../../domain/profile/Profile';
import { ProfileRepository } from '../../domain/profile/ProfileRepository';
import { SQLiteProfileRepository } from '../../infrastructure/persistence/SQLiteProfileRepository';

/**
 * Profile配置服务类，负责管理Agent配置
 */
export class ProfileService {
  private profileRepository: ProfileRepository;
  
  /**
   * 创建一个新的Profile服务实例
   * @param eventBus 事件总线
   */
  constructor(private readonly eventBus: EventBus) {
    this.profileRepository = new SQLiteProfileRepository();
  }
  
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
      // 创建ProfileDTO对象
      const profileDTO: ProfileDTO = {
        role_id: roleId,
        package_id: packageId
      };
      
      // 调用存储库初始化Profile
      const result = await this.profileRepository.initProfile(profileDTO);
      
      // 如果初始化成功，发布Profile更新事件
      if (result.success) {
        this.eventBus.publish(AgentEventType.PROFILE_UPDATED, {
          roleId,
          packageId
        });
      }
      
      return result;
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
      const profile = await this.profileRepository.getProfile();
      
      if (!profile) {
        return {
          success: false,
          message: '未找到配置文件数据'
        };
      }
      
      return {
        success: true,
        profile: profile.toDTO()
      };
    } catch (error) {
      console.error('获取Profile时出错:', error);
      return {
        success: false,
        message: '获取Profile时出错'
      };
    }
  }
} 