/**
 * 顧客管理UI
 * Google Apps ScriptのUIダイアログとメニューを提供
 */

import { CustomerService } from '../services/customer.service';
import { CreateCustomerRequest, UpdateCustomerRequest } from '../models/customer.model';
import { CustomerFilter } from '../repositories/customer.repository';
import { logInfo, logError, logWarn } from '../utils/logger';
import { showErrorToUser, handleError } from '../utils/error-handler';

/**
 * 顧客管理UIクラス
 */
export class CustomerUI {
  private service: CustomerService;
  private ui: GoogleAppsScript.Base.Ui;

  constructor() {
    this.service = new CustomerService();
    this.ui = SpreadsheetApp.getUi();
  }

  /**
   * 顧客一覧を表示
   */
  public async showCustomerList(): Promise<void> {
    try {
      logInfo('顧客一覧表示開始', undefined, 'CustomerUI.showCustomerList');
      
      const customers = await this.service.getAllCustomers();
      
      if (customers.length === 0) {
        this.ui.alert(
          '顧客一覧',
          '登録されている顧客がありません。\\n\\n「顧客登録」から新しい顧客を登録してください。',
          this.ui.ButtonSet.OK
        );
        return;
      }

      // 顧客一覧を整形
      let message = `=== 顧客一覧 (${customers.length}件) ===\\n\\n`;
      
      customers.forEach((customer, index) => {
        message += `${index + 1}. ${customer.companyName}\\n`;
        message += `   ID: ${customer.customerId}\\n`;
        if (customer.contactPerson) {
          message += `   担当者: ${customer.contactPerson}\\n`;
        }
        if (customer.email) {
          message += `   メール: ${customer.email}\\n`;
        }
        message += `   登録日: ${customer.registeredAt.toLocaleDateString('ja-JP')}\\n\\n`;
      });

      // 一覧を表示（長い場合は省略）
      if (message.length > 2000) {
        message = message.substring(0, 1900) + '\\n\\n... (省略されました)';
      }

      this.ui.alert('顧客一覧', message, this.ui.ButtonSet.OK);
      
      logInfo('顧客一覧表示完了', { count: customers.length }, 'CustomerUI.showCustomerList');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerList');
      logError('顧客一覧表示失敗', appError, 'CustomerUI.showCustomerList');
      showErrorToUser(appError);
    }
  }

