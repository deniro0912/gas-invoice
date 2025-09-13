import { chromium } from 'playwright';

console.log('🔧 保存されたログイン状態でGCP設定を確認...');

const context = await chromium.launchPersistentContext('./browser-data', {
  headless: false,
  viewport: { width: 1280, height: 720 }
});

const page = context.pages()[0] || await context.newPage();
const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';

await page.goto(gasUrl);
await page.waitForTimeout(5000);

console.log('✅ GAS エディタにアクセス完了');

try {
  // プロジェクト設定をクリック
  console.log('⚙️ プロジェクト設定を探しています...');
  
  // 設定アイコンをクリック（複数のセレクタを試す）
  const settingsSelectors = [
    '[aria-label*="設定"]',
    '[title*="設定"]',
    'button[aria-label*="Project settings"]',
    'button[title*="Project settings"]',
    '.project-settings',
    '[data-tooltip*="設定"]'
  ];
  
  let settingsFound = false;
  for (const selector of settingsSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      await page.click(selector);
      console.log(`✅ 設定ボタンをクリック: ${selector}`);
      settingsFound = true;
      break;
    } catch (e) {
      continue;
    }
  }
  
  if (!settingsFound) {
    console.log('❌ 設定ボタンが見つかりませんでした');
    // サイドバー全体のスクリーンショットを撮影
    await page.screenshot({ path: 'gas-sidebar.png' });
    console.log('📷 サイドバーのスクリーンショットを保存: gas-sidebar.png');
    
    // 手動で設定を確認してもらう
    console.log('🖱️ 手動で設定ページにアクセスしてください');
    console.log('⏰ 30秒待機します...');
    await page.waitForTimeout(30000);
  } else {
    await page.waitForTimeout(3000);
    
    // GCPプロジェクト関連のテキストを探す
    const pageText = await page.textContent('body');
    if (pageText.includes('Google Cloud Platform') || pageText.includes('GCP')) {
      console.log('✅ GCPプロジェクト設定項目を発見');
      
      // 設定ページのスクリーンショット
      await page.screenshot({ path: 'gas-settings.png', fullPage: true });
      console.log('📷 設定ページのスクリーンショットを保存: gas-settings.png');
      
      console.log('📋 GCPプロジェクトを設定してください');
      console.log('⏰ 60秒待機します...');
      await page.waitForTimeout(60000);
      
    } else {
      console.log('❌ GCPプロジェクト設定項目が見つかりませんでした');
    }
  }
  
} catch (error) {
  console.error('❌ エラー:', error.message);
  await page.screenshot({ path: 'gas-error.png', fullPage: true });
  console.log('📷 エラー時のスクリーンショット: gas-error.png');
}

await context.close();
console.log('📴 ブラウザを閉じました');