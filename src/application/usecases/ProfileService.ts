import { EventBus, AgentEventType } from '../../domain/events/EventBus';
import { Profile, ProfileDTO } from '../../domain/profile/Profile';
import { ProfileRepository } from '../../domain/profile/ProfileRepository';
import { SQLiteProfileRepository } from '../../infrastructure/persistence/SQLiteProfileRepository';
import { SuiConnector } from '../../infrastructure/blockchain/SuiConnector';
import { RoleData } from '../../domain/profile/RoleData';

/**
 * Profile配置服务类，负责管理Agent配置
 */
export class ProfileService {
  private profileRepository: ProfileRepository;
  private suiConnector: SuiConnector;
  
  /**
   * 创建一个新的Profile服务实例
   * @param eventBus 事件总线
   * @param rpcUrl Sui RPC URL (可选，默认使用mainnet)
   */
  constructor(
    private readonly eventBus: EventBus,
    rpcUrl: string = 'https://fullnode.mainnet.sui.io:443'
  ) {
    this.profileRepository = new SQLiteProfileRepository();
    this.suiConnector = new SuiConnector(rpcUrl);
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
  
  /**
   * 获取区块链上的Role对象数据
   */
  public async getRoleOnChainData(): Promise<{ success: boolean; role?: RoleData; skillDetails?: any[]; message?: string }> {
    try {
      console.log('[ProfileService] 开始获取Role链上数据');
      
      // 获取Profile配置，以便获取roleId
      const profileResult = await this.getProfile();
      console.log('[ProfileService] 获取Profile结果:', { 
        success: profileResult.success,
        hasProfile: profileResult.profile ? true : false
      });
      
      if (!profileResult.success || !profileResult.profile) {
        console.error('[ProfileService] 未找到配置文件数据');
        return {
          success: false,
          message: '未找到配置文件数据，无法获取Role对象'
        };
      }
      
      const roleId = profileResult.profile.role_id;
      console.log('[ProfileService] 从Profile获取到的roleId:', roleId);
      
      if (!roleId) {
        console.error('[ProfileService] 配置文件中未设置Role ID');
        return {
          success: false,
          message: '配置文件中未设置Role ID'
        };
      }
      
      // 通过SuiConnector获取Role对象数据
      console.log('[ProfileService] 开始从链上获取Role数据:', roleId);
      const roleData = await this.suiConnector.getRoleData(roleId);
      console.log('[ProfileService] 链上Role数据获取结果:', roleData ? '成功' : '失败'); 
      
      if (!roleData) {
        console.error('[ProfileService] 无法获取Role对象数据');
        return {
          success: false,
          message: `无法获取ID为 ${roleId} 的Role对象数据`
        };
      }
      
      console.log('[ProfileService] 成功获取Role数据, 余额:', roleData.balance.toString());
      
      // 获取技能详细信息
      const skillDetails: any[] = [];
      if (roleData.skills && roleData.skills.length > 0) {
        console.log(`[ProfileService] 开始获取${roleData.skills.length}个技能的详细信息`);
        
        // 使用Promise.all并行获取所有技能信息
        const skillPromises = roleData.skills.map(skillId => this.suiConnector.getSkillDetails(skillId));
        const skillResults = await Promise.all(skillPromises);
        
        // 过滤掉获取失败的技能，只保留成功获取的技能信息
        skillResults.forEach(skill => {
          if (skill) {
            skillDetails.push(skill);
          }
        });
        
        console.log(`[ProfileService] 成功获取${skillDetails.length}/${roleData.skills.length}个技能的详细信息`);
      } else {
        console.log('[ProfileService] Role没有关联的技能');
      }
      
      return {
        success: true,
        role: roleData,
        skillDetails
      };
    } catch (error) {
      console.error('[ProfileService] 获取Role对象数据时出错:', error);
      return {
        success: false,
        message: '获取Role对象数据时出错: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
} 