/**
 * 区块链Role对象数据结构
 */
export interface RoleData {
  id: string;
  bot_nft_id: string;
  health: bigint;
  is_active: boolean;
  is_locked: boolean;
  last_epoch: bigint;
  inactive_epochs: bigint;
  balance: bigint;
  bot_address: string;
  skills: string[];
  app_id?: string;
} 