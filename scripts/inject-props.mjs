import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// 環境名を取得
const env = process.argv[2];
if (!env || !['dev', 'prod'].includes(env)) {
  console.error('❌ 使用方法: node scripts/inject-props.mjs <dev|prod>');
  process.exit(1);
}

// プロジェクトルートからのパス解決
const projectRoot = process.cwd();
const propsFile = resolve(projectRoot, 'env', `props.${env}.json`);

try {
  // プロパティファイルを読み込み
  const props = JSON.parse(readFileSync(propsFile, 'utf8'));
  
  console.log(`📝 ${env} 環境のScript Propertiesを設定中...`);
  
  // 各プロパティを設定
  for (const [key, value] of Object.entries(props)) {
    const command = `clasp run setScriptProperty --params '["${key}", "${value}"]'`;
    console.log(`  設定中: ${key}`);
    
    try {
      execSync(command, { stdio: 'ignore' });
    } catch (error) {
      console.error(`  ❌ ${key} の設定に失敗しました`);
    }
  }
  
  console.log(`✅ Script Propertiesの設定が完了しました`);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`❌ ${propsFile} が見つかりません`);
  } else {
    console.error('❌ エラーが発生しました:', error);
  }
  process.exit(1);
}