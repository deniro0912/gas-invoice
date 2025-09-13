/**
 * 請求書サービス
 * 請求書管理のビジネスロジックを担当
 */

import { 
  Invoice, 
  InvoiceStatus, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  InvoiceFilter 
} from '../models/invoice.model';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { logInfo, logWarn, logError } from '../utils/logger';
import { 
  InvoiceError, 
  CustomerError, 
  ValidationError, 
  ErrorCode, 
  handleError,
  withRetry 
} from '../utils/error-handler';

/**
 * 請求書検索結果
 */
export interface InvoiceSearchResult {
  invoices: Invoice[];
  totalCount: number;
  filteredCount: number;
}

/**
 * 請求書統計情報
 */
export interface InvoiceStats {
  totalCount: number;
  draftCount: number;
  issuedCount: number;
  cancelledCount: number;
  totalAmount: number;
  thisMonthCount: number;
  thisMonthAmount: number;
}

/**
 * 月次レポート
 */
export interface MonthlyReport {
  year: number;
  month: number;
  invoiceCount: number;
  totalAmount: number;
  averageAmount: number;
  topCustomers: {
    customerId: string;
    customerName?: string;
    invoiceCount: number;
    totalAmount: number;
  }[];
}

/**
 * 請求書サービスクラス
 */
export class InvoiceService {
  private invoiceRepository: InvoiceRepository;
  private customerRepository: CustomerRepository;

  constructor(spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.invoiceRepository = new InvoiceRepository(spreadsheet);
    this.customerRepository = new CustomerRepository(spreadsheet);
  }

  /**
   * 請求書を作成
   */
  public async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    logInfo('請求書作成開始', request, 'InvoiceService.createInvoice');
    
    try {
      // バリデーション
      await this.validateCreateRequest(request);
      
      // 顧客存在確認
      const customer = await this.customerRepository.findById(request.customerId);
      if (!customer) {
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${request.customerId}」が見つかりません`,
          'InvoiceService.createInvoice',
          { customerId: request.customerId }
        );
      }
      
      // 請求書作成
      const invoice = await this.invoiceRepository.create(request);
      
      logInfo('請求書作成完了', { 
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount 
      }, 'InvoiceService.createInvoice');
      
      return invoice;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.createInvoice');
      logError('請求書作成失敗', appError, 'InvoiceService.createInvoice');
      throw appError;
    }
  }

  /**
   * 請求書を取得
   */
  public async getInvoice(invoiceNumber: string): Promise<Invoice> {
    try {
      if (!invoiceNumber) {
        throw new ValidationError('請求書番号が指定されていません', 'invoiceNumber', invoiceNumber);
      }

      const invoice = await this.invoiceRepository.findByNumber(invoiceNumber);
      if (!invoice) {
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」が見つかりません`,
          'InvoiceService.getInvoice',
          { invoiceNumber }
        );
      }

