# 請求書発行システム実装計画書

## 1. 実装フェーズ概要

### Phase 1: MVP（3週間）
基本的な請求書作成・PDF生成機能の実装

### Phase 2: 拡張機能（時期未定）
見積書機能、社内展開用機能の追加

## 2. Phase 1 詳細実装計画

### Week 1: 基盤構築とマスタ管理

#### Day 1-2: プロジェクト基盤整備

**タスク一覧:**
- [ ] ディレクトリ構造の作成
- [ ] TypeScript型定義の作成
- [ ] 基本設定ファイルの作成
- [ ] ログユーティリティの実装

**実装ファイル:**
```typescript
// src/models/customer.model.ts
export interface Customer {
  customerId: string;
  companyName: string;
  contactPerson?: string;
  postalCode?: string;
  address: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}


// src/models/invoice.model.ts
export interface Invoice {
  invoiceNumber: string;
  issueDate: Date;
  customerId: string;
  advertiser: string;     // 広告主
  subject: string;        // 件名
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  status: InvoiceStatus;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  itemId: string;
  invoiceNumber: string;
  itemName: string;       // 品目名（「制作費」固定）
  quantity: number;       // 数量（1固定）
  unit: string;           // 単位（「式」固定）
  unitPrice: number;      // 単価
  taxRate: number;        // 税率（0.10固定）
  amount: number;         // 金額
}
```

#### Day 3-4: スプレッドシート初期化

**タスク一覧:**
- [ ] マスタシート作成スクリプト
- [ ] 初期データ投入
- [ ] シート保護設定

**実装内容:**
```typescript
// src/utils/sheet-initializer.ts
export function initializeSpreadsheet(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 顧客マスタシート作成
  const customerSheet = ss.insertSheet('顧客マスタ');
  customerSheet.getRange(1, 1, 1, 9).setValues([[
    '顧客ID', '会社名', '担当者名', '郵便番号', 
    '住所', 'メール', '電話', '登録日', '更新日'
  ]]);
  
  // 請求書シート作成
  const invoiceSheet = ss.insertSheet('請求書データ');
  invoiceSheet.getRange(1, 1, 1, 12).setValues([[
    '請求書番号', '発行日', '顧客ID', '広告主', '件名',
    '小計', '税額', '合計', '備考', 'ステータス', 'PDF URL', '作成日'
  ]]);
  
  // 請求明細シート作成
  const detailSheet = ss.insertSheet('請求明細');
  detailSheet.getRange(1, 1, 1, 8).setValues([[
    '明細ID', '請求書番号', '品目名', '数量', '単位', '単価', '税率', '金額'
  ]]);
}
```

#### Day 5: 顧客管理機能

**タスク一覧:**
- [ ] 顧客リポジトリ実装
- [ ] 顧客サービス実装
- [ ] 顧客管理UI（一覧・登録・編集）

**実装内容:**
```typescript
// src/repositories/customer.repository.ts
export class CustomerRepository {
  private sheet: GoogleAppsScript.Spreadsheet.Sheet;
  
  constructor() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = ss.getSheetByName('顧客マスタ')!;
  }
  
  create(customer: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>): Customer {
    const customerId = this.generateCustomerId();
    const now = new Date();
    const row = [
      customerId,
      customer.companyName,
      customer.contactPerson || '',
      customer.postalCode || '',
      customer.address,
      customer.email || '',
      customer.phone || '',
      now,
      now
    ];
    this.sheet.appendRow(row);
    return { ...customer, customerId, createdAt: now, updatedAt: now };
  }
  
  private generateCustomerId(): string {
    const lastRow = this.sheet.getLastRow();
    const lastId = lastRow > 1 ? 
      this.sheet.getRange(lastRow, 1).getValue() : 'C00000';
    const num = parseInt(lastId.substring(1)) + 1;
    return `C${String(num).padStart(5, '0')}`;
  }
}
```

### Week 2: 請求書作成機能

#### Day 6-7: 請求書作成ロジック

**タスク一覧:**
- [ ] 請求書番号採番機能
- [ ] 請求書リポジトリ実装
- [ ] 請求書サービス実装
- [ ] 金額計算ロジック

