# 請求書発行システム設計書

## 1. アーキテクチャ概要

### 1.1 システム構成図

```
┌─────────────────────────────────────────┐
│           ユーザー（ブラウザ）            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Google Apps Script (GAS)           │
│  ┌─────────────────────────────────┐    │
│  │     TypeScript Source Code      │    │
│  │  ┌──────────┐  ┌─────────────┐│    │
│  │  │   UI層    │  │  ビジネス層  ││    │
│  │  │  (HTML)   │  │   (Logic)    ││    │
│  │  └──────────┘  └─────────────┘│    │
│  │  ┌─────────────────────────────┐│    │
│  │  │      データアクセス層         ││    │
│  │  └─────────────────────────────┘│    │
│  └─────────────────────────────────┘    │
└────────────┬──────────────┬─────────────┘
             │              │
             ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│ Google Spreadsheet│  │   Google Drive    │
│  (データストア)    │  │  (PDF保存先)      │
└──────────────────┘  └──────────────────┘
```

### 1.2 レイヤー構成

| レイヤー | 役割 | 主要コンポーネント |
|---------|------|-------------------|
| UI層 | ユーザーインターフェース | HTMLダイアログ、メニュー |
| ビジネス層 | ビジネスロジック | 請求書作成、PDF生成、計算処理 |
| データアクセス層 | データ永続化 | スプレッドシート操作、Drive操作 |

## 2. ディレクトリ構造

```
gas-invoice/
├── docs/                       # ドキュメント
│   ├── requirements.md        # 要件定義書
│   ├── system-design.md       # 設計書（本書）
│   └── user-manual.md         # ユーザーマニュアル
│
├── src/                        # TypeScriptソース
│   ├── main.ts                # エントリーポイント
│   ├── config.ts              # 設定管理
│   ├── ui/                    # UI層
│   │   ├── menu.ts           # メニュー制御
│   │   ├── dialogs/          # ダイアログ
│   │   │   ├── invoice-create.html
│   │   │   ├── customer-select.html
│   │   │   └── product-select.html
│   │   └── (削除予定)        # 旧HTMLテンプレート関連
│   │
│   ├── services/              # ビジネス層
│   │   ├── invoice.service.ts    # 請求書サービス
│   │   ├── customer.service.ts   # 顧客サービス
│   │   └── (pdf.service.ts)      # 旧PDF生成サービス（HTML方式、使用中止）
│   │
│   ├── repositories/          # データアクセス層
│   │   ├── base.repository.ts    # 基底リポジトリ
│   │   ├── invoice.repository.ts # 請求書リポジトリ
│   │   └── customer.repository.ts # 顧客リポジトリ
│   │
│   ├── models/                # データモデル
│   │   ├── invoice.model.ts      # 請求書モデル
│   │   └── customer.model.ts     # 顧客モデル
│   │
│   └── utils/                 # ユーティリティ
│       ├── validator.ts          # バリデーション
│       ├── formatter.ts          # フォーマッター
│       └── logger.ts             # ロガー
│
├── dist/                      # ビルド出力
├── env/                       # 環境設定
├── scripts/                   # ビルドスクリプト
└── tests/                     # テスト
```

## 3. データモデル設計

### 3.1 顧客（Customer）

```typescript
interface Customer {
  customerId: string;      // 顧客ID (自動採番: C00001)
  companyName: string;     // 会社名
  contactPerson?: string;  // 担当者名
  postalCode?: string;     // 郵便番号
  address: string;         // 住所
  email?: string;          // メールアドレス
  phone?: string;          // 電話番号
  createdAt: Date;         // 登録日
  updatedAt: Date;         // 更新日
}
```

### 3.2 請求書（Invoice）

```typescript
interface Invoice {
  invoiceNumber: string;   // 請求書番号 (YYYYMM-001)
  issueDate: Date;        // 発行日
  customerId: string;     // 顧客ID
  customer?: Customer;    // 顧客情報（JOIN時）
  advertiser: string;     // 広告主
  subject: string;        // 件名
  items: InvoiceItem[];   // 明細
  subtotal: number;       // 小計
  taxAmount: number;      // 税額
  totalAmount: number;    // 合計金額
  notes?: string;         // 備考
  status: InvoiceStatus;  // ステータス
  pdfUrl?: string;        // PDF URL
  createdAt: Date;        // 作成日
  updatedAt: Date;        // 更新日
}

interface InvoiceItem {
  itemId: string;         // 明細ID
  invoiceNumber: string;  // 請求書番号
  itemName: string;       // 品目名（「制作費」固定）
  quantity: number;       // 数量（1固定）
  unit: string;           // 単位（「式」固定）
  unitPrice: number;      // 単価
  taxRate: number;        // 税率（0.10固定）
  amount: number;         // 金額
}

enum InvoiceStatus {
  DRAFT = 'draft',        // 下書き
  ISSUED = 'issued',      // 発行済み
  CANCELLED = 'cancelled' // キャンセル
}
```

## 4. API設計

### 4.1 顧客管理API

| メソッド | 関数名 | 説明 |
|---------|--------|------|
| CREATE | `createCustomer(customer: Customer)` | 顧客登録 |
| READ | `getCustomer(customerId: string)` | 顧客取得 |
| READ | `listCustomers(filter?: CustomerFilter)` | 顧客一覧 |
| UPDATE | `updateCustomer(customerId: string, customer: Partial<Customer>)` | 顧客更新 |
| DELETE | `deleteCustomer(customerId: string)` | 顧客削除 |

### 4.2 請求書管理API

