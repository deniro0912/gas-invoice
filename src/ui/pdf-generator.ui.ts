/**
 * PDF生成UI
 * 請求書PDFの生成、プレビュー、送信機能のUI
 */

import { InvoiceService } from '../services/invoice.service';
import { CustomerService } from '../services/customer.service';
import { PDFGeneratorService } from '../services/pdf-generator.service';
import { PDFDocGeneratorService } from '../services/pdf-doc-generator.service';
import { ErrorHandler } from '../utils/error-handler';

export class PDFGeneratorUI {
  private static instance: PDFGeneratorUI;
  private readonly invoiceService: InvoiceService;
  private readonly customerService: CustomerService;
  private readonly pdfGeneratorService: PDFGeneratorService;
  private readonly pdfDocGeneratorService: PDFDocGeneratorService;

  private constructor() {
    this.invoiceService = InvoiceService.getInstance();
    this.customerService = CustomerService.getInstance();
    this.pdfGeneratorService = PDFGeneratorService.getInstance();
    this.pdfDocGeneratorService = PDFDocGeneratorService.getInstance();
  }

  public static getInstance(): PDFGeneratorUI {
    if (!PDFGeneratorUI.instance) {
      PDFGeneratorUI.instance = new PDFGeneratorUI();
    }
    return PDFGeneratorUI.instance;
  }

