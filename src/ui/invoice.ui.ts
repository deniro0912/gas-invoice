/**
 * 請求書管理UI
 * Google Apps ScriptのUIダイアログとメニューを提供
 */

import { InvoiceService } from '../services/invoice.service';
import { CustomerService } from '../services/customer.service';
import { CreateInvoiceRequest, UpdateInvoiceRequest, InvoiceStatus } from '../models/invoice.model';
import { logInfo, logError, logWarn } from '../utils/logger';
import { showErrorToUser, handleError } from '../utils/error-handler';

/**
 * 請求書管理UIクラス
 */
export class InvoiceUI {
  private invoiceService: InvoiceService;
  private customerService: CustomerService;
  private ui: GoogleAppsScript.Base.Ui;

  constructor() {
    this.invoiceService = new InvoiceService();
    this.customerService = new CustomerService();
    this.ui = SpreadsheetApp.getUi();
  }

  /**
   * 請求書一覧を表示
   */
  public async showInvoiceList(): Promise<void> {
    try {
      logInfo('請求書一覧表示開始', undefined, 'InvoiceUI.showInvoiceList');
      
      const invoices = await this.invoiceService.getAllInvoices();
      
      if (invoices.length === 0) {
        this.ui.alert(
          '請求書一覧',
          '登録されている請求書がありません。\\n\\n「請求書作成」から新しい請求書を作成してください。',
          this.ui.ButtonSet.OK
        );
        return;
      }

      // 請求書一覧を整形（最新順）
      const sortedInvoices = invoices.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      let message = `=== 請求書一覧 (${invoices.length}件) ===\\n\\n`;
      
      sortedInvoices.slice(0, 10).forEach((invoice, index) => {
        const statusText = this.getStatusText(invoice.status);
        message += `${index + 1}. ${invoice.invoiceNumber} [${statusText}]\\n`;
        message += `   広告主: ${invoice.advertiser}\\n`;
        message += `   件名: ${invoice.subject}\\n`;
        message += `   金額: ¥${invoice.totalAmount.toLocaleString()}\\n`;
        message += `   発行日: ${invoice.issueDate.toLocaleDateString('ja-JP')}\\n\\n`;
      });

      if (invoices.length > 10) {
        message += `... 他${invoices.length - 10}件\\n`;
      }

      this.ui.alert('請求書一覧', message, this.ui.ButtonSet.OK);
      
      logInfo('請求書一覧表示完了', { count: invoices.length }, 'InvoiceUI.showInvoiceList');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showInvoiceList');
      logError('請求書一覧表示失敗', appError, 'InvoiceUI.showInvoiceList');
      showErrorToUser(appError);
    }
  }

