/**
 * エラーハンドリングユーティリティ
 */

import { logError, logWarn } from './logger';

/**
 * エラーコード定義
 */
export enum ErrorCode {
  // システムエラー
  SYSTEM_ERROR = 'SYS001',
  CONFIG_ERROR = 'SYS002',
  TIMEOUT_ERROR = 'SYS003',
  
  // データエラー
  DATA_NOT_FOUND = 'DATA001',
  DATA_DUPLICATE = 'DATA002',
  DATA_INVALID = 'DATA003',
  
  // スプレッドシートエラー
  SPREADSHEET_ACCESS_ERROR = 'SS001',
  SPREADSHEET_PERMISSION_ERROR = 'SS002',
  SPREADSHEET_SHEET_NOT_FOUND = 'SS003',
  
  // 顧客関連エラー
  CUSTOMER_NOT_FOUND = 'CUST001',
  CUSTOMER_DUPLICATE = 'CUST002',
  CUSTOMER_VALIDATION_ERROR = 'CUST003',
  
  // 請求書関連エラー
  INVOICE_NOT_FOUND = 'INV001',
  INVOICE_DUPLICATE = 'INV002',
  INVOICE_VALIDATION_ERROR = 'INV003',
  INVOICE_STATUS_ERROR = 'INV004',
  
  // PDF関連エラー
  PDF_TEMPLATE_NOT_FOUND = 'PDF001',
  PDF_GENERATION_FAILED = 'PDF002',
  PDF_SAVE_FAILED = 'PDF003',
  
  // Drive関連エラー
  DRIVE_ACCESS_ERROR = 'DRIVE001',
  DRIVE_PERMISSION_ERROR = 'DRIVE002',
  DRIVE_FOLDER_NOT_FOUND = 'DRIVE003'
}

/**
 * アプリケーションエラーベースクラス
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: string;
  public readonly details?: unknown;
  public readonly isRetryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    context?: string,
    details?: unknown,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.details = details;
    this.isRetryable = isRetryable;
  }

  /**
   * エラー情報をJSON形式で取得
   */
  public toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      details: this.details,
      isRetryable: this.isRetryable,
      stack: this.stack
    };
  }
}

/**
 * 顧客関連エラー
 */
export class CustomerError extends AppError {
  constructor(code: ErrorCode, message: string, context?: string, details?: unknown) {
    super(code, message, context, details, false);
    this.name = 'CustomerError';
  }
}

/**
 * 請求書関連エラー
 */
export class InvoiceError extends AppError {
  constructor(code: ErrorCode, message: string, context?: string, details?: unknown) {
    super(code, message, context, details, false);
    this.name = 'InvoiceError';
  }
}

/**
 * PDF関連エラー
 */
export class PDFError extends AppError {
  constructor(code: ErrorCode, message: string, context?: string, details?: unknown, isRetryable: boolean = true) {
    super(code, message, context, details, isRetryable);
    this.name = 'PDFError';
  }
}

/**
 * スプレッドシート関連エラー
 */
export class SpreadsheetError extends AppError {
  constructor(code: ErrorCode, message: string, context?: string, details?: unknown, isRetryable: boolean = true) {
    super(code, message, context, details, isRetryable);
    this.name = 'SpreadsheetError';
  }
}

/**
 * Drive関連エラー
 */
export class DriveError extends AppError {
  constructor(code: ErrorCode, message: string, context?: string, details?: unknown, isRetryable: boolean = true) {
    super(code, message, context, details, isRetryable);
    this.name = 'DriveError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown, context?: string) {
    super(ErrorCode.DATA_INVALID, message, context, { field, value }, false);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * エラーハンドラークラス
 */
export class ErrorHandler {
  private static retryCount = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒

  /**
   * エラーを処理する
   */
  public static handle(error: unknown, context?: string): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = this.convertToAppError(error, context);
    } else {
      appError = new AppError(
        ErrorCode.SYSTEM_ERROR,
        typeof error === 'string' ? error : 'Unknown error',
        context,
        error
      );
    }

    // ログ出力
    logError(appError.message, appError, appError.context);

    return appError;
  }

