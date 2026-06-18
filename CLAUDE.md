# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

`pwdev` — Playwright CLI の開発者向けラッパー CLI ツール。
AIエージェントによるブラウザ操作を開発用途に最適化する。

参照: [`tasks/docs/concept.md`](tasks/docs/concept.md)

### pwdev が解決する課題

| 課題 | 方針 |
|---|---|
| Headless 起動 | `open` コマンドに `--headed` を自動注入 |
| セッション未維持 | `open` コマンドに `--profile ~/.pwdev/profiles/<name>` を自動注入 |
| localhost 警告 | (未実装・フェーズ2) |

## 開発コマンド

```bash
npm run build      # dist/index.js を生成
npm run dev        # ウォッチビルド
npm install -g .   # グローバル再インストール（変更を pwdev コマンドに反映）
```

## アーキテクチャ

### 構造

```
src/index.ts   ── エントリーポイント（ロジック全体）
dist/index.js  ── ビルド成果物（package.json の bin に指定）
```

### 引数処理フロー（src/index.ts）

1. `process.argv` から `--profile <name>` を抽出（pwdev 独自オプション）
2. `<name>` を `~/.pwdev/profiles/<name>` に展開
3. 残引数から `open` コマンドを検出
4. `open` の場合のみ `--headed --profile <path>` を直後に注入
5. `cross-spawn` で `playwright-cli` に委譲

```
pwdev open https://example.com
  → playwright-cli open --headed --profile ~/.pwdev/profiles/default https://example.com

pwdev --profile customer-a open https://example.com
  → playwright-cli open --headed --profile ~/.pwdev/profiles/customer-a https://example.com

pwdev snapshot
  → playwright-cli snapshot   （そのまま委譲）
```

### 技術スタック

- **言語**: TypeScript → CommonJS (tsup でビルド)
- **依存**: `cross-spawn`（Windows の `.cmd` バイナリ対応）
- **前提**: `playwright-cli` がグローバルインストール済みであること

### Windows の注意点

Node.js の `child_process.spawn` は Windows の `.cmd` ファイルを直接起動できないため、`cross-spawn` を使用している。`shell: true` は Node.js 22 で非推奨警告が出るため使用しない。
