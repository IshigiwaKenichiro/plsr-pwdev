import spawn from 'cross-spawn';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PWDEV_DIR = path.join(os.homedir(), '.pwdev');
const PROFILES_DIR = path.join(PWDEV_DIR, 'profiles');
const CONFIG_PATH = path.join(PWDEV_DIR, 'cli.config.json');
const DEFAULT_PROFILE = 'default';

const DEFAULT_CONFIG = {
  browser: {
    launchOptions: {
      args: [
        '--allow-insecure-localhost',
        '--disable-features=PrivateNetworkAccessPermissionPrompt',
      ],
    },
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },
};

function ensureConfig() {
  fs.mkdirSync(PWDEV_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
  }
}

const rawArgs = process.argv.slice(2);

// --profile <name> を抽出（pwdev 独自オプション）
let profileName = DEFAULT_PROFILE;
const filteredArgs: string[] = [];

for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === '--profile' && i + 1 < rawArgs.length) {
    profileName = rawArgs[i + 1];
    i++;
  } else {
    filteredArgs.push(rawArgs[i]);
  }
}

const profilePath = path.join(PROFILES_DIR, profileName);

// `open` コマンドの位置を探して各オプションを注入
// -s=session のようなグローバルオプションが先頭にある場合を考慮
const commandIdx = filteredArgs.findIndex(arg => !arg.startsWith('-'));
const isOpenCommand = commandIdx !== -1 && filteredArgs[commandIdx] === 'open';

let finalArgs = filteredArgs;

if (isOpenCommand) {
  ensureConfig();
  finalArgs = [
    ...filteredArgs.slice(0, commandIdx + 1),
    '--headed',
    '--profile', profilePath,
    '--config', CONFIG_PATH,
    ...filteredArgs.slice(commandIdx + 1),
  ];
}

const child = spawn('playwright-cli', finalArgs, { stdio: 'inherit' });

child.on('error', err => {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error('エラー: playwright-cli が見つかりません。');
    console.error('  npm install -g @playwright/cli');
  } else {
    console.error(`playwright-cli の起動に失敗しました: ${err.message}`);
  }
  process.exit(1);
});

child.on('exit', code => {
  process.exit(code ?? 0);
});
