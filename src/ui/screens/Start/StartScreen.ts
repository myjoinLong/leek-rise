import type { GameAction } from '../../../core/reducer';
import type { GameState, PlayerGender } from '../../../core/types';

export interface StartScreenOptions {
  save: Pick<GameState, 'day' | 'cash' | 'debt'> | null;
  onContinue: () => void;
  onStartNewGame: (gender: PlayerGender) => void;
}

export function createStartScreen(
  dispatch: (action: GameAction) => void,
  options: StartScreenOptions,
): HTMLElement {
  let selectedGender: PlayerGender | null = null;
  let choosingNewGame = options.save === null;
  const screen = document.createElement('main');
  screen.className = 'start-screen scene-screen';
  screen.innerHTML = `
    <style>
      .start-screen { box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(14px,3vh,24px); width:min(100vw,480px); max-width:100%; min-height:100vh; min-height:100dvh; margin:0 auto; padding:24px 18px; color:var(--text-primary); font-family:'Courier New',monospace; }
      .start-brand { display:flex; flex-direction:column; align-items:center; gap:10px; width:min(100%,calc(100vw - 36px),440px); }
      .start-kicker { padding:5px 10px; border:1px solid #e5c978; background:rgba(24,27,32,.82); color:#f4d88a; font-size:11px; letter-spacing:3px; }
      .start-title { padding:12px 18px; border:3px solid #f4cc63; background:rgba(42,36,48,.94); box-shadow:6px 6px 0 #000; color:#ffe38c; font-size:clamp(32px,10vw,52px); line-height:1.15; text-align:center; text-shadow:3px 3px #7b382d; }
      .start-subtitle { padding:0 8px; color:#f1eadc; font-size:13px; line-height:1.5; text-align:center; text-shadow:2px 2px #171923; }
      .start-roles { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; width:min(100%,calc(100vw - 36px),440px); min-width:0; }
      .start-role { display:flex; min-width:0; min-height:230px; flex-direction:column; align-items:center; justify-content:center; gap:9px; padding:14px 8px; border:2px solid #aaa58f; border-radius:0; background:rgba(30,34,42,.92); box-shadow:4px 4px 0 #000; color:var(--text-primary); font:inherit; text-align:center; cursor:pointer; }
      .start-role[aria-pressed="true"] { border-color:#ffe178; background:rgba(65,64,47,.96); box-shadow:4px 4px 0 #a96e35; }
      .start-avatar { display:block; width:112px; height:136px; border:2px solid #d6c58f; background:rgba(16,21,25,.58); object-fit:contain; image-rendering:pixelated; }
      .start-role-title { font-size:15px; font-weight:bold; }
      .start-role-detail { color:#d7d1c3; font-size:11px; line-height:1.4; }
      .start-enter { width:min(100%,calc(100vw - 36px),440px); min-height:56px; border:3px solid #ffe178; border-radius:0; background:#a94d3d; box-shadow:5px 5px 0 #000; color:#fff4d5; font: bold 19px 'Courier New',monospace; cursor:pointer; }
      .start-enter:disabled { border-color:#777b83; background:#343744; box-shadow:3px 3px 0 #000; color:#bec1c9; cursor:not-allowed; }
      .start-save-menu, .start-new-game { width:min(100%,calc(100vw - 36px),440px); }
      .start-save-menu { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; min-width:0; }
      .start-save-menu[hidden], .start-new-game[hidden], .start-back[hidden] { display:none; }
      .start-save-card { display:flex; min-width:0; min-height:150px; flex-direction:column; align-items:center; justify-content:center; gap:9px; padding:14px 10px; border:2px solid #aaa58f; background:rgba(30,34,42,.94); box-shadow:4px 4px 0 #000; color:var(--text-primary); font:inherit; text-align:center; cursor:pointer; }
      .start-save-card--new { border-color:#d79b53; }
      .start-save-title { font-size:17px; font-weight:bold; color:#ffe38c; }
      .start-save-detail { color:#d7d1c3; font-size:11px; line-height:1.5; }
      .start-back { min-height:44px; margin-top:10px; border:1px solid #aaa58f; background:#343744; color:var(--text-primary); font:inherit; cursor:pointer; }
      .start-overwrite-warning { margin:8px 0 0; color:#f0c679; font-size:11px; line-height:1.5; text-align:center; }
      .start-overwrite-warning[hidden] { display:none; }
      .start-role:active:not([aria-pressed="true"]), .start-enter:active:not(:disabled) { transform:translate(2px,2px); box-shadow:2px 2px 0 #000; }
      .start-save-card:active, .start-back:active { transform:translate(2px,2px); box-shadow:2px 2px 0 #000; }
      .start-footnote { color:#d5d0c3; font-size:10px; text-align:center; text-shadow:1px 1px #111; }
      @media (max-height:720px) { .start-screen { justify-content:flex-start; gap:12px; padding-top:12px; } .start-role { min-height:200px; } .start-avatar { width:78px; height:96px; } }
      @media (max-width:480px) {
        .start-roles, .start-save-menu { grid-template-columns:minmax(0,1fr); gap:8px; }
        .start-role { display:grid; grid-template-columns:80px minmax(0,1fr); grid-template-rows:auto auto; column-gap:12px; row-gap:6px; min-height:112px; justify-content:initial; padding:10px; text-align:left; }
        .start-avatar { grid-column:1; grid-row:1 / 3; width:68px; height:100px; }
        .start-role-title, .start-role-detail { grid-column:2; width:100%; text-align:left; }
        .start-save-card { min-height:110px; }
      }
    </style>
    <header class="start-brand">
      <span class="start-kicker">盘城街区 · 人生开盘</span>
      <h1 class="start-title">韭菜翻身</h1>
      <p class="start-subtitle">选好你的身份，再进盘城讨生活。</p>
    </header>
    ${options.save ? `
      <div class="start-save-menu" role="group" aria-label="选择存档操作">
        <button class="start-save-card" type="button" data-start-choice="continue">
          <span class="start-save-title">重操旧业</span>
          <span class="start-save-detail">第 ${options.save.day} 天<br>现金 ¥${Math.floor(options.save.cash).toLocaleString('zh-CN')} · 负债 ¥${Math.floor(options.save.debt).toLocaleString('zh-CN')}</span>
        </button>
        <button class="start-save-card start-save-card--new" type="button" data-start-choice="new">
          <span class="start-save-title">新生入场</span>
          <span class="start-save-detail">从第 1 天开始<br>重新选择你的身份</span>
        </button>
      </div>
    ` : ''}
    <section class="start-new-game" ${options.save ? 'hidden' : ''} aria-label="新游戏设置">
      <div class="start-roles" role="group" aria-label="选择角色">
        <button class="start-role" type="button" data-gender="MALE" aria-pressed="false">
          <img class="start-avatar start-avatar--rider" src="/art/player-courier-male-v1.png" alt="" aria-hidden="true">
          <span class="start-role-title">男：外卖骑手</span>
          <span class="start-role-detail">精力上限 120<br>初始粉丝 15</span>
        </button>
        <button class="start-role" type="button" data-gender="FEMALE" aria-pressed="false">
          <img class="start-avatar start-avatar--streamer" src="/art/xiaolian-character-v3.png" alt="" aria-hidden="true">
          <span class="start-role-title">女：带货主播</span>
          <span class="start-role-detail">直播收入 +20% · 初始粉丝 30<br>精力上限 100</span>
        </button>
      </div>
      <p class="start-overwrite-warning" ${options.save ? '' : 'hidden'}>新生入场后会覆盖当前单槽自动存档。</p>
      <button class="start-enter" type="button" disabled>${options.save ? '确认新生入场' : '进入盘城'}</button>
      <button class="start-back" type="button" ${options.save ? '' : 'hidden'}>返回存档</button>
    </section>
    <p class="start-footnote">${options.save ? '继续可恢复当前进度；新生入场会覆盖单槽自动存档。' : '虚构故事 · 盘城的规矩还等你慢慢摸清'}</p>
  `;

  const enterButton = screen.querySelector<HTMLButtonElement>('.start-enter')!;
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const roleButton = target.closest<HTMLButtonElement>('[data-gender]');
    if (roleButton) {
      const gender = roleButton.dataset.gender;
      if (gender !== 'MALE' && gender !== 'FEMALE') return;
      selectedGender = gender;
      screen.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button === roleButton));
      });
      enterButton.disabled = false;
      return;
    }
    if (target.closest('[data-start-choice="continue"]')) {
      options.onContinue();
      return;
    }
    if (target.closest('[data-start-choice="new"]')) {
      choosingNewGame = true;
      screen.querySelector<HTMLElement>('.start-save-menu')?.setAttribute('hidden', '');
      screen.querySelector<HTMLElement>('.start-new-game')?.removeAttribute('hidden');
      screen.querySelector<HTMLButtonElement>('.start-back')?.removeAttribute('hidden');
      screen.querySelector<HTMLElement>('.start-overwrite-warning')?.removeAttribute('hidden');
      return;
    }
    if (target.closest('.start-back') && options.save) {
      choosingNewGame = false;
      selectedGender = null;
      screen.querySelector<HTMLElement>('.start-save-menu')?.removeAttribute('hidden');
      screen.querySelector<HTMLElement>('.start-new-game')?.setAttribute('hidden', '');
      screen.querySelector<HTMLElement>('.start-back')?.setAttribute('hidden', '');
      enterButton.disabled = true;
      return;
    }
    if (target.closest('.start-enter') && selectedGender) {
      if (choosingNewGame) options.onStartNewGame(selectedGender);
      else dispatch({ type: 'SELECT_CHARACTER', gender: selectedGender });
    }
  });
  return screen;
}
