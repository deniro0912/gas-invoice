/**
 * スプレッドシートを開いたときに実行されるトリガー関数
 */
export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GAS請求書管理システム')
    .addItem('テスト実行', 'testFunction')
    .addItem('包括的テスト実行', 'runTestsWithLogs')
    .addItem('請求書作成', 'createInvoice')
    .addSeparator()
    .addItem('設定', 'showSettings')
    .addToUi();
}

/**
 * テスト関数
 */
export function testFunction(): void {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const now = new Date();
  
  // 環境変数の取得
  const environment = PropertiesService.getScriptProperties().getProperty('ENVIRONMENT') || 'unknown';
  const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
  
  // テストメッセージをシートに書き込み
  sheet.getRange(1, 1).setValue('システムテスト');
  sheet.getRange(2, 1).setValue(`実行日時: ${now.toLocaleString('ja-JP')}`);
  sheet.getRange(3, 1).setValue(`環境: ${environment}`);
  sheet.getRange(4, 1).setValue(`デバッグモード: ${debugMode ? '有効' : '無効'}`);
  
  // ユーザーに通知
  SpreadsheetApp.getUi().alert('テストが完了しました！');
  
  if (debugMode) {
    console.log('テスト関数が実行されました', {
      timestamp: now.toISOString(),
      environment
    });
  }
}

/**
 * 請求書作成関数（サンプル）
 */
export function createInvoice(): void {
  const ui = SpreadsheetApp.getUi();
  
  // 確認ダイアログ
  const response = ui.alert(
    '請求書作成',
    '請求書を作成しますか？',
    ui.ButtonSet.YES_NO
  );
  
  if (response === ui.Button.YES) {
    // TODO: 請求書作成ロジックを実装
    ui.alert('請求書作成機能は開発中です');
  }
}

/**
 * 設定画面表示関数
 */
export function showSettings(): void {
  const ui = SpreadsheetApp.getUi();
  const properties = PropertiesService.getScriptProperties();
  const allProps = properties.getProperties();
  
  let message = '現在の設定:\\n\\n';
  for (const [key, value] of Object.entries(allProps)) {
    // セキュリティ上、一部の値はマスク
    const displayValue = key.includes('SECRET') || key.includes('KEY') 
      ? '***' 
      : value;
    message += `${key}: ${displayValue}\\n`;
  }
  
  ui.alert('システム設定', message, ui.ButtonSet.OK);
}

/**
 * 包括的テスト実行関数（詳細ログとスプレッドシート出力）
 */