  /**
   * PDF生成ダイアログを表示
   */
  public showPDFGenerationDialog(): void {
    try {
      const html = this.createPDFGenerationHTML();
      const htmlOutput = HtmlService.createHtmlOutput(html)
        .setWidth(600)
        .setHeight(500)
        .setTitle('PDF生成');
      
      SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'PDF生成');
    } catch (error) {
      ErrorHandler.handle(error, 'PDFGeneratorUI.showPDFGenerationDialog');
      this.showError('PDF生成ダイアログの表示に失敗しました');
    }
  }

  /**
   * PDF生成HTML作成
   */
  private createPDFGenerationHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .container {
            max-width: 500px;
            margin: 0 auto;
          }
          h2 {
            color: #333;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
          }
          select, input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }
          .options-group {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .checkbox-group {
            margin-bottom: 10px;
          }
          .checkbox-group input {
            width: auto;
            margin-right: 10px;
          }
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }
          button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
          }
          .btn-primary {
            background-color: #4CAF50;
            color: white;
          }
          .btn-primary:hover {
            background-color: #45a049;
          }
          .btn-secondary {
            background-color: #2196F3;
            color: white;
          }
          .btn-secondary:hover {
            background-color: #0b7dda;
          }
          .btn-cancel {
            background-color: #f44336;
            color: white;
          }
          .btn-cancel:hover {
            background-color: #da190b;
          }
          .loading {
            display: none;
            text-align: center;
            padding: 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .success-message {
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            display: none;
          }
          .error-message {
            background-color: #f44336;
            color: white;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>請求書PDF生成</h2>
          
          <div class="form-group">
            <label for="invoiceSelect">請求書を選択:</label>
            <select id="invoiceSelect" onchange="loadInvoiceDetails()">
              <option value="">-- 請求書を選択してください --</option>
            </select>
          </div>

          <div id="invoiceDetails" style="display: none;">
            <div class="form-group">
              <label>顧客名:</label>
              <input type="text" id="customerName" readonly>
            </div>
            
            <div class="form-group">
              <label>請求金額:</label>
              <input type="text" id="totalAmount" readonly>
            </div>
            
            <div class="form-group">
              <label>発行日:</label>
              <input type="text" id="issueDate" readonly>
            </div>
          </div>

          <div class="options-group">
            <h3>生成オプション</h3>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="saveToInvoiceFolder" checked>
                請求書フォルダに保存
              </label>
            </div>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="emailToCustomer">
                顧客にメール送信
              </label>
            </div>
            
            <div class="form-group" id="emailGroup" style="display: none;">
              <label for="emailAddress">送信先メールアドレス:</label>
              <input type="email" id="emailAddress" placeholder="customer@example.com">
            </div>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="useGoogleDocs" checked>
                高品質PDF生成（Google Docs使用）
              </label>
            </div>
          </div>

          <div class="button-group">
            <button class="btn-secondary" onclick="previewPDF()">プレビュー</button>
            <button class="btn-primary" onclick="generatePDF()">PDF生成</button>
            <button class="btn-cancel" onclick="google.script.host.close()">キャンセル</button>
          </div>

          <div class="loading">
            <div class="spinner"></div>
            <p>PDF生成中...</p>
          </div>

          <div class="success-message" id="successMessage"></div>
          <div class="error-message" id="errorMessage"></div>
        </div>

        <script>
          // ページ読み込み時に請求書リストを取得
          window.onload = function() {
            google.script.run
              .withSuccessHandler(populateInvoiceSelect)
              .withFailureHandler(showError)
              .getActiveInvoices();
          };

          // メール送信チェックボックスの処理
          document.getElementById('emailToCustomer').addEventListener('change', function() {
            const emailGroup = document.getElementById('emailGroup');
            emailGroup.style.display = this.checked ? 'block' : 'none';
          });

          function populateInvoiceSelect(invoices) {
            const select = document.getElementById('invoiceSelect');
            select.innerHTML = '<option value="">-- 請求書を選択してください --</option>';
            
            invoices.forEach(invoice => {
              const option = document.createElement('option');
              option.value = invoice.invoiceNumber;
              option.textContent = invoice.invoiceNumber + ' - ' + invoice.customerName;
              select.appendChild(option);
            });
          }

          function loadInvoiceDetails() {
            const invoiceNumber = document.getElementById('invoiceSelect').value;
            if (!invoiceNumber) {
              document.getElementById('invoiceDetails').style.display = 'none';
              return;
            }

            google.script.run
              .withSuccessHandler(displayInvoiceDetails)
              .withFailureHandler(showError)
              .getInvoiceDetails(invoiceNumber);
          }

          function displayInvoiceDetails(details) {
            document.getElementById('customerName').value = details.customerName;
            document.getElementById('totalAmount').value = '¥' + details.totalAmount.toLocaleString();
            document.getElementById('issueDate').value = details.issueDate;
            document.getElementById('invoiceDetails').style.display = 'block';
            
            // 顧客メールアドレスをセット
            if (details.customerEmail) {
              document.getElementById('emailAddress').value = details.customerEmail;
            }
          }

          function previewPDF() {
            const invoiceNumber = document.getElementById('invoiceSelect').value;
            if (!invoiceNumber) {
              showError('請求書を選択してください');
              return;
            }

            showLoading();
            
            google.script.run
              .withSuccessHandler(hideLoading)
              .withFailureHandler(handleError)
              .previewInvoicePDF(invoiceNumber);
          }

          function generatePDF() {
            const invoiceNumber = document.getElementById('invoiceSelect').value;
            if (!invoiceNumber) {
              showError('請求書を選択してください');
              return;
            }

            const options = {
              saveToFolder: document.getElementById('saveToInvoiceFolder').checked,
              sendEmail: document.getElementById('emailToCustomer').checked,
              emailAddress: document.getElementById('emailAddress').value,
              useGoogleDocs: document.getElementById('useGoogleDocs').checked
            };

            if (options.sendEmail && !options.emailAddress) {
              showError('メールアドレスを入力してください');
              return;
            }

            showLoading();

            google.script.run
              .withSuccessHandler(handlePDFGenerated)
              .withFailureHandler(handleError)
              .generateInvoicePDF(invoiceNumber, options);
          }

          function handlePDFGenerated(result) {
            hideLoading();
            
            if (result.success) {
              showSuccess('PDFが正常に生成されました！\\n' + 
                         'ファイル: ' + result.fileName + '\\n' +
                         (result.fileUrl ? 'URL: ' + result.fileUrl : ''));
              
              // 3秒後にダイアログを閉じる
              setTimeout(function() {
                google.script.host.close();
              }, 3000);
            } else {
              showError('PDF生成に失敗しました: ' + result.error);
            }
          }

          function showLoading() {
            document.querySelector('.loading').style.display = 'block';
            document.querySelector('.button-group').style.display = 'none';
          }

          function hideLoading() {
            document.querySelector('.loading').style.display = 'none';
            document.querySelector('.button-group').style.display = 'flex';
          }

          function showSuccess(message) {
            const successDiv = document.getElementById('successMessage');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            
            setTimeout(function() {
              successDiv.style.display = 'none';
            }, 5000);
          }

          function showError(error) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = typeof error === 'string' ? error : error.message;
            errorDiv.style.display = 'block';
            
            setTimeout(function() {
              errorDiv.style.display = 'none';
            }, 5000);
          }

          function handleError(error) {
            hideLoading();
            showError(error);
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * バッチPDF生成ダイアログを表示
   */
  public showBatchPDFGenerationDialog(): void {
    try {
      const html = this.createBatchPDFGenerationHTML();
      const htmlOutput = HtmlService.createHtmlOutput(html)
        .setWidth(700)
        .setHeight(600)
        .setTitle('一括PDF生成');
      
      SpreadsheetApp.getUi().showModalDialog(htmlOutput, '一括PDF生成');
    } catch (error) {
      ErrorHandler.handle(error, 'PDFGeneratorUI.showBatchPDFGenerationDialog');
      this.showError('一括PDF生成ダイアログの表示に失敗しました');
    }
  }

  /**
   * 一括PDF生成HTML作成
   */
  private createBatchPDFGenerationHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <style>
          /* スタイルは単一PDF生成と同様 */
          .invoice-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 20px;
          }
          .invoice-item {
            padding: 8px;
            margin-bottom: 5px;
            background-color: #f9f9f9;
            border-radius: 4px;
            cursor: pointer;
          }
          .invoice-item:hover {
            background-color: #e9e9e9;
          }
          .invoice-item.selected {
            background-color: #4CAF50;
            color: white;
          }
          .select-all-button {
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>一括PDF生成</h2>
          
          <div class="form-group">
            <label>請求書を選択:</label>
            <button class="select-all-button" onclick="selectAll()">すべて選択</button>
            <button class="select-all-button" onclick="deselectAll()">選択解除</button>
            <div class="invoice-list" id="invoiceList">
              <!-- 請求書リストがここに表示される -->
            </div>
          </div>

          <div class="options-group">
            <h3>一括生成オプション</h3>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="createZipFile">
                ZIPファイルとして保存
              </label>
            </div>
            
            <div class="checkbox-group">
              <label>
                <input type="checkbox" id="sendSummaryEmail">
                完了サマリーをメール送信
              </label>
            </div>
          </div>

          <div class="button-group">
            <button class="btn-primary" onclick="generateBatchPDF()">一括生成開始</button>
            <button class="btn-cancel" onclick="google.script.host.close()">キャンセル</button>
          </div>

          <div class="loading">
            <div class="spinner"></div>
            <p>PDF一括生成中...</p>
            <p id="progressText"></p>
          </div>

          <div class="success-message" id="successMessage"></div>
          <div class="error-message" id="errorMessage"></div>
        </div>

        <script>
          let selectedInvoices = new Set();

          window.onload = function() {
            google.script.run
              .withSuccessHandler(populateInvoiceList)
              .withFailureHandler(showError)
              .getActiveInvoices();
          };

          function populateInvoiceList(invoices) {
            const listDiv = document.getElementById('invoiceList');
            listDiv.innerHTML = '';
            
            invoices.forEach(invoice => {
              const item = document.createElement('div');
              item.className = 'invoice-item';
              item.dataset.invoiceNumber = invoice.invoiceNumber;
              item.textContent = invoice.invoiceNumber + ' - ' + invoice.customerName + 
                                ' (¥' + invoice.totalAmount.toLocaleString() + ')';
              item.onclick = function() {
                toggleSelection(this);
              };
              listDiv.appendChild(item);
            });
          }

          function toggleSelection(element) {
            const invoiceNumber = element.dataset.invoiceNumber;
            
            if (selectedInvoices.has(invoiceNumber)) {
              selectedInvoices.delete(invoiceNumber);
              element.classList.remove('selected');
            } else {
              selectedInvoices.add(invoiceNumber);
              element.classList.add('selected');
            }
          }

          function selectAll() {
            const items = document.querySelectorAll('.invoice-item');
            items.forEach(item => {
              selectedInvoices.add(item.dataset.invoiceNumber);
              item.classList.add('selected');
            });
          }

          function deselectAll() {
            selectedInvoices.clear();
            const items = document.querySelectorAll('.invoice-item');
            items.forEach(item => {
              item.classList.remove('selected');
            });
          }

          function generateBatchPDF() {
            if (selectedInvoices.size === 0) {
              showError('請求書を選択してください');
              return;
            }

            const options = {
              invoiceNumbers: Array.from(selectedInvoices),
              createZip: document.getElementById('createZipFile').checked,
              sendSummary: document.getElementById('sendSummaryEmail').checked
            };

            showLoading();
            updateProgress('開始中...');

            google.script.run
              .withSuccessHandler(handleBatchPDFGenerated)
              .withFailureHandler(handleError)
              .generateBatchPDFs(options);
          }

          function updateProgress(message) {
            document.getElementById('progressText').textContent = message;
          }

          function handleBatchPDFGenerated(result) {
            hideLoading();
            
            if (result.success) {
              showSuccess('一括PDF生成が完了しました！\\n' + 
                         '成功: ' + result.successCount + '件\\n' +
                         '失敗: ' + result.failureCount + '件');
            } else {
              showError('一括PDF生成に失敗しました: ' + result.error);
            }
          }

          // その他の関数は単一PDF生成と同様
        </script>
      </body>
      </html>
    `;
  }

  /**
   * エラー表示
   */
  private showError(message: string): void {
    SpreadsheetApp.getUi().alert('エラー', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}