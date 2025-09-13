/**
 * スプレッドシート初期化ユーティリティ
 */

import { getSpreadsheetConfig } from '../config';
import { logInfo, logError, logWarn } from './logger';
import { SpreadsheetError, ErrorCode, handleError } from './error-handler';

/**
 * 初期化オプション
 */
export interface InitializationOptions {
  recreateSheets?: boolean;      // 既存シートを削除して再作成
  addSampleData?: boolean;       // サンプルデータを追加
  setProtection?: boolean;       // シート保護を設定
  setValidation?: boolean;       // データ検証を設定
}

/**
 * シート設定情報
 */
export interface SheetConfig {
  name: string;
  headers: string[];
  columnWidths?: number[];
  frozenRows?: number;
  frozenColumns?: number;
  protectedRanges?: string[];
  validationRules?: ValidationRule[];
}

/**
 * データ検証ルール
 */
export interface ValidationRule {
  range: string;
  type: 'LIST' | 'DATE' | 'NUMBER' | 'TEXT_LENGTH' | 'CUSTOM';
  values?: string[];
  min?: number;
  max?: number;
  formula?: string;
  helpText?: string;
  showDropdown?: boolean;
}

/**
 * スプレッドシート初期化クラス
 */
export class SheetInitializer {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private config = getSpreadsheetConfig();