      return invoice;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.getInvoice');
      logError('請求書取得失敗', appError, 'InvoiceService.getInvoice');
      throw appError;
    }
  }

  /**
   * 全請求書を取得
   */
  public async getAllInvoices(): Promise<Invoice[]> {
    try {
      const invoices = await this.invoiceRepository.findAll();
      logInfo(`全請求書取得完了`, { count: invoices.length }, 'InvoiceService.getAllInvoices');
      return invoices;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.getAllInvoices');
      logError('全請求書取得失敗', appError, 'InvoiceService.getAllInvoices');
      throw appError;
    }
  }

  /**
   * 顧客別請求書を取得
   */
  public async getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
    try {
      if (!customerId) {
        throw new ValidationError('顧客IDが指定されていません', 'customerId', customerId);
      }

      // 顧客存在確認
      const customer = await this.customerRepository.findById(customerId);
      if (!customer) {
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」が見つかりません`,
          'InvoiceService.getInvoicesByCustomer',
          { customerId }
        );
      }

      const invoices = await this.invoiceRepository.findByCustomerId(customerId);
      logInfo('顧客別請求書取得完了', { customerId, count: invoices.length }, 'InvoiceService.getInvoicesByCustomer');
      return invoices;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.getInvoicesByCustomer');
      logError('顧客別請求書取得失敗', appError, 'InvoiceService.getInvoicesByCustomer');
      throw appError;
    }
  }

  /**
   * 請求書を検索
   */
  public async searchInvoices(filter: InvoiceFilter): Promise<InvoiceSearchResult> {
    try {
      const [allInvoices, filteredInvoices] = await Promise.all([
        this.invoiceRepository.findAll(),
        this.invoiceRepository.findByFilter(filter)
      ]);

      const result: InvoiceSearchResult = {
        invoices: filteredInvoices,
        totalCount: allInvoices.length,
        filteredCount: filteredInvoices.length
      };

      logInfo('請求書検索完了', {
        filterConditions: Object.keys(filter).length,
        totalCount: result.totalCount,
        filteredCount: result.filteredCount
      }, 'InvoiceService.searchInvoices');

      return result;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.searchInvoices');
      logError('請求書検索失敗', appError, 'InvoiceService.searchInvoices');
      throw appError;
    }
  }

  /**
   * 請求書を更新
   */
  public async updateInvoice(invoiceNumber: string, request: UpdateInvoiceRequest): Promise<Invoice> {
    logInfo('請求書更新開始', { invoiceNumber, request }, 'InvoiceService.updateInvoice');
    
    try {
      // バリデーション
      if (!invoiceNumber) {
        throw new ValidationError('請求書番号が指定されていません', 'invoiceNumber', invoiceNumber);
      }
      
      this.validateUpdateRequest(request);
      
      // 存在確認
      const existingInvoice = await this.getInvoice(invoiceNumber);
      
      // ステータス変更のバリデーション
      if (request.status && request.status !== existingInvoice.status) {
        this.validateStatusTransition(existingInvoice.status, request.status);
      }
      
      // 顧客変更の場合は存在確認
      if (request.customerId && request.customerId !== existingInvoice.customerId) {
        const customer = await this.customerRepository.findById(request.customerId);
        if (!customer) {
          throw new CustomerError(
            ErrorCode.CUSTOMER_NOT_FOUND,
            `顧客ID「${request.customerId}」が見つかりません`,
            'InvoiceService.updateInvoice',
            { customerId: request.customerId }
          );
        }
      }
      
      // 更新実行
      const updatedInvoice = await this.invoiceRepository.update(invoiceNumber, request);
      if (!updatedInvoice) {
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」の更新に失敗しました`,
          'InvoiceService.updateInvoice',
          { invoiceNumber }
        );
      }
      
      logInfo('請求書更新完了', { invoiceNumber }, 'InvoiceService.updateInvoice');
      return updatedInvoice;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.updateInvoice');
      logError('請求書更新失敗', appError, 'InvoiceService.updateInvoice');
      throw appError;
    }
  }

  /**
   * 請求書を削除
   */
  public async deleteInvoice(invoiceNumber: string): Promise<void> {
    logInfo('請求書削除開始', { invoiceNumber }, 'InvoiceService.deleteInvoice');
    
    try {
      if (!invoiceNumber) {
        throw new ValidationError('請求書番号が指定されていません', 'invoiceNumber', invoiceNumber);
      }

      // 存在確認
      const invoice = await this.getInvoice(invoiceNumber);

      // 削除可能かチェック
      if (invoice.status === InvoiceStatus.ISSUED) {
        throw new InvoiceError(
          ErrorCode.INVOICE_STATUS_ERROR,
          '発行済みの請求書は削除できません',
          'InvoiceService.deleteInvoice',
          { invoiceNumber, status: invoice.status }
        );
      }

      // 削除実行
      const deleted = await this.invoiceRepository.delete(invoiceNumber);
      if (!deleted) {
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」の削除に失敗しました`,
          'InvoiceService.deleteInvoice',
          { invoiceNumber }
        );
      }

      logInfo('請求書削除完了', { invoiceNumber }, 'InvoiceService.deleteInvoice');

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.deleteInvoice');
      logError('請求書削除失敗', appError, 'InvoiceService.deleteInvoice');
      throw appError;
    }
  }

  /**
   * 請求書を発行する
   */
  public async issueInvoice(invoiceNumber: string): Promise<Invoice> {
    logInfo('請求書発行開始', { invoiceNumber }, 'InvoiceService.issueInvoice');
    
    try {
      const invoice = await this.getInvoice(invoiceNumber);
      
      // ステータスチェック
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new InvoiceError(
          ErrorCode.INVOICE_STATUS_ERROR,
          `下書き状態の請求書のみ発行可能です。現在のステータス: ${invoice.status}`,
          'InvoiceService.issueInvoice',
          { invoiceNumber, currentStatus: invoice.status }
        );
      }

      // ステータスを発行済みに更新
      const updatedInvoice = await this.invoiceRepository.update(invoiceNumber, {
        status: InvoiceStatus.ISSUED,
        issueDate: new Date()
      });

      if (!updatedInvoice) {
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」の発行処理に失敗しました`,
          'InvoiceService.issueInvoice',
          { invoiceNumber }
        );
      }

      logInfo('請求書発行完了', { invoiceNumber }, 'InvoiceService.issueInvoice');
      return updatedInvoice;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.issueInvoice');
      logError('請求書発行失敗', appError, 'InvoiceService.issueInvoice');
      throw appError;
    }
  }

  /**
   * 請求書をキャンセルする
   */
  public async cancelInvoice(invoiceNumber: string): Promise<Invoice> {
    logInfo('請求書キャンセル開始', { invoiceNumber }, 'InvoiceService.cancelInvoice');
    
    try {
      const invoice = await this.getInvoice(invoiceNumber);
      
      // ステータスチェック
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new InvoiceError(
          ErrorCode.INVOICE_STATUS_ERROR,
          '既にキャンセル済みの請求書です',
          'InvoiceService.cancelInvoice',
          { invoiceNumber, currentStatus: invoice.status }
        );
      }

      // ステータスをキャンセルに更新
      const updatedInvoice = await this.invoiceRepository.update(invoiceNumber, {
        status: InvoiceStatus.CANCELLED
      });

      if (!updatedInvoice) {
        throw new InvoiceError(
          ErrorCode.INVOICE_NOT_FOUND,
          `請求書番号「${invoiceNumber}」のキャンセル処理に失敗しました`,
          'InvoiceService.cancelInvoice',
          { invoiceNumber }
        );
      }

      logInfo('請求書キャンセル完了', { invoiceNumber }, 'InvoiceService.cancelInvoice');
      return updatedInvoice;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.cancelInvoice');
      logError('請求書キャンセル失敗', appError, 'InvoiceService.cancelInvoice');
      throw appError;
    }
  }

  /**
   * 請求書統計情報を取得
   */
  public async getInvoiceStats(): Promise<InvoiceStats> {
    try {
      const invoices = await this.invoiceRepository.findAll();
      
      const stats: InvoiceStats = {
        totalCount: invoices.length,
        draftCount: invoices.filter(i => i.status === InvoiceStatus.DRAFT).length,
        issuedCount: invoices.filter(i => i.status === InvoiceStatus.ISSUED).length,
        cancelledCount: invoices.filter(i => i.status === InvoiceStatus.CANCELLED).length,
        totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
        thisMonthCount: 0,
        thisMonthAmount: 0
      };

      // 今月の統計
      const now = new Date();
      const thisMonth = invoices.filter(i => {
        const issueDate = new Date(i.issueDate);
        return issueDate.getFullYear() === now.getFullYear() &&
               issueDate.getMonth() === now.getMonth();
      });

      stats.thisMonthCount = thisMonth.length;
      stats.thisMonthAmount = thisMonth.reduce((sum, i) => sum + i.totalAmount, 0);

      return stats;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.getInvoiceStats');
      logError('請求書統計取得失敗', appError, 'InvoiceService.getInvoiceStats');
      throw appError;
    }
  }

  /**
   * 月次レポートを生成
   */
  public async generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    try {
      const invoices = await this.invoiceRepository.findAll();
      
      // 指定月の請求書をフィルター
      const monthlyInvoices = invoices.filter(invoice => {
        const issueDate = new Date(invoice.issueDate);
        return issueDate.getFullYear() === year && issueDate.getMonth() === month - 1;
      });

      const totalAmount = monthlyInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const averageAmount = monthlyInvoices.length > 0 ? totalAmount / monthlyInvoices.length : 0;

      // 顧客別集計
      const customerStats = new Map<string, { invoiceCount: number; totalAmount: number }>();
      
      monthlyInvoices.forEach(invoice => {
        const current = customerStats.get(invoice.customerId) || { invoiceCount: 0, totalAmount: 0 };
        current.invoiceCount++;
        current.totalAmount += invoice.totalAmount;
        customerStats.set(invoice.customerId, current);
      });

      // トップ顧客（上位5社）
      const topCustomers = Array.from(customerStats.entries())
        .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
        .slice(0, 5)
        .map(([customerId, stats]) => ({
          customerId,
          invoiceCount: stats.invoiceCount,
          totalAmount: stats.totalAmount
        }));

      const report: MonthlyReport = {
        year,
        month,
        invoiceCount: monthlyInvoices.length,
        totalAmount,
        averageAmount,
        topCustomers
      };

      logInfo('月次レポート生成完了', { year, month, invoiceCount: report.invoiceCount }, 'InvoiceService.generateMonthlyReport');
      return report;

    } catch (error) {
      const appError = handleError(error, 'InvoiceService.generateMonthlyReport');
      logError('月次レポート生成失敗', appError, 'InvoiceService.generateMonthlyReport');
      throw appError;
    }
  }

  /**
   * 作成リクエストのバリデーション
   */
  private async validateCreateRequest(request: CreateInvoiceRequest): Promise<void> {
    if (!request.customerId?.trim()) {
      throw new ValidationError('顧客IDは必須です', 'customerId', request.customerId);
    }

    if (!request.advertiser?.trim()) {
      throw new ValidationError('広告主は必須です', 'advertiser', request.advertiser);
    }

    if (request.advertiser.length > 200) {
      throw new ValidationError('広告主は200文字以内で入力してください', 'advertiser', request.advertiser);
    }

    if (!request.subject?.trim()) {
      throw new ValidationError('件名は必須です', 'subject', request.subject);
    }

    if (request.subject.length > 300) {
      throw new ValidationError('件名は300文字以内で入力してください', 'subject', request.subject);
    }

    if (!request.unitPrice || request.unitPrice <= 0) {
      throw new ValidationError('制作費は1円以上で入力してください', 'unitPrice', request.unitPrice);
    }

    if (request.unitPrice > 99999999) {
      throw new ValidationError('制作費は99,999,999円以下で入力してください', 'unitPrice', request.unitPrice);
    }

    if (request.notes && request.notes.length > 1000) {
      throw new ValidationError('備考は1000文字以内で入力してください', 'notes', request.notes);
    }
  }

  /**
   * 更新リクエストのバリデーション
   */
  private validateUpdateRequest(request: UpdateInvoiceRequest): void {
    if (request.advertiser !== undefined) {
      if (!request.advertiser?.trim()) {
        throw new ValidationError('広告主は必須です', 'advertiser', request.advertiser);
      }
      if (request.advertiser.length > 200) {
        throw new ValidationError('広告主は200文字以内で入力してください', 'advertiser', request.advertiser);
      }
    }

    if (request.subject !== undefined) {
      if (!request.subject?.trim()) {
        throw new ValidationError('件名は必須です', 'subject', request.subject);
      }
      if (request.subject.length > 300) {
        throw new ValidationError('件名は300文字以内で入力してください', 'subject', request.subject);
      }
    }

    if (request.notes !== undefined && request.notes && request.notes.length > 1000) {
      throw new ValidationError('備考は1000文字以内で入力してください', 'notes', request.notes);
    }
  }

  /**
   * ステータス変更の妥当性チェック
   */
  private validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): void {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
      [InvoiceStatus.ISSUED]: [InvoiceStatus.CANCELLED],
      [InvoiceStatus.CANCELLED]: [] // キャンセル後は変更不可
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new InvoiceError(
        ErrorCode.INVOICE_STATUS_ERROR,
        `${currentStatus} から ${newStatus} への変更はできません`,
        'InvoiceService.validateStatusTransition',
        { currentStatus, newStatus }
      );
    }
  }
}