  /**
   * 請求書作成UI
   */
  public async showInvoiceCreation(): Promise<void> {
    try {
      logInfo('請求書作成UI開始', undefined, 'InvoiceUI.showInvoiceCreation');

      // 顧客ID入力
      const customerIdResponse = this.ui.prompt(
        '請求書作成',
        '顧客IDを入力してください（例：C00001）\\n\\n「顧客管理 > 顧客一覧」で確認できます。',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (customerIdResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const customerId = customerIdResponse.getResponseText().trim();
      if (!customerId) {
        this.ui.alert('エラー', '顧客IDが入力されていません。', this.ui.ButtonSet.OK);
        return;
      }

      // 顧客存在確認
      const customer = await this.customerService.getCustomer(customerId);
      
      // 顧客情報を表示
      this.ui.alert(
        '顧客確認',
        `顧客情報:\\n\\n` +
        `顧客ID: ${customer.customerId}\\n` +
        `会社名: ${customer.companyName}\\n` +
        `担当者: ${customer.contactPerson || '（未設定）'}\\n\\n` +
        `この顧客で請求書を作成します。`,
        this.ui.ButtonSet.OK
      );

      // 広告主入力
      const advertiserResponse = this.ui.prompt(
        '請求書作成',
        '広告主を入力してください（必須）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (advertiserResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const advertiser = advertiserResponse.getResponseText().trim();
      if (!advertiser) {
        this.ui.alert('エラー', '広告主は必須です。', this.ui.ButtonSet.OK);
        return;
      }

      // 件名入力
      const subjectResponse = this.ui.prompt(
        '請求書作成',
        '件名を入力してください（必須）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (subjectResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const subject = subjectResponse.getResponseText().trim();
      if (!subject) {
        this.ui.alert('エラー', '件名は必須です。', this.ui.ButtonSet.OK);
        return;
      }

      // 制作費入力
      const unitPriceResponse = this.ui.prompt(
        '請求書作成',
        '制作費（税抜き）を入力してください（必須）\\n\\n例：100000（10万円の場合）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (unitPriceResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const unitPriceText = unitPriceResponse.getResponseText().trim();
      const unitPrice = parseInt(unitPriceText, 10);
      if (isNaN(unitPrice) || unitPrice <= 0) {
        this.ui.alert('エラー', '制作費は正の数値で入力してください。', this.ui.ButtonSet.OK);
        return;
      }

      // 備考入力
      const notesResponse = this.ui.prompt(
        '請求書作成',
        '備考を入力してください（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (notesResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const notes = notesResponse.getResponseText().trim() || undefined;

      // 金額計算（税込み）
      const taxRate = 0.10;
      const totalAmount = Math.floor(unitPrice * (1 + taxRate));
      const taxAmount = totalAmount - unitPrice;

      // 確認ダイアログ
      let confirmMessage = '以下の内容で請求書を作成します。よろしいですか？\\n\\n';
      confirmMessage += `顧客: ${customer.companyName}\\n`;
      confirmMessage += `広告主: ${advertiser}\\n`;
      confirmMessage += `件名: ${subject}\\n`;
      confirmMessage += `制作費（税抜き）: ¥${unitPrice.toLocaleString()}\\n`;
      confirmMessage += `消費税（10%）: ¥${taxAmount.toLocaleString()}\\n`;
      confirmMessage += `合計金額: ¥${totalAmount.toLocaleString()}\\n`;
      if (notes) confirmMessage += `備考: ${notes}\\n`;

      const confirmResponse = this.ui.alert(
        '請求書作成確認',
        confirmMessage,
        this.ui.ButtonSet.YES_NO
      );

      if (confirmResponse !== this.ui.Button.YES) {
        this.ui.alert('キャンセル', '請求書作成がキャンセルされました。', this.ui.ButtonSet.OK);
        return;
      }

      // 請求書作成
      const request: CreateInvoiceRequest = {
        customerId,
        advertiser,
        subject,
        unitPrice,
        notes
      };

      const invoice = await this.invoiceService.createInvoice(request);

      this.ui.alert(
        '作成完了',
        `請求書の作成が完了しました。\\n\\n` +
        `請求書番号: ${invoice.invoiceNumber}\\n` +
        `広告主: ${invoice.advertiser}\\n` +
        `合計金額: ¥${invoice.totalAmount.toLocaleString()}\\n` +
        `ステータス: 下書き\\n` +
        `作成日: ${invoice.createdAt.toLocaleDateString('ja-JP')}\\n\\n` +
        `発行するには「請求書発行」メニューを使用してください。`,
        this.ui.ButtonSet.OK
      );

      logInfo('請求書作成完了', { invoiceNumber: invoice.invoiceNumber }, 'InvoiceUI.showInvoiceCreation');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showInvoiceCreation');
      logError('請求書作成失敗', appError, 'InvoiceUI.showInvoiceCreation');
      showErrorToUser(appError);
    }
  }

  /**
   * 請求書発行UI
   */
  public async showInvoiceIssue(): Promise<void> {
    try {
      logInfo('請求書発行UI開始', undefined, 'InvoiceUI.showInvoiceIssue');

      // 請求書番号入力
      const invoiceNumberResponse = this.ui.prompt(
        '請求書発行',
        '発行する請求書番号を入力してください（例：202509-001）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (invoiceNumberResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const invoiceNumber = invoiceNumberResponse.getResponseText().trim();
      if (!invoiceNumber) {
        this.ui.alert('エラー', '請求書番号が入力されていません。', this.ui.ButtonSet.OK);
        return;
      }

      // 請求書取得
      const invoice = await this.invoiceService.getInvoice(invoiceNumber);

      // 現在の情報を表示
      let currentInfo = `=== 請求書情報 ===\\n\\n`;
      currentInfo += `請求書番号: ${invoice.invoiceNumber}\\n`;
      currentInfo += `広告主: ${invoice.advertiser}\\n`;
      currentInfo += `件名: ${invoice.subject}\\n`;
      currentInfo += `合計金額: ¥${invoice.totalAmount.toLocaleString()}\\n`;
      currentInfo += `ステータス: ${this.getStatusText(invoice.status)}\\n`;

      this.ui.alert('請求書情報', currentInfo, this.ui.ButtonSet.OK);

      // 発行確認
      if (invoice.status !== InvoiceStatus.DRAFT) {
        this.ui.alert(
          '発行不可',
          `下書き状態の請求書のみ発行可能です。\\n\\n現在のステータス: ${this.getStatusText(invoice.status)}`,
          this.ui.ButtonSet.OK
        );
        return;
      }

      const confirmResponse = this.ui.alert(
        '発行確認',
        `請求書を発行しますか？\\n\\n請求書番号: ${invoice.invoiceNumber}\\n金額: ¥${invoice.totalAmount.toLocaleString()}\\n\\n※発行後は取り消せません`,
        this.ui.ButtonSet.YES_NO
      );

      if (confirmResponse !== this.ui.Button.YES) {
        this.ui.alert('キャンセル', '請求書発行がキャンセルされました。', this.ui.ButtonSet.OK);
        return;
      }

      // 発行実行
      const issuedInvoice = await this.invoiceService.issueInvoice(invoiceNumber);

      this.ui.alert(
        '発行完了',
        `請求書の発行が完了しました。\\n\\n` +
        `請求書番号: ${issuedInvoice.invoiceNumber}\\n` +
        `発行日: ${issuedInvoice.issueDate.toLocaleDateString('ja-JP')}\\n` +
        `ステータス: ${this.getStatusText(issuedInvoice.status)}`,
        this.ui.ButtonSet.OK
      );

      logInfo('請求書発行完了', { invoiceNumber }, 'InvoiceUI.showInvoiceIssue');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showInvoiceIssue');
      logError('請求書発行失敗', appError, 'InvoiceUI.showInvoiceIssue');
      showErrorToUser(appError);
    }
  }

  /**
   * 請求書検索UI
   */
  public async showInvoiceSearch(): Promise<void> {
    try {
      logInfo('請求書検索UI開始', undefined, 'InvoiceUI.showInvoiceSearch');

      // 検索条件入力
      const advertiserResponse = this.ui.prompt(
        '請求書検索',
        '広告主で検索します。広告主名（部分一致）を入力してください。\\n\\n空白の場合は全件表示されます。',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (advertiserResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const advertiser = advertiserResponse.getResponseText().trim();
      
      // 検索実行
      const filter = advertiser ? { advertiser } : {};
      const searchResult = await this.invoiceService.searchInvoices(filter);
      
      // 結果表示
      if (searchResult.filteredCount === 0) {
        this.ui.alert(
          '検索結果',
          advertiser 
            ? `「${advertiser}」に該当する請求書が見つかりませんでした。`
            : '請求書が登録されていません。',
          this.ui.ButtonSet.OK
        );
        return;
      }

      let message = `=== 検索結果 (${searchResult.filteredCount}件) ===\\n\\n`;
      
      searchResult.invoices.slice(0, 10).forEach((invoice, index) => {
        const statusText = this.getStatusText(invoice.status);
        message += `${index + 1}. ${invoice.invoiceNumber} [${statusText}]\\n`;
        message += `   広告主: ${invoice.advertiser}\\n`;
        message += `   件名: ${invoice.subject}\\n`;
        message += `   金額: ¥${invoice.totalAmount.toLocaleString()}\\n`;
        message += `\\n`;
      });

      if (searchResult.filteredCount > 10) {
        message += `... 他${searchResult.filteredCount - 10}件\\n`;
      }

      this.ui.alert('検索結果', message, this.ui.ButtonSet.OK);
      
      logInfo('請求書検索完了', {
        searchTerm: advertiser,
        resultCount: searchResult.filteredCount
      }, 'InvoiceUI.showInvoiceSearch');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showInvoiceSearch');
      logError('請求書検索失敗', appError, 'InvoiceUI.showInvoiceSearch');
      showErrorToUser(appError);
    }
  }

  /**
   * 請求書統計表示
   */
  public async showInvoiceStats(): Promise<void> {
    try {
      logInfo('請求書統計表示開始', undefined, 'InvoiceUI.showInvoiceStats');

      const stats = await this.invoiceService.getInvoiceStats();

      let message = `=== 請求書統計情報 ===\\n\\n`;
      message += `総請求書数: ${stats.totalCount}件\\n`;
      message += `・下書き: ${stats.draftCount}件\\n`;
      message += `・発行済み: ${stats.issuedCount}件\\n`;
      message += `・キャンセル: ${stats.cancelledCount}件\\n\\n`;
      
      message += `総請求金額: ¥${stats.totalAmount.toLocaleString()}\\n\\n`;
      
      message += `=== 今月の実績 ===\\n`;
      message += `請求書数: ${stats.thisMonthCount}件\\n`;
      message += `請求金額: ¥${stats.thisMonthAmount.toLocaleString()}\\n`;
      
      if (stats.thisMonthCount > 0) {
        const averageAmount = Math.floor(stats.thisMonthAmount / stats.thisMonthCount);
        message += `平均金額: ¥${averageAmount.toLocaleString()}\\n`;
      }

      this.ui.alert('請求書統計', message, this.ui.ButtonSet.OK);
      
      logInfo('請求書統計表示完了', stats, 'InvoiceUI.showInvoiceStats');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showInvoiceStats');
      logError('請求書統計表示失敗', appError, 'InvoiceUI.showInvoiceStats');
      showErrorToUser(appError);
    }
  }

  /**
   * 月次レポート表示
   */
  public async showMonthlyReport(): Promise<void> {
    try {
      logInfo('月次レポート表示開始', undefined, 'InvoiceUI.showMonthlyReport');

      // 年月入力
      const yearMonthResponse = this.ui.prompt(
        '月次レポート',
        '年月を入力してください（例：2025-09）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (yearMonthResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const yearMonthText = yearMonthResponse.getResponseText().trim();
      const match = yearMonthText.match(/^(\\d{4})-(\\d{1,2})$/);
      
      if (!match) {
        this.ui.alert('エラー', '年月の形式が正しくありません。「YYYY-MM」形式で入力してください。', this.ui.ButtonSet.OK);
        return;
      }

      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);

      if (month < 1 || month > 12) {
        this.ui.alert('エラー', '月は1〜12の範囲で入力してください。', this.ui.ButtonSet.OK);
        return;
      }

      // レポート生成
      const report = await this.invoiceService.generateMonthlyReport(year, month);

      let message = `=== ${year}年${month}月 月次レポート ===\\n\\n`;
      message += `請求書数: ${report.invoiceCount}件\\n`;
      message += `請求金額合計: ¥${report.totalAmount.toLocaleString()}\\n`;
      
      if (report.invoiceCount > 0) {
        message += `平均請求金額: ¥${Math.floor(report.averageAmount).toLocaleString()}\\n`;
      }

      if (report.topCustomers.length > 0) {
        message += `\\n=== 上位顧客 ===\\n`;
        report.topCustomers.forEach((customer, index) => {
          message += `${index + 1}. ${customer.customerId}\\n`;
          message += `   請求書数: ${customer.invoiceCount}件\\n`;
          message += `   金額: ¥${customer.totalAmount.toLocaleString()}\\n`;
        });
      }

      this.ui.alert('月次レポート', message, this.ui.ButtonSet.OK);
      
      logInfo('月次レポート表示完了', { year, month, invoiceCount: report.invoiceCount }, 'InvoiceUI.showMonthlyReport');

    } catch (error) {
      const appError = handleError(error, 'InvoiceUI.showMonthlyReport');
      logError('月次レポート表示失敗', appError, 'InvoiceUI.showMonthlyReport');
      showErrorToUser(appError);
    }
  }

  /**
   * ステータステキスト取得
   */
  private getStatusText(status: InvoiceStatus): string {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return '下書き';
      case InvoiceStatus.ISSUED:
        return '発行済み';
      case InvoiceStatus.CANCELLED:
        return 'キャンセル';
      default:
        return status;
    }
  }
}