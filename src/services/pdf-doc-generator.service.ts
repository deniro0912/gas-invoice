/**
 * Google Docs経由のPDF生成サービス
 * より高品質なPDF生成のためのGoogle Docs APIを使用した実装
 */

import { Invoice } from '../models/invoice.model';
import { Customer } from '../models/customer.model';
import { ConfigManager } from '../config';
import { ErrorHandler } from '../utils/error-handler';

export class PDFDocGeneratorService {
  private static instance: PDFDocGeneratorService;
  private readonly templateDocId: string;

  private constructor() {
    // テンプレートドキュメントIDを設定から取得
    const config = ConfigManager.getInstance();
    this.templateDocId = PropertiesService.getScriptProperties()
      .getProperty('INVOICE_TEMPLATE_DOC_ID') || '';
  }

  public static getInstance(): PDFDocGeneratorService {
    if (!PDFDocGeneratorService.instance) {
      PDFDocGeneratorService.instance = new PDFDocGeneratorService();
    }
    return PDFDocGeneratorService.instance;
  }

  /**
   * Google Docs経由でPDFを生成
   */
  public async generatePDFViaGoogleDocs(
    invoice: Invoice,
    customer: Customer
  ): Promise<{ fileId: string; fileUrl: string; pdfUrl: string }> {
    try {
      console.log(`Generating PDF via Google Docs for invoice: ${invoice.invoiceNumber}`);

      // テンプレートドキュメントをコピー
      const docCopy = this.copyTemplateDocument(invoice.invoiceNumber);

      // ドキュメントにデータを挿入
      this.populateDocument(docCopy.getId(), invoice, customer);

      // PDFに変換
      const pdfBlob = this.convertDocToPDF(docCopy.getId());

      // PDFをDriveに保存
      const pdfFile = this.savePDFFile(pdfBlob, invoice, customer);

      // 一時的なドキュメントを削除
      DriveApp.getFileById(docCopy.getId()).setTrashed(true);

      return {
        fileId: pdfFile.getId(),
        fileUrl: pdfFile.getUrl(),
        pdfUrl: this.getPDFDownloadUrl(pdfFile.getId())
      };

    } catch (error) {
      const errorMessage = ErrorHandler.handle(error, 'PDFDocGeneratorService.generatePDFViaGoogleDocs');
      throw new Error(errorMessage);
    }
  }

  /**
   * テンプレートドキュメントをコピー
   */
  private copyTemplateDocument(invoiceNumber: string): GoogleAppsScript.Drive.File {
    if (!this.templateDocId) {
      // テンプレートがない場合は新規作成
      return this.createNewTemplate(invoiceNumber);
    }

    try {
      const templateFile = DriveApp.getFileById(this.templateDocId);
      const fileName = `請求書_${invoiceNumber}_${new Date().getTime()}`;
      return templateFile.makeCopy(fileName);
    } catch (error) {
      console.warn('Template not found, creating new template');
      return this.createNewTemplate(invoiceNumber);
    }
  }

  /**
   * 新規テンプレートドキュメントを作成
   */
  private createNewTemplate(invoiceNumber: string): GoogleAppsScript.Drive.File {
    const doc = DocumentApp.create(`請求書_${invoiceNumber}_${new Date().getTime()}`);
    const body = doc.getBody();

    // 基本的なテンプレート構造を作成
    this.createTemplateStructure(body);

    doc.saveAndClose();
    return DriveApp.getFileById(doc.getId());
  }

