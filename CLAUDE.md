# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Google Apps Script (GAS)を使用した請求書管理システムです。TypeScriptで開発し、claspを使用してGoogle Apps Scriptにデプロイします。開発環境と本番環境の複数環境に対応しています。

## 開発環境セットアップコマンド

### 初期セットアップ（未実施の場合）
```bash
# npm初期化とGASプロジェクト作成
npm init -y
clasp create --type standalone --title "GAS請求書管理システム" --rootDir dist

# 依存パッケージのインストール
npm i -D typescript @types/google-apps-script \
  eslint prettier eslint-config-prettier eslint-plugin-import \
  esbuild rimraf
```

### よく使う開発コマンド
```bash
# TypeScriptをJavaScriptにビルド
npm run build
npm run build:watch    # ファイル監視モード

# 環境切り替え
npm run env:dev        # 開発環境に切り替え
npm run env:prod       # 本番環境に切り替え

# Google Apps Scriptへデプロイ
npm run push:dev       # 開発環境へビルド＆プッシュ
npm run push:prod      # 本番環境へビルド＆プッシュ

# バージョン管理付きデプロイ
npm run deploy:dev     # 開発版をデプロイ
npm run deploy:prod    # 本番版をデプロイ

# Script Properties管理
npm run props:dev      # 開発環境のプロパティを注入
npm run props:prod     # 本番環境のプロパティを注入

# コード品質チェック
npm run lint           # ESLintでチェック
npm run lint:fix       # ESLintで自動修正
npm run format         # Prettierでフォーマット
npm run format:check   # フォーマットチェックのみ

# ユーティリティ
npm run clean          # distディレクトリをクリア
```

## プロジェクト構造

```
gas-invoice/
├── src/                    # TypeScriptソースファイル
│   ├── main.ts            # エントリーポイント（onOpen()とメイン関数）
│   ├── config.ts          # 環境設定管理
│   └── [機能モジュール]    # 機能別モジュール
├── dist/                   # コンパイル済みJavaScript（claspはここからデプロイ）
│   └── appsscript.json    # GASマニフェスト（env/から生成）
├── env/                    # 環境別設定ファイル
│   ├── clasp.dev.json     # 開発環境のGASプロジェクトID
│   ├── clasp.prod.json    # 本番環境のGASプロジェクトID
│   ├── manifest.dev.json  # 開発環境マニフェスト
│   ├── manifest.prod.json # 本番環境マニフェスト
│   ├── props.dev.json     # 開発環境のScript Properties
│   └── props.prod.json    # 本番環境のScript Properties
├── scripts/                # ビルド・デプロイ用ユーティリティ
│   ├── switch-env.mjs     # 環境切り替えスクリプト
│   └── inject-props.mjs   # Script Properties注入スクリプト
└── .clasp.json            # 現在のclasp設定（自動生成、Gitには含めない）
```

## 主要なアーキテクチャパターン

### 環境管理
- **複数環境対応**: 開発環境と本番環境を分離して管理
- **環境切り替え**: `scripts/switch-env.mjs`でデプロイ前に環境を切り替える
- **Script Properties**: 環境変数はGoogle Script Propertiesに保存し、`PropertiesService.getScriptProperties()`でアクセス

### TypeScriptからGASへのビルドパイプライン（重要）
- **ESBuild設定**: `esbuild.config.mjs`でカスタムプラグイン`gas-globals`を使用
- **変換プロセス**: TypeScript → ESM → ポスト処理でGAS関数に変換
- **関数認識の仕組み**: export文を完全除去し、純粋な`function 名前()`宣言に変換
- **"module is not defined"エラー回避**: CommonJS形式ではなくESM→変換アプローチを使用
- **型安全性**: `@types/google-apps-script`でGoogle Apps Script APIの型定義を使用

#### ビルド変換の詳細
```javascript
// src/main.ts (TypeScript)
export function onOpen(): void { ... }

// dist/main.js (変換後)
function onOpen() { ... }  // GASで認識される形式
```

### Google Apps Script API
- **スプレッドシート操作**: すべてのスプレッドシート操作は`SpreadsheetApp`を使用
- **UIメニュー**: カスタムメニューは`onOpen()`トリガー関数で追加
- **Properties Service**: 設定や秘密情報の保存に使用
- **OAuthスコープ**: 必要な権限をマニフェストファイルで定義

## 重要な実装上の注意点

