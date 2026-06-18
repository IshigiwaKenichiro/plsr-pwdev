# pwdev 動作確認手順

## 前提

- `playwright-cli` がグローバルインストール済み
- `pwdev` がグローバルインストール済み（`npm install -g .`）
- ローカルで HTTP サーバーが起動済み（任意のポート）

---

## 1. セッション永続化（ログイン維持）の確認

```bash
pwdev open https://github.com
# ログインする

pwdev -s=mine close

pwdev open https://github.com
# ログイン状態が維持されているか確認
```

**確認ポイント:** 再オープン後にログイン画面が出ないこと

---

## 2. headed 起動の確認

```bash
pwdev open https://example.com
```

**確認ポイント:** ブラウザウィンドウが表示されること

---

## 3. Private Network Access（PNA）ダイアログ抑制の確認

公開 HTTPS サイトからローカルへのアクセスが Chrome にブロックされないことを確認する。

### 手順

```bash
# 1. ローカル HTTP サーバーを用意（任意のポート）
#    例: python -m http.server 3000

# 2. pwdev で公開 HTTPS サイトを開く
pwdev -s=test open https://example.com

# 3. ローカルへの fetch を試みる
pwdev -s=test eval "() => fetch('http://127.0.0.1:3000/').catch(e=>e.message)"
```

**確認ポイント:**
- `許可する / ブロック` の PNA ダイアログが表示されないこと
- fetch がエラーなく応答を返すこと

### 素の playwright-cli との比較

```bash
playwright-cli -s=raw open --headed https://example.com
playwright-cli -s=raw eval "() => fetch('http://127.0.0.1:3000/').catch(e=>e.message)"
# → PNA ダイアログが表示される（pwdev との差分）
```

---

## 確認済みの Chromium フラグ効果

| 設定 | 効果 | 確認方法 |
|---|---|---|
| `--allow-insecure-localhost` | localhost の自己証明書エラーを回避 | 自己証明書 HTTPS サーバーにアクセス |
| `--disable-features=PrivateNetworkAccessPermissionPrompt` | 公開サイト → localhost への PNA ダイアログを抑制 | example.com から 127.0.0.1 への fetch |
| `ignoreHTTPSErrors: true` | Playwright レベルの HTTPS エラーを無視 | `playwright-cli open` 時のナビゲーションエラー抑制 |

---

## config ファイルの場所

```
~/.pwdev/cli.config.json
```

初回 `pwdev open` 時に自動生成される。手動で編集することで Chromium フラグを追加・変更できる。
