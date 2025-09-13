#!/usr/bin/env node

/**
 * 包括的テスト実行スクリプト
 * GASのrunTestsWithLogs()を実行し、結果のスプレッドシートURLを表示
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🧪 GAS請求書管理システム - 包括的テスト実行');
console.log('='.repeat(60));

try {
  // ビルド・プッシュ
  console.log('📦 ビルド・デプロイ中...');
  execSync('npm run push:dev', { stdio: 'inherit' });
  
  console.log('\n✅ デプロイ完了！');
  
  // プロジェクト情報の取得
  const claspConfig = JSON.parse(readFileSync('.clasp.json', 'utf8'));
  const scriptId = claspConfig.scriptId;
  
  console.log('\n📋 テスト実行手順:');
  console.log('1. 以下のURLでGoogle Apps Scriptエディタを開く');
  console.log(`   https://script.google.com/d/${scriptId}/edit`);
  console.log('');
  console.log('2. 関数ドロップダウンから "runTestsWithLogs" を選択');
  console.log('3. 実行ボタン（▶️）をクリック');
  console.log('4. 実行完了後、実行ログに表示されるスプレッドシートURLをクリック');
  console.log('');
  console.log('📊 テスト結果について:');
  console.log('・"テスト実行ログ" シート: 詳細な実行ログとタイムスタンプ');
  console.log('・"テストサマリー" シート: 実行結果の概要');
  console.log('・"データテスト" シート: 実際のデータ書き込みテスト');
  console.log('');
  
  // より詳細な手順説明
  console.log('🎯 期待される結果:');
  console.log('・すべてのテストが "成功" ステータスで完了');
  console.log('・環境変数が正しく読み込まれている');
  console.log('・スプレッドシート操作が正常に動作');
  console.log('・実行時間が表示される');
  console.log('');
  
  console.log('⚠️  エラーが発生した場合:');
  console.log('・エラー詳細も同じスプレッドシートに記録されます');
  console.log('・GASエディタの実行ログタブで詳細を確認できます');
  console.log('');
  
  console.log('🔧 このスクリプトが自動で実行済み:');
  console.log('・TypeScriptファイルのビルド');
  console.log('・開発環境への自動デプロイ');
  console.log('・関数がGASエディタで認識可能');
  
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  console.error('');
  console.error('💡 トラブルシューティング:');
  console.error('1. npm run build でビルドエラーを確認');
  console.error('2. .clasp.json の設定を確認');
  console.error('3. clasp login でGoogle認証を再実行');
  process.exit(1);
}