  /**
   * テンプレート構造を作成
   */
  private createTemplateStructure(body: GoogleAppsScript.Document.Body): void {
    // ページ設定
    body.setMarginTop(72); // 1インチ = 72ポイント
    body.setMarginBottom(72);
    body.setMarginLeft(72);
    body.setMarginRight(72);

    // タイトル
    const title = body.appendParagraph('請 求 書');
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    title.setSpacingAfter(20);

    // 請求書番号
    body.appendParagraph('請求書番号: {{INVOICE_NUMBER}}')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    
    body.appendParagraph('発行日: {{ISSUE_DATE}}')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
      .setSpacingAfter(20);

    // 顧客情報セクション
    body.appendParagraph('{{CUSTOMER_NAME}} 御中')
      .setFontSize(14)
      .setBold(true)
      .setSpacingAfter(10);

    body.appendParagraph('{{CUSTOMER_ADDRESS}}')
      .setSpacingAfter(20);

    // 請求金額セクション
    const amountPara = body.appendParagraph('ご請求金額');
    amountPara.setSpacingAfter(10);
    
    const totalAmount = body.appendParagraph('¥{{TOTAL_AMOUNT}}');
    totalAmount.setFontSize(20);
    totalAmount.setBold(true);
    totalAmount.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    totalAmount.setSpacingAfter(30);

    // 請求明細テーブル
    const table = body.appendTable();
    
    // ヘッダー行
    const headerRow = table.appendTableRow();
    headerRow.appendTableCell('品目').setBackgroundColor('#333333')
      .editAsText().setForegroundColor('#FFFFFF');
    headerRow.appendTableCell('数量').setBackgroundColor('#333333')
      .editAsText().setForegroundColor('#FFFFFF');
    headerRow.appendTableCell('単価').setBackgroundColor('#333333')
      .editAsText().setForegroundColor('#FFFFFF');
    headerRow.appendTableCell('金額').setBackgroundColor('#333333')
      .editAsText().setForegroundColor('#FFFFFF');

    // データ行（プレースホルダー）
    const dataRow = table.appendTableRow();
    dataRow.appendTableCell('{{ITEM_DESCRIPTION}}');
    dataRow.appendTableCell('{{ITEM_QUANTITY}}');
    dataRow.appendTableCell('{{ITEM_UNIT_PRICE}}');
    dataRow.appendTableCell('{{ITEM_AMOUNT}}');

    body.appendParagraph('').setSpacingAfter(20);

    // 小計・税額・合計
    body.appendParagraph('小計: ¥{{SUBTOTAL}}')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    body.appendParagraph('消費税(10%): ¥{{TAX_AMOUNT}}')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    body.appendParagraph('合計: ¥{{TOTAL_AMOUNT}}')
      .setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
      .setBold(true)
      .setSpacingAfter(30);

    // 会社情報
    body.appendParagraph('{{COMPANY_NAME}}')
      .setFontSize(12)
      .setBold(true);
    body.appendParagraph('{{COMPANY_ADDRESS}}');
    body.appendParagraph('TEL: {{COMPANY_PHONE}}');
    body.appendParagraph('Email: {{COMPANY_EMAIL}}');

    // 支払い情報
    body.appendParagraph('').setSpacingAfter(20);
    body.appendParagraph('お支払期限: {{PAYMENT_DUE_DATE}}');
    body.appendParagraph('振込先: {{BANK_DETAILS}}');

    // 備考
    body.appendParagraph('').setSpacingAfter(20);
    body.appendParagraph('備考:');
    body.appendParagraph('{{NOTES}}');
  }

  /**
   * ドキュメントにデータを挿入
   */
  private populateDocument(
    docId: string,
    invoice: Invoice,
    customer: Customer
  ): void {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    // プレースホルダーを実際のデータで置換
    const replacements: { [key: string]: string } = {
      '{{INVOICE_NUMBER}}': invoice.invoiceNumber,
      '{{ISSUE_DATE}}': this.formatDate(invoice.issueDate),
      '{{CUSTOMER_NAME}}': customer.companyName,
      '{{CUSTOMER_ADDRESS}}': this.formatAddress(customer),
      '{{TOTAL_AMOUNT}}': this.formatCurrency(invoice.totalAmount),
      '{{ITEM_DESCRIPTION}}': invoice.description || '制作費',
      '{{ITEM_QUANTITY}}': '1 式',
      '{{ITEM_UNIT_PRICE}}': this.formatCurrency(invoice.subtotal),
      '{{ITEM_AMOUNT}}': this.formatCurrency(invoice.subtotal),
      '{{SUBTOTAL}}': this.formatCurrency(invoice.subtotal),
      '{{TAX_AMOUNT}}': this.formatCurrency(invoice.taxAmount),
      '{{PAYMENT_DUE_DATE}}': this.formatDate(invoice.dueDate),
      '{{NOTES}}': invoice.notes || ''
    };

    // 会社情報を追加
    const config = ConfigManager.getInstance();
    const companyInfo = config.getCompanyInfo();
    replacements['{{COMPANY_NAME}}'] = companyInfo.name;
    replacements['{{COMPANY_ADDRESS}}'] = `〒${companyInfo.postalCode} ${companyInfo.address}`;
    replacements['{{COMPANY_PHONE}}'] = companyInfo.phone;
    replacements['{{COMPANY_EMAIL}}'] = companyInfo.email || '';
    replacements['{{BANK_DETAILS}}'] = config.getBankInfo().details;

    // 置換実行
    for (const [placeholder, value] of Object.entries(replacements)) {
      body.replaceText(placeholder, value);
    }

    doc.saveAndClose();
  }