| メソッド | 関数名 | 説明 |
|---------|--------|------|
| CREATE | `createInvoice(invoice: Invoice)` | 請求書作成 |
| READ | `getInvoice(invoiceNumber: string)` | 請求書取得 |
| READ | `listInvoices(filter?: InvoiceFilter)` | 請求書一覧 |
| UPDATE | `updateInvoice(invoiceNumber: string, invoice: Partial<Invoice>)` | 請求書更新 |
| DELETE | `cancelInvoice(invoiceNumber: string)` | 請求書キャンセル |
| ACTION | `generatePDF(invoiceNumber: string)` | PDF生成 |
| ACTION | `reissueInvoice(invoiceNumber: string)` | 再発行 |

## 5. 画面設計

### 5.1 メインメニュー

```
┌──────────────────────────────────┐
│   請求書管理システム              │
├──────────────────────────────────┤
│ ▶ 請求書作成                     │
│ ▶ 請求書一覧                     │
│ ▶ 顧客管理                       │
│ ▶ 設定                          │
└──────────────────────────────────┘
```

### 5.2 請求書作成画面

```
┌──────────────────────────────────────────┐
│         請求書作成                        │
├──────────────────────────────────────────┤
│ 発行日: [2025/01/01]                     │
│                                          │
│ 顧客選択:                                │
│ [▼ 顧客を選択してください        ]       │
│                                          │
│ 広告主: [                        ]       │
│ 件名:   [                        ]       │
│                                          │
│ 制作費:                                  │
│ 金額: [                 ] 円              │
│                                          │
│ ※品目：制作費（1式）、消費税10%で計算   │
│                                          │
│ 小計: ¥0                                 │
│ 税額: ¥0                                 │
│ 合計: ¥0                                 │
│                                          │
│ 備考:                                    │
│ [                                    ]   │
│                                          │
│ [キャンセル]  [プレビュー]  [発行]       │
└──────────────────────────────────────────┘
```

## 6. PDF生成仕様

### 6.1 PDFテンプレート仕様

#### 6.1.1 テンプレート管理
- **保存場所**: Google Drive (File ID: 15qHfTaG1WUJebBIYvJYPYlbSc-xo7_Lq)
- **フォームフィールド**: 現在0個（追加作成予定）
- **フィールド名規則**: システムで認識可能な名前を使用

#### 6.1.2 埋め込みフィールド一覧
```
フィールド名          | 埋め込み内容
--------------------|------------------
invoice_number      | 請求書番号
issue_date         | 発行日
customer_company   | 顧客会社名  
customer_address   | 顧客住所
advertiser         | 広告主
subject            | 件名
item_name          | 品目名（制作費）
item_quantity      | 数量（1）
item_unit          | 単位（式）
item_price         | 単価
item_amount        | 金額
subtotal           | 小計
tax_amount         | 消費税額
total_amount       | 合計金額
```

#### 6.1.3 フォームフィールド作成フロー
1. 既存PDFテンプレートにフォームフィールドを追加
2. フィールド名を上記命名規則で設定
3. pdf-libライブラリでフィールドへのデータ埋め込み実装
4. システムが自動でフィールドを認識・操作

### 6.2 ファイル保存仕様

- **テンプレート保存先**: Google Drive (File ID管理)
- **生成PDF保存先**: Google Drive `/請求書/[年]/[月]/`
- **ファイル名**: `請求書_[請求書番号]_[顧客名]_[発行日].pdf`
- **例**: `請求書_202501-001_株式会社ABC_20250101.pdf`

## 7. セキュリティ設計

### 7.1 認証・認可

- Google認証によるアクセス制御
- スクリプト実行権限の管理
- 環境変数のScript Properties管理

### 7.2 データ保護

- 顧客情報の適切なアクセス制御
- PDFファイルのDrive権限管理
- ログ出力時の機密情報マスキング

## 8. エラー処理設計

### 8.1 エラー分類

| 分類 | 説明 | 対処 |
|------|------|------|
| 入力エラー | バリデーションエラー | ユーザーへのエラーメッセージ表示 |
| システムエラー | API制限、タイムアウト | リトライまたは管理者通知 |
| データエラー | 不整合、重複 | データ修正ガイダンス |

### 8.2 エラーメッセージ

```typescript
enum ErrorCode {
  CUSTOMER_NOT_FOUND = 'E001',
  PRODUCT_NOT_FOUND = 'E002',
  INVOICE_DUPLICATE = 'E003',
  PDF_GENERATION_FAILED = 'E004',
  SPREADSHEET_ACCESS_ERROR = 'E005'
}
```

## 9. パフォーマンス設計

### 9.1 最適化方針

- スプレッドシート操作のバッチ処理
- キャッシュの活用（マスタデータ）
- 非同期処理の活用（PDF生成）

### 9.2 制限事項への対応

| 制限 | 対応策 |
|------|--------|
| 実行時間6分 | 大量処理の分割実行 |
| API呼び出し制限 | バッチ処理、キャッシュ |
| スプレッドシートサイズ | 定期的なアーカイブ |

## 10. テスト設計

### 10.1 テスト分類

- **単体テスト**: 各サービス、リポジトリ
- **統合テスト**: API連携、データフロー
- **E2Eテスト**: 請求書作成フロー全体

### 10.2 テストケース例

```typescript
describe('InvoiceService', () => {
  test('請求書番号の自動採番', () => {
    // 202501-001 形式の採番確認
  });
  
  test('金額計算の正確性', () => {
    // 小計、税額、合計の計算確認
  });
  
  test('PDF生成と保存', () => {
    // PDF生成とDrive保存の確認
  });
});
```

---

**文書情報**
- 作成日: 2025年9月13日
- バージョン: 1.0
- 作成者: GAS請求書システム開発チーム
- 最終更新: 2025年9月13日