**実装内容:**
```typescript
// src/services/invoice.service.ts
export class InvoiceService {
  private invoiceRepo: InvoiceRepository;
  
  createInvoice(request: CreateInvoiceRequest): Invoice {
    // 請求書番号生成
    const invoiceNumber = this.generateInvoiceNumber();
    
    // 金額計算
    const calculations = this.calculateAmounts(request.unitPrice);
    
    // 固定の明細を作成
    const item: InvoiceItem = {
      itemId: this.generateItemId(),
      invoiceNumber,
      itemName: '制作費',
      quantity: 1,
      unit: '式',
      unitPrice: request.unitPrice,
      taxRate: 0.10,
      amount: request.unitPrice
    };
    
    // 請求書作成
    const invoice: Invoice = {
      invoiceNumber,
      issueDate: new Date(),
      customerId: request.customerId,
      advertiser: request.advertiser,
      subject: request.subject,
      items: [item],
      ...calculations,
      notes: request.notes,
      status: InvoiceStatus.ISSUED,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return this.invoiceRepo.create(invoice);
  }
  
  private calculateAmounts(unitPrice: number): {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = unitPrice;           // 制作費（1式）
    const taxAmount = unitPrice * 0.10;   // 消費税10%
    const totalAmount = subtotal + taxAmount;
    
    return { subtotal, taxAmount, totalAmount };
  }
  
  private generateInvoiceNumber(): string {
    const now = new Date();
    const yearMonth = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0');
    const sequence = this.getNextSequence(yearMonth);
    return `${yearMonth}-${String(sequence).padStart(3, '0')}`;
  }
}
```

#### Day 8-9: 請求書作成UI

**タスク一覧:**
- [ ] HTMLダイアログ作成
- [ ] 顧客選択UI
- [ ] 商品選択・数量入力UI
- [ ] 確認画面

**実装内容:**
```html
<!-- src/ui/dialogs/invoice-create.html -->
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    .container { padding: 20px; }
    .form-group { margin-bottom: 15px; }
    .form-label { display: block; margin-bottom: 5px; }
    .form-control { width: 100%; padding: 8px; }
    .items-table { width: 100%; border-collapse: collapse; }
    .items-table th, .items-table td { 
      border: 1px solid #ddd; padding: 8px; 
    }
    .button-group { margin-top: 20px; }
    .btn { padding: 10px 20px; margin-right: 10px; }
    .btn-primary { background: #4CAF50; color: white; }
    .btn-secondary { background: #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <h2>請求書作成</h2>
    
    <div class="form-group">
      <label class="form-label">顧客選択</label>
      <select id="customerId" class="form-control">
        <option value="">選択してください</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">広告主</label>
      <input type="text" id="advertiser" class="form-control" placeholder="広告主名を入力">
    </div>
    
    <div class="form-group">
      <label class="form-label">件名</label>
      <input type="text" id="subject" class="form-control" placeholder="案件名・件名を入力">
    </div>
    
    <div class="form-group">
      <label class="form-label">制作費</label>
      <div style="border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
        <div><strong>品目名:</strong> 制作費</div>
        <div><strong>数量:</strong> 1</div>
        <div><strong>単位:</strong> 式</div>
        <div><strong>税率:</strong> 10%</div>
        <div style="margin-top: 10px;">
          <label>制作費金額:</label>
          <input type="number" id="unitPrice" class="form-control" 
                 placeholder="金額を入力" min="0" step="1" 
                 onchange="calculateTotal()">
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <div>小計: ¥<span id="subtotal">0</span></div>
      <div>税額: ¥<span id="tax">0</span></div>
      <div><strong>合計: ¥<span id="total">0</span></strong></div>
    </div>
    
    <div class="button-group">
      <button class="btn btn-secondary" onclick="google.script.host.close()">
        キャンセル
      </button>
      <button class="btn btn-primary" onclick="createInvoice()">
        請求書発行
      </button>
    </div>
  </div>
  
  <script>
    // 初期化
    window.onload = function() {
      loadCustomers();
    };
    
    function loadCustomers() {
      google.script.run
        .withSuccessHandler(function(customers) {
          const select = document.getElementById('customerId');
          customers.forEach(function(customer) {
            const option = document.createElement('option');
            option.value = customer.customerId;
            option.text = customer.companyName;
            select.appendChild(option);
          });
        })
        .getCustomerList();
    }
    
    function calculateTotal() {
      const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;
      const subtotal = unitPrice;
      const tax = Math.round(unitPrice * 0.10);
      const total = subtotal + tax;
      
      document.getElementById('subtotal').textContent = subtotal.toLocaleString();
      document.getElementById('tax').textContent = tax.toLocaleString();
      document.getElementById('total').textContent = total.toLocaleString();
    }
    
    function createInvoice() {
      const unitPrice = parseFloat(document.getElementById('unitPrice').value);
      
      if (!unitPrice || unitPrice <= 0) {
        alert('制作費金額を入力してください');
        return;
      }
      
      const data = {
        customerId: document.getElementById('customerId').value,
        advertiser: document.getElementById('advertiser').value,
        subject: document.getElementById('subject').value,
        unitPrice: unitPrice,
        notes: document.getElementById('notes').value
      };
      
      google.script.run
        .withSuccessHandler(function(result) {
          alert('請求書を作成しました: ' + result.invoiceNumber);
          google.script.host.close();
        })
        .withFailureHandler(function(error) {
          alert('エラー: ' + error);
        })
        .createInvoice(data);
    }
  </script>
</body>
</html>
```

