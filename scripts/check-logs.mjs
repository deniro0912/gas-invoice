import { execSync } from 'child_process';

console.log('📋 Google Apps Script 実行ログ取得');
console.log('=' . repeat(40));

try {
  console.log('🔍 最新の実行ログを取得中...\n');
  
  // clasp logsコマンドで最新のログを取得
  const logs = execSync('clasp logs --json', { 
    stdio: 'pipe',
    timeout: 30000 
  }).toString();
  
  const logEntries = JSON.parse(logs);
  
  if (logEntries.length === 0) {
    console.log('📝 実行ログがありません。');
    console.log('💡 Google Apps Scriptエディタでテスト関数を実行してからもう一度お試しください。');
    process.exit(0);
  }
  
  console.log(`📊 最新の ${Math.min(logEntries.length, 10)} 件のログエントリ:\n`);
  
  // 最新10件のログを表示
  logEntries.slice(0, 10).forEach((entry, index) => {
    const timestamp = new Date(entry.timestamp).toLocaleString('ja-JP');
    const level = entry.level || 'INFO';
    const message = entry.message || entry.payload || 'メッセージなし';
    
    console.log(`${index + 1}. [${timestamp}] ${level}`);
    console.log(`   ${message}\n`);
  });
  
  // エラーがあるかチェック
  const errors = logEntries.filter(entry => 
    entry.level === 'ERROR' || 
    (entry.message && entry.message.includes('Error'))
  );
  
  if (errors.length > 0) {
    console.log('⚠️  エラーが検出されました:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.message || error.payload}`);
    });
  } else {
    console.log('✅ エラーは検出されませんでした。');
  }
  
} catch (error) {
  if (error.message.includes('No logs found')) {
    console.log('📝 実行ログがありません。');
    console.log('💡 Google Apps Scriptエディタでテスト関数を実行してからもう一度お試しください。');
  } else if (error.message.includes('timeout')) {
    console.log('⏱️  タイムアウトしました。ネットワーク接続を確認してください。');
  } else {
    console.log('❌ ログ取得エラー:', error.message);
    console.log('\n💡 以下を確認してください:');
    console.log('   1. claspにログインしているか: clasp login');
    console.log('   2. 正しいプロジェクトが選択されているか');
    console.log('   3. Google Apps Script APIが有効になっているか');
  }
}