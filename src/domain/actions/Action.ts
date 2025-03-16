/**
 * 操作结果接口
 */
export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 预定义操作接口
 */
export interface Action {
  /**
   * 操作ID
   */
  readonly id: string;
  
  /**
   * 操作所需权限
   */
  readonly requiredPermissions: string[];
  
  /**
   * 执行操作
   * @param params 操作参数
   */
  execute(params: any): Promise<ActionResult>;
} 