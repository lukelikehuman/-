export const DONG_CHI_CATEGORIES = [
  '蛋品',
  '鮭魚',
  '牛肉',
  '雞肉',
  '米行',
  '蔬果行',
  '美食家食材通路有限公司',
  '988廚房',
  '德品',
  '豬肉',
  '雜項',
] as const;

export type ExpenseCategory = typeof DONG_CHI_CATEGORIES[number];

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed';

export type Branch = '五甲店' | '美麗島店';

export interface ExpenseItem {
  id: string;
  receiptNumber: string;
  merchantName: string;
  branch: Branch;
  date: string;
  category: ExpenseCategory;
  amount: number;
  itemDetails: string;
  submitter: string;
  paymentMethod: '現金零用金' | '主管信用卡' | '公務轉帳' | '員工代墊款';
  receiptImageUrl?: string;
  status: ExpenseStatus;
  notes?: string;
  auditComment?: string;
  createdAt: string;
}

export interface CategoryStat {
  category: ExpenseCategory;
  count: number;
  totalAmount: number;
  color: string;
}