  /**
   * 標準エラーをAppErrorに変換
   */
  private static convertToAppError(error: Error, context?: string): AppError {
    // Google Apps Script特有のエラーを判定
    if (error.message.includes('Spreadsheet')) {
      if (error.message.includes('permission')) {
        return new SpreadsheetError(
          ErrorCode.SPREADSHEET_PERMISSION_ERROR,
          'スプレッドシートへのアクセス権限がありません',
          context,
          error.message,
          false
        );
      } else {
        return new SpreadsheetError(
          ErrorCode.SPREADSHEET_ACCESS_ERROR,
          'スプレッドシートへのアクセスでエラーが発生しました',
          context,
          error.message,
          true
        );
      }
    }

    if (error.message.includes('Drive')) {
      return new DriveError(
        ErrorCode.DRIVE_ACCESS_ERROR,
        'Google Driveへのアクセスでエラーが発生しました',
        context,
        error.message,
        true
      );
    }

    if (error.message.includes('timeout')) {
      return new AppError(
        ErrorCode.TIMEOUT_ERROR,
        '処理がタイムアウトしました',
        context,
        error.message,
        true
      );
    }

    // その他のエラー
    return new AppError(
      ErrorCode.SYSTEM_ERROR,
      error.message,
      context,
      error.message,
      false
    );
  }

  /**
   * リトライ付きでFunction実行
   */
  public static async withRetry<T>(
    fn: () => T | Promise<T>,
    context?: string,
    maxRetries: number = ErrorHandler.MAX_RETRIES
  ): Promise<T> {
    const key = context || fn.toString();
    let lastError: AppError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        // 成功時はリトライ回数をリセット
        this.retryCount.delete(key);
        return result;
      } catch (error) {
        lastError = this.handle(error, context);
        
        // リトライ可能でない場合は即座に失敗
        if (!lastError.isRetryable || attempt === maxRetries) {
          throw lastError;
        }

        // リトライ回数を記録
        const currentCount = this.retryCount.get(key) || 0;
        this.retryCount.set(key, currentCount + 1);

        logWarn(
          `リトライ実行中 (${attempt + 1}/${maxRetries})`,
          { error: lastError.message },
          context
        );

        // 遅延実行
        await this.delay(this.RETRY_DELAY * (attempt + 1)); // 指数バックオフ
      }
    }

    throw lastError!;
  }

  /**
   * 遅延実行
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      Utilities.sleep(ms);
      resolve();
    });
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  public static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case ErrorCode.CUSTOMER_NOT_FOUND:
        return '指定された顧客が見つかりません。';
      case ErrorCode.CUSTOMER_DUPLICATE:
        return '既に登録されている顧客です。';
      case ErrorCode.INVOICE_NOT_FOUND:
        return '指定された請求書が見つかりません。';
      case ErrorCode.PDF_TEMPLATE_NOT_FOUND:
        return 'PDFテンプレートが見つかりません。管理者にお問い合わせください。';
      case ErrorCode.PDF_GENERATION_FAILED:
        return 'PDF生成に失敗しました。しばらく待ってから再試行してください。';
      case ErrorCode.SPREADSHEET_PERMISSION_ERROR:
        return 'スプレッドシートへのアクセス権限がありません。管理者にお問い合わせください。';
      case ErrorCode.DRIVE_PERMISSION_ERROR:
        return 'Google Driveへのアクセス権限がありません。管理者にお問い合わせください。';
      default:
        return 'エラーが発生しました。管理者にお問い合わせください。';
    }
  }

  /**
   * エラー情報をユーザーに表示
   */
  public static showErrorToUser(error: AppError, showDetails: boolean = false): void {
    const userMessage = this.getUserFriendlyMessage(error);
    const detailMessage = showDetails ? `\n\n詳細: ${error.message}\nコード: ${error.code}` : '';
    
    try {
      SpreadsheetApp.getUi().alert(
        'エラー',
        userMessage + detailMessage,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } catch (e) {
      // UIアラートが表示できない場合はコンソールに出力
      console.error('エラー表示失敗:', userMessage, error);
    }
  }
}

/**
 * エラーハンドリング用のヘルパー関数
 */
export function handleError(error: unknown, context?: string): AppError {
  return ErrorHandler.handle(error, context);
}

export function withRetry<T>(
  fn: () => T | Promise<T>,
  context?: string,
  maxRetries?: number
): Promise<T> {
  return ErrorHandler.withRetry(fn, context, maxRetries);
}

export function showErrorToUser(error: AppError, showDetails?: boolean): void {
  ErrorHandler.showErrorToUser(error, showDetails);
}

export function getUserFriendlyMessage(error: AppError): string {
  return ErrorHandler.getUserFriendlyMessage(error);
}