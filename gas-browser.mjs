import { chromium } from 'playwright';

console.log('🧪 GAS エディタアクセス中...');

const browser = await chromium.launch({ 
  headless: false,
  timeout: 300000  // 5分のタイムアウト
});

const page = await browser.newPage();
const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';

console.log('📝 GAS エディタにアクセス中...');
await page.goto(gasUrl);
await page.waitForTimeout(5000);

console.log('🔑 ログイン後、GCP設定をお願いします');
console.log('📋 手順:');
console.log('1. 左サイドバー → ⚙️「プロジェクトの設定」');
console.log('2. 「Google Cloud Platform (GCP) プロジェクト」項目を探す');
console.log('3. 新しいプロジェクトを作成または既存を選択');
console.log('');
console.log('⏰ 5分間待機します（設定完了後、Enterキーを押して終了してください）');

// 5分間待機
await page.waitForTimeout(300000);

await browser.close();
console.log('✅ ブラウザを閉じました');