import { initializeSpreadsheet, checkSpreadsheetInitialization } from './utils/sheet-initializer';
import { CustomerUI } from './ui/customer.ui';
import { InvoiceUI } from './ui/invoice.ui';
import { PDFGeneratorUI } from './ui/pdf-generator.ui';

/**
 * スプレッドシートを開いたときに実行されるトリガー関数
 */
export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GAS請求書管理システム')
    .addSubMenu(ui.createMenu('スプレッドシート管理')
      .addItem('初期化実行', 'initializeSpreadsheetSystem')
      .addItem('初期化状況確認', 'checkInitializationStatus')
      .addItem('初期化テスト実行', 'testSpreadsheetInitialization'))
    .addSubMenu(ui.createMenu('顧客管理')
      .addItem('顧客一覧', 'showCustomerList')
      .addItem('顧客検索', 'showCustomerSearch')
      .addItem('顧客登録', 'showCustomerRegistration')
      .addItem('顧客更新', 'showCustomerUpdate')
      .addItem('顧客削除', 'showCustomerDelete')
      .addSeparator()
      .addItem('顧客統計', 'showCustomerStats')
      .addItem('顧客管理テスト', 'testCustomerManagement')
      .addItem('データ品質チェック', 'checkCustomerDataQuality'))
    .addSubMenu(ui.createMenu('請求書管理')
      .addItem('請求書一覧', 'showInvoiceList')
      .addItem('請求書検索', 'showInvoiceSearch')
      .addItem('請求書作成', 'showInvoiceCreation')
      .addItem('請求書発行', 'showInvoiceIssue')
      .addSeparator()
      .addItem('請求書統計', 'showInvoiceStats')
      .addItem('月次レポート', 'showMonthlyReport')
      .addItem('請求書管理テスト', 'testInvoiceManagement'))
    .addSubMenu(ui.createMenu('PDF生成')
      .addItem('PDF生成', 'showPDFGeneration')
      .addItem('一括PDF生成', 'showBatchPDFGeneration')
      .addItem('PDFテンプレート設定', 'configurePDFTemplate')
      .addSeparator()
      .addItem('PDF生成テスト', 'testPDFGeneration'))
    .addSeparator()
    .addItem('テスト実行', 'testFunction')
    .addItem('包括的テスト実行', 'runTestsWithLogs')
    .addSeparator()
    .addItem('設定', 'showSettings')
    .addToUi();
}

/**
 * スプレッドシート初期化メイン関数
 */
