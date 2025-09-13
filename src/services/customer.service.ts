/**
 * 顧客サービス
 * 顧客管理のビジネスロジックを担当
 */

import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../models/customer.model';
import { CustomerRepository, CustomerFilter } from '../repositories/customer.repository';
import { logInfo, logWarn, logError } from '../utils/logger';
import { 
  CustomerError, 
  ValidationError, 
  ErrorCode, 
  handleError,
  withRetry 
} from '../utils/error-handler';

/**
 * 顧客検索結果
 */
export interface CustomerSearchResult {
  customers: Customer[];
  totalCount: number;
  filteredCount: number;
}

/**
 * 顧客サービスクラス
 */
export class CustomerService {
  private repository: CustomerRepository;

  constructor(spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.repository = new CustomerRepository(spreadsheet);
  }

  /**
   * 顧客を作成
   */
  public async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    logInfo('顧客作成開始', request, 'CustomerService.createCustomer');
    
    try {
      // バリデーション
      this.validateCreateRequest(request);
      
      // 重複チェック
      await this.checkDuplicateCompanyName(request.companyName);
      
      // 顧客作成
      const customer = await this.repository.create(request);
      
      logInfo('顧客作成完了', { customerId: customer.customerId }, 'CustomerService.createCustomer');
      return customer;

    } catch (error) {
      const appError = handleError(error, 'CustomerService.createCustomer');
      logError('顧客作成失敗', appError, 'CustomerService.createCustomer');
      throw appError;
    }
  }

  /**
   * 顧客を取得
   */
  public async getCustomer(customerId: string): Promise<Customer> {
    try {
      if (!customerId) {
        throw new ValidationError('顧客IDが指定されていません', 'customerId', customerId);
      }

      const customer = await this.repository.findById(customerId);
      if (!customer) {
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」が見つかりません`,
          'CustomerService.getCustomer',
          { customerId }
        );
      }

      return customer;

    } catch (error) {
      const appError = handleError(error, 'CustomerService.getCustomer');
      logError('顧客取得失敗', appError, 'CustomerService.getCustomer');
      throw appError;
    }
  }

  /**
   * 全顧客を取得
   */
  public async getAllCustomers(): Promise<Customer[]> {
    try {
      const customers = await this.repository.findAll();
      logInfo(`全顧客取得完了`, { count: customers.length }, 'CustomerService.getAllCustomers');
      return customers;

    } catch (error) {
      const appError = handleError(error, 'CustomerService.getAllCustomers');
      logError('全顧客取得失敗', appError, 'CustomerService.getAllCustomers');
      throw appError;
    }
  }

  /**
   * 顧客を検索
   */
  public async searchCustomers(filter: CustomerFilter): Promise<CustomerSearchResult> {
    try {
      const [allCustomers, filteredCustomers] = await Promise.all([
        this.repository.findAll(),
        this.repository.findByFilter(filter)
      ]);

      const result: CustomerSearchResult = {
        customers: filteredCustomers,
        totalCount: allCustomers.length,
        filteredCount: filteredCustomers.length
      };

      logInfo('顧客検索完了', {
        filterConditions: Object.keys(filter).length,
        totalCount: result.totalCount,
        filteredCount: result.filteredCount
      }, 'CustomerService.searchCustomers');

      return result;

    } catch (error) {
      const appError = handleError(error, 'CustomerService.searchCustomers');
      logError('顧客検索失敗', appError, 'CustomerService.searchCustomers');
      throw appError;
    }
  }

  /**
   * 会社名で検索
   */
  public async findByCompanyName(companyName: string): Promise<Customer | null> {
    try {
      if (!companyName) {
        throw new ValidationError('会社名が指定されていません', 'companyName', companyName);
      }

      return await this.repository.findByCompanyName(companyName);

    } catch (error) {
      const appError = handleError(error, 'CustomerService.findByCompanyName');
      logError('会社名検索失敗', appError, 'CustomerService.findByCompanyName');
      throw appError;
    }
  }

  /**
   * 顧客を更新
   */
  public async updateCustomer(customerId: string, request: UpdateCustomerRequest): Promise<Customer> {
    logInfo('顧客更新開始', { customerId, request }, 'CustomerService.updateCustomer');
    
    try {
      // バリデーション
      if (!customerId) {
        throw new ValidationError('顧客IDが指定されていません', 'customerId', customerId);
      }
      
      this.validateUpdateRequest(request);
      
      // 存在確認
      await this.getCustomer(customerId);
      
      // 会社名の重複チェック（変更する場合）
      if (request.companyName) {
        const existing = await this.repository.findByCompanyName(request.companyName);
        if (existing && existing.customerId !== customerId) {
          throw new CustomerError(
            ErrorCode.CUSTOMER_DUPLICATE,
            `会社名「${request.companyName}」は既に登録されています`,
            'CustomerService.updateCustomer',
            { companyName: request.companyName, existingCustomerId: existing.customerId }
          );
        }
      }
      
      // 更新実行
      const updatedCustomer = await this.repository.update(customerId, request);
      if (!updatedCustomer) {
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」の更新に失敗しました`,
          'CustomerService.updateCustomer',
          { customerId }
        );
      }
      
      logInfo('顧客更新完了', { customerId }, 'CustomerService.updateCustomer');
      return updatedCustomer;

    } catch (error) {
      const appError = handleError(error, 'CustomerService.updateCustomer');
      logError('顧客更新失敗', appError, 'CustomerService.updateCustomer');
      throw appError;
    }
  }

  /**
   * 顧客を削除
   */
  public async deleteCustomer(customerId: string): Promise<void> {
    logInfo('顧客削除開始', { customerId }, 'CustomerService.deleteCustomer');
    
    try {
      if (!customerId) {
        throw new ValidationError('顧客IDが指定されていません', 'customerId', customerId);
      }

      // 存在確認
      await this.getCustomer(customerId);

      // TODO: 請求書が存在する場合の削除制限チェック
      // const hasInvoices = await this.checkCustomerHasInvoices(customerId);
      // if (hasInvoices) {
      //   throw new CustomerError(
      //     ErrorCode.CUSTOMER_HAS_INVOICES,
      //     '請求書が存在する顧客は削除できません',
      //     'CustomerService.deleteCustomer'
      //   );
      // }

      // 削除実行
      const deleted = await this.repository.delete(customerId);
      if (!deleted) {
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」の削除に失敗しました`,
          'CustomerService.deleteCustomer',
          { customerId }
        );
      }

      logInfo('顧客削除完了', { customerId }, 'CustomerService.deleteCustomer');

    } catch (error) {
      const appError = handleError(error, 'CustomerService.deleteCustomer');
      logError('顧客削除失敗', appError, 'CustomerService.deleteCustomer');
      throw appError;
    }
  }

  /**
   * 顧客統計情報を取得
   */
  public async getCustomerStats(): Promise<{
    totalCount: number;
    recentRegistrations: number; // 直近30日
    topCompanies: { companyName: string; registeredAt: Date }[];
  }> {
    try {
      const customers = await this.repository.findAll();
      const totalCount = customers.length;
      
      // 直近30日の登録数
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentRegistrations = customers.filter(
        customer => customer.registeredAt >= thirtyDaysAgo
      ).length;
      
      // 最新5社
      const topCompanies = customers
        .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
        .slice(0, 5)
        .map(customer => ({
          companyName: customer.companyName,
          registeredAt: customer.registeredAt
        }));

      return {
        totalCount,
        recentRegistrations,
        topCompanies
      };

    } catch (error) {
      const appError = handleError(error, 'CustomerService.getCustomerStats');
      logError('顧客統計取得失敗', appError, 'CustomerService.getCustomerStats');
      throw appError;
    }
  }

  /**
   * 作成リクエストのバリデーション
   */
  private validateCreateRequest(request: CreateCustomerRequest): void {
    if (!request.companyName?.trim()) {
      throw new ValidationError('会社名は必須です', 'companyName', request.companyName);
    }

    if (request.companyName.length > 100) {
      throw new ValidationError('会社名は100文字以内で入力してください', 'companyName', request.companyName);
    }

    if (request.contactPerson && request.contactPerson.length > 50) {
      throw new ValidationError('担当者名は50文字以内で入力してください', 'contactPerson', request.contactPerson);
    }

    if (request.email && !this.isValidEmail(request.email)) {
      throw new ValidationError('有効なメールアドレスを入力してください', 'email', request.email);
    }

    if (request.postalCode && !this.isValidPostalCode(request.postalCode)) {
      throw new ValidationError('郵便番号は「123-4567」の形式で入力してください', 'postalCode', request.postalCode);
    }

    if (request.phoneNumber && !this.isValidPhoneNumber(request.phoneNumber)) {
      throw new ValidationError('電話番号は有効な形式で入力してください', 'phoneNumber', request.phoneNumber);
    }
  }

  /**
   * 更新リクエストのバリデーション
   */
  private validateUpdateRequest(request: UpdateCustomerRequest): void {
    if (request.companyName !== undefined) {
      if (!request.companyName?.trim()) {
        throw new ValidationError('会社名は必須です', 'companyName', request.companyName);
      }
      if (request.companyName.length > 100) {
        throw new ValidationError('会社名は100文字以内で入力してください', 'companyName', request.companyName);
      }
    }

    if (request.contactPerson !== undefined && request.contactPerson && request.contactPerson.length > 50) {
      throw new ValidationError('担当者名は50文字以内で入力してください', 'contactPerson', request.contactPerson);
    }

    if (request.email !== undefined && request.email && !this.isValidEmail(request.email)) {
      throw new ValidationError('有効なメールアドレスを入力してください', 'email', request.email);
    }

    if (request.postalCode !== undefined && request.postalCode && !this.isValidPostalCode(request.postalCode)) {
      throw new ValidationError('郵便番号は「123-4567」の形式で入力してください', 'postalCode', request.postalCode);
    }

    if (request.phoneNumber !== undefined && request.phoneNumber && !this.isValidPhoneNumber(request.phoneNumber)) {
      throw new ValidationError('電話番号は有効な形式で入力してください', 'phoneNumber', request.phoneNumber);
    }
  }

  /**
   * 会社名重複チェック
   */
  private async checkDuplicateCompanyName(companyName: string): Promise<void> {
    const existing = await this.repository.findByCompanyName(companyName);
    if (existing) {
      throw new CustomerError(
        ErrorCode.CUSTOMER_DUPLICATE,
        `会社名「${companyName}」は既に登録されています`,
        'CustomerService.checkDuplicateCompanyName',
        { companyName, existingCustomerId: existing.customerId }
      );
    }
  }

  /**
   * メールアドレス形式チェック
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * 郵便番号形式チェック
   */
  private isValidPostalCode(postalCode: string): boolean {
    const postalCodeRegex = /^\d{3}-\d{4}$/;
    return postalCodeRegex.test(postalCode);
  }

  /**
   * 電話番号形式チェック
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // 日本の電話番号形式（基本的なチェック）
    const phoneRegex = /^0\d{1,4}-\d{1,4}-\d{3,4}$/;
    return phoneRegex.test(phoneNumber);
  }
}