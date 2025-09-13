/**
 * 顧客データモデル
 */
export interface Customer {
  customerId: string;      // 顧客ID (自動採番: C00001)
  companyName: string;     // 会社名
  contactPerson?: string;  // 担当者名
  postalCode?: string;     // 郵便番号
  address: string;         // 住所
  email?: string;          // メールアドレス
  phone?: string;          // 電話番号
  createdAt: Date;         // 登録日
  updatedAt: Date;         // 更新日
}

/**
 * 顧客検索フィルター
 */
export interface CustomerFilter {
  companyName?: string;    // 会社名での検索
  keyword?: string;        // キーワード検索
}

/**
 * 顧客作成リクエスト
 */
export type CreateCustomerRequest = Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>;

/**
 * 顧客更新リクエスト
 */
export type UpdateCustomerRequest = Partial<Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>>;