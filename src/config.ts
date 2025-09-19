/**
 * システム設定管理
 */

/**
 * 環境設定
 */
export interface AppConfig {
  environment: 'development' | 'production';
  debugMode: boolean;
  spreadsheetId?: string;
  templateFolderName: string;
  templateFileName: string;
  outputFolderName: string;
  maxRetries: number;
  requestTimeout: number;
}

/**
 * スプレッドシート設定
 */
export interface SpreadsheetConfig {
  customerSheetName: string;
  invoiceSheetName: string;
  invoiceDetailSheetName: string;
  maxRows: number;
  batchSize: number;
}

/**
 * PDF設定
 */
export interface PDFConfig {
  templateFolderName: string;
  templateFileName: string;
  outputFolderName: string;
  defaultFontSize: number;
  dateFormat: string;
  numberFormat: string;
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: AppConfig = {
  environment: 'development',
  debugMode: true,
  templateFolderName: '請求書テンプレート',
  templateFileName: 'invoice_template.pdf',
  outputFolderName: '請求書',
  maxRetries: 3,
  requestTimeout: 30000 // 30秒
};

const DEFAULT_SPREADSHEET_CONFIG: SpreadsheetConfig = {
  customerSheetName: '顧客マスタ',
  invoiceSheetName: '請求書データ',
  invoiceDetailSheetName: '請求明細',
  maxRows: 10000,
  batchSize: 100
};

const DEFAULT_PDF_CONFIG: PDFConfig = {
  templateFolderName: '請求書テンプレート',
  templateFileName: 'invoice_template.pdf',
  outputFolderName: '請求書',
  defaultFontSize: 12,
  dateFormat: 'yyyy年MM月dd日',
  numberFormat: '#,##0'
};

/**
 * 設定管理クラス
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private spreadsheetConfig: SpreadsheetConfig;
  private pdfConfig: PDFConfig;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 設定を読み込む
   */
  private loadConfig(): void {
    try {
      const properties = PropertiesService.getScriptProperties();
      
      // アプリケーション設定
      const environment = properties.getProperty('ENVIRONMENT') as 'development' | 'production' || 'development';
      const debugMode = properties.getProperty('DEBUG_MODE') === 'true';
      const spreadsheetId = properties.getProperty('SPREADSHEET_ID') || undefined;
      
      this.config = {
        ...DEFAULT_CONFIG,
        environment,
        debugMode,
        spreadsheetId
      };

      // スプレッドシート設定
      this.spreadsheetConfig = {
        ...DEFAULT_SPREADSHEET_CONFIG
      };

      // PDF設定
      this.pdfConfig = {
        ...DEFAULT_PDF_CONFIG
      };

    } catch (error) {
      console.error('設定読み込みエラー:', error);
      // デフォルト設定にフォールバック
      this.config = DEFAULT_CONFIG;
      this.spreadsheetConfig = DEFAULT_SPREADSHEET_CONFIG;
      this.pdfConfig = DEFAULT_PDF_CONFIG;
    }
  }

  /**
   * アプリケーション設定を取得
   */
  public getAppConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * スプレッドシート設定を取得
   */
  public getSpreadsheetConfig(): SpreadsheetConfig {
    return { ...this.spreadsheetConfig };
  }

  /**
   * PDF設定を取得
   */
  public getPDFConfig(): PDFConfig {
    return { ...this.pdfConfig };
  }

  /**
   * 環境を取得
   */
  public getEnvironment(): 'development' | 'production' {
    return this.config.environment;
  }

  /**
   * デバッグモードかどうか
   */
  public isDebugMode(): boolean {
    return this.config.debugMode;
  }

  /**
   * 本番環境かどうか
   */
  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<AppConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 設定をリロード
   */
  public reload(): void {
    this.loadConfig();
  }

  /**
   * 会社情報を取得
   */
  public getCompanyInfo(): any {
    return {
      name: PropertiesService.getScriptProperties().getProperty('COMPANY_NAME') || '株式会社サンプル',
      postalCode: PropertiesService.getScriptProperties().getProperty('COMPANY_POSTAL_CODE') || '100-0001',
      address: PropertiesService.getScriptProperties().getProperty('COMPANY_ADDRESS') || '東京都千代田区千代田1-1',
      phone: PropertiesService.getScriptProperties().getProperty('COMPANY_PHONE') || '03-1234-5678',
      email: PropertiesService.getScriptProperties().getProperty('COMPANY_EMAIL') || 'info@example.com',
      website: PropertiesService.getScriptProperties().getProperty('COMPANY_WEBSITE') || 'https://example.com'
    };
  }

  /**
   * 銀行情報を取得
   */
  public getBankInfo(): any {
    return {
      details: PropertiesService.getScriptProperties().getProperty('BANK_DETAILS') || 
              'みずほ銀行 東京支店 普通 1234567 カ)サンプル'
    };
  }
}

/**
 * 設定取得のヘルパー関数
 */
export function getConfig(): AppConfig {
  return ConfigManager.getInstance().getAppConfig();
}

export function getSpreadsheetConfig(): SpreadsheetConfig {
  return ConfigManager.getInstance().getSpreadsheetConfig();
}

export function getPDFConfig(): PDFConfig {
  return ConfigManager.getInstance().getPDFConfig();
}

export function isDebugMode(): boolean {
  return ConfigManager.getInstance().isDebugMode();
}

export function isProduction(): boolean {
  return ConfigManager.getInstance().isProduction();
}