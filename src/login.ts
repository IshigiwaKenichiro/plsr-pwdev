import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { runPlaywrightCli } from './playwrightCli';

// 使い捨て URL を推測されにくくするための長さ（バイト）
const TOKEN_BYTES = 16;

/** erakis/profile の getProfile() が返す値のうち、ここで使うもの */
interface ErakisProfile {
  baseUrl: string;
  username: string;
  password?: string;
  basicUsername?: string;
  basicPassword?: string;
}

interface ErakisProfileModule {
  getProfile(name: string): ErakisProfile;
}

type AuthHeaders = Record<string, string>;

const USAGE = '使い方: pwdev login <erakisプロファイル名> [アプリID または URL]';

/** npm のグローバルインストール先。Windows と Unix 系で node 本体からの位置が違う */
function globalNodeModules(): string {
  const prefix = path.dirname(process.execPath);
  return process.platform === 'win32'
    ? path.join(prefix, 'node_modules')
    : path.join(prefix, '..', 'lib', 'node_modules');
}

/** `npx erakis` で入った erakis の置き場所。新しいものから探す */
function npxCacheDirs(): string[] {
  const cacheRoot = process.env.npm_config_cache
    ?? (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache')
      : path.join(os.homedir(), '.npm'));
  const npxRoot = path.join(cacheRoot, '_npx');
  if (!fs.existsSync(npxRoot)) return [];

  return fs.readdirSync(npxRoot)
    .map(name => path.join(npxRoot, name, 'node_modules'))
    .filter(dir => fs.existsSync(path.join(dir, 'erakis')))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

/**
 * erakis/profile の場所を探す。
 * pwdev は erakis に依存しないので、プロジェクト → グローバル → npx キャッシュの順に借りてくる。
 * プロジェクトのものを先にするのは、プロファイルの保存形式がそのプロジェクトの erakis と合うため。
 */
function findErakisProfileModule(): string | null {
  const searchDirs = [process.cwd(), globalNodeModules(), ...npxCacheDirs()];
  for (const dir of searchDirs) {
    try {
      return require.resolve('erakis/profile', { paths: [dir] });
    } catch {
      // 次の場所を探す
    }
  }
  return null;
}

function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

function buildAuthHeaders(profile: ErakisProfile): AuthHeaders {
  const headers: AuthHeaders = {
    'x-cybozu-authorization': toBase64(`${profile.username}:${profile.password}`),
  };
  if (profile.basicUsername) {
    headers.authorization = `Basic ${toBase64(`${profile.basicUsername}:${profile.basicPassword ?? ''}`)}`;
  }
  return headers;
}

/** 引数（アプリID または URL）から開くページを決める。パスで受けないのは Git Bash が /k/1/ を K:/1/ に書き換えるため */
function resolveTargetUrl(origin: string, target: string | undefined): string | null {
  if (!target) return `${origin}/k/`;
  if (/^\d+$/.test(target)) return `${origin}/k/${target}/`;
  if (!/^https?:\/\//.test(target)) return null;
  // 別ドメインを開くとヘッダーが付かず、ログインしたように見えない
  return new URL(target).origin === origin ? target : null;
}

/**
 * 認証ヘッダーを一度だけ返す localhost サーバーを立てる。
 * run-code は実行したコードを出力に表示するので、値をコードに埋め込まず、実行中のコードから取りに来させる。
 * そのコードはページ内ではなく playwright-cli のプロセスで動くので、https のページから http へ取りに行く制限は受けない。
 */
async function serveOnce(headers: AuthHeaders): Promise<{ url: string; close: () => void }> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const server = http.createServer((req, res) => {
    if (req.url !== `/${token}`) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(headers));
    server.close();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { url: `http://127.0.0.1:${port}/${token}`, close: () => server.close() };
}

/** run-code に渡すコード。認証値は含めない */
function buildRunCode(authUrl: string, origin: string, targetUrl: string): string {
  // setExtraHTTPHeaders だと外部の CDN などにも送られるので、route でドメインを絞る
  return `async page => {
  const res = await fetch(${JSON.stringify(authUrl)});
  const auth = await res.json();
  await page.context().route(${JSON.stringify(`${origin}/**`)}, route =>
    route.continue({ headers: { ...route.request().headers(), ...auth } }));
  await page.goto(${JSON.stringify(targetUrl)});
  return page.url();
}`;
}

/**
 * erakis のプロファイルで、起動中のブラウザから kintone にログインする。
 * @param globalArgs `-s=<session>` など、コマンドより前に書かれたオプション
 * @param args login のあとに続く引数
 */
export async function runLogin(globalArgs: string[], args: string[]): Promise<number> {
  const [profileName, target] = args;
  if (!profileName) {
    console.error(USAGE);
    return 1;
  }

  const modulePath = findErakisProfileModule();
  if (!modulePath) {
    console.error('エラー: erakis が見つかりません。プロジェクトに入れるか、npm install -g erakis を実行してください。');
    return 1;
  }
  const { getProfile } = await import(pathToFileURL(modulePath).href) as ErakisProfileModule;

  let profile: ErakisProfile;
  try {
    profile = getProfile(profileName);
  } catch (err) {
    console.error(`エラー: erakis のプロファイル "${profileName}" を読めません: ${(err as Error).message}`);
    return 1;
  }
  const origin = new URL(profile.baseUrl).origin;
  const targetUrl = resolveTargetUrl(origin, target);
  if (!targetUrl) {
    console.error(`エラー: 開くページはアプリID か ${origin} の URL で指定してください。`);
    console.error(USAGE);
    return 1;
  }

  // password は資格情報ストアから遅延で読まれるので、引数の確認を済ませてから触る
  if (!profile.password) {
    console.error(`エラー: プロファイル "${profileName}" にパスワードがありません。npx erakis profile update ${profileName} で設定してください。`);
    return 1;
  }

  const server = await serveOnce(buildAuthHeaders(profile));
  // pwdev は cmd.exe 経由で playwright-cli を呼ぶため、複数行のコードは引数だと1行目で切れる
  const codeFile = path.join(os.tmpdir(), `pwdev-login-${crypto.randomBytes(TOKEN_BYTES).toString('hex')}.js`);
  fs.writeFileSync(codeFile, buildRunCode(server.url, origin, targetUrl), 'utf8');

  try {
    return await runPlaywrightCli([...globalArgs, 'run-code', `--filename=${codeFile}`]);
  } finally {
    server.close();
    fs.rmSync(codeFile, { force: true });
  }
}
