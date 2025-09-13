/**
 * システム設定を管理するモジュール
 */

/**
 * Script Propertiesから設定値を取得
 */
export const CONFIG = {
  // 環境設定
  ENVIRONMENT: PropertiesService.getScriptProperties().getProperty('ENVIRONMENT') || 'development',
  DEBUG_MODE: PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true',
  
  // API設定
  API_BASE_URL: PropertiesService.getScriptProperties().getProperty('API_BASE_URL') || '',
  
  // アプリケーション設定
  APP_NAME: 'GAS請求書管理システム',
  VERSION: '1.0.0',
  
  // スプレッドシート設定
  SHEET_NAMES: {
    CUSTOMERS: '顧客情報',
    USAGE: '使用量データ',
    INVOICES: '請求履歴',
    SETTINGS: '設定'
  }
};

/**
 * デバッグログ出力
 */
export function debugLog(message: string, data?: unknown): void {
  if (CONFIG.DEBUG_MODE) {
    console.log(`[${new Date().toISOString()}] ${message}`, data || '');
  }
}