import { chromium } from 'playwright';

console.log('🧪 GAS エディタを起動します...');

const browser = await chromium.launch({ 
  headless: false,
  slowMo: 500
});

const page = await browser.newPage();
const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';

await page.goto(gasUrl);
await page.waitForTimeout(3000);

console.log('✅ ブラウザを起動しました');
console.log('📋 次の手順:');
console.log('1. ログイン');
console.log('2. 左サイドバー → ⚙️「プロジェクトの設定」');
console.log('3. GCPプロジェクトを設定');
console.log('4. 設定完了後、Claudeに報告してください');
console.log('');
console.log('🎯 ブラウザは開いたままにしておきます');

// ブラウザを閉じずに、スクリプトだけ終了
console.log('⚠️  注意: ブラウザを手動で閉じてください');
process.exit(0);