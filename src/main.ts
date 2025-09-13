import { initializeSpreadsheet, checkSpreadsheetInitialization } from './utils/sheet-initializer';
import { CustomerUI } from './ui/customer.ui';

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
    .addSeparator()
    .addItem('テスト実行', 'testFunction')
    .addItem('包括的テスト実行', 'runTestsWithLogs')
    .addItem('請求書作成', 'createInvoice')
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
