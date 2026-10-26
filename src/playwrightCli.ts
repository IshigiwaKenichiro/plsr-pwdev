import spawn from 'cross-spawn';

/**
 * playwright-cli を実行し、終了コードを返す。
 * login が localhost サーバーを動かしたまま待てるよう、同期実行にはしない。
 */
export function runPlaywrightCli(args: string[]): Promise<number> {
  return new Promise(resolve => {
    const child = spawn('playwright-cli', args, { stdio: 'inherit' });

    child.on('error', err => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error('エラー: playwright-cli が見つかりません。');
        console.error('  npm install -g @playwright/cli');
      } else {
        console.error(`playwright-cli の起動に失敗しました: ${err.message}`);
      }
      resolve(1);
    });

    child.on('exit', code => {
      resolve(code ?? 0);
    });
  });
}