### Google Apps Scriptの制約
1. **グローバル関数**: GAS UIから呼び出される関数はグローバルスコープに必要（main.tsからexport）
2. **トリガー関数**: `onOpen()`, `onEdit()`などは特別なトリガー関数
3. **DOM非対応**: Googleのサーバー上で実行されるため、window、document、DOM APIは使用不可
4. **API制限**: Google Apps Scriptのクォータと実行時間制限（最大6分）に注意

### 開発ワークフロー
1. `src/`ディレクトリで変更を行う（TypeScript）
2. `npm run push:dev`で開発環境に自動ビルド＆デプロイ
3. Google Apps Scriptエディタでテスト実行（testFunctionなど）
4. スプレッドシートが自動作成されない場合は、手動で新規作成してからスクリプトを実行
5. 準備ができたら`npm run push:prod`で本番環境へ

### トラブルシューティング
- **関数が認識されない**: GASエディタでページを更新（F5）、.claspignoreの設定確認、またはビルド出力を確認
- **"module is not defined"エラー**: ESBuild設定が正しく動作していない。`npm run build`でdist/main.jsにexport文が残っていないか確認
- **関数が空白になる**: ビルドプロセスでエラー。`npm run build`でエラーログを確認
- **スプレッドシートエラー**: `SpreadsheetApp.getActiveSpreadsheet()`がnullの場合、新規スプレッドシートの作成が必要
- **権限エラー**: 初回実行時はGoogleアカウントでの権限承認が必要

### ビルドパイプライン固有の注意事項
- **ビルド前チェック**: TypeScriptのexport関数がすべて正しく変換されるか確認
- **デプロイ後確認**: GASエディタの関数ドロップダウンで全関数が表示されるか確認
- **変換結果検証**: dist/main.jsに`export`や`import`文が残っていないか確認

### Script Propertiesの使用パターン
```typescript
// 環境変数の読み取り
const apiUrl = PropertiesService.getScriptProperties().getProperty("API_BASE_URL") || "";
const isFeatureEnabled = PropertiesService.getScriptProperties().getProperty("FEATURE_FLAG") === "true";
```

### エラーハンドリング
```typescript
try {
  // GAS操作
} catch (error) {
  console.error("エラー:", error);
  SpreadsheetApp.getUi().alert(`エラーが発生しました: ${error.toString()}`);
}
```

## テスト方法

Google Apps ScriptはGoogleの環境で実行されるため：
1. **手動テスト**: GASエディタで関数を選択して実行ボタンをクリック
2. **testFunction**: システム全体のテスト用関数。スプレッドシートにテスト結果を出力
3. **デバッグ**: `console.log()`を使用し、GASエディタの「実行ログ」タブで確認
4. **スプレッドシート連携**: テスト用のスプレッドシートを作成するか、既存のものを使用
5. **権限テスト**: 初回実行時の権限承認フローの確認

### 主要なテスト関数
- `testFunction()`: システムテスト（環境変数確認、スプレッドシート書き込み）
- `runTestsWithLogs()`: 詳細ログ付きテスト（新規スプレッドシート作成、自動テスト実行）
- `testPDFTemplateFields()`: **PDF生成機能完全テスト**（テンプレート読み込み、フォーム解析、データ埋め込み）
- `testPDFGeneration()`: PDF生成サービステスト
- `testCustomerManagement()`: 顧客管理機能テスト
- `testInvoiceManagement()`: 請求書作成機能テスト
- `showSettings()`: 設定確認用
- `getLastTestResults()`: 最新のテスト結果スプレッドシートを取得するAPI関数

### 包括的テスト実行システム
```bash
# 包括的テスト実行（推奨）
npm run test               # 自動ビルド・デプロイ・テスト手順表示
npm run test:comprehensive # 同上（明示的）

# 従来のテスト実行
npm run push:dev           # ビルド・デプロイのみ

# ログ確認（重要！）
npm run logs               # 実行ログを直接確認（推奨）
npm run logs:watch         # リアルタイムログ監視
npm run logs:json          # JSON形式でログ取得
clasp logs                 # 直接コマンド実行
```

### テスト結果の確認方法
1. **スプレッドシート**: `runTestsWithLogs()`実行後、自動生成される詳細結果スプレッドシート
   - 「テスト実行ログ」シート：タイムスタンプ付き詳細ログ
   - 「テストサマリー」シート：実行結果概要  
   - 「データテスト」シート：実際のデータ書き込みテスト
2. **コマンドライン**: `clasp logs`で実行ログを直接確認