  constructor(spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    
    if (!this.spreadsheet) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_ACCESS_ERROR,
        'アクティブなスプレッドシートが見つかりません',
        'SheetInitializer'
      );
    }
  }

  /**
   * 全体初期化
   */
  public async initialize(options: InitializationOptions = {}): Promise<void> {
    logInfo('スプレッドシート初期化開始', options, 'SheetInitializer');

    try {
      // シート設定を定義
      const sheetConfigs = this.getSheetConfigs();

      // 各シートを作成
      for (const sheetConfig of sheetConfigs) {
        await this.createSheet(sheetConfig, options);
      }

      // 初期データの投入
      if (options.addSampleData) {
        await this.addSampleData();
      }

      // 全体的な設定
      this.setupSpreadsheetSettings();

      logInfo('スプレッドシート初期化完了', undefined, 'SheetInitializer');

    } catch (error) {
      const appError = handleError(error, 'SheetInitializer.initialize');
      logError('スプレッドシート初期化失敗', appError, 'SheetInitializer');
      throw appError;
    }
  }

  /**
   * シート設定を取得
   */
  private getSheetConfigs(): SheetConfig[] {
    return [
      // 顧客マスタシート
      {
        name: this.config.customerSheetName,
        headers: [
          '顧客ID', '会社名', '担当者名', '郵便番号', 
          '住所', 'メールアドレス', '電話番号', '登録日', '更新日'
        ],
        columnWidths: [100, 200, 120, 100, 300, 200, 120, 120, 120],
        frozenRows: 1,
        frozenColumns: 2,
        protectedRanges: ['A:A', 'H:I'], // 顧客ID、登録日・更新日を保護
        validationRules: [
          {
            range: 'D2:D1000', // 郵便番号
            type: 'CUSTOM',
            formula: 'REGEXMATCH(D2,"^\\d{3}-\\d{4}$")',
            helpText: '郵便番号は「123-4567」の形式で入力してください'
          },
          {
            range: 'F2:F1000', // メールアドレス
            type: 'CUSTOM',
            formula: 'REGEXMATCH(F2,"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")',
            helpText: '有効なメールアドレスを入力してください'
          }
        ]
      },
      
      // 請求書データシート
      {
        name: this.config.invoiceSheetName,
        headers: [
          '請求書番号', '発行日', '顧客ID', '広告主', '件名',
          '小計', '税額', '合計金額', '備考', 'ステータス', 'PDF URL', '作成日', '更新日'
        ],
        columnWidths: [120, 100, 100, 150, 200, 100, 100, 120, 200, 100, 250, 120, 120],
        frozenRows: 1,
        frozenColumns: 3,
        protectedRanges: ['A:A', 'F:H', 'K:M'], // 請求書番号、金額計算、URL、日付を保護
        validationRules: [
          {
            range: 'J2:J1000', // ステータス
            type: 'LIST',
            values: ['draft', 'issued', 'cancelled'],
            helpText: 'ステータスを選択してください',
            showDropdown: true
          }
        ]
      },

      // 請求明細シート
      {
        name: this.config.invoiceDetailSheetName,
        headers: [
          '明細ID', '請求書番号', '品目名', '数量', '単位', '単価', '税率', '金額'
        ],
        columnWidths: [100, 120, 100, 80, 60, 100, 80, 100],
        frozenRows: 1,
        frozenColumns: 2,
        protectedRanges: ['A:A', 'C:E', 'G:H'], // 明細ID、固定項目、税率・金額を保護
        validationRules: [
          {
            range: 'C2:C1000', // 品目名
            type: 'LIST',
            values: ['制作費'],
            helpText: '品目名は「制作費」固定です',
            showDropdown: true
          },
          {
            range: 'D2:D1000', // 数量
            type: 'NUMBER',
            min: 1,
            max: 1,
            helpText: '数量は「1」固定です'
          },
          {
            range: 'E2:E1000', // 単位
            type: 'LIST',
            values: ['式'],
            helpText: '単位は「式」固定です',
            showDropdown: true
          }
        ]
      }
    ];
  }

  /**
   * 個別シート作成
   */
  private async createSheet(sheetConfig: SheetConfig, options: InitializationOptions): Promise<void> {
    logInfo(`シート作成開始: ${sheetConfig.name}`, undefined, 'SheetInitializer');

    try {
      let sheet = this.spreadsheet.getSheetByName(sheetConfig.name);

      // 既存シートの処理
      if (sheet) {
        if (options.recreateSheets) {
          logWarn(`既存シートを削除: ${sheetConfig.name}`, undefined, 'SheetInitializer');
          this.spreadsheet.deleteSheet(sheet);
          sheet = null;
        } else {
          logInfo(`既存シートをスキップ: ${sheetConfig.name}`, undefined, 'SheetInitializer');
          return;
        }
      }

      // 新規シート作成
      if (!sheet) {
        sheet = this.spreadsheet.insertSheet(sheetConfig.name);
        logInfo(`新規シート作成: ${sheetConfig.name}`, undefined, 'SheetInitializer');
      }

      // ヘッダー設定
      this.setupHeaders(sheet, sheetConfig);

      // 列幅設定
      if (sheetConfig.columnWidths) {
        this.setupColumnWidths(sheet, sheetConfig.columnWidths);
      }

      // 固定行・列設定
      this.setupFrozenRowsColumns(sheet, sheetConfig);

      // データ検証設定
      if (options.setValidation && sheetConfig.validationRules) {
        this.setupValidationRules(sheet, sheetConfig.validationRules);
      }

      // シート保護設定
      if (options.setProtection && sheetConfig.protectedRanges) {
        this.setupProtection(sheet, sheetConfig.protectedRanges);
      }

      logInfo(`シート作成完了: ${sheetConfig.name}`, undefined, 'SheetInitializer');

    } catch (error) {
      const appError = handleError(error, `SheetInitializer.createSheet(${sheetConfig.name})`);
      logError(`シート作成失敗: ${sheetConfig.name}`, appError, 'SheetInitializer');
      throw appError;
    }
  }

  /**
   * ヘッダー設定
   */
  private setupHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet, config: SheetConfig): void {
    const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
    headerRange.setValues([config.headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#E8F0FE');
    headerRange.setBorder(
      true, true, true, true, true, true,
      '#1155CC', SpreadsheetApp.BorderStyle.SOLID
    );
  }

  /**
   * 列幅設定
   */
  private setupColumnWidths(sheet: GoogleAppsScript.Spreadsheet.Sheet, widths: number[]): void {
    widths.forEach((width, index) => {
      sheet.setColumnWidth(index + 1, width);
    });
  }

  /**
   * 固定行・列設定
   */
  private setupFrozenRowsColumns(sheet: GoogleAppsScript.Spreadsheet.Sheet, config: SheetConfig): void {
    if (config.frozenRows) {
      sheet.setFrozenRows(config.frozenRows);
    }
    if (config.frozenColumns) {
      sheet.setFrozenColumns(config.frozenColumns);
    }
  }

  /**
   * データ検証設定
   */
  private setupValidationRules(sheet: GoogleAppsScript.Spreadsheet.Sheet, rules: ValidationRule[]): void {
    rules.forEach(rule => {
      try {
        const range = sheet.getRange(rule.range);
        let validationBuilder = SpreadsheetApp.newDataValidation();

        switch (rule.type) {
          case 'LIST':
            validationBuilder = validationBuilder
              .requireValueInList(rule.values || [], rule.showDropdown !== false);
            break;
          case 'DATE':
            validationBuilder = validationBuilder.requireDate();
            break;
          case 'NUMBER':
            if (rule.min !== undefined && rule.max !== undefined) {
              validationBuilder = validationBuilder.requireNumberBetween(rule.min, rule.max);
            } else if (rule.min !== undefined) {
              validationBuilder = validationBuilder.requireNumberGreaterThanOrEqualTo(rule.min);
            } else if (rule.max !== undefined) {
              validationBuilder = validationBuilder.requireNumberLessThanOrEqualTo(rule.max);
            }
            break;
          case 'CUSTOM':
            if (rule.formula) {
              validationBuilder = validationBuilder.requireFormulaSatisfied(rule.formula);
            }
            break;
        }

        if (rule.helpText) {
          validationBuilder = validationBuilder.setHelpText(rule.helpText);
        }

        const validation = validationBuilder.build();
        range.setDataValidation(validation);

      } catch (error) {
        logWarn(
          `データ検証設定失敗: ${rule.range}`,
          { error: error.toString() },
          'SheetInitializer'
        );
      }
    });
  }

  /**
   * シート保護設定
   */
  private setupProtection(sheet: GoogleAppsScript.Spreadsheet.Sheet, protectedRanges: string[]): void {
    protectedRanges.forEach(rangeA1Notation => {
      try {
        const range = sheet.getRange(rangeA1Notation);
        const protection = range.protect();
        protection.setDescription(`自動設定による保護範囲: ${rangeA1Notation}`);
        
        // 編集者を制限（必要に応じて調整）
        protection.removeEditors(protection.getEditors());
        protection.addEditor(Session.getActiveUser().getEmail());

      } catch (error) {
        logWarn(
          `シート保護設定失敗: ${rangeA1Notation}`,
          { error: error.toString() },
          'SheetInitializer'
        );
      }
    });
  }

  /**
   * サンプルデータ追加
   */
  private async addSampleData(): Promise<void> {
    logInfo('サンプルデータ追加開始', undefined, 'SheetInitializer');

    try {
      // 顧客マスタのサンプルデータ
      await this.addSampleCustomers();

      // 請求書のサンプルデータ（オプション）
      // await this.addSampleInvoices();

      logInfo('サンプルデータ追加完了', undefined, 'SheetInitializer');

    } catch (error) {
      const appError = handleError(error, 'SheetInitializer.addSampleData');
      logWarn('サンプルデータ追加失敗', appError, 'SheetInitializer');
      // サンプルデータのエラーは致命的ではないので継続
    }
  }

  /**
   * サンプル顧客データ追加
   */
  private async addSampleCustomers(): Promise<void> {
    const customerSheet = this.spreadsheet.getSheetByName(this.config.customerSheetName);
    if (!customerSheet) return;

    const now = new Date();
    const sampleData = [
      ['C00001', '株式会社サンプル', '田中太郎', '100-0001', '東京都千代田区千代田1-1', 'tanaka@sample.com', '03-1234-5678', now, now],
      ['C00002', '有限会社テスト', '佐藤花子', '160-0023', '東京都新宿区西新宿1-1', 'sato@test.co.jp', '03-8765-4321', now, now],
      ['C00003', 'デモ商事株式会社', '鈴木一郎', '150-0043', '東京都渋谷区道玄坂1-1', 'suzuki@demo.com', '03-5555-1234', now, now]
    ];

    const range = customerSheet.getRange(2, 1, sampleData.length, sampleData[0].length);
    range.setValues(sampleData);
    
    logInfo(`サンプル顧客データ追加: ${sampleData.length}件`, undefined, 'SheetInitializer');
  }

  /**
   * スプレッドシート全体設定
   */
  private setupSpreadsheetSettings(): void {
    try {
      // スプレッドシート名の設定
      const currentName = this.spreadsheet.getName();
      if (!currentName.includes('請求書管理')) {
        this.spreadsheet.rename(`請求書管理システム - ${new Date().toLocaleDateString('ja-JP')}`);
      }

      // タイムゾーンの設定
      this.spreadsheet.setSpreadsheetTimeZone('Asia/Tokyo');

      // ロケールの設定
      this.spreadsheet.setSpreadsheetLocale('ja_JP');

      // 反復計算の設定
      this.spreadsheet.setRecalculationMode(SpreadsheetApp.RecalculationMode.ON_CHANGE);

      logInfo('スプレッドシート全体設定完了', undefined, 'SheetInitializer');

    } catch (error) {
      logWarn('スプレッドシート全体設定で一部エラー', { error: error.toString() }, 'SheetInitializer');
    }
  }

  /**
   * 初期化状況確認
   */
  public checkInitialization(): { initialized: boolean; missingSheets: string[] } {
    const requiredSheets = [
      this.config.customerSheetName,
      this.config.invoiceSheetName,
      this.config.invoiceDetailSheetName
    ];

    const existingSheets = this.spreadsheet.getSheets().map(sheet => sheet.getName());
    const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

    return {
      initialized: missingSheets.length === 0,
      missingSheets
    };
  }
}

/**
 * ヘルパー関数
 */
export function initializeSpreadsheet(
  options: InitializationOptions = {},
  spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet
): Promise<void> {
  const initializer = new SheetInitializer(spreadsheet);
  return initializer.initialize(options);
}

export function checkSpreadsheetInitialization(
  spreadsheet?: GoogleAppsScript.Spreadsheet.Spreadsheet
): { initialized: boolean; missingSheets: string[] } {
  const initializer = new SheetInitializer(spreadsheet);
  return initializer.checkInitialization();
}