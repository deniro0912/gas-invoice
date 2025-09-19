#!/usr/bin/env node

/**
 * GAS実行状況確認スクリプト
 * testPDFGeneration()のエラー内容を詳細に分析
 */

console.log('🔍 GAS実行状況確認');
console.log('=' .repeat(60));

console.log('\n📋 エラー診断チェックリスト:');

console.log('\n1. ⚡ システム基盤チェック');
console.log('   - スプレッドシート初期化が完了しているか');
console.log('   - 関数: testSpreadsheetInitialization()');

console.log('\n2. 👥 顧客データチェック');
console.log('   - テスト用顧客データが作成されているか');
console.log('   - 関数: testCustomerManagement()');

console.log('\n3. 📄 請求書データチェック');
console.log('   - テスト用請求書データが作成されているか');
console.log('   - 関数: testInvoiceManagement()');

console.log('\n4. 📊 包括的テスト実行（推奨）');
console.log('   - 詳細ログ付き全システムテスト');
console.log('   - 関数: runTestsWithLogs()');
console.log('   - 結果: 新規スプレッドシートに詳細ログ出力');

console.log('\n🎯 推奨実行順序:');
console.log('   1. runTestsWithLogs()     # 包括的テスト＋詳細ログ');
console.log('   2. testPDFGeneration()    # PDF生成テスト');

console.log('\n📝 実行方法:');
console.log('   1. GASエディタを開く');
console.log('   2. 関数選択ドロップダウンから関数を選択');
console.log('   3. ▶️ 実行ボタンをクリック');
console.log('   4. 初回は権限承認が必要');

console.log('\n⚠️  権限エラーの場合:');
console.log('   - Google Apps Script API');
console.log('   - Google Drive API'); 
console.log('   - Google Docs API');
console.log('   - Google Spreadsheet API');
console.log('   全ての権限を「許可」してください');

console.log('\n🔗 GASエディタURL:');
console.log('   https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit');

console.log('\n📞 エラー報告時にお教えください:');
console.log('   1. 実行した関数名');
console.log('   2. エラーメッセージ全文');
console.log('   3. 実行ログタブの内容');
console.log('   4. 権限承認の成功/失敗');

console.log('\n✨ 次のステップ:');
console.log('   runTestsWithLogs() を実行してください');
console.log('   → 実行成功時: 生成されたスプレッドシートURLが表示される');
console.log('   → 実行失敗時: エラー詳細をお教えください');