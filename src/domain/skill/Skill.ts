/**
 * Skill执行结果接口
 */
export interface SkillResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Skill参数定义
 */
export interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * 技能文档接口
 */
export interface SkillDocumentation {
  /**
   * 技能名称
   */
  name: string;
  
  /**
   * 技能描述
   */
  description: string;
  
  /**
   * 技能版本
   */
  version: string;
  
  /**
   * 输入参数文档
   */
  inputSchema: any;
  
  /**
   * 输出结果文档
   */
  outputSchema: any;
  
  /**
   * 示例输入
   */
  exampleInputs?: any[];
  
  /**
   * 示例输出
   */
  exampleOutputs?: any[];
}

/**
 * 技能接口
 */
export interface Skill {
  /**
   * 技能ID
   */
  readonly id: string;
  
  /**
   * 技能文档
   */
  readonly documentation: SkillDocumentation;
  
  /**
   * 执行技能
   * @param params 技能参数
   */
  execute(params: any): Promise<SkillResult>;
} 