  /**
   * 顧客検索UI
   */
  public async showCustomerSearch(): Promise<void> {
    try {
      logInfo('顧客検索UI開始', undefined, 'CustomerUI.showCustomerSearch');

      // 検索条件入力
      const companyNameResponse = this.ui.prompt(
        '顧客検索',
        '会社名で検索します。会社名（部分一致）を入力してください。\\n\\n空白の場合は全件表示されます。',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (companyNameResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const companyName = companyNameResponse.getResponseText().trim();
      
      // 検索実行
      const filter: CustomerFilter = {};
      if (companyName) {
        filter.companyName = companyName;
      }

      const searchResult = await this.service.searchCustomers(filter);
      
      // 結果表示
      if (searchResult.filteredCount === 0) {
        this.ui.alert(
          '検索結果',
          companyName 
            ? `「${companyName}」に該当する顧客が見つかりませんでした。`
            : '顧客が登録されていません。',
          this.ui.ButtonSet.OK
        );
        return;
      }

      let message = `=== 検索結果 (${searchResult.filteredCount}件) ===\\n\\n`;
      
      searchResult.customers.forEach((customer, index) => {
        message += `${index + 1}. ${customer.companyName}\\n`;
        message += `   ID: ${customer.customerId}\\n`;
        if (customer.contactPerson) {
          message += `   担当者: ${customer.contactPerson}\\n`;
        }
        if (customer.email) {
          message += `   メール: ${customer.email}\\n`;
        }
        message += `\\n`;
      });

      if (message.length > 2000) {
        message = message.substring(0, 1900) + '\\n\\n... (省略されました)';
      }

      this.ui.alert('検索結果', message, this.ui.ButtonSet.OK);
      
      logInfo('顧客検索完了', {
        searchTerm: companyName,
        resultCount: searchResult.filteredCount
      }, 'CustomerUI.showCustomerSearch');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerSearch');
      logError('顧客検索失敗', appError, 'CustomerUI.showCustomerSearch');
      showErrorToUser(appError);
    }
  }

  /**
   * 顧客登録UI
   */
  public async showCustomerRegistration(): Promise<void> {
    try {
      logInfo('顧客登録UI開始', undefined, 'CustomerUI.showCustomerRegistration');

      // 会社名入力（必須）
      const companyNameResponse = this.ui.prompt(
        '顧客登録',
        '会社名を入力してください（必須）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (companyNameResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const companyName = companyNameResponse.getResponseText().trim();
      if (!companyName) {
        this.ui.alert('エラー', '会社名は必須です。', this.ui.ButtonSet.OK);
        return;
      }

      // 担当者名入力
      const contactPersonResponse = this.ui.prompt(
        '顧客登録',
        '担当者名を入力してください（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (contactPersonResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const contactPerson = contactPersonResponse.getResponseText().trim() || undefined;

      // メールアドレス入力
      const emailResponse = this.ui.prompt(
        '顧客登録',
        'メールアドレスを入力してください（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (emailResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const email = emailResponse.getResponseText().trim() || undefined;

      // 郵便番号入力
      const postalCodeResponse = this.ui.prompt(
        '顧客登録',
        '郵便番号を入力してください（例：123-4567）（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (postalCodeResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const postalCode = postalCodeResponse.getResponseText().trim() || undefined;

      // 住所入力
      const addressResponse = this.ui.prompt(
        '顧客登録',
        '住所を入力してください（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (addressResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const address = addressResponse.getResponseText().trim() || undefined;

      // 電話番号入力
      const phoneResponse = this.ui.prompt(
        '顧客登録',
        '電話番号を入力してください（例：03-1234-5678）（省略可）',
        this.ui.ButtonSet.OK_CANCEL
      );

      if (phoneResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const phoneNumber = phoneResponse.getResponseText().trim() || undefined;

      // 確認ダイアログ
      let confirmMessage = '以下の内容で登録します。よろしいですか？\\n\\n';
      confirmMessage += `会社名: ${companyName}\\n`;
      if (contactPerson) confirmMessage += `担当者: ${contactPerson}\\n`;
      if (email) confirmMessage += `メール: ${email}\\n`;
      if (postalCode) confirmMessage += `郵便番号: ${postalCode}\\n`;
      if (address) confirmMessage += `住所: ${address}\\n`;
      if (phoneNumber) confirmMessage += `電話: ${phoneNumber}\\n`;

      const confirmResponse = this.ui.alert(
        '顧客登録確認',
        confirmMessage,
        this.ui.ButtonSet.YES_NO
      );

      if (confirmResponse !== this.ui.Button.YES) {
        this.ui.alert('キャンセル', '顧客登録がキャンセルされました。', this.ui.ButtonSet.OK);
        return;
      }

      // 顧客作成
      const request: CreateCustomerRequest = {
        companyName,
        contactPerson,
        email,
        postalCode,
        address,
        phoneNumber
      };

      const customer = await this.service.createCustomer(request);

      this.ui.alert(
        '登録完了',
        `顧客の登録が完了しました。\\n\\n` +
        `顧客ID: ${customer.customerId}\\n` +
        `会社名: ${customer.companyName}\\n` +
        `登録日: ${customer.registeredAt.toLocaleDateString('ja-JP')}`,
        this.ui.ButtonSet.OK
      );

      logInfo('顧客登録完了', { customerId: customer.customerId }, 'CustomerUI.showCustomerRegistration');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerRegistration');
      logError('顧客登録失敗', appError, 'CustomerUI.showCustomerRegistration');
      showErrorToUser(appError);
    }
  }

  /**
   * 顧客更新UI
   */
  public async showCustomerUpdate(): Promise<void> {
    try {
      logInfo('顧客更新UI開始', undefined, 'CustomerUI.showCustomerUpdate');

      // 顧客ID入力
      const customerIdResponse = this.ui.prompt(
        '顧客更新',
        '更新する顧客のIDを入力してください（例：C00001）',
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

      // 顧客取得
      const customer = await this.service.getCustomer(customerId);

      // 現在の情報を表示
      let currentInfo = `=== 現在の顧客情報 ===\\n\\n`;
      currentInfo += `顧客ID: ${customer.customerId}\\n`;
      currentInfo += `会社名: ${customer.companyName}\\n`;
      currentInfo += `担当者: ${customer.contactPerson || '（未設定）'}\\n`;
      currentInfo += `メール: ${customer.email || '（未設定）'}\\n`;
      currentInfo += `郵便番号: ${customer.postalCode || '（未設定）'}\\n`;
      currentInfo += `住所: ${customer.address || '（未設定）'}\\n`;
      currentInfo += `電話: ${customer.phoneNumber || '（未設定）'}\\n`;

      this.ui.alert('顧客情報', currentInfo, this.ui.ButtonSet.OK);

      // 更新項目の選択
      const updateResponse = this.ui.alert(
        '更新確認',
        'この顧客情報を更新しますか？',
        this.ui.ButtonSet.YES_NO
      );

      if (updateResponse !== this.ui.Button.YES) {
        return;
      }

      // 各項目の更新
      const updateRequest: UpdateCustomerRequest = {};

      // 会社名
      const companyNameResponse = this.ui.prompt(
        '会社名更新',
        `現在の会社名: ${customer.companyName}\\n\\n新しい会社名を入力してください（変更しない場合は空白）`,
        this.ui.ButtonSet.OK_CANCEL
      );

      if (companyNameResponse.getSelectedButton() !== this.ui.Button.OK) {
        return;
      }

      const newCompanyName = companyNameResponse.getResponseText().trim();
      if (newCompanyName && newCompanyName !== customer.companyName) {
        updateRequest.companyName = newCompanyName;
      }

      // 簡略版の更新（他の項目も同様に実装可能）
      const updatedCustomer = await this.service.updateCustomer(customerId, updateRequest);

      this.ui.alert(
        '更新完了',
        `顧客情報の更新が完了しました。\\n\\n` +
        `顧客ID: ${updatedCustomer.customerId}\\n` +
        `会社名: ${updatedCustomer.companyName}\\n` +
        `更新日: ${updatedCustomer.updatedAt.toLocaleDateString('ja-JP')}`,
        this.ui.ButtonSet.OK
      );

      logInfo('顧客更新完了', { customerId }, 'CustomerUI.showCustomerUpdate');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerUpdate');
      logError('顧客更新失敗', appError, 'CustomerUI.showCustomerUpdate');
      showErrorToUser(appError);
    }
  }

  /**
   * 顧客削除UI
   */
  public async showCustomerDelete(): Promise<void> {
    try {
      logInfo('顧客削除UI開始', undefined, 'CustomerUI.showCustomerDelete');

      // 顧客ID入力
      const customerIdResponse = this.ui.prompt(
        '顧客削除',
        '削除する顧客のIDを入力してください（例：C00001）\\n\\n※この操作は取り消せません',
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

      // 顧客取得
      const customer = await this.service.getCustomer(customerId);

      // 確認ダイアログ
      const confirmMessage = `以下の顧客を削除します。よろしいですか？\\n\\n` +
        `顧客ID: ${customer.customerId}\\n` +
        `会社名: ${customer.companyName}\\n` +
        `担当者: ${customer.contactPerson || '（未設定）'}\\n\\n` +
        `※この操作は取り消せません`;

      const confirmResponse = this.ui.alert(
        '削除確認',
        confirmMessage,
        this.ui.ButtonSet.YES_NO
      );

      if (confirmResponse !== this.ui.Button.YES) {
        this.ui.alert('キャンセル', '顧客削除がキャンセルされました。', this.ui.ButtonSet.OK);
        return;
      }

      // 最終確認
      const finalConfirmResponse = this.ui.alert(
        '最終確認',
        `本当に削除しますか？\\n\\n顧客: ${customer.companyName}\\n\\nこの操作は取り消せません。`,
        this.ui.ButtonSet.YES_NO
      );

      if (finalConfirmResponse !== this.ui.Button.YES) {
        this.ui.alert('キャンセル', '顧客削除がキャンセルされました。', this.ui.ButtonSet.OK);
        return;
      }

      // 削除実行
      await this.service.deleteCustomer(customerId);

      this.ui.alert(
        '削除完了',
        `顧客の削除が完了しました。\\n\\n削除された顧客: ${customer.companyName}`,
        this.ui.ButtonSet.OK
      );

      logInfo('顧客削除完了', { customerId }, 'CustomerUI.showCustomerDelete');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerDelete');
      logError('顧客削除失敗', appError, 'CustomerUI.showCustomerDelete');
      showErrorToUser(appError);
    }
  }

  /**
   * 顧客統計表示
   */
  public async showCustomerStats(): Promise<void> {
    try {
      logInfo('顧客統計表示開始', undefined, 'CustomerUI.showCustomerStats');

      const stats = await this.service.getCustomerStats();

      let message = `=== 顧客統計情報 ===\\n\\n`;
      message += `総顧客数: ${stats.totalCount}件\\n`;
      message += `直近30日の新規登録: ${stats.recentRegistrations}件\\n\\n`;

      if (stats.topCompanies.length > 0) {
        message += `=== 最近登録された顧客（上位5件） ===\\n`;
        stats.topCompanies.forEach((company, index) => {
          message += `${index + 1}. ${company.companyName}\\n`;
          message += `   登録日: ${company.registeredAt.toLocaleDateString('ja-JP')}\\n`;
        });
      }

      this.ui.alert('顧客統計', message, this.ui.ButtonSet.OK);
      
      logInfo('顧客統計表示完了', stats, 'CustomerUI.showCustomerStats');

    } catch (error) {
      const appError = handleError(error, 'CustomerUI.showCustomerStats');
      logError('顧客統計表示失敗', appError, 'CustomerUI.showCustomerStats');
      showErrorToUser(appError);
    }
  }
}