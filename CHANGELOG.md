# Changelog

このファイルは plsr-pwdev の主な変更点を記録します。

書式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に従い、
バージョン番号は [Semantic Versioning](https://semver.org/lang/ja/) に従います。
日付は npm への公開日です。

## [0.2.0] - 2026-10-27

### 追加

- `pwdev login <erakisプロファイル名> [アプリID または URL]` — erakis のプロファイルの認証情報で、起動中のブラウザから kintone にログインする（#2）
  - `X-Cybozu-Authorization`（Basic 認証があれば `Authorization` も）を、プロファイルのドメイン宛てのリクエストにだけ付ける
  - 認証値は出力・ファイル・コマンドライン引数に出さない

## [0.1.0] - 2026-06-18

初版リリース。

### 追加

- `pwdev open <url>` — Playwright CLI を開発向けの既定値で起動する
  - `--headed` を自動付与し、常にブラウザを表示する
  - `--profile ~/.pwdev/profiles/<name>` を自動付与し、Cookie・LocalStorage・SSO状態を永続化する
  - `--allow-insecure-localhost` を付与し、localhost の証明書警告を回避する
- `--profile <name>` によるプロファイル切り替え。`~/.pwdev/profiles/<name>` に自動生成され、指定なしの場合は `default` を使う
- `open` 以外のコマンドは `playwright-cli` にそのまま委譲する（`snapshot` / `click` / `fill` / `screenshot` など）
