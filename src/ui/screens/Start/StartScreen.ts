import type { GameAction } from '../../../core/reducer';
import type { PlayerGender } from '../../../core/types';

export function createStartScreen(dispatch: (action: GameAction) => void): HTMLElement {
  let selectedGender: PlayerGender | null = null;
  const screen = document.createElement('main');
  screen.className = 'start-screen scene-screen';
  screen.innerHTML = `
    <style>
      .start-screen { box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(14px,3vh,24px); width:100%; min-height:100vh; min-height:100dvh; padding:24px 18px; color:var(--text-primary); font-family:'Courier New',monospace; }
      .start-brand { display:flex; flex-direction:column; align-items:center; gap:10px; width:min(100%,440px); }
      .start-kicker { padding:5px 10px; border:1px solid #e5c978; background:rgba(24,27,32,.82); color:#f4d88a; font-size:11px; letter-spacing:3px; }
      .start-title { padding:12px 18px; border:3px solid #f4cc63; background:rgba(42,36,48,.94); box-shadow:6px 6px 0 #000; color:#ffe38c; font-size:clamp(32px,10vw,52px); line-height:1.15; text-align:center; text-shadow:3px 3px #7b382d; }
      .start-subtitle { padding:0 8px; color:#f1eadc; font-size:13px; line-height:1.5; text-align:center; text-shadow:2px 2px #171923; }
      .start-roles { display:grid; grid-template-columns:1fr 1fr; gap:12px; width:min(100%,440px); }
      .start-role { display:flex; min-height:230px; flex-direction:column; align-items:center; justify-content:center; gap:9px; padding:14px 8px; border:2px solid #aaa58f; border-radius:0; background:rgba(30,34,42,.92); box-shadow:4px 4px 0 #000; color:var(--text-primary); font:inherit; text-align:center; cursor:pointer; }
      .start-role[aria-pressed="true"] { border-color:#ffe178; background:rgba(65,64,47,.96); box-shadow:4px 4px 0 #a96e35; }
      .start-avatar { display:block; width:104px; aspect-ratio:1; border:2px solid #d6c58f; background-image:url('/art/pancheng-characters.png'); background-repeat:no-repeat; background-size:400% 200%; image-rendering:pixelated; }
      .start-avatar--rider { background-position:0 0; }
      .start-avatar--streamer { background-position:33.333% 0; }
      .start-role-title { font-size:15px; font-weight:bold; }
      .start-role-detail { color:#d7d1c3; font-size:11px; line-height:1.4; }
      .start-enter { width:min(100%,440px); min-height:56px; border:3px solid #ffe178; border-radius:0; background:#a94d3d; box-shadow:5px 5px 0 #000; color:#fff4d5; font: bold 19px 'Courier New',monospace; cursor:pointer; }
      .start-enter:disabled { border-color:#777b83; background:#343744; box-shadow:3px 3px 0 #000; color:#bec1c9; cursor:not-allowed; }
      .start-role:active:not([aria-pressed="true"]), .start-enter:active:not(:disabled) { transform:translate(2px,2px); box-shadow:2px 2px 0 #000; }
      .start-footnote { color:#d5d0c3; font-size:10px; text-align:center; text-shadow:1px 1px #111; }
      @media (max-height:720px) { .start-screen { justify-content:flex-start; gap:12px; padding-top:12px; } .start-role { min-height:200px; } .start-avatar { width:78px; } }
    </style>
    <header class="start-brand">
      <span class="start-kicker">盘城街区 · 人生开盘</span>
      <h1 class="start-title">韭菜翻身</h1>
      <p class="start-subtitle">选好你的身份，再进盘城讨生活。</p>
    </header>
    <div class="start-roles" role="group" aria-label="选择角色">
      <button class="start-role" type="button" data-gender="MALE" aria-pressed="false">
        <span class="start-avatar start-avatar--rider" aria-hidden="true"></span>
        <span class="start-role-title">男：外卖骑手</span>
        <span class="start-role-detail">精力上限 120<br>初始粉丝 15</span>
      </button>
      <button class="start-role" type="button" data-gender="FEMALE" aria-pressed="false">
        <span class="start-avatar start-avatar--streamer" aria-hidden="true"></span>
        <span class="start-role-title">女：带货主播</span>
        <span class="start-role-detail">直播收入 +20% · 初始粉丝 30<br>精力上限 100</span>
      </button>
    </div>
    <button class="start-enter" type="button" disabled>进入盘城</button>
    <p class="start-footnote">虚构故事 · 盘城的规矩还等你慢慢摸清</p>
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
    if (target.closest('.start-enter') && selectedGender) {
      dispatch({ type: 'SELECT_CHARACTER', gender: selectedGender });
    }
  });
  return screen;
}