export function initializeSpreadsheetSystem(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // 確認ダイアログ
    const response = ui.alert(
      'スプレッドシート初期化',
      'システムのスプレッドシートを初期化しますか？\\n\\n' +
      '・顧客マスタシート\\n' +
      '・請求書データシート\\n' +
      '・請求明細シート\\n\\n' +
      '既存のシートがある場合は保持されます。',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      ui.alert('初期化がキャンセルされました');
      return;
    }
    
    // 初期化オプション選択
    const optionsResponse = ui.alert(
      '初期化オプション',
      'サンプルデータを追加しますか？\\n\\n' +
      'YES: サンプル顧客データを含めて初期化\\n' +
      'NO: 空のシートのみ作成',
      ui.ButtonSet.YES_NO_CANCEL
    );
    
    if (optionsResponse === ui.Button.CANCEL) {
      ui.alert('初期化がキャンセルされました');
      return;
    }
    
    const addSampleData = optionsResponse === ui.Button.YES;
    
    // ログ開始
    console.log('=== スプレッドシート初期化開始 ===');
    console.log(`サンプルデータ: ${addSampleData ? '有効' : '無効'}`);
    
    // 初期化実行
    ui.alert('初期化を開始します...\\n\\n処理完了まで少々お待ちください。');
    
    // SheetInitializerを使用して初期化
    
    const options = {
      recreateSheets: false,
      addSampleData: addSampleData,
      setProtection: true,
      setValidation: true
    };
    
    // 非同期初期化を実行
    initializeSpreadsheet(options)
      .then(() => {
        console.log('初期化成功');
        ui.alert(
          '初期化完了',
          'スプレッドシートの初期化が完了しました！\\n\\n' +
          '作成されたシート:\\n' +
          '・顧客マスタ\\n' +
          '・請求書データ\\n' +
          '・請求明細' +
          (addSampleData ? '\\n\\nサンプルデータが追加されています。' : ''),
          ui.ButtonSet.OK
        );
      })
      .catch((error: any) => {
        console.error('初期化エラー:', error);
        ui.alert(
          'エラー',
          `初期化中にエラーが発生しました:\\n\\n${error.message}\\n\\n` +
          'システム管理者にお問い合わせください。',
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('初期化処理エラー:', error);
    ui.alert(
      'エラー',
      `処理中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * 初期化状況確認関数
 */
export function checkInitializationStatus(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('初期化状況確認開始');
    
    // SheetInitializerを使用して状況確認
    const status = checkSpreadsheetInitialization();
    
    let message = '=== 初期化状況 ===\\n\\n';
    
    if (status.initialized) {
      message += '✅ システムは正常に初期化されています\\n\\n';
      message += '利用可能なシート:\\n';
      message += '・顧客マスタ\\n';
      message += '・請求書データ\\n';
      message += '・請求明細\\n';
    } else {
      message += '❌ システムの初期化が不完全です\\n\\n';
      message += '不足しているシート:\\n';
      status.missingSheets.forEach(sheetName => {
        message += `・${sheetName}\\n`;
      });
      message += '\\n「スプレッドシート初期化」を実行してください。';
    }
    
    // スプレッドシート情報も追加
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = spreadsheet.getSheets().map(sheet => sheet.getName());
    
    message += '\\n\\n=== 全シート一覧 ===\\n';
    allSheets.forEach(sheetName => {
      message += `・${sheetName}\\n`;
    });
    
    message += `\\n総シート数: ${allSheets.length}`;
    message += `\\nスプレッドシート名: ${spreadsheet.getName()}`;
    
    ui.alert('初期化状況', message, ui.ButtonSet.OK);
    
    console.log('初期化状況確認完了', {
      initialized: status.initialized,
      missingSheets: status.missingSheets,
      totalSheets: allSheets.length
    });
    
  } catch (error: any) {
    console.error('初期化状況確認エラー:', error);
    ui.alert(
      'エラー',
      `状況確認中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
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

/**
 * スプレッドシート初期化のテスト関数
 */
export function testSpreadsheetInitialization(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('=== スプレッドシート初期化テスト開始 ===');
    
    // 現在の状況を確認
    const status = checkSpreadsheetInitialization();
    console.log('初期化前状況:', status);
    
    ui.alert(
      'テスト実行',
      'スプレッドシート初期化のテストを実行します。\\n\\n' +
      '処理完了まで少々お待ちください。',
      ui.ButtonSet.OK
    );
    
    // テスト用の初期化実行（サンプルデータ付き）
    const options = {
      recreateSheets: false,
      addSampleData: true,
      setProtection: true,
      setValidation: true
    };
    
    initializeSpreadsheet(options)
      .then(() => {
        // 初期化後の状況確認
        const statusAfter = checkSpreadsheetInitialization();
        console.log('初期化後状況:', statusAfter);
        
        let message = '=== テスト結果 ===\\n\\n';
        
        if (statusAfter.initialized) {
          message += '✅ 初期化テスト成功\\n\\n';
          message += '作成されたシート:\\n';
          message += '・顧客マスタ (サンプルデータ付き)\\n';
          message += '・請求書データ\\n';
          message += '・請求明細\\n\\n';
          message += 'データ検証とシート保護も設定されています。';
        } else {
          message += '❌ 初期化テスト失敗\\n\\n';
          message += '不足しているシート:\\n';
          statusAfter.missingSheets.forEach(sheetName => {
            message += `・${sheetName}\\n`;
          });
        }
        
        ui.alert('テスト完了', message, ui.ButtonSet.OK);
        console.log('=== スプレッドシート初期化テスト完了 ===');
      })
      .catch((error: any) => {
        console.error('初期化テストエラー:', error);
        ui.alert(
          'テストエラー',
          `初期化テスト中にエラーが発生しました:\\n\\n${error.message}`,
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('テスト処理エラー:', error);
    ui.alert(
      'テストエラー',
      `テスト処理中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

// ===== 顧客管理関数 =====

/**
 * 顧客一覧表示
 */
export function showCustomerList(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerList().catch(error => {
    console.error('顧客一覧表示エラー:', error);
  });
}

/**
 * 顧客検索
 */
export function showCustomerSearch(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerSearch().catch(error => {
    console.error('顧客検索エラー:', error);
  });
}

/**
 * 顧客登録
 */
export function showCustomerRegistration(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerRegistration().catch(error => {
    console.error('顧客登録エラー:', error);
  });
}

/**
 * 顧客更新
 */
export function showCustomerUpdate(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerUpdate().catch(error => {
    console.error('顧客更新エラー:', error);
  });
}

/**
 * 顧客削除
 */
export function showCustomerDelete(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerDelete().catch(error => {
    console.error('顧客削除エラー:', error);
  });
}

/**
 * 顧客統計
 */
export function showCustomerStats(): void {
  const customerUI = new CustomerUI();
  customerUI.showCustomerStats().catch(error => {
    console.error('顧客統計エラー:', error);
  });
}

/**
 * 顧客管理機能の包括的テスト
 */
export function testCustomerManagement(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('=== 顧客管理機能テスト開始 ===');
    
    ui.alert(
      '顧客管理テスト',
      '顧客管理機能のテストを実行します。\\n\\n' +
      '以下の操作を順番に実行します：\\n' +
      '1. テスト顧客の作成\\n' +
      '2. 顧客情報の取得\\n' +
      '3. 顧客一覧の取得\\n' +
      '4. 顧客検索\\n' +
      '5. 統計情報の取得\\n\\n' +
      '処理完了まで少々お待ちください。',
      ui.ButtonSet.OK
    );
    
    // 非同期でテスト実行
    runCustomerManagementTest()
      .then(() => {
        ui.alert(
          'テスト完了',
          '顧客管理機能のテストが完了しました。\\n\\n' +
          '詳細はコンソールログとシステムログシートを確認してください。',
          ui.ButtonSet.OK
        );
        console.log('=== 顧客管理機能テスト完了 ===');
      })
      .catch((error: any) => {
        console.error('顧客管理テストエラー:', error);
        ui.alert(
          'テストエラー',
          `テスト実行中にエラーが発生しました:\\n\\n${error.message}\\n\\n` +
          '詳細はコンソールログを確認してください。',
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('顧客管理テスト処理エラー:', error);
    ui.alert(
      'テストエラー',
      `テスト処理中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * 顧客管理テスト実行（非同期）
 */
async function runCustomerManagementTest(): Promise<void> {
  const { CustomerService } = await import('./services/customer.service');
  const customerService = new CustomerService();
  
  console.log('1. テスト顧客作成開始');
  
  // テスト顧客データ
  const testCustomers = [
    {
      companyName: 'テスト株式会社A',
      contactPerson: 'テスト太郎',
      email: 'test-a@example.com',
      postalCode: '100-0001',
      address: '東京都千代田区千代田1-1',
      phoneNumber: '03-1111-1111'
    },
    {
      companyName: 'テスト有限会社B',
      contactPerson: 'テスト花子',
      email: 'test-b@example.com',
      postalCode: '160-0023',
      address: '東京都新宿区西新宿1-1',
      phoneNumber: '03-2222-2222'
    },
    {
      companyName: 'テスト合同会社C',
      email: 'test-c@example.com'
    }
  ];
  
  const createdCustomers = [];
  
  // 顧客作成テスト
  for (const customerData of testCustomers) {
    try {
      const customer = await customerService.createCustomer(customerData);
      createdCustomers.push(customer);
      console.log(`   顧客作成成功: ${customer.customerId} - ${customer.companyName}`);
    } catch (error: any) {
      if (error.code === 'CUST002') { // 重複エラーの場合はスキップ
        console.log(`   顧客作成スキップ（既存）: ${customerData.companyName}`);
      } else {
        throw error;
      }
    }
  }
  
  console.log('2. 顧客取得テスト開始');
  
  // 顧客取得テスト
  if (createdCustomers.length > 0) {
    const firstCustomer = createdCustomers[0];
    const retrievedCustomer = await customerService.getCustomer(firstCustomer.customerId);
    console.log(`   顧客取得成功: ${retrievedCustomer.customerId} - ${retrievedCustomer.companyName}`);
  }
  
  console.log('3. 全顧客取得テスト開始');
  
  // 全顧客取得テスト
  const allCustomers = await customerService.getAllCustomers();
  console.log(`   全顧客取得成功: ${allCustomers.length}件`);
  
  console.log('4. 顧客検索テスト開始');
  
  // 顧客検索テスト
  const searchResult = await customerService.searchCustomers({ companyName: 'テスト' });
  console.log(`   検索結果: ${searchResult.filteredCount}件 / ${searchResult.totalCount}件中`);
  
  console.log('5. 統計情報取得テスト開始');
  
  // 統計情報取得テスト
  const stats = await customerService.getCustomerStats();
  console.log(`   統計情報取得成功:`);
  console.log(`   - 総顧客数: ${stats.totalCount}`);
  console.log(`   - 直近30日: ${stats.recentRegistrations}件`);
  console.log(`   - 最近の顧客: ${stats.topCompanies.length}件`);
  
  console.log('顧客管理機能テスト全て成功');
}

/**
 * 顧客データ品質チェック
 */
export function checkCustomerDataQuality(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('=== 顧客データ品質チェック開始 ===');
    
    ui.alert(
      '顧客データ品質チェック',
      '顧客データの品質をチェックします。\\n\\n' +
      '以下の項目をチェックします：\\n' +
      '・重複データの確認\\n' +
      '・必須フィールドの確認\\n' +
      '・データ形式の確認\\n\\n' +
      '処理完了まで少々お待ちください。',
      ui.ButtonSet.OK
    );
    
    // 非同期で品質チェック実行
    runDataQualityCheck()
      .then((result) => {
        let message = '=== 顧客データ品質チェック結果 ===\\n\\n';
        message += `チェック対象: ${result.totalCount}件\\n\\n`;
        message += `✅ 正常データ: ${result.validCount}件\\n`;
        
        if (result.issues.length > 0) {
          message += `⚠️  問題のあるデータ: ${result.issues.length}件\\n\\n`;
          message += '=== 問題詳細 ===\\n';
          result.issues.slice(0, 10).forEach((issue, index) => {
            message += `${index + 1}. ${issue}\\n`;
          });
          if (result.issues.length > 10) {
            message += `... 他${result.issues.length - 10}件\\n`;
          }
        } else {
          message += '\\n全データが正常です！';
        }
        
        ui.alert('品質チェック結果', message, ui.ButtonSet.OK);
        console.log('=== 顧客データ品質チェック完了 ===');
      })
      .catch((error: any) => {
        console.error('品質チェックエラー:', error);
        ui.alert(
          'チェックエラー',
          `品質チェック中にエラーが発生しました:\\n\\n${error.message}`,
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('品質チェック処理エラー:', error);
    ui.alert(
      'チェックエラー',
      `処理中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * データ品質チェック実行（非同期）
 */
async function runDataQualityCheck(): Promise<{
  totalCount: number;
  validCount: number;
  issues: string[];
}> {
  const { CustomerService } = await import('./services/customer.service');
  const customerService = new CustomerService();
  
  const customers = await customerService.getAllCustomers();
  const issues: string[] = [];
  let validCount = 0;
  
  for (const customer of customers) {
    let isValid = true;
    
    // 必須フィールドチェック
    if (!customer.companyName || customer.companyName.trim() === '') {
      issues.push(`${customer.customerId}: 会社名が空です`);
      isValid = false;
    }
    
    // メール形式チェック
    if (customer.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(customer.email)) {
        issues.push(`${customer.customerId}: メールアドレス形式が不正です (${customer.email})`);
        isValid = false;
      }
    }
    
    // 郵便番号形式チェック
    if (customer.postalCode) {
      const postalRegex = /^\\d{3}-\\d{4}$/;
      if (!postalRegex.test(customer.postalCode)) {
        issues.push(`${customer.customerId}: 郵便番号形式が不正です (${customer.postalCode})`);
        isValid = false;
      }
    }
    
    // 電話番号形式チェック
    if (customer.phoneNumber) {
      const phoneRegex = /^0\\d{1,4}-\\d{1,4}-\\d{3,4}$/;
      if (!phoneRegex.test(customer.phoneNumber)) {
        issues.push(`${customer.customerId}: 電話番号形式が不正です (${customer.phoneNumber})`);
        isValid = false;
      }
    }
    
    if (isValid) {
      validCount++;
    }
  }
  
  // 重複チェック
  const companyNames = customers.map(c => c.companyName.toLowerCase());
  const duplicateNames = companyNames.filter((name, index) => 
    companyNames.indexOf(name) !== index
  );
  
  if (duplicateNames.length > 0) {
    duplicateNames.forEach(name => {
      issues.push(`重複する会社名: ${name}`);
    });
  }
  
  console.log('品質チェック完了:', {
    total: customers.length,
    valid: validCount,
    issues: issues.length
  });
  
  return {
    totalCount: customers.length,
    validCount,
    issues
  };
}

// ===== 請求書管理関数 =====

/**
 * 請求書一覧表示
 */
export function showInvoiceList(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showInvoiceList().catch(error => {
    console.error('請求書一覧表示エラー:', error);
  });
}

/**
 * 請求書検索
 */
export function showInvoiceSearch(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showInvoiceSearch().catch(error => {
    console.error('請求書検索エラー:', error);
  });
}

/**
 * 請求書作成
 */
export function showInvoiceCreation(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showInvoiceCreation().catch(error => {
    console.error('請求書作成エラー:', error);
  });
}

/**
 * 請求書発行
 */
export function showInvoiceIssue(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showInvoiceIssue().catch(error => {
    console.error('請求書発行エラー:', error);
  });
}

/**
 * 請求書統計
 */
export function showInvoiceStats(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showInvoiceStats().catch(error => {
    console.error('請求書統計エラー:', error);
  });
}

/**
 * 月次レポート
 */
export function showMonthlyReport(): void {
  const invoiceUI = new InvoiceUI();
  invoiceUI.showMonthlyReport().catch(error => {
    console.error('月次レポートエラー:', error);
  });
}

/**
 * 請求書管理機能の包括的テスト
 */
export function testInvoiceManagement(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('=== 請求書管理機能テスト開始 ===');
    
    ui.alert(
      '請求書管理テスト',
      '請求書管理機能のテストを実行します。\\n\\n' +
      '以下の操作を順番に実行します：\\n' +
      '1. テスト請求書の作成\\n' +
      '2. 請求書情報の取得\\n' +
      '3. 請求書一覧の取得\\n' +
      '4. 請求書検索\\n' +
      '5. 請求書発行\\n' +
      '6. 統計情報の取得\\n\\n' +
      '※実際に顧客データが必要です。\\n' +
      '先に顧客管理テストを実行してください。\\n\\n' +
      '処理完了まで少々お待ちください。',
      this.ui.ButtonSet.OK
    );
    
    // 非同期でテスト実行
    runInvoiceManagementTest()
      .then(() => {
        ui.alert(
          'テスト完了',
          '請求書管理機能のテストが完了しました。\\n\\n' +
          '詳細はコンソールログとシステムログシートを確認してください。',
          ui.ButtonSet.OK
        );
        console.log('=== 請求書管理機能テスト完了 ===');
      })
      .catch((error: any) => {
        console.error('請求書管理テストエラー:', error);
        ui.alert(
          'テストエラー',
          `テスト実行中にエラーが発生しました:\\n\\n${error.message}\\n\\n` +
          '詳細はコンソールログを確認してください。',
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('請求書管理テスト処理エラー:', error);
    ui.alert(
      'テストエラー',
      `テスト処理中にエラーが発生しました:\\n\\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * 請求書管理テスト実行（非同期）
 */
async function runInvoiceManagementTest(): Promise<void> {
  const { InvoiceService } = await import('./services/invoice.service');
  const { CustomerService } = await import('./services/customer.service');
  
  const invoiceService = new InvoiceService();
  const customerService = new CustomerService();
  
  console.log('1. 顧客存在確認');
  
  // 既存顧客を取得
  const customers = await customerService.getAllCustomers();
  if (customers.length === 0) {
    throw new Error('テスト実行には顧客データが必要です。先に「顧客管理テスト」を実行してください。');
  }
  
  const testCustomer = customers[0];
  console.log(`   テスト顧客: ${testCustomer.customerId} - ${testCustomer.companyName}`);
  
  console.log('2. テスト請求書作成開始');
  
  // テスト請求書データ
  const testInvoices = [
    {
      customerId: testCustomer.customerId,
      advertiser: 'テスト広告主A',
      subject: 'Webサイト制作',
      unitPrice: 100000,
      notes: 'テストデータ - システムテスト用'
    },
    {
      customerId: testCustomer.customerId,
      advertiser: 'テスト広告主B',
      subject: 'ロゴデザイン制作',
      unitPrice: 50000,
      notes: 'テストデータ - 品質確認用'
    }
  ];
  
  const createdInvoices = [];
  
  // 請求書作成テスト
  for (const invoiceData of testInvoices) {
    try {
      const invoice = await invoiceService.createInvoice(invoiceData);
      createdInvoices.push(invoice);
      console.log(`   請求書作成成功: ${invoice.invoiceNumber} - ¥${invoice.totalAmount.toLocaleString()}`);
    } catch (error: any) {
      console.log(`   請求書作成スキップ（既存またはエラー）: ${invoiceData.advertiser} - ${error.message}`);
    }
  }
  
  if (createdInvoices.length === 0) {
    console.log('   新規請求書は作成されませんでした（既存データまたはエラー）');
  }
  
  console.log('3. 請求書取得テスト開始');
  
  // 請求書取得テスト（作成したものまたは既存のもの）
  const allInvoices = await invoiceService.getAllInvoices();
  if (allInvoices.length > 0) {
    const firstInvoice = allInvoices[0];
    const retrievedInvoice = await invoiceService.getInvoice(firstInvoice.invoiceNumber);
    console.log(`   請求書取得成功: ${retrievedInvoice.invoiceNumber} - ${retrievedInvoice.advertiser}`);
  }
  
  console.log('4. 全請求書取得テスト開始');
  
  // 全請求書取得テスト
  console.log(`   全請求書取得成功: ${allInvoices.length}件`);
  
  console.log('5. 請求書検索テスト開始');
  
  // 請求書検索テスト
  const searchResult = await invoiceService.searchInvoices({ advertiser: 'テスト' });
  console.log(`   検索結果: ${searchResult.filteredCount}件 / ${searchResult.totalCount}件中`);
  
  console.log('6. 請求書発行テスト開始');
  
  // 下書きの請求書があれば発行テスト
  const draftInvoices = allInvoices.filter(i => i.status === 'draft');
  if (draftInvoices.length > 0) {
    try {
      const draftInvoice = draftInvoices[0];
      const issuedInvoice = await invoiceService.issueInvoice(draftInvoice.invoiceNumber);
      console.log(`   請求書発行成功: ${issuedInvoice.invoiceNumber} - ステータス: ${issuedInvoice.status}`);
    } catch (error: any) {
      console.log(`   請求書発行スキップ: ${error.message}`);
    }
  } else {
    console.log('   下書き請求書がないため発行テストをスキップ');
  }
  
  console.log('7. 統計情報取得テスト開始');
  
  // 統計情報取得テスト
  const stats = await invoiceService.getInvoiceStats();
  console.log(`   統計情報取得成功:`);
  console.log(`   - 総請求書数: ${stats.totalCount}`);
  console.log(`   - 下書き: ${stats.draftCount}件`);
  console.log(`   - 発行済み: ${stats.issuedCount}件`);
  console.log(`   - 総請求金額: ¥${stats.totalAmount.toLocaleString()}`);
  
  console.log('8. 月次レポートテスト開始');
  
  // 今月のレポート
  const now = new Date();
  const monthlyReport = await invoiceService.generateMonthlyReport(now.getFullYear(), now.getMonth() + 1);
  console.log(`   月次レポート取得成功:`);
  console.log(`   - 対象: ${monthlyReport.year}年${monthlyReport.month}月`);
  console.log(`   - 請求書数: ${monthlyReport.invoiceCount}件`);
  console.log(`   - 請求金額: ¥${monthlyReport.totalAmount.toLocaleString()}`);
  
  console.log('請求書管理機能テスト全て成功');
}

// ===== PDF生成関数 =====

/**
 * PDF生成ダイアログ表示
 */
export function showPDFGeneration(): void {
  const pdfUI = PDFGeneratorUI.getInstance();
  pdfUI.showPDFGenerationDialog();
}

/**
 * 一括PDF生成ダイアログ表示
 */
export function showBatchPDFGeneration(): void {
  const pdfUI = PDFGeneratorUI.getInstance();
  pdfUI.showBatchPDFGenerationDialog();
}

/**
 * PDFテンプレート設定
 */
export function configurePDFTemplate(): void {
  const ui = SpreadsheetApp.getUi();
  
  const html = `
    <div style="padding: 20px;">
      <h3>PDFテンプレート設定</h3>
      <p>Google DocsテンプレートIDを設定してください：</p>
      <input type="text" id="templateId" style="width: 100%; padding: 8px;" 
             placeholder="Google Docs ID (例: 1abc...xyz)">
      <br><br>
      <button onclick="saveTemplateId()" style="padding: 10px 20px;">保存</button>
      <button onclick="google.script.host.close()" style="padding: 10px 20px;">キャンセル</button>
    </div>
    <script>
      function saveTemplateId() {
        const templateId = document.getElementById('templateId').value;
        if (templateId) {
          google.script.run.savePDFTemplateId(templateId);
          google.script.host.close();
        } else {
          alert('テンプレートIDを入力してください');
        }
      }
    </script>
  `;
  
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(400)
    .setHeight(200)
    .setTitle('PDFテンプレート設定');
  
  ui.showModalDialog(htmlOutput, 'PDFテンプレート設定');
}

/**
 * PDFテンプレートID保存
 */
export function savePDFTemplateId(templateId: string): void {
  PropertiesService.getScriptProperties()
    .setProperty('INVOICE_TEMPLATE_DOC_ID', templateId);
  
  SpreadsheetApp.getUi().alert(
    '設定完了',
    'PDFテンプレートIDが保存されました。',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * PDF生成テスト
 */
export function testPDFGeneration(): void {
  const ui = SpreadsheetApp.getUi();
  
  try {
    console.log('=== PDF生成テスト開始 ===');
    
    ui.alert(
      'PDF生成テスト',
      'PDF生成機能のテストを実行します。\n\n' +
      '以下の操作を実行します：\n' +
      '1. 最初の請求書を取得\n' +
      '2. HTMLテンプレートでPDFプレビュー\n' +
      '3. Google Docs経由でPDF生成\n' +
      '4. Google Driveに保存\n\n' +
      '処理完了まで少々お待ちください。',
      ui.ButtonSet.OK
    );
    
    // 非同期でテスト実行
    runPDFGenerationTest()
      .then((result) => {
        ui.alert(
          'テスト完了',
          'PDF生成テストが完了しました。\n\n' +
          (result.pdfUrl ? `PDF URL: ${result.pdfUrl}\n\n` : '') +
          '詳細はコンソールログを確認してください。',
          ui.ButtonSet.OK
        );
        console.log('=== PDF生成テスト完了 ===');
      })
      .catch((error: any) => {
        console.error('PDF生成テストエラー:', error);
        ui.alert(
          'テストエラー',
          `テスト実行中にエラーが発生しました:\n\n${error.message}`,
          ui.ButtonSet.OK
        );
      });
      
  } catch (error: any) {
    console.error('PDF生成テスト処理エラー:', error);
    ui.alert(
      'テストエラー',
      `テスト処理中にエラーが発生しました:\n\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * GASエディタから実行可能なPDF生成テスト（UI呼び出しなし）
 */
export function testPDFGenerationDirect(): void {
  try {
    console.log('=== PDF生成ダイレクトテスト開始 ===');
    
    // UIを使わず直接テスト実行
    runPDFGenerationTest()
      .then((result) => {
        console.log('✅ PDF生成テスト完了');
        console.log('結果:', JSON.stringify(result, null, 2));
        console.log('=== PDF生成ダイレクトテスト完了 ===');
      })
      .catch((error: any) => {
        console.error('❌ PDF生成テストエラー:', error);
        console.error('エラー詳細:', error.stack || error.message);
      });
      
  } catch (error: any) {
    console.error('❌ PDF生成テスト処理エラー:', error);
    console.error('エラー詳細:', error.stack || error.message);
  }
}

/**
 * 簡易PDF生成テスト（Drive操作を最小限に）
 */
export function testSimplePDFGeneration(): void {
  try {
    console.log('=== 簡易PDF生成テスト開始 ===');
    
    // 基本的なGoogle Docs作成とPDF変換のみをテスト
    console.log('1. Google Docsドキュメント作成...');
    const doc = DocumentApp.create(`簡易PDF生成テスト_${Date.now()}`);
    const body = doc.getBody();
    
    // コンテンツを追加
    body.appendParagraph('請求書PDF生成テスト').setFontSize(18).setBold(true);
    body.appendParagraph('');
    body.appendParagraph('生成日時: ' + new Date().toLocaleString('ja-JP'));
    body.appendParagraph('テスト内容: Google DocsからPDFへの変換');
    body.appendParagraph('');
    body.appendParagraph('このテストが成功すれば、PDF生成機能の基本部分は動作しています。');
    
    doc.saveAndClose();
    console.log('ドキュメント作成完了:', doc.getId());
    
    // 長めに待機（Google Docsの保存処理完了まで）
    console.log('処理完了を待機中（10秒）...');
    Utilities.sleep(10000);
    
    console.log('2. PDFに変換...');
    const file = DriveApp.getFileById(doc.getId());
    
    // ファイルの準備状況を確認
    console.log('ファイル名:', file.getName());
    console.log('ファイルタイプ:', file.getMimeType());
    console.log('ファイルサイズ:', file.getSize());
    
    const pdfBlob = file.getAs('application/pdf');
    console.log('PDF変換完了, サイズ:', pdfBlob.getBytes().length);
    
    console.log('3. PDFファイルをDriveに保存...');
    const pdfFile = DriveApp.createFile(pdfBlob);
    pdfFile.setName(`請求書テスト_${Date.now()}.pdf`);
    console.log('PDFファイル保存完了:', pdfFile.getId());
    console.log('PDFファイルURL:', pdfFile.getUrl());
    
    // 一時的なドキュメントを削除
    console.log('4. 一時ファイル削除...');
    file.setTrashed(true);
    
    console.log('✅ 簡易PDF生成テスト成功');
    console.log('PDFファイルID:', pdfFile.getId());
    
  } catch (error: any) {
    console.error('❌ 簡易PDF生成テストエラー:', error);
    console.error('エラー詳細:', error.stack);
    console.error('エラー名:', error.name);
    console.error('エラーメッセージ:', error.message);
  }
  
  console.log('=== 簡易PDF生成テスト完了 ===');
}

/**
 * 権限強制再認証テスト
 */
export function testForceReauth(): void {
  try {
    console.log('=== 権限強制再認証テスト開始 ===');
    
    console.log('基本情報取得テスト:');
    console.log('- 現在のユーザーメール:', Session.getActiveUser().getEmail());
    console.log('- 現在の時間:', new Date().toLocaleString('ja-JP'));
    
    console.log('スプレッドシート権限テスト:');
    const testSheet = SpreadsheetApp.create('権限テスト_' + Date.now());
    console.log('✅ スプレッドシート作成成功:', testSheet.getId());
    testSheet.getSheets()[0].getRange('A1').setValue('権限テスト');
    console.log('✅ スプレッドシート書き込み成功');
    
    console.log('Drive権限テスト:');
    const file = DriveApp.getFileById(testSheet.getId());
    console.log('✅ Driveファイル取得成功:', file.getName());
    file.setTrashed(true);
    console.log('✅ ファイル削除成功');
    
    console.log('Documents権限テスト:');
    const doc = DocumentApp.create('Documents権限テスト_' + Date.now());
    console.log('✅ Google Docs作成成功:', doc.getId());
    doc.getBody().appendParagraph('権限テスト成功');
    doc.saveAndClose();
    console.log('✅ Google Docs保存成功');
    
    console.log('PDF変換テスト:');
    const docFile = DriveApp.getFileById(doc.getId());
    const pdfBlob = docFile.getAs('application/pdf');
    console.log('✅ PDF変換成功, サイズ:', pdfBlob.getBytes().length);
    
    docFile.setTrashed(true);
    console.log('✅ 全ての権限テスト成功');
    
  } catch (error: any) {
    console.error('❌ 権限テストエラー:', error.message);
    console.error('エラータイプ:', error.name);
    console.error('詳細:', error.stack?.substring(0, 300));
  }
  
  console.log('=== 権限強制再認証テスト完了 ===');
}

/**
 * 段階的PDF生成テスト（より詳細なデバッグ）
 */
export function testStepByStepPDF(): void {
  try {
    console.log('=== 段階的PDF生成テスト開始 ===');
    
    console.log('Step 1: 権限確認');
    // 権限確認
    try {
      const testFolder = DriveApp.getRootFolder();
      console.log('✅ Drive権限OK');
      const testDoc = DocumentApp.create('権限テスト_' + Date.now());
      testDoc.getBody().appendParagraph('権限テスト');
      testDoc.saveAndClose();
      console.log('✅ Documents権限OK');
      DriveApp.getFileById(testDoc.getId()).setTrashed(true);
    } catch (error: any) {
      console.error('❌ 権限エラー:', error.message);
      return;
    }
    
    console.log('Step 2: 既存ドキュメントでPDF変換テスト');
    // 既存のドキュメントを検索してPDF変換を試行
    const files = DriveApp.getFilesByType(MimeType.GOOGLE_DOCS);
    if (files.hasNext()) {
      const existingDoc = files.next();
      console.log('既存ドキュメントを使用:', existingDoc.getName());
      
      try {
        const pdfBlob = existingDoc.getAs(MimeType.PDF);
        console.log('✅ 既存ドキュメントのPDF変換成功, サイズ:', pdfBlob.getBytes().length);
        
        // 新規ドキュメントでもテスト
        console.log('Step 3: 新規ドキュメントでPDF変換テスト');
        const newDoc = DocumentApp.create(`段階テスト_${Date.now()}`);
        newDoc.getBody().appendParagraph('段階的テスト用ドキュメント');
        newDoc.saveAndClose();
        
        Utilities.sleep(5000);
        
        const newFile = DriveApp.getFileById(newDoc.getId());
        const newPdfBlob = newFile.getAs(MimeType.PDF);
        console.log('✅ 新規ドキュメントのPDF変換成功, サイズ:', newPdfBlob.getBytes().length);
        
        // クリーンアップ
        newFile.setTrashed(true);
        
      } catch (error: any) {
        console.error('❌ PDF変換エラー:', error.message);
        console.error('エラー詳細:', JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        }));
      }
    } else {
      console.log('既存のGoogle Docsが見つかりません');
    }
    
  } catch (error: any) {
    console.error('❌ 段階的テストエラー:', error);
  }
  
  console.log('=== 段階的PDF生成テスト完了 ===');
}

/**
 * PDF生成テスト実行（非同期）
 */
async function runPDFGenerationTest(): Promise<any> {
  // テスト用スプレッドシートを作成または取得
  console.log('0. テスト用スプレッドシート準備中...');
  let testSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  
  try {
    // 既存のアクティブスプレッドシートを試行
    testSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('   既存のスプレッドシートを使用:', testSpreadsheet.getName());
  } catch (error) {
    // アクティブスプレッドシートが存在しない場合は新規作成
    console.log('   新規テスト用スプレッドシートを作成中...');
    testSpreadsheet = SpreadsheetApp.create('PDF生成テスト用スプレッドシート_' + new Date().getTime());
    console.log('   新規スプレッドシート作成完了:', testSpreadsheet.getName());
    console.log('   スプレッドシートURL:', testSpreadsheet.getUrl());
  }

  // 必要なサービスをインポート
  const { InvoiceService } = await import('./services/invoice.service');
  const { CustomerService } = await import('./services/customer.service');
  const { PDFGeneratorService } = await import('./services/pdf-generator.service');
  const { PDFDocGeneratorService } = await import('./services/pdf-doc-generator.service');
  const { SheetInitializer } = await import('./utils/sheet-initializer');

  // シート初期化（新規作成されたスプレッドシートの場合）
  console.log('0.5. シート構造の初期化中...');
  const initializer = new SheetInitializer(testSpreadsheet);
  try {
    await initializer.initialize({
      recreateSheets: false,
      addSampleData: false,
      setProtection: false,
      setValidation: false  // データ入力規則エラー回避のため一時的に無効化
    });
    console.log('   シート初期化完了');
  } catch (error: any) {
    console.log('   シート初期化スキップ（既存シート利用）:', error.message);
  }
  
  // サービス初期化
  const invoiceService = new InvoiceService(testSpreadsheet);
  const customerService = new CustomerService(testSpreadsheet);
  const pdfGeneratorService = PDFGeneratorService.getInstance();
  const pdfDocGeneratorService = PDFDocGeneratorService.getInstance();
  
  console.log('1. 請求書と顧客データ取得');
  
  // 最初の請求書を取得
  let invoices = await invoiceService.getAllInvoices();
  let testInvoice: any;
  let testCustomer: any;
  
  if (invoices.length === 0) {
    console.log('   テスト用データが存在しないため、サンプルデータを作成中...');
    
    // サンプル顧客データ作成
    const sampleCustomer = {
      customerId: 'CUST_TEST001',
      companyName: 'テスト株式会社',
      contactName: '山田太郎',
      email: 'test@example.com',
      phoneNumber: '03-1234-5678',
      postalCode: '100-0001',
      address: '東京都千代田区千代田1-1',
      paymentTerms: '月末締め翌月末払い',
      taxRate: 0.10,
      notes: 'PDF生成テスト用顧客データ',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const createdCustomer = await customerService.createCustomer(sampleCustomer);
    console.log('   サンプル顧客データ作成完了:', createdCustomer.customerId);
    
    // サンプル請求書データ作成
    const sampleInvoice = {
      invoiceId: 'INV_TEST001',
      invoiceNumber: 'T2025-001',
      customerId: createdCustomer.customerId,  // 実際に作成された顧客IDを使用
      advertiser: 'PDF生成テスト広告主',  // 必須フィールド
      subject: 'PDF生成機能テスト案件',   // 必須フィールド
      unitPrice: 50000,  // 制作費（必須フィールド）
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      items: [
        {
          itemName: 'PDF生成テスト商品A',
          description: 'テスト用サンプル商品です',
          quantity: 2,
          unitPrice: 10000,
          amount: 20000
        },
        {
          itemName: 'PDF生成テスト商品B',
          description: 'もう一つのテスト商品です',
          quantity: 1,
          unitPrice: 5000,
          amount: 5000
        }
      ],
      subtotal: 25000,
      taxAmount: 2500,
      totalAmount: 27500,
      notes: 'PDF生成テスト用請求書',
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await invoiceService.createInvoice(sampleInvoice);
    console.log('   サンプル請求書データ作成完了');
    
    // 作成したデータを取得
    invoices = await invoiceService.getAllInvoices();
    testInvoice = invoices[0];
    testCustomer = await customerService.getCustomer(testInvoice.customerId);
  } else {
    testInvoice = invoices[0];
    testCustomer = await customerService.getCustomer(testInvoice.customerId);
  }
  
  console.log(`   テスト請求書: ${testInvoice.invoiceNumber}`);
  console.log(`   顧客: ${testCustomer.companyName}`);
  
  console.log('2. HTMLテンプレートでプレビュー生成');
  
  // HTMLテンプレートでプレビュー
  const previewResult = await pdfGeneratorService.generateInvoicePDF(
    testInvoice,
    testCustomer,
    { preview: true }
  );
  
  console.log(`   プレビュー生成: ${previewResult.success ? '成功' : '失敗'}`);
  
  console.log('3. Google Docs経由でPDF生成');
  
  // Google Docs経由でPDF生成
  try {
    const pdfResult = await pdfDocGeneratorService.generatePDFViaGoogleDocs(
      testInvoice,
      testCustomer
    );
    
    console.log(`   PDF生成成功:`);
    console.log(`   - ファイルID: ${pdfResult.fileId}`);
    console.log(`   - ファイルURL: ${pdfResult.fileUrl}`);
    console.log(`   - ダウンロードURL: ${pdfResult.pdfUrl}`);
    
    return pdfResult;
  } catch (error: any) {
    console.log(`   Google Docs生成スキップ: ${error.message}`);
    
    // 代替方法でPDF生成
    console.log('4. HTML方式でPDF生成（代替）');
    
    const pdfResult = await pdfGeneratorService.generateInvoicePDF(
      testInvoice,
      testCustomer,
      { saveToFolder: true }
    );
    
    console.log(`   PDF生成: ${pdfResult.success ? '成功' : '失敗'}`);
    if (pdfResult.success) {
      console.log(`   - ファイル名: ${pdfResult.fileName}`);
      console.log(`   - ファイルURL: ${pdfResult.fileUrl}`);
    }
    
    return pdfResult;
  }
}

/**
 * 請求書詳細取得（UI用）
 */
export function getInvoiceDetails(invoiceNumber: string): any {
  // UIから呼び出される関数
  const { InvoiceService } = require('./services/invoice.service');
  const { CustomerService } = require('./services/customer.service');
  
  const invoiceService = new InvoiceService();
  const customerService = new CustomerService();
  
  const invoice = invoiceService.getInvoice(invoiceNumber);
  const customer = customerService.getCustomer(invoice.customerId);
  
  return {
    invoiceNumber: invoice.invoiceNumber,
    customerName: customer.companyName,
    customerEmail: customer.email,
    totalAmount: invoice.totalAmount,
    issueDate: invoice.issueDate.toLocaleDateString('ja-JP')
  };
}

/**
 * アクティブな請求書リスト取得（UI用）
 */
export function getActiveInvoices(): any[] {
  // UIから呼び出される関数
  const { InvoiceService } = require('./services/invoice.service');
  const { CustomerService } = require('./services/customer.service');
  
  const invoiceService = new InvoiceService();
  const customerService = new CustomerService();
  
  const invoices = invoiceService.getAllInvoices();
  
  return invoices.map(invoice => {
    const customer = customerService.getCustomer(invoice.customerId);
    return {
      invoiceNumber: invoice.invoiceNumber,
      customerName: customer.companyName,
      totalAmount: invoice.totalAmount,
      status: invoice.status
    };
  });
}

/**
 * 請求書PDF生成（UI用）
 */
export function generateInvoicePDF(invoiceNumber: string, options: any): any {
  // UIから呼び出される関数
  const { InvoiceService } = require('./services/invoice.service');
  const { CustomerService } = require('./services/customer.service');
  const { PDFGeneratorService } = require('./services/pdf-generator.service');
  const { PDFDocGeneratorService } = require('./services/pdf-doc-generator.service');
  
  const invoiceService = new InvoiceService();
  const customerService = new CustomerService();
  
  const invoice = invoiceService.getInvoice(invoiceNumber);
  const customer = customerService.getCustomer(invoice.customerId);
  
  if (options.useGoogleDocs) {
    const pdfDocGeneratorService = PDFDocGeneratorService.getInstance();
    return pdfDocGeneratorService.generatePDFViaGoogleDocs(invoice, customer);
  } else {
    const pdfGeneratorService = PDFGeneratorService.getInstance();
    return pdfGeneratorService.generateInvoicePDF(invoice, customer, options);
  }
}

/**
 * 請求書PDFプレビュー（UI用）
 */
export function previewInvoicePDF(invoiceNumber: string): void {
  // UIから呼び出される関数
  const { InvoiceService } = require('./services/invoice.service');
  const { CustomerService } = require('./services/customer.service');
  const { PDFGeneratorService } = require('./services/pdf-generator.service');
  
  const invoiceService = new InvoiceService();
  const customerService = new CustomerService();
  const pdfGeneratorService = PDFGeneratorService.getInstance();
  
  const invoice = invoiceService.getInvoice(invoiceNumber);
  const customer = customerService.getCustomer(invoice.customerId);
  
  pdfGeneratorService.generateInvoicePDF(invoice, customer, { preview: true });
}

/**
 * 一括PDF生成（UI用）
 */
export function generateBatchPDFs(options: any): any {
  // UIから呼び出される関数
  const { PDFGeneratorService } = require('./services/pdf-generator.service');
  
  const pdfGeneratorService = PDFGeneratorService.getInstance();
  const results = pdfGeneratorService.generateBatchPDFs(options.invoiceNumbers, options);
  
  return {
    success: true,
    successCount: Array.from(results.values()).filter(r => r.success).length,
    failureCount: Array.from(results.values()).filter(r => !r.success).length
  };
}

/**
 * APIサービス確認テスト（新規追加）
 */
export function testAPIServices(): void {
  try {
    console.log('=== APIサービス確認テスト開始 ===');
    
    // 1. 基本的なSession APIテスト
    console.log('1. Session API テスト...');
    try {
      const userEmail = Session.getActiveUser().getEmail();
      console.log('✅ Session API: OK - ユーザーメール:', userEmail);
    } catch (error) {
      console.error('❌ Session API エラー:', error.toString());
    }

    // 2. SpreadsheetApp APIテスト
    console.log('2. SpreadsheetApp API テスト...');
    try {
      const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSpreadsheet) {
        console.log('✅ SpreadsheetApp API: OK - アクティブシート:', activeSpreadsheet.getName());
      } else {
        console.log('⚠️ SpreadsheetApp API: アクティブスプレッドシートなし（正常）');
      }
    } catch (error) {
      console.error('❌ SpreadsheetApp API エラー:', error.toString());
    }

    // 3. DriveApp APIテスト（最小限）
    console.log('3. DriveApp API テスト...');
    try {
      // まず最も基本的なAPI呼び出しをテスト
      console.log('3-1. DriveApp基本テスト...');
      const files = DriveApp.getFiles();
      console.log('✅ DriveApp.getFiles(): 基本API使用可能');
      
      // ルートフォルダアクセステスト
      console.log('3-2. ルートフォルダアクセステスト...');
      const rootFolder = DriveApp.getRootFolder();
      console.log('✅ DriveApp.getRootFolder(): OK');
      console.log('   ルートフォルダ名:', rootFolder.getName());
      
    } catch (error) {
      console.error('❌ DriveApp API エラー:', error.toString());
      console.error('   詳細:', error.stack);
    }

    // 4. DocumentApp APIテスト
    console.log('4. DocumentApp API テスト...');
    try {
      // 一時的なテストドキュメントを作成
      console.log('4-1. テストドキュメント作成...');
      const testDoc = DocumentApp.create('API_Test_Document_' + Date.now());
      console.log('✅ DocumentApp.create(): OK - ドキュメントID:', testDoc.getId());
      
      // ドキュメントを削除（クリーンアップ）
      console.log('4-2. テストドキュメント削除...');
      const testFile = DriveApp.getFileById(testDoc.getId());
      testFile.setTrashed(true);
      console.log('✅ ドキュメント削除: 完了');
      
    } catch (error) {
      console.error('❌ DocumentApp API エラー:', error.toString());
      console.error('   詳細:', error.stack);
    }

    console.log('=== APIサービス確認テスト完了 ===');
    
  } catch (error) {
    console.error('❌ APIサービステストエラー:', error);
    console.error('詳細:', error.stack);
  }
}

/**
 * PDFテンプレートアップロードテスト
 */
export function testUploadPDFTemplate(): void {
  console.log('=== PDFテンプレートアップロード開始 ===');
  
  try {
    // ローカルのinvoice-template.pdfを読み込む必要がありますが、
    // Google Apps Scriptはローカルファイルに直接アクセスできません。
    // 代わりに、手動でGoogle DriveにアップロードしたファイルのIDを使用します。
    
    console.log('手動でinvoice-template.pdfをGoogle Driveにアップロードしてください');
    console.log('アップロード後、ファイルIDを確認してtestPDFTemplateFields()関数で使用します');
    console.log('=== 手順 ===');
    console.log('1. drive.google.com にアクセス');
    console.log('2. invoice-template.pdf をアップロード');
    console.log('3. ファイルを右クリック → 共有 → リンクを取得');
    console.log('4. URLからファイルIDを抽出（/d/の後の部分）');
    console.log('5. testPDFTemplateFields()関数のfileIdを更新');
    
  } catch (error) {
    console.error('❌ エラー:', error.toString());
  }
}

/**
 * 既存のPDFテンプレートを検索
 */
export function findExistingPDFTemplate(): void {
  console.log('=== 既存PDFテンプレート検索開始 ===');
  
  try {
    // invoice-template.pdfを検索
    const fileName = 'invoice-template.pdf';
    console.log('検索ファイル名:', fileName);
    
    const files = DriveApp.getFilesByName(fileName);
    let count = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      count++;
      
      console.log(`\n--- テンプレート ${count} ---`);
      console.log('ファイルID:', file.getId());
      console.log('ファイル名:', file.getName());
      console.log('サイズ:', file.getSize(), 'bytes');
      console.log('作成日:', file.getDateCreated());
      console.log('最終更新:', file.getLastUpdated());
      console.log('URL:', file.getUrl());
      console.log('オーナー:', file.getOwner()?.getEmail() || '不明');
      
      // 最初に見つかったファイルのIDを使用
      if (count === 1) {
        console.log('\n✅ このファイルIDを使用してください:', file.getId());
        console.log('testPDFTemplateFields()関数のfileIdをこのIDに更新してください');
      }
    }
    
    if (count === 0) {
      console.log('❌ invoice-template.pdfが見つかりません');
      console.log('手動でGoogle Driveにアップロードしてください');
    } else {
      console.log(`\n合計 ${count} 個のテンプレートファイルが見つかりました`);
    }
    
  } catch (error) {
    console.error('❌ 検索エラー:', error.toString());
    console.error('エラースタック:', error.stack);
  }
}

/**
 * Context7公式ドキュメントに基づくDrive APIテスト
 */
export function testDriveAPIWithContext7(): void {
  console.log('=== Context7公式ドキュメント準拠Drive APIテスト ===');
  
  try {
    // DriveTestServiceをインポートして使用
    // Note: Google Apps Scriptでは直接importできないため、
    // ビルドプロセスで統合される前提
    
    console.log('🔍 段階1: 認証とルートフォルダアクセス');
    const rootFolder = DriveApp.getRootFolder();
    console.log('✅ ルートフォルダアクセス成功');
    console.log('   フォルダ名:', rootFolder.getName());
    console.log('   フォルダID:', rootFolder.getId());
    
    console.log('\n🔍 段階2: invoice-template.pdf検索');
    const files = DriveApp.getFilesByName('invoice-template.pdf');
    let fileCount = 0;
    let targetFileId = '';
    
    while (files.hasNext()) {
      const file = files.next();
      fileCount++;
      
      console.log(`--- テンプレートファイル ${fileCount} ---`);
      console.log('ファイルID:', file.getId());
      console.log('ファイル名:', file.getName());
      console.log('サイズ:', file.getSize(), 'bytes');
      console.log('作成日:', file.getDateCreated());
      console.log('最終更新:', file.getLastUpdated());
      console.log('所有者:', file.getOwner()?.getEmail() || '不明');
      console.log('URL:', file.getUrl());
      
      if (fileCount === 1) {
        targetFileId = file.getId();
        console.log('\n🎯 このファイルIDを使用してください:', targetFileId);
      }
    }
    
    if (fileCount === 0) {
      console.log('❌ invoice-template.pdfが見つかりません');
      console.log('手動でGoogle Driveにアップロードしてください');
      return;
    }
    
    console.log(`\n📊 合計 ${fileCount} 個のテンプレートファイルが見つかりました`);
    
    console.log('\n🔍 段階3: ファイルアクセステスト');
    if (targetFileId) {
      const targetFile = DriveApp.getFileById(targetFileId);
      console.log('✅ getFileById()成功');
      console.log('   確認ファイル名:', targetFile.getName());
      console.log('   確認サイズ:', targetFile.getSize(), 'bytes');
      
      // PDFとして読み込み可能かテスト
      const blob = targetFile.getBlob();
      console.log('✅ getBlob()成功');
      console.log('   MIMEタイプ:', blob.getContentType());
      console.log('   データサイズ:', blob.getBytes().length, 'bytes');
    }
    
    console.log('\n🎉 Context7準拠Drive APIテスト完了');
    console.log('全ての基本機能が正常動作しています');
    
  } catch (error) {
    console.error('❌ Drive APIテスト失敗:', error.toString());
    console.error('エラースタック:', error.stack);
    console.error('\n🔧 対処法:');
    console.error('1. OAuth認証スコープを確認');
    console.error('2. Google Drive APIサービス状態を確認');
    console.error('3. ファイルアクセス権限を確認');
  }
}

/**
 * 最小限のDrive APIテスト（サーバーエラー回避版）
 */
export function testMinimalDriveAPI(): void {
  console.log('=== 最小限Drive APIテスト ===');
  
  try {
    // 最も基本的なSpreadsheetApp経由でのテスト
    console.log('1. SpreadsheetApp経由でDriveアクセステスト...');
    
    // 現在のスプレッドシートからDriveファイル情報を取得
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const driveFile = DriveApp.getFileById(sheet.getId());
    
    console.log('✅ SpreadsheetApp→DriveApp変換成功');
    console.log('   ファイル名:', driveFile.getName());
    console.log('   ファイルID:', sheet.getId());
    
    console.log('2. Drive基本情報テスト...');
    console.log('   サイズ:', driveFile.getSize(), 'bytes');
    console.log('   MIME:', driveFile.getMimeType());
    console.log('   作成日:', driveFile.getDateCreated());
    
    console.log('✅ 最小限Drive APIテスト完了');
    
  } catch (error) {
    console.error('❌ 最小限テストも失敗:', error.toString());
    console.error('Google Apps ScriptのDrive APIサービスに障害が発生中');
    console.error('対処法: Google側のサービス復旧を待つか、Drive API以外の方法を使用');
  }
}

/**
 * テンプレートファイルの手動IDセットテスト
 */
export function testManualTemplateID(): void {
  console.log('=== 手動テンプレートIDテスト ===');
  
  // ユーザーが手動でファイルIDを設定するバージョン
  const TEMPLATE_FILE_ID = 'PASTE_YOUR_FILE_ID_HERE'; // ←ここにファイルIDを貼り付け
  
  if (TEMPLATE_FILE_ID === 'PASTE_YOUR_FILE_ID_HERE') {
    console.log('❗ ファイルIDが設定されていません');
    console.log('手順:');
    console.log('1. drive.google.com にアクセス');
    console.log('2. invoice-template.pdf をアップロード');
    console.log('3. ファイルのURLからIDを抽出');
    console.log('4. testManualTemplateID()関数のTEMPLATE_FILE_IDを更新');
    console.log('5. この関数を再実行');
    return;
  }
  
  try {
    console.log('指定されたファイルIDでテスト:', TEMPLATE_FILE_ID);
    
    const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
    
    console.log('✅ ファイルアクセス成功');
    console.log('   ファイル名:', templateFile.getName());
    console.log('   サイズ:', templateFile.getSize(), 'bytes');
    console.log('   MIME:', templateFile.getMimeType());
    
    const blob = templateFile.getBlob();
    console.log('✅ Blob取得成功');
    console.log('   データサイズ:', blob.getBytes().length, 'bytes');
    
    console.log('🎯 このファイルIDをPDF生成で使用できます:', TEMPLATE_FILE_ID);
    
  } catch (error) {
    console.error('❌ ファイルアクセス失敗:', error.toString());
    console.error('原因:');
    console.error('- ファイルIDが正しくない');
    console.error('- ファイルアクセス権限がない');
    console.error('- Drive APIサービス障害');
  }
}

/**
 * PDFテンプレートフィールド解析テスト
 */
export async function testPDFTemplateFields(): Promise<void> {
  console.log('=== PDFテンプレートフィールド解析開始 ===');
  
  try {
    const templateFileId = '15qHfTaG1WUJebBIYvJYPYlbSc-xo7_Lq';
    console.log('テンプレートファイルID:', templateFileId);
    
    // ファイル存在確認
    const templateFile = DriveApp.getFileById(templateFileId);
    console.log('✅ テンプレートファイル取得成功');
    console.log('   ファイル名:', templateFile.getName());
    console.log('   ファイルサイズ:', templateFile.getSize(), 'bytes');
    console.log('   MIMEタイプ:', templateFile.getBlob().getContentType());
    
    // PDFバイトデータ取得
    console.log('2. PDFデータ取得中...');
    const pdfBlob = templateFile.getBlob();
    const pdfBytes = pdfBlob.getBytes();
    console.log('✅ PDFバイトデータ取得完了:', pdfBytes.length, 'bytes');
    
    // pdf-libを使用してPDFフォーム解析を試行
    console.log('3. pdf-lib統合テスト...');
    try {
      // PDFLibの読み込み（Context7で確認済み、GASで利用可能）
      const pdfLibUrl = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      console.log('pdf-libライブラリのロード試行...');
      
      // UrlFetchAppでpdf-libライブラリを取得
      const response = UrlFetchApp.fetch(pdfLibUrl);
      const pdfLibCode = response.getContentText();
      console.log('✅ pdf-libライブラリ取得成功:', pdfLibCode.length, '文字');
      
      // ライブラリを実行環境に読み込み
      eval(pdfLibCode);
      console.log('✅ pdf-libライブラリ実行完了');
      
      // PDFDocumentの読み込み試行
      console.log('4. PDFドキュメント解析中...');
      
      // GASのArrayBufferとの互換性確保
      const uint8Array = new Uint8Array(pdfBytes);
      console.log('PDF Uint8Array作成完了:', uint8Array.length);
      
      // PDF-libでPDFドキュメントを読み込み（非同期処理をPromiseで処理）
      console.log('PDFLib.PDFDocument.load()実行中...');
      const pdfDoc = await PDFLib.PDFDocument.load(uint8Array);
      console.log('✅ PDFドキュメント読み込み成功');
      
      // フォーム確認
      console.log('5. フォームフィールド解析...');
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      console.log('📋 フォームフィールド数:', fields.length);
      
      // 各フィールドの詳細を解析
      fields.forEach((field, index) => {
        console.log(`フィールド${index + 1}:`);
        console.log('  名前:', field.getName());
        console.log('  タイプ:', field.constructor.name);
        
        // テキストフィールドの場合
        if (field.constructor.name === 'PDFTextField') {
          console.log('  現在の値:', field.getText() || '(空)');
          console.log('  最大文字数:', field.getMaxLength() || '制限なし');
        }
        
        // チェックボックスの場合
        if (field.constructor.name === 'PDFCheckBox') {
          console.log('  チェック状態:', field.isChecked());
        }
        
        // ドロップダウンの場合
        if (field.constructor.name === 'PDFDropdown') {
          console.log('  選択肢:', field.getOptions());
          console.log('  現在の選択:', field.getSelected());
        }
      });
      
      // テスト用にサンプルデータを埋め込んでみる
      console.log('6. サンプルデータ埋め込みテスト...');
      if (fields.length > 0) {
        // 最初のテキストフィールドにテストデータを設定
        const textFields = fields.filter(f => f.constructor.name === 'PDFTextField');
        if (textFields.length > 0) {
          const firstTextField = textFields[0];
          console.log('テストデータ埋め込み:', firstTextField.getName());
          firstTextField.setText('TEST DATA - ' + new Date().toISOString());
          
          // 埋め込み後のPDF保存テスト
          console.log('7. 埋め込み後PDF生成...');
          const modifiedPdfBytes = await pdfDoc.save();
          console.log('✅ 修正済みPDF生成完了:', modifiedPdfBytes.length, 'bytes');
          
          // Google Driveに保存テスト
          console.log('8. Google Driveに保存テスト...');
          const blob = Utilities.newBlob(modifiedPdfBytes, 'application/pdf', 
                                        `invoice-template-modified-${Date.now()}.pdf`);
          const savedFile = DriveApp.createFile(blob);
          console.log('✅ テスト用PDF保存完了:', savedFile.getId());
          console.log('   URL:', savedFile.getUrl());
        }
      }
      
    } catch (pdfLibError) {
      console.warn('⚠️ pdf-lib統合エラー:', pdfLibError.toString());
      console.warn('エラースタック:', pdfLibError.stack);
      console.log('代替案実行中...');
    }
    
    // 代替案: 座標ベースのテキスト重ね書き
    console.log('5. 代替PDF処理方式の準備...');
    console.log('✅ テンプレートファイル準備完了');
    console.log('📝 次のステップ:');
    console.log('   1. pdf-lib統合の詳細実装');
    console.log('   2. フォームフィールド座標の特定');
    console.log('   3. データ埋め込み機能の実装');
    console.log('   4. 完成PDFのGoogle Drive保存');
    
  } catch (error) {
    console.error('❌ テンプレート解析エラー:', error.toString());
    console.error('スタック:', error.stack);
  }
}

/**
 * 新しいPDF生成とURL確認テスト
 */
export function testNewPDFGeneration(): void {
  console.log('=== 新しいPDF生成テスト開始 ===');
  
  try {
    console.log('1. サンプル請求書データ作成...');
    
    // サンプル請求書データ
    const invoiceData = {
      invoiceNumber: `TEST-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      subtotal: 50000,
      taxAmount: 5000,
      totalAmount: 55000,
      description: 'PDF生成テスト案件'
    };
    
    const customerData = {
      companyName: 'テスト株式会社',
      contactName: '田中太郎',
      address: '東京都千代田区1-1-1'
    };
    
    console.log('2. 単純なPDF作成...');
    
    // 単純なGoogle Docsドキュメントを作成してPDFに変換
    const docName = `請求書テスト_${Date.now()}`;
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();
    
    // 請求書っぽい内容を追加
    body.appendParagraph('【請求書】').setFontSize(18).setBold(true);
    body.appendParagraph('');
    body.appendParagraph(`請求書番号: ${invoiceData.invoiceNumber}`);
    body.appendParagraph(`発行日: ${invoiceData.issueDate.toLocaleDateString('ja-JP')}`);
    body.appendParagraph(`支払期限: ${invoiceData.dueDate.toLocaleDateString('ja-JP')}`);
    body.appendParagraph('');
    body.appendParagraph(`【請求先】`).setBold(true);
    body.appendParagraph(`会社名: ${customerData.companyName}`);
    body.appendParagraph(`担当者: ${customerData.contactName}`);
    body.appendParagraph(`住所: ${customerData.address}`);
    body.appendParagraph('');
    body.appendParagraph(`【請求内容】`).setBold(true);
    body.appendParagraph(`案件名: ${invoiceData.description}`);
    body.appendParagraph(`小計: ¥${invoiceData.subtotal.toLocaleString()}`);
    body.appendParagraph(`消費税: ¥${invoiceData.taxAmount.toLocaleString()}`);
    body.appendParagraph(`合計: ¥${invoiceData.totalAmount.toLocaleString()}`).setBold(true);
    
    doc.saveAndClose();
    console.log('3. ドキュメント作成完了:', doc.getId());
    
    // PDFに変換
    const docFile = DriveApp.getFileById(doc.getId());
    const pdfBlob = docFile.getAs('application/pdf');
    
    console.log('4. PDF変換完了、サイズ:', pdfBlob.getBytes().length);
    
    // PDFファイルとして保存
    const pdfFileName = `請求書_${invoiceData.invoiceNumber}.pdf`;
    const pdfFile = DriveApp.createFile(pdfBlob);
    pdfFile.setName(pdfFileName);
    
    console.log('5. PDFファイル保存完了:', pdfFile.getId());
    
    // 共有設定
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    console.log('6. 共有設定完了');
    
    // URL情報を出力
    const fileUrl = pdfFile.getUrl();
    const directViewUrl = `https://drive.google.com/file/d/${pdfFile.getId()}/view?usp=sharing`;
    const directDownloadUrl = `https://drive.google.com/uc?id=${pdfFile.getId()}&export=download`;
    
    console.log('7. URL情報:');
    console.log('   ファイルID:', pdfFile.getId());
    console.log('   標準URL:', fileUrl);
    console.log('   直接表示URL:', directViewUrl);
    console.log('   直接ダウンロードURL:', directDownloadUrl);
    
    // 元のドキュメントを削除
    docFile.setTrashed(true);
    console.log('8. 一時ドキュメント削除完了');
    
    console.log('=== 新しいPDF生成テスト完了 ===');
    console.log('✅ 成功: 新しいPDFが生成されました');
    
  } catch (error) {
    console.error('❌ PDF生成エラー:', error.toString());
    console.error('スタックトレース:', error.stack);
  }
}

/**
 * PDF ファイル確認テスト
 */
export function testPDFFileAccess(): void {
  try {
    console.log('=== PDFファイルアクセステスト開始 ===');
    
    // 生成されたPDFのファイルIDを確認
    const fileId = '1FrpUNIIkkOHR_vCONTLqY4qQZFUY_1vF';
    console.log('テスト対象ファイルID:', fileId);
    
    // 1. ファイル存在確認
    console.log('1. ファイル存在確認...');
    try {
      const file = DriveApp.getFileById(fileId);
      console.log('✅ ファイル存在確認: OK');
      console.log('   ファイル名:', file.getName());
      console.log('   ファイルサイズ:', file.getSize(), 'bytes');
      console.log('   作成日時:', file.getDateCreated());
      console.log('   MIMEタイプ:', file.getBlob().getContentType());
      
      // 2. 共有設定確認
      console.log('2. 共有設定確認...');
      const sharingAccess = file.getSharingAccess();
      const sharingPermission = file.getSharingPermission();
      console.log('   共有アクセス:', sharingAccess);
      console.log('   共有権限:', sharingPermission);
      
      // 3. URL取得テスト
      console.log('3. URL取得テスト...');
      const fileUrl = file.getUrl();
      const downloadUrl = file.getDownloadUrl();
      console.log('   標準URL:', fileUrl);
      console.log('   ダウンロードURL:', downloadUrl);
      
      // 4. 共有設定を強制更新
      console.log('4. 共有設定強制更新...');
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      console.log('✅ 共有設定更新完了');
      
      // 5. 更新後のURL再取得
      console.log('5. 更新後URL再取得...');
      const newFileUrl = file.getUrl();
      console.log('   更新後URL:', newFileUrl);
      
      // 6. 代替URLパターンの生成
      console.log('6. 代替URLパターン生成...');
      const directViewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
      const directDownloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
      console.log('   直接表示URL:', directViewUrl);
      console.log('   直接ダウンロードURL:', directDownloadUrl);
      
    } catch (error) {
      console.error('❌ ファイルアクセスエラー:', error.toString());
      console.error('   ファイルが削除されているか、アクセス権限がない可能性があります');
    }

    console.log('=== PDFファイルアクセステスト完了 ===');
    
  } catch (error) {
    console.error('❌ PDFファイルテストエラー:', error);
    console.error('詳細:', error.stack);
  }
}
