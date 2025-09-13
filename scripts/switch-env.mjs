import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// 環境名を取得
const env = process.argv[2];
if (!env || !['dev', 'prod'].includes(env)) {
  console.error('❌ 使用方法: node scripts/switch-env.mjs <dev|prod>');
  process.exit(1);
}

// プロジェクトルートからのパス解決
const projectRoot = process.cwd();
const envDir = resolve(projectRoot, 'env');
const distDir = resolve(projectRoot, 'dist');

try {
  // distディレクトリが存在しなければ作成
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  // clasp設定ファイルのコピー
  const claspSource = resolve(envDir, `clasp.${env}.json`);
  const claspDest = resolve(projectRoot, '.clasp.json');
  
  if (existsSync(claspSource)) {
    copyFileSync(claspSource, claspDest);
    console.log(`✅ .clasp.json を ${env} 環境用に切り替えました`);
  } else {
    console.warn(`⚠️  ${claspSource} が見つかりません`);
  }

  // マニフェストファイルのコピー
  const manifestSource = resolve(envDir, `manifest.${env}.json`);
  const manifestDest = resolve(distDir, 'appsscript.json');
  
  if (existsSync(manifestSource)) {
    copyFileSync(manifestSource, manifestDest);
    console.log(`✅ appsscript.json を ${env} 環境用に切り替えました`);
  } else {
    console.warn(`⚠️  ${manifestSource} が見つかりません`);
  }

  console.log(`\n🎯 環境を ${env} に切り替えました`);
} catch (error) {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
}