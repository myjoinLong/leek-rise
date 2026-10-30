import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { entries, escapeHtml, type EntryId, type HubEntry, sprite } from './DaytimeHubEntries';
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
    '.dt-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f8efd5;font-family:"Courier New",monospace}',
    '.dt-screen.scene-screen::before{display:none}',
    '.dt-world{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;image-rendering:pixelated}',
    '.dt-hud{position:absolute;z-index:3;top:var(--safe-top);right:10px;left:10px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:5px 10px;padding:8px 10px;border:2px solid #c1aa73;background:rgba(25,29,32,.88);box-shadow:3px 3px 0 #000;font-size:11px}',
    '.dt-crisis{width:100%;color:#ffd07a;font-weight:bold}',
    '.dt-title{width:100%;color:#ffe28a;font-size:16px}.dt-map{position:absolute;inset:0;z-index:2;pointer-events:none}',
    '.dt-hotspot{position:absolute;display:flex;width:76px;min-height:88px;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px;padding:5px 2px;transform:translate(-50%,-50%);border:0;background:transparent;color:#fff4d3;font:inherit;text-align:center;text-shadow:2px 2px #171717;cursor:pointer;pointer-events:auto}',
    '.dt-hotspot:focus-visible{outline:2px solid #ffe178;outline-offset:1px}.dt-hotspot:active{transform:translate(-50%,calc(-50% + 2px))}.dt-hotspot:disabled{cursor:default;opacity:.82}',
    '.dt-prompt{position:absolute;top:0;left:50%;min-width:24px;padding:2px 5px;transform:translateX(-50%);border:2px solid #28241d;background:#f3dfa5;box-shadow:2px 2px #000;color:#302a21;font-size:11px;font-weight:bold;line-height:1.1;text-shadow:none}',
    '.dt-prompt::after{position:absolute;bottom:-5px;left:calc(50% - 4px);width:6px;height:6px;transform:rotate(45deg);border-right:2px solid #28241d;border-bottom:2px solid #28241d;background:#f3dfa5;content:""}',
    '.dt-person{width:32px;height:44px;margin-top:18px;filter:drop-shadow(2px 2px 0 #151515);image-rendering:pixelated;shape-rendering:crispEdges}',
    '.dt-hair{fill:var(--hair)}.dt-shirt{fill:var(--shirt)}.dt-pants{fill:var(--pants)}',
    '.dt-place{max-width:76px;padding:2px 4px;background:rgba(25,24,21,.78);color:#fff2cc;font-size:9px;font-weight:bold;white-space:nowrap}',
    '.dt-gate{position:absolute;top:20%;left:84%;z-index:2;min-width:62px;min-height:58px;padding:5px;transform:translate(-50%,-50%);border:3px solid #ffdc67;background:rgba(154,49,39,.88);box-shadow:4px 4px #000;color:#fff0bd;font-size:11px;font-weight:bold;cursor:pointer;pointer-events:auto}',
    '.dt-gate:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.dt-hint{position:absolute;z-index:3;right:10px;bottom:calc(var(--safe-bottom) + 6px);left:10px;padding:6px;border:1px solid rgba(230,211,155,.75);background:rgba(25,24,21,.82);color:#fff0c8;font-size:10px;text-align:center}',
    '.dt-modal{position:absolute;z-index:8;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:12px 10px calc(var(--safe-bottom) + 12px);pointer-events:none}',
    '.dt-modal[hidden],.dt-toast[hidden]{display:none}.dt-dialog{width:100%;max-width:440px;padding:12px;border:3px solid #e2ca8a;background:rgba(35,37,43,.98);box-shadow:5px 5px 0 #000;pointer-events:auto}',
    '.dt-dialog-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;color:#ffe28a;font-size:15px}',
    '.dt-avatar{display:grid;width:46px;height:46px;flex:none;place-items:center;border:2px solid #d8c791;background:#51483c;color:#ffe28a;font-size:15px;font-weight:bold}',
    '.dt-dialog-copy{min-height:42px;margin-bottom:10px;color:#e4dfd0;font-size:12px;line-height:1.55}.dt-dialog-actions{display:flex;gap:8px}',
    '.dt-dialog-button{min-height:44px;border:2px solid #88816e;border-radius:0;background:#414550;color:#fff;font:bold 12px "Courier New",monospace;cursor:pointer}',
    '.dt-dialog-button:first-child{flex:1;border-color:#e4a45e;background:#814936}.dt-dialog-button:last-child{min-width:82px}.dt-dialog-button:disabled{opacity:.55;cursor:not-allowed}',
    '.dt-toast{position:absolute;z-index:9;top:calc(var(--safe-top) + 86px);left:50%;padding:8px 12px;transform:translateX(-50%);border:2px solid #ffe178;background:#292d31;box-shadow:3px 3px 0 #000;color:#a9ef8b;font-size:15px;font-weight:bold;white-space:nowrap}',
    '@media(max-height:680px){.dt-hotspot{transform:translate(-50%,-50%) scale(.82)}}',
    '</style>',
    '<img class="dt-world" src="/art/pancheng-district-pixel-v1.png" alt="盘城像素街区全景：街道、店铺与交易所" draggable="false">',
    '<header class="dt-hud"><h1 class="dt-title"></h1><span class="dt-stat dt-cash"></span><span class="dt-stat dt-energy"></span><span class="dt-stat dt-leech"></span><span class="dt-crisis" hidden></span></header>',
    '<section class="dt-map" aria-label="盘城街区人物与入口">',
    entries.map((entry) => '<button class="dt-hotspot" type="button" data-entry="' + entry.id + '" aria-label="' + escapeHtml(entry.name + '，' + entry.place) + '" style="left:' + entry.x + '%;top:' + entry.y + '%">' +
      '<span class="dt-prompt" aria-hidden="true">' + entry.prompt + '</span>' + sprite(entry.palette) +
      '<span class="dt-place">' + escapeHtml(entry.place) + '</span><span class="dt-person-name">' + escapeHtml(entry.name) + '</span></button>').join(''),
    '<button class="dt-gate" type="button" data-entry="exchange" aria-label="进入交易所">交易所<br>开市中 ›</button>',
    '</section><p class="dt-hint">沿街探索 · 点击人物头上的提示或地点入口</p>',
    '<div class="dt-modal" hidden><section class="dt-dialog" role="dialog" aria-modal="false" aria-labelledby="dt-npc-name">',
    '<div class="dt-dialog-head"><span class="dt-avatar" aria-hidden="true">人</span><strong id="dt-npc-name"></strong></div>',
    '<p class="dt-dialog-copy"></p><div class="dt-dialog-actions"><button class="dt-dialog-button dt-primary" type="button"></button><button class="dt-dialog-button" type="button" data-action="close">离开</button></div></section></div>',
    '<div class="dt-toast" role="status" aria-live="polite" hidden></div>',
  ].join('');
  const modal = screen.querySelector<HTMLElement>('.dt-modal')!;
  const npcName = screen.querySelector<HTMLElement>('#dt-npc-name')!;
  const npcAvatar = screen.querySelector<HTMLElement>('.dt-avatar')!;
  const npcCopy = screen.querySelector<HTMLElement>('.dt-dialog-copy')!;
  const primaryButton = screen.querySelector<HTMLButtonElement>('.dt-primary')!;
  const toast = screen.querySelector<HTMLElement>('.dt-toast')!;
  const render = (): void => {
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
      node.querySelector<HTMLElement>('.dt-prompt')!.textContent = presentation.prompt;
      node.querySelector<HTMLElement>('.dt-person-name')!.textContent = presentation.label;
    });
    const activeEntry = entries.find((entry) => entry.id === activeNpc);
    primaryButton.hidden = !activeEntry;
    if (activeEntry) {
      const presentation = activeEntry.getPresentation(state);
      primaryButton.textContent = presentation.primaryLabel;
      primaryButton.disabled = presentation.primaryDisabled;
      npcCopy.textContent = activeEntry.getDialogue?.(state) ?? activeEntry.line;
    }
  };
  const closeDialogue = (): void => {
    modal.hidden = true;
    activeNpc = null;
    render();
  };
  const openDialogue = (entry: HubEntry): void => {
    activeNpc = entry.id;
    npcName.textContent = entry.name + ' · ' + entry.place;
    npcAvatar.textContent = entry.name.slice(0, 1);
    modal.hidden = false;
    render();
  };
  const bindEvents = (): void => {
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
  return screen;
}
