import { chromium } from 'playwright';

console.log('🧪 GAS エディタアクセステスト開始...');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';

console.log('📝 GAS エディタにアクセス中...');
await page.goto(gasUrl);
await page.waitForTimeout(5000);

const title = await page.title();
console.log('✅ ページタイトル:', title);

// スクリーンショット撮影
await page.screenshot({ path: 'gas-screenshot.png', fullPage: true });
console.log('📷 スクリーンショット保存: gas-screenshot.png');

// 30秒間ブラウザを開いたままにして手動確認を可能にする
console.log('🔑 ログインをお願いします...');
console.log('ログイン完了後、GASエディタが表示されるまで待機します...');

// ログインとGASエディタ表示を待つ
await page.waitForTimeout(60000); // 1分間待機

console.log('📋 GCP設定確認のため、さらに時間を延長します...');
await page.waitForTimeout(60000); // さらに1分間待機

await browser.close();
console.log('🎉 テスト完了');