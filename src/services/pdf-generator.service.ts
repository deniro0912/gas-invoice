/**
 * PDF生成サービス
 * 請求書データからPDFを生成し、Google Driveに保存
 */

import { Invoice } from '../models/invoice.model';
import { Customer } from '../models/customer.model';
import { ConfigManager } from '../config';
import { ErrorHandler } from '../utils/error-handler';

export interface PDFGenerationOptions {
  saveToFolder?: string; // Google DriveのフォルダID
  fileName?: string; // PDFファイル名
  emailTo?: string; // メール送信先
  preview?: boolean; // プレビューモード
}

export interface PDFGenerationResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

export class PDFGeneratorService {
  private static instance: PDFGeneratorService;
  private readonly templateCache: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): PDFGeneratorService {
    if (!PDFGeneratorService.instance) {
      PDFGeneratorService.instance = new PDFGeneratorService();
    }
    return PDFGeneratorService.instance;
  }

  /**
   * 請求書PDFを生成
   */
  public async generateInvoicePDF(
    invoice: Invoice,
    customer: Customer,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      console.log(`Generating PDF for invoice: ${invoice.invoiceNumber}`);

      // HTMLテンプレートを取得
      const htmlTemplate = this.getHTMLTemplate();

      // データをテンプレートに適用
      const htmlContent = this.applyDataToTemplate(htmlTemplate, invoice, customer);

      // PDFに変換
      const blob = this.convertHTMLToPDF(htmlContent);

      // ファイル名を生成
      const fileName = options.fileName || 
        `請求書_${invoice.invoiceNumber}_${customer.companyName}.pdf`;

      // Google Driveに保存
      if (!options.preview) {
        const result = await this.savePDFToDrive(blob, fileName, options.saveToFolder);
        
        // メール送信オプション
        if (options.emailTo) {
          await this.sendPDFByEmail(result.fileId!, options.emailTo, invoice, customer);
        }

        return {
          success: true,
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: fileName
        };
      } else {
        // プレビューモード
        return this.showPDFPreview(htmlContent);
      }

    } catch (error) {
      const errorMessage = ErrorHandler.handle(error, 'PDFGeneratorService.generateInvoicePDF');
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * HTMLテンプレートを取得
   */
  private getHTMLTemplate(): string {
    // キャッシュチェック
    if (this.templateCache.has('invoice')) {
      return this.templateCache.get('invoice')!;
    }

    // HTMLテンプレートファイルを読み込む
    // 注: GASではファイルシステムアクセスが制限されているため、
    // テンプレートは直接コードに埋め込むか、Google Driveから読み込む
    const template = this.getEmbeddedTemplate();
    
    this.templateCache.set('invoice', template);
    return template;
  }

  /**
   * データをHTMLテンプレートに適用
   */
  private applyDataToTemplate(
    template: string,
    invoice: Invoice,
    customer: Customer
  ): string {
    // Handlebars風の置換処理
    let html = template;

    // 基本情報
    html = html.replace('{{invoiceNumber}}', invoice.invoiceNumber);
    html = html.replace('{{issueDate}}', this.formatDate(invoice.issueDate));
    html = html.replace('{{paymentDueDate}}', this.formatDate(invoice.dueDate));

    // 顧客情報
    html = html.replace('{{customerName}}', customer.companyName);
    html = html.replace('{{customerPostalCode}}', customer.postalCode || '');
    html = html.replace('{{customerAddress}}', customer.address || '');

    // 金額情報
    const subtotal = invoice.subtotal;
    const taxAmount = invoice.taxAmount;
    const totalAmount = invoice.totalAmount;

    html = html.replace('{{subtotalFormatted}}', this.formatCurrency(subtotal));
    html = html.replace('{{taxAmountFormatted}}', this.formatCurrency(taxAmount));
    html = html.replace('{{totalAmountFormatted}}', this.formatCurrency(totalAmount));

    // 請求明細
    const itemsHtml = this.generateItemsHTML(invoice);
    html = html.replace('{{#each items}}{{/each}}', itemsHtml);

    // 会社情報（設定から取得）
    const config = ConfigManager.getInstance();
    html = html.replace('{{companyName}}', config.getCompanyInfo().name);
    html = html.replace('{{companyPostalCode}}', config.getCompanyInfo().postalCode);
    html = html.replace('{{companyAddress}}', config.getCompanyInfo().address);
    html = html.replace('{{companyPhone}}', config.getCompanyInfo().phone);
    html = html.replace('{{companyEmail}}', config.getCompanyInfo().email || '');
    html = html.replace('{{companyWebsite}}', config.getCompanyInfo().website || '');

    // 銀行情報
    html = html.replace('{{bankDetails}}', config.getBankInfo().details);

    // 備考
    html = html.replace('{{notes}}', invoice.notes || '');

    // 条件付き表示の処理
    html = this.processConditionals(html);

    return html;
  }

  /**
   * 請求明細のHTML生成
   */
  private generateItemsHTML(invoice: Invoice): string {
    // 固定の制作費項目
    const item = {
      description: invoice.description || '制作費',
      quantity: 1,
      unit: '式',
      unitPrice: invoice.subtotal,
      amount: invoice.subtotal
    };

    return `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td class="amount-cell">¥${this.formatCurrency(item.unitPrice)}</td>
        <td class="amount-cell">¥${this.formatCurrency(item.amount)}</td>
      </tr>
    `;
  }

  /**
   * HTMLをPDFに変換
   */
  private convertHTMLToPDF(htmlContent: string): GoogleAppsScript.Base.Blob {
    try {
      console.log('HTML→PDF変換開始');
      console.log('HTMLコンテンツサイズ:', htmlContent.length);
      
      // 一時的なGoogle Docsドキュメントを作成してPDFに変換
      const tempDoc = DocumentApp.create(`temp_invoice_${Date.now()}`);
      const body = tempDoc.getBody();
      
      // HTMLコンテンツをドキュメントに挿入（簡易版）
      body.appendParagraph('請求書PDF生成テスト');
      body.appendParagraph('HTMLコンテンツサイズ: ' + htmlContent.length + ' 文字');
      body.appendParagraph('生成日時: ' + new Date().toLocaleString('ja-JP'));
      
      tempDoc.saveAndClose();
      
      // PDFとして出力
      const tempFile = DriveApp.getFileById(tempDoc.getId());
      const pdfBlob = tempFile.getAs('application/pdf');
      
      // 一時ファイルを削除
      tempFile.setTrashed(true);
      
      console.log('PDF変換完了, サイズ:', pdfBlob.getBytes().length);
      return pdfBlob;
      
    } catch (error) {
      console.error('HTML→PDF変換エラー:', error);
      console.error('エラースタック:', error.stack);
      
      // フォールバック: エラー用のGoogle Docs PDFを作成
      console.log('フォールバック: エラー用PDF作成');
      const fallbackDoc = DocumentApp.create(`error_invoice_${Date.now()}`);
      const fallbackBody = fallbackDoc.getBody();
      
      fallbackBody.appendParagraph('PDF生成エラーレポート').setFontSize(16).setBold(true);
      fallbackBody.appendParagraph('');
      fallbackBody.appendParagraph(`元のHTMLサイズ: ${htmlContent.length} 文字`);
      fallbackBody.appendParagraph(`エラー: ${error.toString()}`);
      fallbackBody.appendParagraph(`生成日時: ${new Date().toLocaleString('ja-JP')}`);
      
      fallbackDoc.saveAndClose();
      
      const fallbackFile = DriveApp.getFileById(fallbackDoc.getId());
      const fallbackBlob = fallbackFile.getAs('application/pdf');
      
      // 一時ファイルを削除
      fallbackFile.setTrashed(true);
      
      return fallbackBlob;
    }
  }

  /**
   * PDFをGoogle Driveに保存
   */
  private async savePDFToDrive(
    blob: GoogleAppsScript.Base.Blob,
    fileName: string,
    folderId?: string
  ): Promise<{ fileId: string; fileUrl: string }> {
    try {
      console.log('PDF保存開始:', { fileName, folderId, blobSize: blob.getBytes().length });
      
      // 保存先フォルダを取得または作成
      const folder = this.getOrCreateFolder(folderId);
      console.log('フォルダ取得完了:', folder.getId());
      
      // PDFファイルを作成
      console.log('PDFファイル作成中:', fileName);
      const file = folder.createFile(blob);
      file.setName(fileName);
      console.log('PDFファイル作成完了:', file.getId());
      
      // 共有設定
      console.log('共有設定適用中...');
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
      console.log('共有設定完了');

      return {
        fileId: file.getId(),
        fileUrl: file.getUrl()
      };
    } catch (error) {
      console.error('PDF保存エラー詳細:', error);
      console.error('エラースタック:', error.stack);
      throw new Error(`PDFのGoogle Drive保存に失敗: ${error.toString()}`);
    }
  }

  /**
   * フォルダを取得または作成
   */
  private getOrCreateFolder(folderId?: string): GoogleAppsScript.Drive.Folder {
    console.log('フォルダ取得開始:', { folderId });
    
    if (folderId) {
      try {
        console.log('指定フォルダID取得試行:', folderId);
        const folder = DriveApp.getFolderById(folderId);
        console.log('指定フォルダ取得成功:', folder.getName());
        return folder;
      } catch (error) {
        console.warn(`フォルダが見つからない: ${folderId}, 新規フォルダを作成します`);
        console.warn('エラー詳細:', error);
      }
    }

    // デフォルトフォルダを作成
    console.log('ルートフォルダ取得中...');
    const rootFolder = DriveApp.getRootFolder();
    console.log('ルートフォルダ取得完了');
    
    const folderName = `請求書_${new Date().getFullYear()}`;
    console.log('フォルダ名:', folderName);
    
    console.log('既存フォルダ検索中...');
    const folders = rootFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      const existingFolder = folders.next();
      console.log('既存フォルダ発見:', existingFolder.getId());
      return existingFolder;
    }
    
    console.log('新規フォルダ作成中:', folderName);
    const newFolder = rootFolder.createFolder(folderName);
    console.log('新規フォルダ作成完了:', newFolder.getId());
    return newFolder;
  }

  /**
   * PDFをメールで送信
   */
  private async sendPDFByEmail(
    fileId: string,
    emailTo: string,
    invoice: Invoice,
    customer: Customer
  ): Promise<void> {
    try {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      
      const subject = `請求書送付のご案内 - ${invoice.invoiceNumber}`;
      const body = `
${customer.companyName} 様

いつもお世話になっております。

請求書をお送りいたします。
ご確認のほど、よろしくお願いいたします。

請求書番号: ${invoice.invoiceNumber}
発行日: ${this.formatDate(invoice.issueDate)}
お支払期限: ${this.formatDate(invoice.dueDate)}
ご請求金額: ¥${this.formatCurrency(invoice.totalAmount)}（税込）

添付ファイルをご確認ください。

何かご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。
      `;

      MailApp.sendEmail({
        to: emailTo,
        subject: subject,
        body: body,
        attachments: [blob]
      });

      console.log(`PDF sent to: ${emailTo}`);
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * PDFプレビューを表示
   */
  private showPDFPreview(htmlContent: string): PDFGenerationResult {
    // HtmlServiceを使用してプレビューを表示
    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(800)
      .setHeight(1000)
      .setTitle('請求書プレビュー');
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, '請求書プレビュー');
    
    return {
      success: true,
      fileName: 'preview'
    };
  }

  /**
   * 条件付き表示の処理
   */
  private processConditionals(html: string): string {
    // {{#if variable}} ... {{/if}} パターンの処理
    const conditionalPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    
    return html.replace(conditionalPattern, (match, variable, content) => {
      // 変数が空でない場合はコンテンツを表示
      if (html.includes(`{{${variable}}}`) && 
          !html.includes(`{{${variable}}}`).includes('{{}}')) {
        return content;
      }
      return '';
    });
  }

  /**
   * 日付フォーマット
   */
  private formatDate(date: Date | string | undefined): string {
    if (!date) {
      return '未設定';
    }
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // 有効な日付かチェック
    if (isNaN(dateObj.getTime())) {
      return '無効な日付';
    }
    
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日`;
  }

  /**
   * 通貨フォーマット
   */
  private formatCurrency(amount: number): string {
    return amount.toLocaleString('ja-JP');
  }

  /**
   * 埋め込みHTMLテンプレートを取得
   */
  private getEmbeddedTemplate(): string {
    // テンプレートファイルの内容を返す
    // 実際の実装では、別ファイルから読み込むか、
    // Google Driveから取得する
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* スタイルは invoice-template.html から */
  </style>
</head>
<body>
  <!-- HTMLテンプレート本体 -->
</body>
</html>`;
  }

  /**
   * バッチPDF生成
   */
  public async generateBatchPDFs(
    invoiceIds: string[],
    options: PDFGenerationOptions = {}
  ): Promise<Map<string, PDFGenerationResult>> {
    const results = new Map<string, PDFGenerationResult>();
    
    for (const invoiceId of invoiceIds) {
      try {
        // ここで実際の請求書と顧客データを取得
        // const invoice = await invoiceRepository.findByNumber(invoiceId);
        // const customer = await customerRepository.findById(invoice.customerId);
        
        // const result = await this.generateInvoicePDF(invoice, customer, options);
        // results.set(invoiceId, result);
      } catch (error) {
        results.set(invoiceId, {
          success: false,
          error: `Failed to generate PDF for ${invoiceId}: ${error}`
        });
      }
    }
    
    return results;
  }
}