## セキュリティに関する注意

- `.clasp.json`をコミットしない（プロジェクトIDが含まれる）
- 機密データはコードではなくScript Propertiesに保存
- マニフェストファイルで適切なOAuthスコープを使用
- 外部API呼び出し時の`UrlFetchApp`使用には注意

## 請求書システム固有の機能

### 実装済み主要機能（Phase 1: 80%完了）
- ✅ **請求書の作成と管理**: 完全実装（バリデーション、採番システム）
- ✅ **顧客情報の管理**: CRUD操作、検索機能
- ✅ **PDF生成システム**: pdf-lib統合、テンプレートベース自動生成
- ✅ **データのスプレッドシート管理**: 自動初期化、型安全アクセス
- 🔄 **請求履歴表示**: 次回実装予定
- 🔄 **月次レポートの作成**: 将来機能

### システム仕様
- **請求明細**: 「制作費」一式固定（品目名:「制作費」、数量:「1」、単位:「式」、税率:「10%」）
- **金額入力**: 制作費金額のみを入力し、税額・合計を自動計算
- **データ構成**: 顧客情報、請求データ（制作費一式）、請求履歴
- **データベース**: Googleスプレッドシートでの永続化

## システムアーキテクチャ

### レイヤードアーキテクチャ
```
┌─────────────────────┐
│   UI Layer          │ ← HTMLダイアログ、GASメニュー
├─────────────────────┤
│   Service Layer     │ ← ビジネスロジック、PDF生成
├─────────────────────┤
│   Repository Layer  │ ← データアクセス、CRUD操作
├─────────────────────┤
│   Model Layer       │ ← TypeScript型定義
└─────────────────────┘
```

### 主要コンポーネント
- **Models** (`src/models/`): Customer, Invoice, InvoiceItem等の型定義
- **Repositories** (`src/repositories/`): スプレッドシートデータアクセス層
- **Services** (`src/services/`): ビジネスロジック、PDF生成、外部API統合
- **UI** (`src/ui/`): ユーザーインターフェース、HTMLダイアログ
- **Utils** (`src/utils/`): 共通ユーティリティ、初期化、エラーハンドリング

### PDF生成システム（革新的実装）
```typescript
// pdf-libライブラリ完全統合システム
テンプレートPDF → フォーム解析 → データ埋め込み → Google Drive保存
```

**技術的特徴:**
- **動的ライブラリロード**: UrlFetchApp + eval()でpdf-libを実行時統合
- **テンプレートベース**: 実際のPDFフォームフィールドを自動検出・操作
- **フィールドタイプ対応**: テキスト、チェックボックス、ドロップダウン
- **完全自動化**: `testPDFTemplateFields()`で全フロー検証可能

### データベース設計（スプレッドシート）
- **顧客マスタ**: 会社情報、連絡先、住所
- **請求書データ**: ヘッダー情報、金額、ステータス
- **請求明細**: 品目詳細、数量、単価
- **自動初期化**: `initializeSpreadsheet()`でスキーマ構築

## 学んだ重要な教訓

### PDF生成における技術的ブレークスルー
- **外部ライブラリ統合**: GAS環境でnpmライブラリを動的ロード
- **テンプレート駆動**: コード埋め込みHTMLではなく、実PDFテンプレートの操作
- **型安全な外部API**: eval()使用時もTypeScript型定義でインテリセンス確保

### ビルドパイプラインの構築
- **間違ったアプローチ**: CommonJS形式（format: 'cjs'）→"module is not defined"エラー  
- **正しいアプローチ**: ESM形式で出力後、カスタムプラグインでexport/import文を除去
- **根本解決**: 手動でJavaScriptを書くのではなく、自動変換パイプラインを構築

### Google Apps Script特有の制約
- **関数認識**: グローバル関数宣言のみ認識（exportされた関数は認識されない）
- **モジュール非対応**: Node.js形式のmodule.exportsやrequire()は使用不可
- **実行環境**: V8エンジンだが、ブラウザやNode.jsとは異なる制約環境

### 効果的な開発フロー
1. TypeScriptで型安全な開発
2. `npm run push:dev`で自動ビルド・デプロイ
3. GASエディタでの実行確認
4. 本番デプロイ前の環境切り替え（`npm run push:prod`）

## GCPプロジェクト設定とログ取得（重要）

### clasp logsを使うための必須設定
Google Apps Scriptのログを`clasp logs`で取得するには、**標準GCPプロジェクト**の設定が必要です。

