import { chromium } from 'playwright';

console.log('🧪 永続化ブラウザでGAS エディタを起動...');

// ユーザーデータディレクトリを使用して永続化
const context = await chromium.launchPersistentContext('./browser-data', {
  headless: false,
  viewport: { width: 1280, height: 720 }
});

const page = context.pages()[0] || await context.newPage();
const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';

await page.goto(gasUrl);
await page.waitForTimeout(3000);

console.log('✅ 永続化ブラウザを起動しました');
console.log('🔑 ログインを完了してから、"ログイン完了"と入力してください');

// ブラウザは永続化されるので、次回同じデータを使用可能
console.log('💾 ブラウザデータは ./browser-data に保存されます');

// 60秒待機してからプロセス終了
await page.waitForTimeout(60000);
await context.close();
console.log('📴 ブラウザを閉じました');