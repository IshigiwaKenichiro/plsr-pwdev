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

### kintone にログインする

```bash
pwdev login <erakisプロファイル名> [アプリID または URL]

pwdev login mine 194                                # https://<ドメイン>/k/194/ を開く
pwdev login mine https://example.cybozu.com/k/194/  # URL で指定
pwdev -s=mine login mine                            # セッションを指定。ページを省くとポータル（/k/）
```

[erakis](https://www.npmjs.com/package/erakis) のプロファイルにある認証情報で、起動中のブラウザから kintone にログインする。
ログイン画面に手で入力しなくてよいので、AI エージェントにパスワードを渡さずに済む。

- 先に `pwdev open` でブラウザを起動しておく
- `X-Cybozu-Authorization`（プロファイルに Basic 認証があれば `Authorization` も）を、プロファイルのドメイン宛てのリクエストにだけ付ける
- 認証値は出力・ファイル・コマンドライン引数に出さない
- erakis は pwdev の依存ではない。カレントディレクトリのプロジェクト → グローバル → `npx erakis` のキャッシュの順に探す
- ログイン後に残るのはセッション Cookie だけなので、ブラウザを起動し直したら `login` をやり直す
- ページはアプリ ID か URL で指定する。Git Bash では `/k/194/` のような引数が `K:/194/` に書き換わるため、パスでは受けない

### その他のコマンド

`open` と `login` 以外はすべて `playwright-cli` にそのまま委譲される。

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

## 変更履歴

変更内容は [CHANGELOG.md](./CHANGELOG.md) を参照してください。
