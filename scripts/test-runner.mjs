import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🧪 GAS請求書管理システム - 自動テスト実行');
console.log('=' . repeat(50));

// テスト関数の一覧
const testFunctions = [
  {
    name: 'testFunction',
    description: 'システム基本テスト',
    timeout: 30000
  },
  {
    name: 'showSettings', 
    description: '設定確認テスト',
    timeout: 15000
  }
];

// 環境の確認
console.log('📋 環境情報:');
try {
  const claspJson = JSON.parse(readFileSync('.clasp.json', 'utf8'));
  console.log(`  Script ID: ${claspJson.scriptId}`);
  console.log(`  Root Dir: ${claspJson.rootDir}`);
} catch (error) {
  console.log('  ⚠️  .clasp.json が見つかりません');
}

// ビルド実行
console.log('\n🔨 ビルド実行中...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('  ✅ ビルド完了');
} catch (error) {
  console.log('  ❌ ビルドエラー:', error.message);
  process.exit(1);
}

// プッシュ実行
console.log('\n📤 Google Apps Scriptにプッシュ中...');
try {
  const result = execSync('clasp push --force', { stdio: 'pipe' }).toString();
  console.log('  ✅ プッシュ完了');
  console.log(`  ${result.trim()}`);
} catch (error) {
  console.log('  ❌ プッシュエラー:', error.message);
  process.exit(1);
}

// ログの確認方法を表示
console.log('\n📊 テスト実行後の確認方法:');
console.log('  1. Google Apps Scriptエディタを開いてください');
console.log('  2. 以下の関数を順番に実行してください:');

testFunctions.forEach((func, index) => {
  console.log(`     ${index + 1}. ${func.name}() - ${func.description}`);
});

console.log('\n  3. 実行ログタブで結果を確認してください');
console.log('\n🔗 Google Apps Scriptエディタを開く:');

try {
  const claspJson = JSON.parse(readFileSync('.clasp.json', 'utf8'));
  const scriptUrl = `https://script.google.com/d/${claspJson.scriptId}/edit`;
  console.log(`  ${scriptUrl}`);
} catch (error) {
  console.log('  URLの生成に失敗しました');
}

// 追加の便利な情報
console.log('\n💡 便利なコマンド:');
console.log('  npm run test:quick    - このスクリプトを実行');
console.log('  npm run push:dev      - 開発環境に素早くプッシュ');
console.log('  clasp logs            - 実行ログを取得');
console.log('  clasp open            - ブラウザでエディタを開く');

console.log('\n🎯 テスト準備完了！上記のURLからエディタを開いてテストを実行してください。');