export function runTestsWithLogs(): any {
  console.log('=== GAS請求書管理システム テスト開始 ===');
  
  const results: any = {};
  const startTime = new Date();
  let testSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  let logSheet: GoogleAppsScript.Spreadsheet.Sheet;
  
  try {
    // 環境変数テスト
    console.log('1. 環境変数テスト実行中...');
    const environment = PropertiesService.getScriptProperties().getProperty('ENVIRONMENT') || 'unknown';
    const debugMode = PropertiesService.getScriptProperties().getProperty('DEBUG_MODE') === 'true';
    
    results.environment = {
      status: 'success',
      data: { environment, debugMode }
    };
    console.log(`   環境: ${environment}, デバッグモード: ${debugMode ? '有効' : '無効'}`);
    
    // テスト結果記録用スプレッドシート作成
    console.log('2. テスト結果スプレッドシート作成中...');
    testSpreadsheet = SpreadsheetApp.create(`GAS請求書管理システム - テスト結果 ${startTime.toLocaleString('ja-JP')}`);
    logSheet = testSpreadsheet.getActiveSheet();
    logSheet.setName('テスト実行ログ');
    
    // ヘッダー設定
    const headers = ['時刻', 'テスト項目', 'ステータス', '詳細', 'メモ'];
    logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    
    let logRow = 2;
    function addLogEntry(testName: string, status: string, details: string, notes: string = '') {
      const timestamp = new Date().toLocaleString('ja-JP');
      logSheet.getRange(logRow, 1, 1, 5).setValues([[timestamp, testName, status, details, notes]]);
      logRow++;
    }
    
    addLogEntry('テスト開始', '開始', `環境: ${environment}`, `開始時刻: ${startTime.toISOString()}`);
    
    results.spreadsheet = {
      status: 'success',
      data: { 
        url: testSpreadsheet.getUrl(),
        id: testSpreadsheet.getId()
      }
    };
    console.log(`   テスト結果スプレッドシート: ${testSpreadsheet.getUrl()}`);
    
    addLogEntry('環境変数テスト', '成功', `環境: ${environment}, デバッグ: ${debugMode}`, 'Script Properties正常');
    
    // データ書き込みテスト
    console.log('3. 基本データ書き込みテスト実行中...');
    const testSheet = testSpreadsheet.insertSheet('データテスト');
    const testData = [
      ['システムテスト', '値'],
      ['実行日時', startTime.toLocaleString('ja-JP')],
      ['環境', environment],
      ['デバッグモード', debugMode ? '有効' : '無効'],
      ['テスト完了時刻', new Date().toLocaleString('ja-JP')]
    ];
    
    const range = testSheet.getRange(1, 1, testData.length, 2);
    range.setValues(testData);
    
    addLogEntry('データ書き込みテスト', '成功', `${testData.length}行書き込み完了`, 'Range操作正常');
    
    results.dataWrite = {
      status: 'success',
      data: { rowsWritten: testData.length }
    };
    console.log(`   ${testData.length}行のデータ書き込み完了`);
    
    // 全体結果とサマリー
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    addLogEntry('テスト完了', '成功', `実行時間: ${duration}ms`, `終了時刻: ${endTime.toISOString()}`);
    
    // サマリーシート作成
    const summarySheet = testSpreadsheet.insertSheet('テストサマリー');
    const summaryData = [
      ['項目', '値'],
      ['実行開始時刻', startTime.toLocaleString('ja-JP')],
      ['実行終了時刻', endTime.toLocaleString('ja-JP')],
      ['実行時間', `${duration}ms`],
      ['環境', environment],
      ['デバッグモード', debugMode ? '有効' : '無効'],
      ['実行した関数', 'runTestsWithLogs()'],
      ['スプレッドシートURL', testSpreadsheet.getUrl()]
    ];
    summarySheet.getRange(1, 1, summaryData.length, 2).setValues(summaryData);
    summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    
    results.summary = {
      status: 'success',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      spreadsheetUrl: testSpreadsheet.getUrl(),
      testLogUrl: testSpreadsheet.getUrl() + '#gid=' + logSheet.getSheetId()
    };
    
    console.log('=== テスト完了 ===');
    console.log(`実行時間: ${duration}ms`);
    console.log(`テスト結果スプレッドシート: ${testSpreadsheet.getUrl()}`);
    
    return results;
    
  } catch (error: any) {
    console.error('❌ テストエラー:', error.toString());
    console.error('スタックトレース:', error.stack);
    
    // エラー情報もスプレッドシートに記録（可能であれば）
    try {
      if (testSpreadsheet && logSheet) {
        const errorTime = new Date().toLocaleString('ja-JP');
        logSheet.getRange(logRow, 1, 1, 5).setValues([[
          errorTime, 
          'エラー発生', 
          '失敗', 
          error.toString(), 
          error.stack || 'スタックトレース無し'
        ]]);
      }
    } catch (logError) {
      console.error('ログ記録エラー:', logError);
    }
    
    results.error = {
      status: 'error',
      message: error.toString(),
      stack: error.stack,
      spreadsheetUrl: testSpreadsheet ? testSpreadsheet.getUrl() : 'スプレッドシート作成前にエラー'
    };
    
    return results;
  }
}

/**
 * テスト結果を取得するためのAPI的関数
 */
export function getLastTestResults(): string {
  try {
    // 最新のテスト結果スプレッドシートを検索
    const files = DriveApp.getFilesByName('GAS請求書管理システム - テスト結果');
    const fileList = [];
    
    while (files.hasNext()) {
      const file = files.next();
      fileList.push({
        name: file.getName(),
        url: file.getUrl(),
        lastModified: file.getLastUpdated()
      });
    }
    
    if (fileList.length === 0) {
      return JSON.stringify({
        status: 'no_tests',
        message: 'テスト結果が見つかりません。先にrunTestsWithLogs()を実行してください。'
      });
    }
    
    // 最新のファイルを取得
    fileList.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    const latestTest = fileList[0];
    
    return JSON.stringify({
      status: 'success',
      latestTestUrl: latestTest.url,
      lastModified: latestTest.lastModified.toISOString(),
      totalTestFiles: fileList.length,
      message: `最新のテスト結果: ${latestTest.url}`
    });
    
  } catch (error: any) {
    return JSON.stringify({
      status: 'error',
      message: error.toString()
    });
  }
}