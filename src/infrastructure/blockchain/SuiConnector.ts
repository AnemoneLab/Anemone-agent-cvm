/**
 * Sui区块链连接器类，负责与Sui区块链交互
 */
import { SuiClient } from '@mysten/sui/client';
import { RoleData } from '../../domain/profile/RoleData';

export class SuiConnector {
  private rpcUrl: string;
  private suiClient: SuiClient;

  /**
   * 创建一个新的Sui连接器实例
   * @param rpcUrl Sui RPC URL
   */
  constructor(rpcUrl: string = 'https://fullnode.mainnet.sui.io:443') {
    this.rpcUrl = rpcUrl;
    this.suiClient = new SuiClient({ url: this.rpcUrl });
  }

  /**
   * 获取当前RPC URL
   */
  public getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * 设置RPC URL
   * @param rpcUrl 新的RPC URL
   */
  public setRpcUrl(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
    this.suiClient = new SuiClient({ url: this.rpcUrl });
  }

  /**
   * 获取Role对象数据
   * @param roleId Role对象ID
   * @returns Role对象数据或undefined（如果获取失败）
   */
  public async getRoleData(roleId: string): Promise<RoleData | undefined> {
    try {
      console.log(`[SuiConnector] 正在获取Role对象数据: ${roleId}`);
      console.log(`[SuiConnector] 使用RPC URL: ${this.rpcUrl}`);
      
      // 记录请求开始时间，用于计算耗时
      const startTime = Date.now();
      
      const response = await this.suiClient.getObject({
        id: roleId,
        options: {
          showContent: true,
          showOwner: true
        }
      });
      
      const elapsedTime = Date.now() - startTime;
      console.log(`[SuiConnector] 获取Role数据请求耗时: ${elapsedTime}ms`);
      console.log(`[SuiConnector] 获取Role数据响应状态:`, {
        hasData: !!response.data,
        hasContent: response.data && !!response.data.content,
        dataType: response.data?.content?.dataType
      });
      
      // 检查响应是否有效
      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        console.error("[SuiConnector] SUI API返回的Role数据格式不正确", response);
        return undefined;
      }
      
      // 类型断言处理，确保能够正确访问moveObject的fields
      const fields = response.data.content.fields as Record<string, any>;
      if (!fields) {
        console.error("[SuiConnector] Role对象没有fields");
        return undefined;
      }

      console.log(`[SuiConnector] 获取到Role对象fields: ${Object.keys(fields).join(', ')}`);

      // 提取bot_nft_id
      let bot_nft_id = '';
      if (fields.bot_nft_id) {
        if (typeof fields.bot_nft_id === 'string') {
          bot_nft_id = fields.bot_nft_id;
        } else if (fields.bot_nft_id.id) {
          bot_nft_id = fields.bot_nft_id.id;
        }
      }
      console.log(`[SuiConnector] 提取的bot_nft_id: ${bot_nft_id}`);

      // 提取skills数组
      const skills: string[] = [];
      if (fields.skills && Array.isArray(fields.skills)) {
        for (const skill of fields.skills) {
          if (typeof skill === 'string') {
            skills.push(skill);
          } else if (skill.id) {
            skills.push(skill.id);
          }
        }
      }
      console.log(`[SuiConnector] 提取的skills数量: ${skills.length}`);

      // 检查余额字段 - 增强版，适应不同的余额字段格式
      let balanceValue = BigInt(0);
      const hasBalanceField = !!fields.balance;
      
      if (hasBalanceField) {
        // 情况1: balance是一个对象，包含value属性
        if (fields.balance && typeof fields.balance === 'object' && fields.balance.value) {
          balanceValue = BigInt(fields.balance.value);
        } 
        // 情况2: balance直接是一个字符串或数字
        else if (fields.balance && (typeof fields.balance === 'string' || typeof fields.balance === 'number')) {
          balanceValue = BigInt(fields.balance);
        }
        // 情况3: 其他未知格式，记录下来以便调试
        else {
          console.log('[SuiConnector] 余额字段格式未知:', JSON.stringify(fields.balance));
        }
      }
      
      console.log(`[SuiConnector] 余额字段存在: ${hasBalanceField}, 值: ${balanceValue.toString()}`);

      // 提取Role详细信息
      const roleData: RoleData = {
        id: roleId,
        bot_nft_id: bot_nft_id,
        health: BigInt(fields.health || 0),
        is_active: fields.is_active || false,
        is_locked: fields.is_locked || false,
        last_epoch: BigInt(fields.last_epoch || 0),
        inactive_epochs: BigInt(fields.inactive_epochs || 0),
        balance: balanceValue,
        bot_address: fields.bot_address || '',
        skills: skills,
        app_id: fields.app_id || undefined
      };
      
      console.log(`[SuiConnector] 成功构建RoleData对象, id: ${roleData.id}, 余额: ${roleData.balance.toString()}`);
      return roleData;
    } catch (error) {
      console.error('[SuiConnector] 获取Role数据出错:', error);
      // 添加更详细的错误信息
      console.error('[SuiConnector] 错误详情:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        roleId
      });
      return undefined;
    }
  }

  /**
   * 从区块链获取Skills（暂未实现，仅为占位）
   * @param packageId 包ID
   */
  public async getSkills(packageId: string): Promise<any[]> {
    console.log(`[SuiConnector] 将从包 ${packageId} 加载技能（尚未实现）`);
    return [];
  }

  /**
   * 获取技能详细信息
   * @param skillId 技能ID
   * @returns 技能详细信息或undefined（如果获取失败）
   */
  public async getSkillDetails(skillId: string): Promise<any | undefined> {
    try {
      console.log(`[SuiConnector] 正在获取Skill对象数据: ${skillId}`);
      
      // 记录请求开始时间，用于计算耗时
      const startTime = Date.now();
      
      const response = await this.suiClient.getObject({
        id: skillId,
        options: {
          showContent: true
        }
      });
      
      const elapsedTime = Date.now() - startTime;
      console.log(`[SuiConnector] 获取Skill数据请求耗时: ${elapsedTime}ms`);
      
      // 检查响应是否有效
      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        console.error("[SuiConnector] SUI API返回的Skill数据格式不正确", response);
        return undefined;
      }
      
      // 类型断言处理，确保能够正确访问moveObject的fields
      const fields = response.data.content.fields as Record<string, any>;
      if (!fields) {
        console.error("[SuiConnector] Skill对象没有fields");
        return undefined;
      }
      
      console.log(`[SuiConnector] 获取到Skill对象fields: ${Object.keys(fields).join(', ')}`);
      
      // 构建技能信息对象
      const skillDetails = {
        id: skillId,
        name: fields.name || '未知技能名称',
        description: fields.description || '无描述',
        endpoint: fields.endpoint || '',
        doc: fields.doc || '',
        github_repo: fields.github_repo || '',
        docker_image: fields.docker_image || '',
        quote: fields.quote || '',
        log_url: fields.log_url || '',
        fee: fields.fee ? Number(fields.fee) : 0,
        author: fields.author || '',
        is_enabled: fields.is_enabled === true
      };
      
      console.log(`[SuiConnector] 成功构建Skill详细信息对象: ${skillDetails.name}`);
      return skillDetails;
    } catch (error) {
      console.error('[SuiConnector] 获取Skill数据出错:', error);
      // 添加更详细的错误信息
      console.error('[SuiConnector] 错误详情:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        skillId
      });
      return undefined;
    }
  }
} 