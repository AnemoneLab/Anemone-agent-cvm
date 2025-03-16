import { SuiConnector } from './SuiConnector';
import { Skill, SkillDocumentation } from '../../domain/skill/Skill';

/**
 * 技能获取器类，负责从区块链加载技能
 */
export class SkillFetcher {
  private suiConnector: SuiConnector;

  /**
   * 创建一个新的技能获取器实例
   * @param suiConnector Sui连接器
   */
  constructor(suiConnector: SuiConnector) {
    this.suiConnector = suiConnector;
  }

  /**
   * 从区块链加载技能（暂未实现，仅为占位）
   * @param packageId 包ID
   */
  public async fetchSkills(packageId: string): Promise<Skill[]> {
    console.log(`[SkillFetcher] 从包 ${packageId} 加载技能（尚未实现）`);
    return [];
  }
} 