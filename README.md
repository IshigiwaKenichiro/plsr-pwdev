# pwdev

Playwright CLI の開発者向けラッパー。AIエージェントによるブラウザ操作を開発用途に最適化する。

## なぜ pwdev か

`playwright-cli` はデフォルトで毎回クリーンなセッションで起動する。開発中の反復作業では、ログインのやり直しや localhost の警告が頻発し、手間がかかる。

`pwdev` は以下を標準動作にする。

- **常にブラウザを表示**（`--headed` を自動付与）
- **セッション永続化**（`UserDataDir` ベースのプロファイル管理）

## インストール

```bash
npm install -g plsr-pwdev
```

前提: `playwright-cli` がグローバルインストールされていること。

```bash
npm install -g @playwright/cli   # または相当するパッケージ
```

## 使い方

### ブラウザを開く

```bash
pwdev open https://example.com
```

`--headed` と `--profile ~/.pwdev/profiles/default` が自動で付与される。

### プロファイルを切り替える

```bash
pwdev --profile customer-a open https://example.com
```

プロファイルは `~/.pwdev/profiles/<name>` に自動生成される。Cookie・LocalStorage・SSO 状態が維持される。

### その他のコマンド

`open` 以外はすべて `playwright-cli` にそのまま委譲される。

```bash
pwdev snapshot
pwdev click e12
pwdev fill e34 "hello"
pwdev -s=mine screenshot --filename=result.png
```

`playwright-cli --help` のコマンドはすべて使用できる。

## プロファイル

プロファイルは `~/.pwdev/profiles/` 以下に保存される。

```
~/.pwdev/
└── profiles/
    ├── default       # pwdev open のデフォルト
    ├── customer-a
    └── customer-b
```

指定なしの場合は `default` プロファイルが使われる。

## 開発

```bash
git clone https://github.com/your-org/pwdev
cd pwdev
npm install
npm run build
npm install -g .
```

```bash
npm run dev   # ウォッチビルド
```

## AI エージェントへの伝え方

システムプロンプトに以下をそのまま貼り付けて使用できる。

```
## ブラウザ操作ツール: pwdev

`playwright-cli` の代わりに `pwdev` を使うこと。
- `pwdev open <url>` でブラウザを開く（headed・セッション永続化・localhost警告なし）
- セッション名は `-s=<name>` で指定（例: `pwdev -s=mine open https://...`）
- `open` 以外のコマンドは playwright-cli と同じ（snapshot, click, fill, eval 等）

例:
  pwdev -s=mine open https://localhost:3000
  pwdev -s=mine snapshot
  pwdev -s=mine click e12
```

## ライセンス

MIT
