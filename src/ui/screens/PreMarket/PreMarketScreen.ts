import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';

export function createPreMarketScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const screen = document.createElement('main');
  screen.className = 'pm-screen scene-screen';
  screen.innerHTML = `
    <style>
      .pm-screen { box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; width:100%; min-height:100vh; min-height:100dvh; max-width:480px; margin:0 auto; padding:var(--sp-4); color:var(--text-primary); font-family:var(--font-sans); }
      .pm-topline { display:flex; justify-content:space-between; padding:8px 10px; border:2px solid #a58c61; background:rgba(23,26,32,.88); box-shadow:3px 3px #000; color:#e8d7a8; font-size:11px; letter-spacing:1px; }
      .pm-content { width:100%; margin:auto 0; padding:clamp(18px,5vw,28px); border:3px solid #b69a68; background:rgba(25,28,34,.92); box-shadow:6px 6px #000; }
      .pm-label { display:inline-block; margin-bottom:14px; padding:5px 8px; border:1px solid #b88e54; background:#463b30; color:#f5cf86; font-size:11px; }
      .pm-title { margin-bottom:var(--sp-4); color:#ffe28a; font-size:var(--fs-title); }
      .pm-message-card { display:flex; align-items:flex-start; gap:12px; padding:12px; border:2px solid #4b5260; background:#222630; }
      .pm-chat-avatar { display:grid; width:42px; height:42px; flex:none; place-items:center; border:2px solid #a48a60; background:#594533; color:#ffe28a; font-size:15px; font-weight:bold; }
      .pm-message { padding-top:2px; color:#e1dfd5; font-size:var(--fs-body); line-height:1.7; }
      .pm-foot { margin-top:16px; color:#9ba1ac; font-size:11px; line-height:1.5; }
      .pm-button { width:100%; min-height:54px; margin-bottom:var(--safe-bottom); color:#fff4d5; background:#9e4939; border:3px solid #f3d477; box-shadow:4px 4px #000; border-radius:0; font:bold 16px var(--font-sans); cursor:pointer; }
      .pm-button:active { transform:translate(2px,2px); box-shadow:2px 2px #000; }
    </style>
    <header class="pm-topline"><span>盘城 · 群聊动态</span><span>第 ${state.day} 天</span></header>
    <section class="pm-content">
      <span class="pm-label">未读消息 · 今早</span>
      <h1 class="pm-title"></h1>
      <article class="pm-message-card"><span class="pm-chat-avatar" aria-hidden="true">群</span><p class="pm-message"></p></article>
      <p class="pm-foot">${state.debtCrisisStarted ? '九哥已启动债务危机协商；存档保留，今天仍可继续经营与还款。' : '消息先放一边。今天的生活，还得从街区里找出路。'}</p>
    </section>
    <button class="pm-button" type="button">去街区看看 &gt;</button>
  `;
  screen.querySelector<HTMLElement>('.pm-title')!.textContent = `第 ${state.day} 天 · 早盘`;
  screen.querySelector<HTMLElement>('.pm-message')!.textContent = state.npcMessage;
  screen.querySelector<HTMLButtonElement>('.pm-button')!.addEventListener('click', () => {
    dispatch({ type: 'ADVANCE_PHASE' });
  });
  return screen;
}
