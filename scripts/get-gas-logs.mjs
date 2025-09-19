#!/usr/bin/env node

/**
 * GAS実行ログ確認スクリプト
 * claspコマンドの代替として実行ログを確認
 */

import { execSync } from 'child_process';

console.log('🔍 GAS実行ログ確認');
console.log('=' .repeat(60));

try {
  // GCPプロジェクトIDを環境変数に設定してログ取得を試行
  process.env.GOOGLE_CLOUD_PROJECT = '1007727912720';
  process.env.GCP_PROJECT_ID = '1007727912720';
  process.env.GCLOUD_PROJECT = '1007727912720';
  
  console.log('🎯 GCPプロジェクトID設定: 1007727912720');
  console.log('');
  
  // まず、プロジェクトの状態を確認
  console.log('📋 プロジェクト状態確認:');
  try {
    const listResult = execSync('clasp list', { encoding: 'utf8' });
    console.log(listResult);
  } catch (error) {
    console.log('⚠️ プロジェクト一覧取得失敗:', error.message);
  }
  
  console.log('');
  console.log('📊 実行ログ取得試行:');
  
  // 複数の方法でログ取得を試行
  const logCommands = [
    'clasp logs --simplified',
    'clasp logs',
    'clasp logs --json'
  ];
  
  for (const command of logCommands) {
    try {
      console.log(`\n🔄 実行中: ${command}`);
      const result = execSync(command, { 
        encoding: 'utf8',
        env: {
          ...process.env,
          GOOGLE_CLOUD_PROJECT: '1007727912720',
          GCP_PROJECT_ID: '1007727912720'
        }
      });
      
      if (result.trim()) {
        console.log('✅ ログ取得成功:');
        console.log('-'.repeat(40));
        console.log(result);
        console.log('-'.repeat(40));
        break;
      } else {
        console.log('📝 ログは空です（実行履歴なし）');
      }
      
    } catch (error) {
      console.log(`❌ ${command} 失敗:`, error.message);
      
      if (error.message.includes('GCP project ID')) {
        console.log('💡 GCPプロジェクトID設定が必要です');
      }
    }
  }
  
} catch (error) {
  console.error('💥 スクリプト実行エラー:', error.message);
}

console.log('');
console.log('📞 手動確認方法:');
console.log('1. GASエディタで関数を実行');
console.log('2. 「実行ログ」タブをクリック');
console.log('3. ログ内容を確認');
console.log('');
console.log('🔗 GASエディタ: https://script.google.com/d/10PdYrLy31aS5W3wwqvibrJrYcdNxMIEGiE-JEHuouKGB6hT5e7rjSuZP/edit');