#### Day 10: PDF生成機能

**タスク一覧:**
- [ ] PDFテンプレートからの読み込み
- [ ] フォームフィールドへのデータ埋め込み
- [ ] Google Drive保存処理

**実装内容:**
```typescript
// src/services/pdf.service.ts
export class PDFService {
  private readonly TEMPLATE_FOLDER_NAME = '請求書テンプレート';
  private readonly TEMPLATE_FILE_NAME = 'invoice_template.pdf';
  
  generateInvoicePDF(invoice: Invoice): string {
    try {
      // PDFテンプレートを取得
      const templateBlob = this.getTemplateFile();
      
      // フォームフィールドにデータを埋め込み
      const filledPdfBlob = this.fillPdfForm(templateBlob, invoice);
      
      // Google Driveに保存
      const fileName = this.generateFileName(invoice);
      const folder = this.getOrCreateFolder(invoice.issueDate);
      const file = folder.createFile(filledPdfBlob.setName(fileName));
      
      return file.getUrl();
      
    } catch (error) {
      console.error('PDF生成エラー:', error);
      throw new Error(`PDF生成に失敗しました: ${error.toString()}`);
    }
  }
  
  private getTemplateFile(): GoogleAppsScript.Base.Blob {
    try {
      // テンプレートフォルダを検索
      const folders = DriveApp.getFoldersByName(this.TEMPLATE_FOLDER_NAME);
      if (!folders.hasNext()) {
        throw new Error(`テンプレートフォルダが見つかりません: ${this.TEMPLATE_FOLDER_NAME}`);
      }
      
      const templateFolder = folders.next();
      
      // テンプレートファイルを検索
      const files = templateFolder.getFilesByName(this.TEMPLATE_FILE_NAME);
      if (!files.hasNext()) {
        throw new Error(`テンプレートファイルが見つかりません: ${this.TEMPLATE_FILE_NAME}`);
      }
      
      const templateFile = files.next();
      return templateFile.getBlob();
      
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
      throw error;
    }
  }
  
  private fillPdfForm(templateBlob: GoogleAppsScript.Base.Blob, invoice: Invoice): GoogleAppsScript.Base.Blob {
    // Google Apps ScriptでPDFフォーム埋め込み
    // 注意: GASではPDF-libが直接使用できないため、代替手段を使用
    
    // 方法1: HTMLテンプレート + PDF変換
    const htmlContent = this.createHTMLFromTemplate(invoice);
    const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'invoice.html');
    
    // HTMLをPDFに変換（Google DriveのAPI使用）
    // 実際の実装では、より高度なPDF操作ライブラリが必要
    
    return this.convertHTMLtoPDF(htmlBlob);
  }
  
  private createHTMLFromTemplate(invoice: Invoice): string {
    const customer = this.getCustomer(invoice.customerId);
    const item = invoice.items[0];
    
    // HTMLテンプレートを読み込み（Google Driveから）
    const htmlTemplate = this.getHTMLTemplate();
    
    // プレースホルダーを実データで置換
    return htmlTemplate
      .replace('{{invoice_number}}', invoice.invoiceNumber)
      .replace('{{issue_date}}', Utilities.formatDate(invoice.issueDate, 'JST', 'yyyy年MM月dd日'))
      .replace('{{customer_company}}', customer.companyName + ' 御中')
      .replace('{{customer_address}}', customer.address)
      .replace('{{advertiser}}', invoice.advertiser)
      .replace('{{subject}}', invoice.subject)
      .replace('{{item_name}}', item.itemName)
      .replace('{{item_quantity}}', item.quantity.toString())
      .replace('{{item_unit}}', item.unit)
      .replace('{{item_price}}', item.unitPrice.toLocaleString())
      .replace('{{item_amount}}', item.amount.toLocaleString())
      .replace('{{subtotal}}', invoice.subtotal.toLocaleString())
      .replace('{{tax_amount}}', invoice.taxAmount.toLocaleString())
      .replace('{{total_amount}}', invoice.totalAmount.toLocaleString());
  }
  
  private getHTMLTemplate(): string {
    // HTMLテンプレートファイルをGoogle Driveから読み込み
    try {
      const folders = DriveApp.getFoldersByName(this.TEMPLATE_FOLDER_NAME);
      const templateFolder = folders.next();
      const files = templateFolder.getFilesByName('invoice_template.html');
      
      if (files.hasNext()) {
        return files.next().getBlob().getDataAsString();
      } else {
        // デフォルトHTMLテンプレートを返す
        return this.getDefaultHTMLTemplate();
      }
    } catch (error) {
      console.error('HTMLテンプレート取得エラー:', error);
      return this.getDefaultHTMLTemplate();
    }
  }
  
  private getDefaultHTMLTemplate(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: "ヒラギノ角ゴ Pro", "Hiragino Kaku Gothic Pro", sans-serif; }
    .header { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .invoice-info { margin: 20px 0; }
    .customer-info { margin: 20px 0; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details-table th, .details-table td { border: 1px solid #000; padding: 8px; text-align: center; }
    .total-section { margin-top: 20px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">請求書</div>
  
  <div class="invoice-info">
    <div>請求書番号: {{invoice_number}}</div>
    <div>発行日: {{issue_date}}</div>
  </div>
  
  <div class="customer-info">
    <div>{{customer_company}}</div>
    <div>{{customer_address}}</div>
  </div>
  
  <div class="project-info">
    <div>広告主: {{advertiser}}</div>
    <div>件名: {{subject}}</div>
  </div>
  
  <table class="details-table">
    <tr><th>品目</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr>
    <tr>
      <td>{{item_name}}</td>
      <td>{{item_quantity}}</td>
      <td>{{item_unit}}</td>
      <td>¥{{item_price}}</td>
      <td>¥{{item_amount}}</td>
    </tr>
  </table>
  
  <div class="total-section">
    <div>小計: ¥{{subtotal}}</div>
    <div>消費税(10%): ¥{{tax_amount}}</div>
    <div><strong>合計金額: ¥{{total_amount}}</strong></div>
  </div>
</body>
</html>`;
  }
  
  private convertHTMLtoPDF(htmlBlob: GoogleAppsScript.Base.Blob): GoogleAppsScript.Base.Blob {
    // Google Apps ScriptでHTMLをPDFに変換
    // 注意: 実際の実装では、より高度な変換が必要
    
    try {
      // 一時的なGoogle Docsを作成してPDF化
      const doc = DocumentApp.create('temp_invoice');
      const body = doc.getBody();
      
      // HTMLコンテンツをGoogle Docsに挿入
      // （実際にはHTMLパースが必要）
      body.appendParagraph('請求書'); // 簡略化
      
      // PDFとして出力
      const pdfBlob = doc.getBlob().setName('invoice.pdf');
      
      // 一時ファイルを削除
      DriveApp.getFileById(doc.getId()).setTrashed(true);
      
      return pdfBlob;
      
    } catch (error) {
      console.error('HTML→PDF変換エラー:', error);
      throw error;
    }
  }
  
  private generateFileName(invoice: Invoice): string {
    const customer = this.getCustomer(invoice.customerId);
    const dateStr = Utilities.formatDate(
      invoice.issueDate, 'JST', 'yyyyMMdd'
    );
    return `請求書_${invoice.invoiceNumber}_${customer.companyName}_${dateStr}.pdf`;
  }
  
  private getOrCreateFolder(date: Date): GoogleAppsScript.Drive.Folder {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // 請求書フォルダを取得または作成
    let invoiceFolder = this.getOrCreateFolderByName('請求書');
    let yearFolder = this.getOrCreateFolderByName(year, invoiceFolder);
    let monthFolder = this.getOrCreateFolderByName(month, yearFolder);
    
    return monthFolder;
  }
  
  private getOrCreateFolderByName(name: string, parent?: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder {
    const folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
    
    if (folders.hasNext()) {
      return folders.next();
    } else {
      return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
    }
  }
  
  private getCustomer(customerId: string): Customer {
    // 顧客情報を取得（CustomerRepositoryを使用）
    // 実装は顧客管理機能に依存
    return {
      customerId,
      companyName: 'サンプル会社',
      address: 'サンプル住所'
    } as Customer;
  }
}
```

### Week 3: 管理機能と仕上げ

#### Day 11-12: 請求履歴管理

**タスク一覧:**
- [ ] 請求書一覧表示
- [ ] 検索・フィルター機能
- [ ] 再発行機能

**実装内容:**
```typescript
// src/services/invoice-list.service.ts
export class InvoiceListService {
  listInvoices(filter?: InvoiceFilter): Invoice[] {
    const invoices = this.invoiceRepo.findAll();
    
    if (!filter) return invoices;
    
    return invoices.filter(invoice => {
      if (filter.dateFrom && invoice.issueDate < filter.dateFrom) return false;
      if (filter.dateTo && invoice.issueDate > filter.dateTo) return false;
      if (filter.customerId && invoice.customerId !== filter.customerId) return false;
      if (filter.status && invoice.status !== filter.status) return false;
      return true;
    });
  }
  
