/**
 * Drive API テストサービス
 * Context7で確認した正しいDrive API使用パターンに基づく実装
 */

export class DriveTestService {
  private static instance: DriveTestService;

  private constructor() {}

  public static getInstance(): DriveTestService {
    if (!DriveTestService.instance) {
      DriveTestService.instance = new DriveTestService();
    }
    return DriveTestService.instance;
  }

  /**
   * 段階的Drive APIテスト
   * Context7のドキュメントに基づく正しい使用方法
   */
  public testDriveAPIStep1_Authorization(): void {
    console.log('=== Drive API 段階テスト1: 認証確認 ===');
    
    try {
      // 1. 最小限のDrive API呼び出し - getRootFolder()
      console.log('1. getRootFolder()テスト...');
      const rootFolder = DriveApp.getRootFolder();
      console.log('✅ getRootFolder()成功');
      console.log('   ルートフォルダ名:', rootFolder.getName());
      console.log('   ルートフォルダID:', rootFolder.getId());

    } catch (error) {
      console.error('❌ getRootFolder()失敗:', error.toString());
      console.error('エラースタック:', error.stack);
      throw error;
    }
  }

  /**
   * 段階的Drive APIテスト - ファイル検索
   */
  public testDriveAPIStep2_FileSearch(): void {
    console.log('=== Drive API 段階テスト2: ファイル検索 ===');
    
    try {
      // Context7で確認: DriveApp.getFilesByName()は正しい方法
      console.log('1. ファイル検索テスト...');
      const files = DriveApp.getFilesByName('invoice-template.pdf');
      
      console.log('✅ getFilesByName()成功');
      
      let count = 0;
      while (files.hasNext()) {
        const file = files.next();
        count++;
        
        console.log(`--- ファイル ${count} ---`);
        console.log('ID:', file.getId());
        console.log('名前:', file.getName());
        console.log('サイズ:', file.getSize(), 'bytes');
        console.log('MIME:', file.getMimeType());
        console.log('作成日:', file.getDateCreated());
        console.log('URL:', file.getUrl());
        
        if (count === 1) {
          console.log('\n🎯 最初のファイルで詳細テスト実行...');
          this.testFileDetails(file);
        }
        
        // 最大3ファイルまで表示
        if (count >= 3) break;
      }
      
      console.log(`\n📊 合計 ${count} 個のファイルが見つかりました`);
      
    } catch (error) {
      console.error('❌ ファイル検索失敗:', error.toString());
      console.error('エラースタック:', error.stack);
      throw error;
    }
  }

  /**
   * ファイル詳細情報のテスト
   */
  private testFileDetails(file: GoogleAppsScript.Drive.File): void {
    try {
      console.log('=== ファイル詳細テスト ===');
      
      // Context7で確認済みの安全なメソッド
      console.log('所有者:', file.getOwner()?.getEmail() || '不明');
      console.log('最終更新:', file.getLastUpdated());
      console.log('スター状態:', file.isStarred());
      console.log('ゴミ箱状態:', file.isTrashed());
      
      // 親フォルダ取得テスト
      console.log('親フォルダ確認中...');
      const parents = file.getParents();
      let parentCount = 0;
      while (parents.hasNext() && parentCount < 3) {
        const parent = parents.next();
        parentCount++;
        console.log(`親フォルダ ${parentCount}:`, parent.getName());
      }
      
      console.log('✅ ファイル詳細テスト完了');
      
    } catch (error) {
      console.error('❌ ファイル詳細テスト失敗:', error.toString());
    }
  }

  /**
   * ファイル作成テスト（安全な方法）
   */
  public testDriveAPIStep3_FileCreation(): void {
    console.log('=== Drive API 段階テスト3: ファイル作成 ===');
    
    try {
      // Context7で確認: DriveApp.createFile()は正しい方法
      console.log('1. テストファイル作成...');
      
      const testContent = `Drive API テストファイル
作成日時: ${new Date().toLocaleString('ja-JP')}
目的: Drive API動作確認
ステータス: 正常動作中`;

      const blob = Utilities.newBlob(testContent, 'text/plain', 'drive-api-test.txt');
      const testFile = DriveApp.createFile(blob);
      
      console.log('✅ ファイル作成成功');
      console.log('   ファイルID:', testFile.getId());
      console.log('   ファイル名:', testFile.getName());
      console.log('   ファイルURL:', testFile.getUrl());
      
      // 共有設定テスト（Context7で確認済み）
      console.log('2. 共有設定テスト...');
      testFile.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
      console.log('✅ 共有設定成功');
      
      // クリーンアップ
      console.log('3. テストファイル削除...');
      testFile.setTrashed(true);
      console.log('✅ テストファイル削除完了');
      
    } catch (error) {
      console.error('❌ ファイル作成テスト失敗:', error.toString());
      console.error('エラースタック:', error.stack);
      throw error;
    }
  }

  /**
   * 完全なDrive APIテストスイート
   */
  public runCompleteAPITest(): void {
    console.log('🚀 Complete Drive API Test Suite 開始');
    console.log('Context7公式ドキュメントに基づく実装');
    
    try {
      this.testDriveAPIStep1_Authorization();
      console.log('');
      
      this.testDriveAPIStep2_FileSearch();
      console.log('');
      
      this.testDriveAPIStep3_FileCreation();
      console.log('');
      
      console.log('🎉 全テスト完了: Drive API正常動作確認');
      
    } catch (error) {
      console.error('🚨 テストスイート失敗:', error.toString());
      throw error;
    }
  }
}