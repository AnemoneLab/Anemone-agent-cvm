import { Skill } from './Skill';

/**
 * 技能注册表类
 */
export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  
  /**
   * 创建一个新的技能注册表实例
   */
  constructor() {
    // 初始状态不注册任何技能，技能将从区块链动态加载
  }
  
  /**
   * 注册一个技能
   * @param skill 技能实例
   */
  public registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
  }
  
  /**
   * 注册多个技能
   * @param skills 技能实例数组
   */
  public registerSkills(skills: Skill[]): void {
    skills.forEach(skill => this.registerSkill(skill));
  }
  
  /**
   * 获取指定ID的技能
   * @param id 技能ID
   */
  public getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }
  
  /**
   * 获取所有已注册的技能
   */
  public getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * 根据技能ID移除技能
   * @param id 技能ID
   */
  public removeSkill(id: string): boolean {
    return this.skills.delete(id);
  }
  
  /**
   * 清除所有已注册的技能
   */
  public clearSkills(): void {
    this.skills.clear();
  }
  
  /**
   * 从区块链加载Skill（需要具体实现）
   * @param packageId 包ID
   */
  public async loadSkillsFromBlockchain(packageId: string): Promise<void> {
    // 具体从区块链加载Skill的实现将在基础设施层提供
    console.log(`将从区块链包 ${packageId} 加载技能。`);
  }
} 