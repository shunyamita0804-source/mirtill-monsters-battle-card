import './style.css';
import { APP_INFO } from './config/app.ts';

/**
 * 第1段階：開発環境の動作確認用プレースホルダー画面。
 * ゲーム本体（タイトル画面・バトル等）は第2段階以降で実装する。
 */
function renderPlaceholder(root: HTMLElement): void {
  root.innerHTML = `
    <main class="placeholder">
      <p class="placeholder__series">${APP_INFO.seriesName}</p>
      <h1 class="placeholder__title">${APP_INFO.gameName}</h1>
      <p class="placeholder__status">開発環境 準備完了（第${APP_INFO.phase}段階）</p>
      <p class="placeholder__version">v${APP_INFO.version}</p>
    </main>
  `;
}

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  renderPlaceholder(root);
}
