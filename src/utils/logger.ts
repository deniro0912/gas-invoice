/**
 * ログユーティリティ
 */

import { isDebugMode, isProduction } from '../config';

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * ログ出力インターフェース
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: Error;
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  enableDebug: boolean;
  enableConsole: boolean;
  enableSpreadsheet: boolean;
  maxLogEntries: number;
}

/**
 * ロガークラス
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];

  private constructor() {
    this.config = {
      enableDebug: isDebugMode(),
      enableConsole: true,
      enableSpreadsheet: isProduction(), // 本番環境のみスプレッドシートログ
      maxLogEntries: 1000
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * デバッグログ
   */
  public debug(message: string, data?: unknown, context?: string): void {
    if (this.config.enableDebug) {
      this.log(LogLevel.DEBUG, message, context, data);
    }
  }

  /**
   * 情報ログ
   */
  public info(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * 警告ログ
   */
  public warn(message: string, data?: unknown, context?: string): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * エラーログ
   */
  public error(message: string, error?: Error, context?: string): void {
    this.log(LogLevel.ERROR, message, context, undefined, error);
  }

  /**
   * ログ出力の共通処理
   */
  private log(level: LogLevel, message: string, context?: string, data?: unknown, error?: Error): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error
    };

    // コンソール出力
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // ログバッファに保存
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer.shift(); // 古いログを削除
    }

    // スプレッドシートログ
    if (this.config.enableSpreadsheet) {
      this.outputToSpreadsheet(logEntry);
    }
  }

  /**
   * コンソール出力
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] ${entry.level}`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${contextStr}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.log(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.error || '');
        if (entry.error?.stack) {
          console.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  /**
   * スプレッドシートへのログ出力
   */
  private outputToSpreadsheet(entry: LogEntry): void {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) return;

      // ログシートを取得または作成
      let logSheet = ss.getSheetByName('システムログ');
      if (!logSheet) {
        logSheet = ss.insertSheet('システムログ');
        // ヘッダー設定
        logSheet.getRange(1, 1, 1, 6).setValues([
          ['タイムスタンプ', 'レベル', 'コンテキスト', 'メッセージ', 'データ', 'エラー']
        ]);
        logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      }

      // ログエントリを追加
      const nextRow = logSheet.getLastRow() + 1;
      const values = [
        entry.timestamp,
        entry.level,
        entry.context || '',
        entry.message,
        entry.data ? JSON.stringify(entry.data) : '',
        entry.error ? entry.error.toString() : ''
      ];

      logSheet.getRange(nextRow, 1, 1, 6).setValues([values]);

      // ログが多くなりすぎた場合は古いものを削除
      const maxRows = 1000;
      if (nextRow > maxRows) {
        logSheet.deleteRows(2, nextRow - maxRows);
      }

    } catch (error) {
      // スプレッドシートログでエラーが発生した場合はコンソールにのみ出力
      console.error('スプレッドシートログ出力エラー:', error);
    }
  }

  /**
   * ログバッファを取得
   */
  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * ログバッファをクリア
   */
  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * 設定を更新
   */
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * ロガーのヘルパー関数
 */
const logger = Logger.getInstance();

export function logDebug(message: string, data?: unknown, context?: string): void {
  logger.debug(message, data, context);
}

export function logInfo(message: string, data?: unknown, context?: string): void {
  logger.info(message, data, context);
}

export function logWarn(message: string, data?: unknown, context?: string): void {
  logger.warn(message, data, context);
}

export function logError(message: string, error?: Error, context?: string): void {
  logger.error(message, error, context);
}