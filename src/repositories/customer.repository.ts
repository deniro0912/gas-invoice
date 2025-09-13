/**
 * 顧客データリポジトリ
 * スプレッドシートとの顧客データのやり取りを担当
 */

import { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../models/customer.model';
import { getSpreadsheetConfig } from '../config';
import { logInfo, logWarn, logError } from '../utils/logger';
import { 
  SpreadsheetError, 
  ErrorCode, 
  CustomerError, 
  handleError,
  withRetry 
} from '../utils/error-handler';

/**
 * 顧客検索フィルター
 */
export interface CustomerFilter {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  registeredAfter?: Date;
  registeredBefore?: Date;
}

/**
 * 顧客リポジトリクラス
 */
export class CustomerRepository {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private sheet: GoogleAppsScript.Spreadsheet.Sheet;
  private config = getSpreadsheetConfig();

  constructor(spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    
    if (!this.spreadsheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_ACCESS_ERROR,
        'アクティブなスプレッドシートが見つかりません',
        'CustomerRepository'
      );
    }

    // 顧客マスタシートを取得
    const customerSheet = this.spreadsheet.getSheetByName(this.config.customerSheetName);
    if (!customerSheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_SHEET_NOT_FOUND,
        `顧客マスタシート「${this.config.customerSheetName}」が見つかりません`,
        'CustomerRepository'
      );
    }
    this.sheet = customerSheet;
  }

  /**
   * 顧客を作成
   */
  public async create(request: CreateCustomerRequest): Promise<Customer> {
    logInfo('顧客作成開始', request, 'CustomerRepository.create');
    
    return withRetry(async () => {
      try {
        // 顧客IDを生成
        const customerId = await this.generateCustomerId();
        
        // 重複チェック
        const existingCustomer = await this.findByCompanyName(request.companyName);
        if (existingCustomer) {
          throw new CustomerError(
            ErrorCode.CUSTOMER_DUPLICATE,
            `会社名「${request.companyName}」は既に登録されています`,
            'CustomerRepository.create',
            { companyName: request.companyName }
          );
        }

        const now = new Date();
        const customer: Customer = {
          customerId,
          companyName: request.companyName,
          contactPerson: request.contactPerson,
          postalCode: request.postalCode,
          address: request.address,
          email: request.email,
          phoneNumber: request.phoneNumber,
          registeredAt: now,
          updatedAt: now
        };

        // データをスプレッドシートに追加
        const values = this.customerToRowData(customer);
        const nextRow = this.sheet.getLastRow() + 1;
        
        this.sheet.getRange(nextRow, 1, 1, values.length).setValues([values]);
        
        logInfo('顧客作成完了', { customerId }, 'CustomerRepository.create');
        return customer;

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.create');
        logError('顧客作成失敗', appError, 'CustomerRepository.create');
        throw appError;
      }
    }, 'CustomerRepository.create');
  }

  /**
   * 顧客IDで検索
   */
  public async findById(customerId: string): Promise<Customer | null> {
    return withRetry(async () => {
      try {
        const data = this.sheet.getDataRange().getValues();
        const headerRow = data[0];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === customerId) {
            return this.rowDataToCustomer(row, headerRow);
          }
        }
        
        return null;

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.findById');
        logError('顧客検索失敗', appError, 'CustomerRepository.findById');
        throw appError;
      }
    }, 'CustomerRepository.findById');
  }

  /**
   * 会社名で検索（部分一致）
   */
  public async findByCompanyName(companyName: string): Promise<Customer | null> {
    return withRetry(async () => {
      try {
        const data = this.sheet.getDataRange().getValues();
        const headerRow = data[0];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[1] && row[1].toString().toLowerCase().includes(companyName.toLowerCase())) {
            return this.rowDataToCustomer(row, headerRow);
          }
        }
        
        return null;

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.findByCompanyName');
        logError('会社名検索失敗', appError, 'CustomerRepository.findByCompanyName');
        throw appError;
      }
    }, 'CustomerRepository.findByCompanyName');
  }

  /**
   * 全顧客取得
   */
  public async findAll(): Promise<Customer[]> {
    return withRetry(async () => {
      try {
        const data = this.sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
          return []; // ヘッダーのみの場合
        }

        const headerRow = data[0];
        const customers: Customer[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0]) { // 顧客IDがある行のみ処理
            customers.push(this.rowDataToCustomer(row, headerRow));
          }
        }

        logInfo(`全顧客取得完了`, { count: customers.length }, 'CustomerRepository.findAll');
        return customers;

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.findAll');
        logError('全顧客取得失敗', appError, 'CustomerRepository.findAll');
        throw appError;
      }
    }, 'CustomerRepository.findAll');
  }

  /**
   * 条件付き検索
   */
  public async findByFilter(filter: CustomerFilter): Promise<Customer[]> {
    return withRetry(async () => {
      try {
        const allCustomers = await this.findAll();
        
        return allCustomers.filter(customer => {
          // 会社名フィルター
          if (filter.companyName && 
              !customer.companyName.toLowerCase().includes(filter.companyName.toLowerCase())) {
            return false;
          }

          // 担当者フィルター
          if (filter.contactPerson && customer.contactPerson &&
              !customer.contactPerson.toLowerCase().includes(filter.contactPerson.toLowerCase())) {
            return false;
          }

          // メールフィルター
          if (filter.email && customer.email &&
              !customer.email.toLowerCase().includes(filter.email.toLowerCase())) {
            return false;
          }

          // 登録日フィルター
          if (filter.registeredAfter && customer.registeredAt < filter.registeredAfter) {
            return false;
          }

          if (filter.registeredBefore && customer.registeredAt > filter.registeredBefore) {
            return false;
          }

          return true;
        });

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.findByFilter');
        logError('条件付き検索失敗', appError, 'CustomerRepository.findByFilter');
        throw appError;
      }
    }, 'CustomerRepository.findByFilter');
  }

  /**
   * 顧客更新
   */
  public async update(customerId: string, request: UpdateCustomerRequest): Promise<Customer | null> {
    logInfo('顧客更新開始', { customerId, request }, 'CustomerRepository.update');
    
    return withRetry(async () => {
      try {
        const data = this.sheet.getDataRange().getValues();
        const headerRow = data[0];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === customerId) {
            // 既存データを取得
            const existingCustomer = this.rowDataToCustomer(row, headerRow);
            
            // 更新データをマージ
            const updatedCustomer: Customer = {
              ...existingCustomer,
              ...request,
              customerId, // IDは変更不可
              updatedAt: new Date()
            };

            // スプレッドシートを更新
            const values = this.customerToRowData(updatedCustomer);
            this.sheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
            
            logInfo('顧客更新完了', { customerId }, 'CustomerRepository.update');
            return updatedCustomer;
          }
        }
        
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」が見つかりません`,
          'CustomerRepository.update',
          { customerId }
        );

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.update');
        logError('顧客更新失敗', appError, 'CustomerRepository.update');
        throw appError;
      }
    }, 'CustomerRepository.update');
  }

  /**
   * 顧客削除
   */
  public async delete(customerId: string): Promise<boolean> {
    logInfo('顧客削除開始', { customerId }, 'CustomerRepository.delete');
    
    return withRetry(async () => {
      try {
        const data = this.sheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[0] === customerId) {
            this.sheet.deleteRow(i + 1);
            logInfo('顧客削除完了', { customerId }, 'CustomerRepository.delete');
            return true;
          }
        }
        
        throw new CustomerError(
          ErrorCode.CUSTOMER_NOT_FOUND,
          `顧客ID「${customerId}」が見つかりません`,
          'CustomerRepository.delete',
          { customerId }
        );

      } catch (error) {
        const appError = handleError(error, 'CustomerRepository.delete');
        logError('顧客削除失敗', appError, 'CustomerRepository.delete');
        throw appError;
      }
    }, 'CustomerRepository.delete');
  }

  /**
   * 顧客ID生成
   */
  private async generateCustomerId(): Promise<string> {
    try {
      const data = this.sheet.getDataRange().getValues();
      let maxNumber = 0;

      // 既存の顧客IDから最大番号を取得
      for (let i = 1; i < data.length; i++) {
        const customerId = data[i][0];
        if (customerId && typeof customerId === 'string') {
          const match = customerId.match(/^C(\d{5})$/);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        }
      }

      const nextNumber = maxNumber + 1;
      return `C${nextNumber.toString().padStart(5, '0')}`;

    } catch (error) {
      const appError = handleError(error, 'CustomerRepository.generateCustomerId');
      logError('顧客ID生成失敗', appError, 'CustomerRepository.generateCustomerId');
      throw appError;
    }
  }

  /**
   * 顧客オブジェクトを行データに変換
   */
  private customerToRowData(customer: Customer): any[] {
    return [
      customer.customerId,
      customer.companyName,
      customer.contactPerson || '',
      customer.postalCode || '',
      customer.address || '',
      customer.email || '',
      customer.phoneNumber || '',
      customer.registeredAt,
      customer.updatedAt
    ];
  }

  /**
   * 行データを顧客オブジェクトに変換
   */
  private rowDataToCustomer(row: any[], headerRow: any[]): Customer {
    return {
      customerId: row[0] || '',
      companyName: row[1] || '',
      contactPerson: row[2] || undefined,
      postalCode: row[3] || undefined,
      address: row[4] || undefined,
      email: row[5] || undefined,
      phoneNumber: row[6] || undefined,
      registeredAt: row[7] instanceof Date ? row[7] : new Date(row[7]),
      updatedAt: row[8] instanceof Date ? row[8] : new Date(row[8])
    };
  }

  /**
   * 顧客数取得
   */
  public async getCount(): Promise<number> {
    try {
      const data = this.sheet.getDataRange().getValues();
      return Math.max(0, data.length - 1); // ヘッダー行を除く
    } catch (error) {
      logWarn('顧客数取得失敗', { error: error.toString() }, 'CustomerRepository.getCount');
      return 0;
    }
  }

  /**
   * 顧客存在確認
   */
  public async exists(customerId: string): Promise<boolean> {
    try {
      const customer = await this.findById(customerId);
      return customer !== null;
    } catch (error) {
      return false;
    }
  }
}