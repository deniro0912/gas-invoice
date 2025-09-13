/**
 * 請求書明細データモデル
 */
export interface InvoiceItem {
  itemId: string;         // 明細ID
  invoiceNumber: string;  // 請求書番号
  itemName: string;       // 品目名（「制作費」固定）
  quantity: number;       // 数量（1固定）
  unit: string;           // 単位（「式」固定）
  unitPrice: number;      // 単価
  taxRate: number;        // 税率（0.10固定）
  amount: number;         // 金額
}

/**
 * 請求書ステータス
 */
export enum InvoiceStatus {
  DRAFT = 'draft',        // 下書き
  ISSUED = 'issued',      // 発行済み
  CANCELLED = 'cancelled' // キャンセル
}

/**
 * 請求書データモデル
 */
export interface Invoice {
  invoiceNumber: string;   // 請求書番号 (YYYYMM-001)
  issueDate: Date;        // 発行日
  customerId: string;     // 顧客ID
  advertiser: string;     // 広告主
  subject: string;        // 件名
  items: InvoiceItem[];   // 明細（常に1件）
  subtotal: number;       // 小計
  taxAmount: number;      // 税額
  totalAmount: number;    // 合計金額
  notes?: string;         // 備考
  status: InvoiceStatus;  // ステータス
  pdfUrl?: string;        // PDF URL
  createdAt: Date;        // 作成日
  updatedAt: Date;        // 更新日
}

/**
 * 請求書検索フィルター
 */
export interface InvoiceFilter {
  dateFrom?: Date;        // 発行日（開始）
  dateTo?: Date;          // 発行日（終了）
  customerId?: string;    // 顧客ID
  advertiser?: string;    // 広告主
  status?: InvoiceStatus; // ステータス
}

/**
 * 請求書作成リクエスト
 */
export interface CreateInvoiceRequest {
  customerId: string;     // 顧客ID
  advertiser: string;     // 広告主
  subject: string;        // 件名
  unitPrice: number;      // 制作費金額
  notes?: string;         // 備考
}

/**
 * 請求書更新リクエスト
 */
export type UpdateInvoiceRequest = Partial<Omit<Invoice, 'invoiceNumber' | 'items' | 'createdAt' | 'updatedAt'>>;

/**
 * 請求書検索結果
 */
export interface InvoiceSearchResult {
  invoices: Invoice[];
  totalCount: number;
  hasNext: boolean;
}