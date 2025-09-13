import { chromium } from 'playwright';

console.log('🔍 GCPプロジェクトIDを取得中...');

const context = await chromium.launchPersistentContext('./browser-data', {
  headless: false,
  viewport: { width: 1280, height: 720 }
});

const page = context.pages()[0] || await context.newPage();

try {
  // GAS エディタにアクセス
  const gasUrl = 'https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit';
  await page.goto(gasUrl);
  await page.waitForTimeout(5000);

  // プロジェクト設定をクリック
  console.log('⚙️ プロジェクト設定にアクセス中...');
  
  // 設定アイコンを探してクリック
  const settingsButton = await page.locator('[data-tooltip*="プロジェクトの設定"], [aria-label*="設定"], button:has-text("設定")').first();
  await settingsButton.click();
  await page.waitForTimeout(3000);

  // ページの内容から GCP プロジェクト ID を抽出
  const pageContent = await page.content();
  
  // プロジェクト ID のパターンを探す
  const projectIdRegex = /project[_-]?id[:\s]*([a-z0-9-]+)/gi;
  const matches = pageContent.match(projectIdRegex);
  
  if (matches) {
    console.log('🎯 見つかった可能性のあるプロジェクトID:');
    matches.forEach(match => console.log(`  ${match}`));
  }
  
  // より具体的にGCPプロジェクト情報を探す
  const gcpElements = await page.locator('text=GCP').all();
  for (const element of gcpElements) {
    const parent = element.locator('..');
    const text = await parent.textContent();
    console.log('📋 GCP関連テキスト:', text);
  }
  
  // スクリーンショットを撮影
  await page.screenshot({ path: 'project-settings.png', fullPage: true });
  console.log('📷 プロジェクト設定のスクリーンショット: project-settings.png');
  
  console.log('');
  console.log('📝 手動でプロジェクトIDを確認してください:');
  console.log('1. プロジェクト設定ページでGCPプロジェクトIDを探す');
  console.log('2. プロジェクトIDをコピー');
  console.log('3. このスクリプト実行後にプロジェクトIDを教えてください');
  
  // 30秒待機
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('❌ エラー:', error.message);
  await page.screenshot({ path: 'error-project-id.png' });
}

await context.close();
console.log('📴 ブラウザを閉じました');