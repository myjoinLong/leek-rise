import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { entries, escapeHtml, type EntryId, type HubEntry, sprite } from './DaytimeHubEntries';
import { dialogueForEntry } from './npcReturnDialogue';
import { playNpcIdlePerformance } from './npcIdlePerformance';
export function createDaytimeScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  let state = initialState;
  let activeNpc: EntryId | null = null;
  const screen = document.createElement('main');
  screen.className = 'dt-screen scene-screen';
  screen.innerHTML = [
    '<style>',
    '.dt-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f8efd5;font-family:"Courier New",monospace;container-type:size}',
    '.dt-screen.scene-screen::before{display:none}',
    '.dt-world-plane{position:absolute;top:50%;left:50%;z-index:1;width:max(100cqw,66.666667cqh);height:max(100cqh,150cqw);transform:translate(-50%,-50%)}',
    '.dt-world{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}',
    '.dt-market-light{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0}',
    '.dt-screen[data-market-mood="profit"] .dt-market-light{background:radial-gradient(ellipse at 50% 57%,rgba(232,93,74,.62),transparent 72%);opacity:.3}',
    '.dt-screen[data-market-mood="loss"] .dt-market-light{background:radial-gradient(ellipse at 50% 57%,rgba(63,184,122,.56),transparent 72%);opacity:.3}',
    '.dt-hud{position:absolute;z-index:3;top:var(--safe-top);right:10px;left:10px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:5px 10px;padding:8px 10px;border:2px solid #c1aa73;background:rgba(25,29,32,.88);box-shadow:3px 3px 0 #000;font-size:11px}',
    '.dt-crisis{width:100%;color:#ffd07a;font-weight:bold}',
    '.dt-title{width:100%;color:#ffe28a;font-size:16px}.dt-map{position:absolute;inset:0;z-index:2;pointer-events:none}',
    '.dt-hotspot{position:absolute;display:flex;width:60px;height:72px;min-height:72px;flex-direction:column;align-items:center;justify-content:flex-end;padding:0;transform:translate(-50%,-100%);border:0;background:transparent;color:#fff4d3;font:inherit;text-align:center;text-shadow:2px 2px #171717;cursor:pointer;pointer-events:auto}',
    '.dt-hotspot:focus-visible{outline:2px solid #ffe178;outline-offset:1px}.dt-hotspot:active{transform:translate(-50%,calc(-100% + 2px))}.dt-hotspot:disabled{cursor:default;opacity:.82}',
    '.dt-hotspot[data-entry="longge"]{width:64px;height:104px}',
    '.dt-hotspot[data-entry="jiuge"]{width:64px;height:104px;pointer-events:none}',
    '.dt-hotspot[data-entry="jiuge"] .dt-person,.dt-hotspot[data-entry="jiuge"] .dt-prompt{pointer-events:auto}',
    '.dt-hotspot[data-entry="zheng"]{width:64px;height:104px;pointer-events:none}',
    '.dt-hotspot[data-entry="zheng"] .dt-person,.dt-hotspot[data-entry="zheng"] .dt-prompt{pointer-events:auto}',
    '@media(max-height:600px){.dt-hotspot[data-entry="chen"]{translate:0 44px}.dt-hotspot[data-entry="zhou"]{translate:-28px 0}.dt-hotspot[data-entry="laoliang"]{translate:0 -20px}}',
    '@media(max-width:420px) and (min-height:601px){.dt-hotspot[data-entry="phoneflip"]{translate:0 -6px}}',
    '.dt-prompt{position:absolute;top:0;left:50%;display:grid;width:max-content;min-width:20px;max-width:72px;height:22px;place-items:center;padding:0 4px;transform:translateX(-50%);border:2px solid #28241d;background:#f3dfa5;box-shadow:2px 2px #000;color:#302a21;font-size:10px;font-weight:bold;line-height:1;text-shadow:none;white-space:nowrap}',
    '.dt-prompt::after{position:absolute;bottom:-5px;left:calc(50% - 4px);width:6px;height:6px;transform:rotate(45deg);border-right:2px solid #28241d;border-bottom:2px solid #28241d;background:#f3dfa5;content:""}',
    '.dt-person{display:block;width:var(--sprite-width,48px);height:var(--sprite-height,48px);flex:none;margin:0 0 2px;transform:scale(var(--depth-scale,1));transform-origin:bottom center;background-image:var(--sprite-src,url(/art/pancheng-npc-atlas-v1.webp));background-repeat:no-repeat;background-size:var(--sprite-size,400% 400%);background-position:var(--sprite-pos,var(--sprite-x) var(--sprite-y));filter:drop-shadow(2px 2px 0 #151515);image-rendering:pixelated}',
    '.dt-ground-shadow{display:block;width:var(--shadow-width,22px);height:5px;flex:none;margin:-5px 0 0;border-radius:50%;background:rgba(12,11,10,.76);box-shadow:2px 1px 0 rgba(12,11,10,.8);transform:scaleX(var(--depth-scale,1))}',
    '.dt-avatar .dt-person{width:40px;height:40px;margin:0;transform:none;filter:none}',
    '.dt-avatar .dt-ground-shadow{display:none}',
    '.dt-place{display:none}.dt-person-name{position:absolute;top:calc(100% - 1px);left:50%;display:block;max-width:92px;padding:2px 4px;transform:translateX(-50%);border:1px solid rgba(193,170,115,.9);background:rgba(25,24,21,.92);box-shadow:1px 1px #000;color:#fff2cc;font-size:9px;font-weight:bold;line-height:1.2;text-align:center;white-space:nowrap;pointer-events:none}',
    '.dt-gate{position:absolute;top:20%;left:84%;z-index:2;min-width:62px;min-height:58px;padding:5px;transform:translate(-50%,-50%);border:3px solid #ffdc67;background:rgba(154,49,39,.88);box-shadow:4px 4px #000;color:#fff0bd;font-size:11px;font-weight:bold;cursor:pointer;pointer-events:auto}',
    '.dt-gate:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.dt-hint{position:absolute;z-index:3;right:10px;bottom:calc(var(--safe-bottom) + 6px);left:10px;padding:6px;border:1px solid rgba(230,211,155,.75);background:rgba(25,24,21,.82);color:#fff0c8;font-size:10px;text-align:center}',
    '.dt-modal{position:absolute;z-index:8;inset:0;display:flex;align-items:flex-end;justify-content:center;overflow-y:auto;overscroll-behavior:contain;padding:12px 10px calc(var(--safe-bottom) + 12px);pointer-events:none}',
    '.dt-modal[hidden],.dt-toast[hidden]{display:none}.dt-dialog{box-sizing:border-box;display:flex;width:100%;max-width:440px;max-height:calc(100vh - var(--safe-top) - var(--safe-bottom) - 24px);max-height:calc(100dvh - var(--safe-top) - var(--safe-bottom) - 24px);flex-direction:column;overflow:hidden;padding:12px;border:3px solid #e2ca8a;background:rgba(35,37,43,.98);box-shadow:5px 5px 0 #000;pointer-events:auto}',
    '.dt-dialog-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;color:#ffe28a;font-size:15px}',
    '.dt-avatar{display:grid;width:46px;height:46px;flex:none;place-items:center;border:2px solid #d8c791;background:#51483c;color:#ffe28a;font-size:15px;font-weight:bold}',
    '.dt-dialog-copy{flex:0 1 auto;max-height:220px;max-height:min(38vh,220px);max-height:min(38dvh,220px);min-height:42px;overflow-y:auto;overscroll-behavior:contain;margin-bottom:10px;color:#e4dfd0;font-size:12px;line-height:1.55;white-space:pre-line}.dt-dialog-actions{display:flex;flex:none;gap:8px}',
    '.dt-dialog-button{min-height:44px;border:2px solid #88816e;border-radius:0;background:#414550;color:#fff;font:bold 12px "Courier New",monospace;cursor:pointer}',
    '.dt-dialog-button:first-child{flex:1;border-color:#e4a45e;background:#814936}.dt-dialog-button:last-child{min-width:82px}.dt-dialog-button:disabled{opacity:.55;cursor:not-allowed}',
    '.dt-toast{position:absolute;z-index:9;top:calc(var(--safe-top) + 86px);left:50%;padding:8px 12px;transform:translateX(-50%);border:2px solid #ffe178;background:#292d31;box-shadow:3px 3px 0 #000;color:#a9ef8b;font-size:15px;font-weight:bold;white-space:nowrap}',
    '</style>',
    '<div class="dt-world-plane"><img class="dt-world" src="/art/pancheng-district-pixel-v1.webp" alt="盘城像素街区全景：街道、店铺与交易所" draggable="false"><div class="dt-market-light" aria-hidden="true"></div>',
    '<section class="dt-map" aria-label="盘城街区人物与入口">',
    entries.map((entry) => '<button class="dt-hotspot" type="button" data-entry="' + entry.id + '" aria-haspopup="dialog" aria-controls="dt-dialog" aria-expanded="false" aria-label="' + escapeHtml(entry.name + '，' + entry.place) + '" style="left:clamp(calc(50% - 50cqw + 32px),' + entry.x + '%,calc(50% + 50cqw - 32px));top:clamp(calc(50% - 50cqh + 32px),' + entry.y + '%,calc(50% + 50cqh - 32px));z-index:' + Math.round(entry.y * 10) + ';--depth-scale:' + (0.9 + entry.y / 500).toFixed(2) + '">' +
      '<span class="dt-prompt" aria-hidden="true">' + entry.prompt + '</span>' + sprite(entry.id, entry.palette) +
      '<span class="dt-place">' + escapeHtml(entry.place) + '</span><span class="dt-person-name">' + escapeHtml(entry.name) + '</span></button>').join(''),
    '<button class="dt-gate" type="button" data-entry="exchange" aria-label="进入交易所" style="left:clamp(calc(50% - 50cqw + 36px),84%,calc(50% + 50cqw - 36px));top:clamp(calc(50% - 50cqh + 36px),20%,calc(50% + 50cqh - 36px))">交易所<br>开市中 ›</button>',
    '</section></div>',
    '<header class="dt-hud"><h1 class="dt-title"></h1><span class="dt-stat dt-cash"></span><span class="dt-stat dt-energy"></span><span class="dt-stat dt-leech"></span><span class="dt-crisis" hidden></span></header>',
    '<p class="dt-hint">沿街探索 · 点击人物头上的提示或地点入口</p>',
    '<div class="dt-modal" hidden><section id="dt-dialog" class="dt-dialog" role="dialog" aria-modal="false" aria-labelledby="dt-npc-name">',
    '<div class="dt-dialog-head"><span class="dt-avatar" aria-hidden="true">人</span><strong id="dt-npc-name"></strong></div>',
    '<p class="dt-dialog-copy"></p><div class="dt-dialog-actions"><button class="dt-dialog-button dt-primary" type="button"></button><button class="dt-dialog-button" type="button" data-action="close">离开</button></div></section></div>',
    '<div class="dt-toast" role="status" aria-live="polite" hidden></div>',
  ].join('');
  const modal = screen.querySelector<HTMLElement>('.dt-modal')!;
  const npcName = screen.querySelector<HTMLElement>('#dt-npc-name')!;
  const npcAvatar = screen.querySelector<HTMLElement>('.dt-avatar')!;
  const npcCopy = screen.querySelector<HTMLElement>('.dt-dialog-copy')!;
  const primaryButton = screen.querySelector<HTMLButtonElement>('.dt-primary')!;
  const closeButton = screen.querySelector<HTMLButtonElement>('[data-action="close"]')!;
  const toast = screen.querySelector<HTMLElement>('.dt-toast')!;
  let activeTrigger: HTMLButtonElement | null = null;
  let dialogueAnimation: Animation | null = null;
  const idleAnimations: Animation[] = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stopIdleMotion = (): void => {
    idleAnimations.forEach((animation) => animation.cancel());
    idleAnimations.length = 0;
  };
  const syncIdleMotion = (): void => {
    if (reducedMotion.matches) {
      stopIdleMotion();
      dialogueAnimation?.cancel();
      dialogueAnimation = null;
      return;
    }
    if (idleAnimations.length > 0) return;

    const slowDuration = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-slow')) || 280;
    screen.querySelectorAll<HTMLElement>('.dt-map .dt-person').forEach((person, index) => {
      const depthScale = person.parentElement?.style.getPropertyValue('--depth-scale').trim() || '1';
      const npcId = person.dataset.npc;
      const entry = entries.find((candidate) => candidate.id === npcId);
      if (!entry) return;
      const animation = playNpcIdlePerformance(person, entry.id, depthScale, slowDuration, index);
      if (document.visibilityState === 'hidden') animation.pause();
      idleAnimations.push(animation);
    });
  };
  const syncIdleVisibility = (): void => {
    idleAnimations.forEach((animation) => {
      if (document.visibilityState === 'hidden') animation.pause();
      else animation.play();
    });
  };
  const screenObserver = new MutationObserver(() => {
    if (screen.isConnected) return;
    stopIdleMotion();
    dialogueAnimation?.cancel();
    dialogueAnimation = null;
    screenObserver.disconnect();
    reducedMotion.removeEventListener('change', syncIdleMotion);
    document.removeEventListener('visibilitychange', syncIdleVisibility);
  });
  const render = (): void => {
    const portfolioValue = Object.values(state.stocks).reduce(
      (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
      0,
    );
    const dailyEquityChange = state.cash + portfolioValue - state.debt - state.dayStartEquity;
    screen.dataset.marketMood = dailyEquityChange > 0.005 ? 'profit' : dailyEquityChange < -0.005 ? 'loss' : 'neutral';
    screen.querySelector<HTMLElement>('.dt-title')!.textContent = '第 ' + state.day + ' 天 · 盘城街区';
    screen.querySelector<HTMLElement>('.dt-cash')!.textContent = '现金 ¥' + state.cash.toLocaleString();
    screen.querySelector<HTMLElement>('.dt-energy')!.textContent = '精力 ' + state.energy + '/' + state.energyMax;
    screen.querySelector<HTMLElement>('.dt-leech')!.textContent = '韭性 ' + state.leechLevel;
    const crisisNotice = screen.querySelector<HTMLElement>('.dt-crisis')!;
    crisisNotice.hidden = !state.debtCrisisStarted;
    crisisNotice.textContent = state.debtCrisisStarted ? '⚠ 已进入债务危机阶段 · 保留存档，仍可继续经营' : '';
    entries.forEach((entry) => {
      const node = screen.querySelector<HTMLButtonElement>('[data-entry="' + entry.id + '"]');
      if (!node) return;
      const presentation = entry.getPresentation(state);
      node.disabled = presentation.nodeDisabled;
      node.setAttribute('aria-label', entry.name + '，' + entry.place + '，' + presentation.label + '，' + presentation.prompt + '，点击查看对话');
      node.querySelector<HTMLElement>('.dt-prompt')!.textContent = presentation.prompt;
      node.querySelector<HTMLElement>('.dt-person-name')!.textContent = entry.name;
    });
    const activeEntry = entries.find((entry) => entry.id === activeNpc);
    primaryButton.hidden = !activeEntry;
    if (activeEntry) {
      const presentation = activeEntry.getPresentation(state);
      primaryButton.textContent = presentation.primaryLabel;
      primaryButton.disabled = presentation.primaryDisabled;
      npcCopy.textContent = dialogueForEntry(activeEntry, state);
    }
  };
  const closeDialogue = (): void => {
    dialogueAnimation?.cancel();
    dialogueAnimation = null;
    modal.hidden = true;
    activeTrigger?.setAttribute('aria-expanded', 'false');
    activeNpc = null;
    render();
    if (activeTrigger?.isConnected) activeTrigger.focus({ preventScroll: true });
    activeTrigger = null;
  };
  const openDialogue = (entry: HubEntry): void => {
    activeTrigger?.setAttribute('aria-expanded', 'false');
    activeTrigger = screen.querySelector<HTMLButtonElement>('[data-entry="' + entry.id + '"]');
    activeTrigger?.setAttribute('aria-expanded', 'true');
    activeNpc = entry.id;
    npcName.textContent = entry.name + ' · ' + entry.place;
    npcAvatar.innerHTML = sprite(entry.id, entry.palette);
    modal.hidden = false;
    render();
    if (!reducedMotion.matches) {
      dialogueAnimation?.cancel();
      const duration = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-base')) || 200;
      dialogueAnimation = modal.querySelector<HTMLElement>('.dt-dialog')!.animate([
        { opacity: 0, transform: 'translateY(12px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration, easing: 'steps(6, end)', fill: 'both' });
    }
    (primaryButton.disabled ? closeButton : primaryButton).focus({ preventScroll: true });
  };
  const bindEvents = (): void => {
    screen.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !modal.hidden) {
        event.preventDefault();
        closeDialogue();
      }
    });
    screen.addEventListener('click', (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const entryId = target.closest<HTMLElement>('[data-entry]')?.dataset.entry;
      if (entryId === 'exchange') {
        dispatch({ type: 'ADVANCE_PHASE' });
        return;
      }
      const entry = entries.find((candidate) => candidate.id === entryId);
      if (entry) {
        openDialogue(entry);
        return;
      }
      const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'close') {
        closeDialogue();
        return;
      }
      if (!target.closest('.dt-primary') || !activeNpc) return;
      const activeEntry = entries.find((candidate) => candidate.id === activeNpc);
      if (!activeEntry) return;
      const presentation = activeEntry.getPresentation(state);
      if (!presentation.primaryAction || presentation.primaryDisabled) {
        toast.textContent = '该入口当前不可进入';
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 1500);
        return;
      }
      if (presentation.primaryAction.type === 'BORROW_FROM_NPC') {
        const previousLeech = state.leechLevel;
        state = dispatch(presentation.primaryAction);
        closeDialogue();
        if (state.leechLevel < previousLeech) {
          toast.textContent = '借款 +¥1,000 · 韭性 -10';
          toast.hidden = false;
          window.setTimeout(() => { toast.hidden = true; }, 1500);
        }
        return;
      }
      state = dispatch(presentation.primaryAction);
    });
  };
  bindEvents();
  render();
  reducedMotion.addEventListener('change', syncIdleMotion);
  document.addEventListener('visibilitychange', syncIdleVisibility);
  screenObserver.observe(document.body, { childList: true, subtree: true });
  syncIdleMotion();
  return screen;
}