  searchInvoices(keyword: string): Invoice[] {
    const invoices = this.invoiceRepo.findAll();
    return invoices.filter(invoice => {
      // 請求書番号で検索
      if (invoice.invoiceNumber.includes(keyword)) return true;
      // 顧客名で検索
      const customer = this.customerRepo.findById(invoice.customerId);
      if (customer?.companyName.includes(keyword)) return true;
      return false;
    });
  }
  
  reissueInvoice(invoiceNumber: string): string {
    const invoice = this.invoiceRepo.findByNumber(invoiceNumber);
    if (!invoice) throw new Error('請求書が見つかりません');
    
    // PDF再生成
    const pdfUrl = this.pdfService.generateInvoicePDF(invoice);
    
    // URL更新
    invoice.pdfUrl = pdfUrl;
    this.invoiceRepo.update(invoice);
    
    return pdfUrl;
  }
}
```

#### Day 13-14: テストとバグ修正

**テスト項目:**
- [ ] 顧客登録・編集・削除
- [ ] 商品登録・編集・削除
- [ ] 請求書作成フロー全体
- [ ] PDF生成と保存
- [ ] 請求書検索・一覧表示
- [ ] エラーハンドリング

**テストケース例:**
```typescript
// tests/invoice.test.ts
function testInvoiceCreation() {
  const testData = {
    customerId: 'C00001',
    items: [
      {
        productId: 'P00001',
        productName: 'テスト商品',
        quantity: 10,
        unitPrice: 1000,
        taxRate: 0.10,
        amount: 10000
      }
    ]
  };
  
  const invoice = createInvoice(testData);
  
  // アサーション
  console.assert(invoice.invoiceNumber.match(/\d{6}-\d{3}/));
  console.assert(invoice.subtotal === 10000);
  console.assert(invoice.taxAmount === 1000);
  console.assert(invoice.totalAmount === 11000);
  
  console.log('✅ 請求書作成テスト成功');
}
```

#### Day 15: ドキュメント整備

**作成ドキュメント:**
- [ ] ユーザーマニュアル
- [ ] 運用手順書
- [ ] トラブルシューティングガイド

## 3. 実装優先順位

### 必須機能（Must Have）
1. 顧客登録・管理
2. 商品登録・管理
3. 請求書作成
4. PDF生成
5. 請求履歴表示

### あると良い機能（Nice to Have）
1. 詳細な検索機能
2. データのエクスポート
3. バックアップ機能

### 将来機能（Future）
1. 見積書機能
2. 入金管理
3. メール送信
4. 権限管理

## 4. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| GAS実行時間制限 | 高 | 中 | バッチ処理の分割実装 |
| PDF生成エラー | 高 | 低 | エラーハンドリングとリトライ |
| データ不整合 | 中 | 低 | トランザクション的処理 |
| UI操作性 | 中 | 中 | ユーザーフィードバック収集 |

## 5. 完了基準

### Phase 1完了条件
- [ ] 全必須機能の実装完了
- [ ] テスト項目の全合格
- [ ] ドキュメント作成完了
- [ ] 本番環境へのデプロイ
- [ ] ユーザー受け入れテスト合格

### 品質基準
- コードカバレッジ: 70%以上
- エラー率: 1%未満
- 処理時間: 請求書1件10秒以内

---

**文書情報**
- 作成日: 2025年9月13日
- バージョン: 1.0
- 作成者: GAS請求書システム開発チーム
- 最終更新: 2025年9月13日