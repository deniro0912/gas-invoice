import esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

// distディレクトリが存在しなければ作成
if (!existsSync('dist')) {
  mkdirSync('dist');
}

const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'esm',
  banner: {
    js: `
// Google Apps Script - GAS請求書管理システム
// TypeScriptからビルドされたファイルです
    `.trim()
  },
  footer: {
    js: `
// Google Apps Script用のグローバル関数として公開
// ESModule形式から標準的なfunction宣言に変換
    `.trim()
  },
  plugins: [
    {
      name: 'gas-globals',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length > 0) return;
          
          // ビルド後にファイルを読み取って変換
          const fs = await import('fs');
          const path = await import('path');
          
          const filePath = path.resolve('dist/main.js');
          let content = fs.readFileSync(filePath, 'utf8');
          
          // ESModule構文を除去してGAS用の関数宣言に変換
          content = transformToGASFunctions(content);
          
          fs.writeFileSync(filePath, content, 'utf8');
          console.log('✅ Google Apps Script用に変換完了');
        });
      }
    }
  ],
  logLevel: 'info'
};

// ESModule構文をGAS用の関数宣言に変換する関数
function transformToGASFunctions(content) {
  // export function を function に変換
  content = content.replace(/export\s+function\s+(\w+)/g, 'function $1');
  
  // export const func = () => を function func() に変換
  content = content.replace(/export\s+const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{/g, 'function $1() {');
  
  // ESModuleのexportブロックを完全に除去（複数行対応）
  content = content.replace(/export\s*\{[\s\S]*?\};?/g, '');
  
  // その他のexport文を除去
  content = content.replace(/^export\s+.*$/gm, '');
  
  // import文を除去
  content = content.replace(/^import\s+.*$/gm, '');
  
  // 空行を整理
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // 最後の空行やゴミを除去
  content = content.trim();
  
  return content;
}

// ビルド実行
async function build() {
  try {
    await esbuild.build(config);
    console.log('✅ ビルド完了');
  } catch (error) {
    console.error('❌ ビルドエラー:', error);
    process.exit(1);
  }
}

// watchモードの設定
if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 ファイル監視中...');
} else {
  await build();
}