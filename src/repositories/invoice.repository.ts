/**
 * 請求書データリポジトリ
 * スプレッドシートとの請求書データのやり取りを担当
 */

import { 
  Invoice, 
  InvoiceItem, 
  InvoiceStatus, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  InvoiceFilter 
} from '../models/invoice.model';
import { getSpreadsheetConfig } from '../config';
import { logInfo, logWarn, logError } from '../utils/logger';
import { 
  SpreadsheetError, 
  InvoiceError, 
  ErrorCode, 
  handleError,
  withRetry 
} from '../utils/error-handler';

/**
 * 請求書リポジトリクラス
 */
export class InvoiceRepository {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private invoiceSheet: GoogleAppsScript.Spreadsheet.Sheet;
  private detailSheet: GoogleAppsScript.Spreadsheet.Sheet;
  private config = getSpreadsheetConfig();

  constructor(spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    
    if (!this.spreadsheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_ACCESS_ERROR,
        'アクティブなスプレッドシートが見つかりません',
        'InvoiceRepository'
      );
    }

    // 請求書データシートを取得
    const invoiceSheet = this.spreadsheet.getSheetByName(this.config.invoiceSheetName);
    if (!invoiceSheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_SHEET_NOT_FOUND,
        `請求書データシート「${this.config.invoiceSheetName}」が見つかりません`,
        'InvoiceRepository'
      );
    }
    this.invoiceSheet = invoiceSheet;

    // 請求明細シートを取得
    const detailSheet = this.spreadsheet.getSheetByName(this.config.invoiceDetailSheetName);
    if (!detailSheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_SHEET_NOT_FOUND,
        `請求明細シート「${this.config.invoiceDetailSheetName}」が見つかりません`,
        'InvoiceRepository'
      );
    }
    this.detailSheet = detailSheet;
  }

  /**
   * 請求書を作成
   */
  public async create(request: CreateInvoiceRequest): Promise<Invoice> {
    logInfo('請求書作成開始', request, 'InvoiceRepository.create');
    
    return withRetry(async () => {
      try {
        // 請求書番号を生成
        const invoiceNumber = await this.generateInvoiceNumber();
        
        // 重複チェック
        const existingInvoice = await this.findByNumber(invoiceNumber);
        if (existingInvoice) {
          throw new InvoiceError(
            ErrorCode.INVOICE_DUPLICATE,
            `請求書番号「${invoiceNumber}」は既に存在します`,
            'InvoiceRepository.create',
            { invoiceNumber }
          );
        }

        const now = new Date();
        
        // 明細データ作成（制作費固定）
        const itemId = await this.generateItemId(invoiceNumber);
        const taxRate = 0.10; // 税率10%固定
        const amount = Math.floor(request.unitPrice * (1 + taxRate));
        const taxAmount = amount - request.unitPrice;
        
        const item: InvoiceItem = {
          itemId,
          invoiceNumber,
          itemName: '制作費', // 固定
          quantity: 1,        // 固定
          unit: '式',         // 固定
          unitPrice: request.unitPrice,
          taxRate,
          amount
        };

        // 請求書作成
        const invoice: Invoice = {
          invoiceNumber,
          issueDate: now,
          customerId: request.customerId,
          advertiser: request.advertiser,
          subject: request.subject,
          items: [item],
          subtotal: request.unitPrice,
          taxAmount,
          totalAmount: amount,
          notes: request.notes,
          status: InvoiceStatus.DRAFT,
          createdAt: now,
          updatedAt: now
        };

        // 請求書データをスプレッドシートに追加
        await this.insertInvoiceData(invoice);
        
        // 明細データをスプレッドシートに追加
        await this.insertItemData(item);
        
        logInfo('請求書作成完了', { invoiceNumber }, 'InvoiceRepository.create');
        return invoice;

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.create');
        logError('請求書作成失敗', appError, 'InvoiceRepository.create');
        throw appError;
      }
    }, 'InvoiceRepository.create');
  }

  /**
   * 請求書番号で検索
   */
  public async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return withRetry(async () => {
      try {
        const data = this.invoiceSheet.getDataRange().getValues();
        const headerRow = data[0];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === invoiceNumber) {
            const invoice = this.rowDataToInvoice(row, headerRow);
            // 明細データを取得
            invoice.items = await this.getInvoiceItems(invoiceNumber);
            return invoice;
          }
        }
        
        return null;

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.findByNumber');
        logError('請求書検索失敗', appError, 'InvoiceRepository.findByNumber');
        throw appError;
      }
    }, 'InvoiceRepository.findByNumber');
  }

  /**
   * 顧客IDで請求書検索
   */
  public async findByCustomerId(customerId: string): Promise<Invoice[]> {
    return withRetry(async () => {
      try {
        const data = this.invoiceSheet.getDataRange().getValues();
        const headerRow = data[0];
        const invoices: Invoice[] = [];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[2] === customerId) { // 顧客IDは3番目の列
            const invoice = this.rowDataToInvoice(row, headerRow);
            invoice.items = await this.getInvoiceItems(invoice.invoiceNumber);
            invoices.push(invoice);
          }
        }
        
        return invoices;

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.findByCustomerId');
        logError('顧客別請求書検索失敗', appError, 'InvoiceRepository.findByCustomerId');
        throw appError;
      }
    }, 'InvoiceRepository.findByCustomerId');
  }

  /**
   * 全請求書取得
   */
  public async findAll(): Promise<Invoice[]> {
    return withRetry(async () => {
      try {
        const data = this.invoiceSheet.getDataRange().getValues();
        
        if (data.length <= 1) {
          return []; // ヘッダーのみの場合
        }

        const headerRow = data[0];
        const invoices: Invoice[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0]) { // 請求書番号がある行のみ処理
            const invoice = this.rowDataToInvoice(row, headerRow);
            invoice.items = await this.getInvoiceItems(invoice.invoiceNumber);
            invoices.push(invoice);
          }
        }

        logInfo(`全請求書取得完了`, { count: invoices.length }, 'InvoiceRepository.findAll');
        return invoices;

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.findAll');
        logError('全請求書取得失敗', appError, 'InvoiceRepository.findAll');
        throw appError;
      }
    }, 'InvoiceRepository.findAll');
  }

  /**
   * 条件付き検索
   */
  public async findByFilter(filter: InvoiceFilter): Promise<Invoice[]> {
    return withRetry(async () => {
      try {
        const allInvoices = await this.findAll();
        
        return allInvoices.filter(invoice => {
          // 発行日フィルター
          if (filter.dateFrom && invoice.issueDate < filter.dateFrom) {
            return false;
          }
          if (filter.dateTo && invoice.issueDate > filter.dateTo) {
            return false;
          }

          // 顧客IDフィルター
          if (filter.customerId && invoice.customerId !== filter.customerId) {
            return false;
          }

          // 広告主フィルター
          if (filter.advertiser && 
              !invoice.advertiser.toLowerCase().includes(filter.advertiser.toLowerCase())) {
            return false;
          }

          // ステータスフィルター
          if (filter.status && invoice.status !== filter.status) {
            return false;
          }

          return true;
        });

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.findByFilter');
        logError('条件付き請求書検索失敗', appError, 'InvoiceRepository.findByFilter');
        throw appError;
      }
    }, 'InvoiceRepository.findByFilter');
  }

  /**
   * 請求書更新
   */
  public async update(invoiceNumber: string, request: UpdateInvoiceRequest): Promise<Invoice | null> {
    logInfo('請求書更新開始', { invoiceNumber, request }, 'InvoiceRepository.update');
    
    return withRetry(async () => {
      try {
        const data = this.invoiceSheet.getDataRange().getValues();
        const headerRow = data[0];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === invoiceNumber) {
            // 既存データを取得
            const existingInvoice = this.rowDataToInvoice(row, headerRow);
            existingInvoice.items = await this.getInvoiceItems(invoiceNumber);
            
            // 更新データをマージ
            const updatedInvoice: Invoice = {
              ...existingInvoice,
              ...request,
              invoiceNumber, // 番号は変更不可
              updatedAt: new Date()
            };

            // スプレッドシートを更新
            const values = this.invoiceToRowData(updatedInvoice);
            this.invoiceSheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
            
            logInfo('請求書更新完了', { invoiceNumber }, 'InvoiceRepository.update');
            return updatedInvoice;
          }
        }
        
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」が見つかりません`,
          'InvoiceRepository.update',
          { invoiceNumber }
        );

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.update');
        logError('請求書更新失敗', appError, 'InvoiceRepository.update');
        throw appError;
      }
    }, 'InvoiceRepository.update');
  }

  /**
   * 請求書削除
   */
  public async delete(invoiceNumber: string): Promise<boolean> {
    logInfo('請求書削除開始', { invoiceNumber }, 'InvoiceRepository.delete');
    
    return withRetry(async () => {
      try {
        // 明細データを先に削除
        await this.deleteInvoiceItems(invoiceNumber);
        
        // 請求書データを削除
        const data = this.invoiceSheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === invoiceNumber) {
            this.invoiceSheet.deleteRow(i + 1);
            logInfo('請求書削除完了', { invoiceNumber }, 'InvoiceRepository.delete');
            return true;
          }
        }
        
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」が見つかりません`,
          'InvoiceRepository.delete',
          { invoiceNumber }
        );

      } catch (error) {
        const appError = handleError(error, 'InvoiceRepository.delete');
        logError('請求書削除失敗', appError, 'InvoiceRepository.delete');
        throw appError;
      }
    }, 'InvoiceRepository.delete');
  }

  /**
   * 請求書番号生成（YYYYMM-001形式）
   */
  private async generateInvoiceNumber(): Promise<string> {
    try {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const data = this.invoiceSheet.getDataRange().getValues();
      let maxNumber = 0;

      // 同月の請求書番号から最大番号を取得
      for (let i = 1; i < data.length; i++) {
        const invoiceNumber = data[i][0];
        if (invoiceNumber && typeof invoiceNumber === 'string') {
          const match = invoiceNumber.match(new RegExp(`^${yearMonth}-(\\d{3})$`));
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        }
      }

      const nextNumber = maxNumber + 1;
      return `${yearMonth}-${nextNumber.toString().padStart(3, '0')}`;

    } catch (error) {
      const appError = handleError(error, 'InvoiceRepository.generateInvoiceNumber');
      logError('請求書番号生成失敗', appError, 'InvoiceRepository.generateInvoiceNumber');
      throw appError;
    }
  }

  /**
   * 明細ID生成
   */
  private async generateItemId(invoiceNumber: string): Promise<string> {
    // 制作費は1件固定なので、請求書番号 + "-001"
    return `${invoiceNumber}-001`;
  }

  /**
   * 請求書データをスプレッドシートに挿入
   */
  private async insertInvoiceData(invoice: Invoice): Promise<void> {
    const values = this.invoiceToRowData(invoice);
    const nextRow = this.invoiceSheet.getLastRow() + 1;
    this.invoiceSheet.getRange(nextRow, 1, 1, values.length).setValues([values]);
  }

  /**
   * 明細データをスプレッドシートに挿入
   */
  private async insertItemData(item: InvoiceItem): Promise<void> {
    const values = this.itemToRowData(item);
    const nextRow = this.detailSheet.getLastRow() + 1;
    this.detailSheet.getRange(nextRow, 1, 1, values.length).setValues([values]);
  }

  /**
   * 請求書の明細データを取得
   */
  private async getInvoiceItems(invoiceNumber: string): Promise<InvoiceItem[]> {
    const data = this.detailSheet.getDataRange().getValues();
    const items: InvoiceItem[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === invoiceNumber) { // 請求書番号は2番目の列
        items.push(this.rowDataToItem(row));
      }
    }
    
    return items;
  }

  /**
   * 明細データを削除
   */
  private async deleteInvoiceItems(invoiceNumber: string): Promise<void> {
    const data = this.detailSheet.getDataRange().getValues();
    
    // 後ろから削除（行番号がずれないように）
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (row[1] === invoiceNumber) {
        this.detailSheet.deleteRow(i + 1);
      }
    }
  }

  /**
   * 請求書オブジェクトを行データに変換
   */
  private invoiceToRowData(invoice: Invoice): any[] {
    return [
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.customerId,
      invoice.advertiser,
      invoice.subject,
      invoice.subtotal,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.notes || '',
      invoice.status,
      invoice.pdfUrl || '',
      invoice.createdAt,
      invoice.updatedAt
    ];
  }

  /**
   * 行データを請求書オブジェクトに変換
   */
  private rowDataToInvoice(row: any[], headerRow: any[]): Invoice {
    return {
      invoiceNumber: row[0] || '',
      issueDate: row[1] instanceof Date ? row[1] : new Date(row[1]),
      customerId: row[2] || '',
      advertiser: row[3] || '',
      subject: row[4] || '',
      items: [], // 別途取得
      subtotal: Number(row[5]) || 0,
      taxAmount: Number(row[6]) || 0,
      totalAmount: Number(row[7]) || 0,
      notes: row[8] || undefined,
      status: row[9] || InvoiceStatus.DRAFT,
      pdfUrl: row[10] || undefined,
      createdAt: row[11] instanceof Date ? row[11] : new Date(row[11]),
      updatedAt: row[12] instanceof Date ? row[12] : new Date(row[12])
    };
  }

  /**
   * 明細オブジェクトを行データに変換
   */
  private itemToRowData(item: InvoiceItem): any[] {
    return [
      item.itemId,
      item.invoiceNumber,
      item.itemName,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.taxRate,
      item.amount
    ];
  }

  /**
   * 行データを明細オブジェクトに変換
   */
  private rowDataToItem(row: any[]): InvoiceItem {
    return {
      itemId: row[0] || '',
      invoiceNumber: row[1] || '',
      itemName: row[2] || '',
      quantity: Number(row[3]) || 1,
      unit: row[4] || '',
      unitPrice: Number(row[5]) || 0,
      taxRate: Number(row[6]) || 0.10,
      amount: Number(row[7]) || 0
    };
  }

  /**
   * 請求書数取得
   */
  public async getCount(): Promise<number> {
    try {
      const data = this.invoiceSheet.getDataRange().getValues();
      return Math.max(0, data.length - 1); // ヘッダー行を除く
    } catch (error) {
      logWarn('請求書数取得失敗', { error: error.toString() }, 'InvoiceRepository.getCount');
      return 0;
    }
  }

  /**
   * 請求書存在確認
   */
  public async exists(invoiceNumber: string): Promise<boolean> {
    try {
      const invoice = await this.findByNumber(invoiceNumber);
      return invoice !== null;
    } catch (error) {
      return false;
    }
  }
}