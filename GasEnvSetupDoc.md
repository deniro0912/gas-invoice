# Google Apps Script 開発環境 構築ドキュメント（AI実行用・複数環境対応版）

## 1. 前提

* プロジェクト用ディレクトリはユーザーが自分で作成して移動しておく。
* グローバルに必要なのは以下のみ：

  * Node.js / npm
  * clasp（Google公式 CLI）
* TypeScript, ESLint, Prettier などはプロジェクトごとに devDependencies で管理する。

---

## 2. clasp の確認

```bash
clasp --version
```

未導入または古い場合のみ更新：

```bash
npm i -g @google/clasp@latest
clasp login
```

---

## 3. プロジェクト初期化

```bash
npm init -y
clasp create --type standalone --title "My GAS App" --rootDir dist
```

---

## 4. パッケージ導入（ローカル依存として管理）

```bash
npm i -D typescript @types/google-apps-script \
  eslint prettier eslint-config-prettier eslint-plugin-import \
  esbuild rimraf
```

---

## 5. ディレクトリ構成

```
/project-root/
├─ src/
├─ dist/
├─ env/
│   ├─ clasp.dev.json
│   ├─ clasp.prod.json
│   ├─ manifest.dev.json
│   ├─ manifest.prod.json
│   ├─ props.dev.json
│   └─ props.prod.json
├─ scripts/
│   ├─ switch-env.mjs
│   └─ inject-props.mjs
├─ .clasp.json
├─ .claspignore
├─ tsconfig.json
├─ esbuild.config.mjs
├─ .eslintrc.cjs
├─ .prettierrc.json
└─ package.json
```

---

## 6. 設定ファイル

* tsconfig.json
* esbuild.config.mjs
* .claspignore
* .eslintrc.cjs
* .prettierrc.json
* package.json（scripts追加）

※ 詳細は省略、必要に応じて生成。

---

## 7. appsscript.json（環境ごとに env/manifest.\*.json を管理）

例：

```json
{
  "timeZone": "Asia/Tokyo",
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "runtimeVersion": "V8"
}
```

---

## 8. サンプルコード（src/main.ts）

```ts
function onOpen() {
  SpreadsheetApp.getUi().createMenu("MyMenu").addItem("Hello", "hello").addToUi();
}

export function hello() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(1, 1).setValue(`Hello GAS! ${new Date().toISOString()}`);
}
```

---

## 9. 複数環境対応

### A. clasp 設定ファイル

* env/clasp.dev.json
* env/clasp.prod.json → 実行前に switch-env.mjs で `.clasp.json` にコピー

### B. スイッチスクリプト（scripts/switch-env.mjs）

```js
import { copyFileSync, existsSync, mkdirSync } from "fs";

const env = process.argv[2];
if (!env || !["dev", "prod"].includes(env)) {
  console.error("Usage: node scripts/switch-env.mjs <dev|prod>");
  process.exit(1);
}

copyFileSync(`env/clasp.${env}.json`, `.clasp.json`);
if (!existsSync("dist")) mkdirSync("dist");
copyFileSync(`env/manifest.${env}.json`, `dist/appsscript.json`);

console.log(`[switch-env] switched to ${env}`);
```

### C. Script Properties 注入（任意: scripts/inject-props.mjs）

→ props.{env}.json を読み取り、Script Properties に注入。

### D. package.json スクリプト

```json
{
  "scripts": {
    "env:dev": "node scripts/switch-env.mjs dev",
    "env:prod": "node scripts/switch-env.mjs prod",
    "push:dev": "npm run env:dev && npm run build && clasp push",
    "push:prod": "npm run env:prod && npm run build && clasp push",
    "open:dev": "npm run env:dev && clasp open",
    "open:prod": "npm run env:prod && clasp open",
    "deploy:dev": "npm run push:dev && clasp deploy --description \"dev\"",
    "deploy:prod": "npm run push:prod && clasp deploy --description \"prod\"",
    "props:dev": "node scripts/inject-props.mjs dev",
    "props:prod": "node scripts/inject-props.mjs prod"
  }
}
```

---

## 10. 使い方

* 開発環境へ反映：

  ```bash
  npm run push:dev
  ```
* 本番環境へ反映：

  ```bash
  npm run push:prod
  ```
* Script Properties 注入（任意）：

  ```bash
  npm run props:dev
  npm run props:prod
  ```
* ブラウザで開く：

  ```bash
  npm run open:dev
  npm run open:prod
  ```

---

## 11. コード側の環境変数読み取り例

```ts
// src/config.ts
export const CONFIG = {
  API_BASE_URL: PropertiesService.getScriptProperties().getProperty("API_BASE_URL") || "",
  FEATURE_FLAG_X: PropertiesService.getScriptProperties().getProperty("FEATURE_FLAG_X") === "true"
};
```

```ts
// src/main.ts
import { CONFIG } from "./config";

export function hello() {
  const sheet = SpreadsheetApp.getActive().getActiveSheet();
  sheet.getRange(1, 1).setValue(
    `ENV URL: ${CONFIG.API_BASE_URL} / X=${CONFIG.FEATURE_FLAG_X} / ${new Date().toISOString()}`
  );
}
```

---

## 12. 運用ポイント

* グローバルは最小限（node/npm/clasp）
* その他はすべてプロジェクトローカルで管理
* `.clasp.json` は Git にコミットせず、環境切替スクリプトで生成
* Script Properties は props.{env}.json から注入または手動設定

---