#### 設定手順（初回のみ）
1. **GASエディタにアクセス**: 
   ```bash
   # ブラウザでGASエディタを開く
   clasp open-script
   ```

2. **プロジェクト設定画面**:
   - 左サイドバー → ⚙️「プロジェクトの設定」をクリック

3. **GCPプロジェクト切り替え**:
   - 「Google Cloud Platform (GCP) プロジェクト」セクション
   - 「プロジェクトを変更」をクリック
   - **重要**: 「新しいプロジェクト」を作成（デフォルトプロジェクトではclasp logsが使用不可）

4. **プロジェクトID設定**:
   ```bash
   # .clasp.jsonにプロジェクトIDを追加（例）
   {
     "scriptId": "...",
     "projectId": "gas-invoice-dev",  # ← 追加
     "rootDir": "dist"
   }
   ```

5. **ログ取得テスト**:
   ```bash
   clasp logs                 # 実行ログ表示
   clasp logs --watch        # リアルタイム監視
   ```

#### トラブルシューティング：GCP設定
- **「GCP project ID is not set」エラー**: `.clasp.json`にprojectIdが設定されていない
- **「デフォルトプロジェクト」表示**: 標準GCPプロジェクトに切り替える必要がある
- **権限エラー**: Google Cloud Console で適切な権限設定が必要

#### Playwright環境の問題と解決
開発中にPlaywright MCPで自動ブラウザ操作を使用する場合：

```bash
# 正しいPlaywright MCP サーバーをインストール
npm install -g @executeautomation/playwright-mcp-server

# ブラウザバイナリをグローバルインストール
npx playwright install --global
```

**重要**: プロジェクト固有ではなく、グローバルインストールが必要です。

### 自動ログ取得の完成形
設定完了後の理想的な開発フロー：

```bash
# 1. テスト実行
npm run test               # ビルド・デプロイ・テスト手順表示

# 2. GASエディタで関数実行（手動）
# runTestsWithLogs() を実行

# 3. ログ確認（自動）
clasp logs                 # コピペ不要でログ直接確認
```

これで「実行ログを毎回コピペして渡す」問題が完全に解決されます。

## **PDF生成システム実装状況（重要・2025/09/15）**

### ✅ 実装完了済み機能（Day 8-9完了）
1. **pdf-libライブラリ統合**: UrlFetchApp + eval()による動的ライブラリロード
2. **テンプレートPDF読み込み**: Google Drive File ID: `15qHfTaG1WUJebBIYvJYPYlbSc-xo7_Lq`
3. **PDFDocument解析**: pdf-lib.PDFDocument.load()での完全解析
4. **フォームフィールド検出**: form.getFields()での自動フィールド検出

### 🔍 重要な発見（testPDFTemplateFields実行結果）
- **PDFテンプレート容量**: 674,300 bytes（正常読み込み確認）
- **pdf-libライブラリ容量**: 525,030 characters（CDN統合成功）
- **フォームフィールド数**: **0個**（⚠️ 重要）

### ⚠️ 現在の技術的課題
```typescript
// テンプレートPDFにフォームフィールドが存在しない
const form = pdfDoc.getForm();
const fields = form.getFields();
console.log('Form fields count:', fields.length); // 0

// 解決策：座標ベーステキスト埋め込み方式への移行が必要
```

### 📋 次のアクション項目
1. **座標ベース文字埋め込み実装**: PDFページ上の指定座標への文字描画
2. **テンプレート座標マップ作成**: 請求書項目（会社名、金額等）の座標定義
3. **代替PDF操作方式**: フォームフィールド依存から脱却

### 🎯 完成形のワークフロー設計
```typescript
// 現在: フォームフィールド方式（実装済みだが使用不可）
templatePDF → getForm() → getFields() → setValue()

// 必要: 座標ベース方式（今後実装）
templatePDF → getPage() → drawText(text, {x, y}) → save()
```

### 💡 技術的学習成果
- **Google Apps Script制約下でのpdf-lib統合**: 完全実証
- **外部CDNライブラリの動的ロード**: UrlFetchApp + eval()方式確立
- **PDF解析・操作システム**: 基盤技術完成
- **テンプレートベースワークフロー**: 思想転換の必要性発見

この実装により、Google Apps Script環境でのPDF操作基盤技術が確立されました。フォームフィールド方式から座標ベース方式への移行で、完全なPDF生成システムが実現可能です。