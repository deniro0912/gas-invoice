/**
 * PDFテンプレートアップロードサービス
 * ローカルファイルをGoogle Driveにアップロード
 */

export class PDFTemplateUploaderService {
  private static instance: PDFTemplateUploaderService;

  private constructor() {}

  public static getInstance(): PDFTemplateUploaderService {
    if (!PDFTemplateUploaderService.instance) {
      PDFTemplateUploaderService.instance = new PDFTemplateUploaderService();
    }
    return PDFTemplateUploaderService.instance;
  }

  /**
   * Base64エンコードされたPDFデータをGoogle Driveにアップロード
   * 注: GASではローカルファイルを直接読み込めないため、
   * Base64でエンコードしたデータを関数に埋め込む必要があります
   */
  public uploadPDFTemplate(base64Data: string, fileName: string): string {
    try {
      console.log('PDFテンプレートのアップロード開始:', fileName);
      
      // Base64データをBlobに変換
      const blob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        'application/pdf',
        fileName
      );
      
      console.log('Blobサイズ:', blob.getBytes().length, 'bytes');
      
      // Google Driveのルートフォルダに保存
      const file = DriveApp.createFile(blob);
      
      // 共有設定（リンクを知っている人は閲覧可能）
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
      
      const fileId = file.getId();
      const fileUrl = file.getUrl();
      
      console.log('✅ PDFテンプレートアップロード成功');
      console.log('   ファイルID:', fileId);
      console.log('   ファイルURL:', fileUrl);
      console.log('   ファイル名:', file.getName());
      
      return fileId;
      
    } catch (error) {
      console.error('❌ PDFテンプレートアップロードエラー:', error.toString());
      throw error;
    }
  }

  /**
   * 既存のテンプレートファイルを検索
   */
  public findExistingTemplate(fileName: string = 'invoice-template.pdf'): string | null {
    try {
      console.log('既存テンプレート検索:', fileName);
      
      const files = DriveApp.getFilesByName(fileName);
      
      if (files.hasNext()) {
        const file = files.next();
        const fileId = file.getId();
        console.log('✅ 既存テンプレート発見:', fileId);
        return fileId;
      }
      
      console.log('既存テンプレートなし');
      return null;
      
    } catch (error) {
      console.error('テンプレート検索エラー:', error.toString());
      return null;
    }
  }

  /**
   * PDFテンプレートの内容を確認
   */
  public verifyTemplate(fileId: string): void {
    try {
      console.log('PDFテンプレート検証開始:', fileId);
      
      const file = DriveApp.getFileById(fileId);
      
      console.log('✅ テンプレート情報:');
      console.log('   ファイル名:', file.getName());
      console.log('   サイズ:', file.getSize(), 'bytes');
      console.log('   MIMEタイプ:', file.getMimeType());
      console.log('   作成日:', file.getDateCreated());
      console.log('   最終更新:', file.getLastUpdated());
      console.log('   URL:', file.getUrl());
      
      // PDFの内容を取得
      const blob = file.getBlob();
      console.log('   Blobサイズ:', blob.getBytes().length, 'bytes');
      
    } catch (error) {
      console.error('❌ テンプレート検証エラー:', error.toString());
      throw error;
    }
  }
}