  /**
   * Google DocsをPDFに変換
   */
  private convertDocToPDF(docId: string): GoogleAppsScript.Base.Blob {
    const doc = DriveApp.getFileById(docId);
    return doc.getAs('application/pdf');
  }

  /**
   * PDFファイルを保存
   */
  private savePDFFile(
    pdfBlob: GoogleAppsScript.Base.Blob,
    invoice: Invoice,
    customer: Customer
  ): GoogleAppsScript.Drive.File {
    try {
      console.log('PDF保存開始:', { invoiceNumber: invoice.invoiceNumber, blobSize: pdfBlob.getBytes().length });
      
      // 保存先フォルダを取得または作成
      const folderName = `請求書_${new Date().getFullYear()}`;
      console.log('フォルダ検索:', folderName);
      
      const folders = DriveApp.getFoldersByName(folderName);
      
      let folder: GoogleAppsScript.Drive.Folder;
      if (folders.hasNext()) {
        folder = folders.next();
        console.log('既存フォルダを使用:', folder.getId());
      } else {
        console.log('新規フォルダを作成:', folderName);
        folder = DriveApp.createFolder(folderName);
        console.log('フォルダ作成完了:', folder.getId());
      }

      // ファイル名を生成
      const fileName = `請求書_${invoice.invoiceNumber}_${customer.companyName}.pdf`;
      console.log('PDFファイル作成:', fileName);
      
      // PDFファイルを作成
      const pdfFile = folder.createFile(pdfBlob);
      pdfFile.setName(fileName);
      console.log('PDFファイル作成完了:', pdfFile.getId());
      
      // 共有設定
      console.log('共有設定適用中...');
      pdfFile.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
      console.log('共有設定完了');

      return pdfFile;
    } catch (error) {
      console.error('PDF保存エラー詳細:', error);
      console.error('エラースタック:', error.stack);
      throw new Error(`PDFファイル保存に失敗: ${error.toString()}`);
    }
  }

  /**
   * PDFダウンロードURLを取得
   */
  private getPDFDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * 住所フォーマット
   */
  private formatAddress(customer: Customer): string {
    if (!customer.address) return '';
    
    const postalCode = customer.postalCode ? `〒${customer.postalCode}` : '';
    return `${postalCode} ${customer.address}`.trim();
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
   * テンプレートドキュメントIDを設定
   */
  public setTemplateDocId(docId: string): void {
    PropertiesService.getScriptProperties()
      .setProperty('INVOICE_TEMPLATE_DOC_ID', docId);
  }

  /**
   * バッチPDF生成（Google Docs版）
   */
  public async generateBatchPDFsViaGoogleDocs(
    invoices: Array<{ invoice: Invoice; customer: Customer }>
  ): Promise<Map<string, { fileId: string; fileUrl: string; pdfUrl: string }>> {
    const results = new Map();

    for (const { invoice, customer } of invoices) {
      try {
        const result = await this.generatePDFViaGoogleDocs(invoice, customer);
        results.set(invoice.invoiceNumber, result);
        
        // レート制限対策
        Utilities.sleep(1000);
      } catch (error) {
        console.error(`Failed to generate PDF for ${invoice.invoiceNumber}:`, error);
        results.set(invoice.invoiceNumber, null);
      }
    }

    return results;
  }
}