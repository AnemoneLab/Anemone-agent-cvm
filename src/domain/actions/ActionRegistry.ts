import { Action } from './Action';
import { BalanceWithdraw } from './financialActions/BalanceWithdraw';
import { ProfileUpdate } from './systemActions/ProfileUpdate';

/**
 * 代理上下文接口，提供权限验证
 */
export interface AgentContext {
  /**
   * 检查是否具有指定权限
   * @param permission 权限名称
   */
  hasPermission(permission: string): boolean;
}

/**
 * Action注册表类，管理系统中的所有预定义Action
 */
export class ActionRegistry {
  private actions: Map<string, Action> = new Map();
  
  /**
   * 创建一个新的操作注册表实例
   */
  constructor() {
    this.registerSystemActions();
  }
  
  /**
   * 注册系统预定义操作
   */
  private registerSystemActions(): void {
    // 注册财务操作
    this.registerAction(new BalanceWithdraw());
    
    // 注册系统操作
    this.registerAction(new ProfileUpdate());
  }
  
  /**
   * 注册一个Action
   * @param action Action实例
   */
  public registerAction(action: Action): void {
    this.actions.set(action.id, action);
  }
  
  /**
   * 获取指定ID的Action
   * @param actionId ActionID
   */
  public getAction(actionId: string): Action | undefined {
    return this.actions.get(actionId);
  }
  
  /**
   * 获取所有已注册的Action ID列表
   */
  public getActionIds(): string[] {
    return Array.from(this.actions.keys());
  }
  
  /**
   * 获取所有已注册的Action
   */
  public getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }
  
  /**
   * 检查是否可以执行指定的Action
   * @param actionId ActionID
   * @param agentContext 代理上下文
   */
  public canExecute(actionId: string, agentContext: AgentContext): boolean {
    const action = this.getAction(actionId);
    if (!action) return false;
    
    return action.requiredPermissions.every(
      permission => agentContext.hasPermission(permission)
    );
  }
} 