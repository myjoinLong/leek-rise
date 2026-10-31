import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { longgeScenarioForRun } from '../../../core/systems/longgeChatScenarios';
import { isLonggeConclusion, renderLonggeConclusion, renderLonggeResult, renderLonggeStep } from './LonggeChatContent';

export function createLonggeChatScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const screen = document.createElement('main');
  screen.className = 'lc-screen';
  screen.innerHTML = [
    '<style>',
    '.lc-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f8efd5;font-family:"Courier New",monospace;background:#1c2327}',
    '.lc-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 76%;image-rendering:pixelated;opacity:.78}',
    '.lc-screen::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,21,25,.08),rgba(16,21,25,.32) 35%,rgba(16,21,25,.82));content:""}',
    '.lc-host{position:absolute;z-index:1;top:27%;right:12%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:1px solid #c2a86b;background:rgba(26,31,34,.9);box-shadow:3px 3px #000;color:#fff0c5;font-size:9px;pointer-events:none}.lc-host-sprite{display:block;width:58px;height:72px;background:url("/art/longge-character-v4.png") center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.lc-header{position:absolute;z-index:1;top:var(--safe-top);right:12px;left:12px;padding:12px;border:2px solid #c2a86b;background:rgba(26,31,34,.94);box-shadow:4px 4px #000}',
    '.lc-kicker{margin:0 0 5px;color:#f0bd63;font-size:10px;letter-spacing:1px}.lc-title{margin:0;color:#fff0c5;font-size:19px}.lc-stats{margin:7px 0 0;color:#d8d1bc;font-size:11px}',
    '.lc-content{position:absolute;z-index:2;right:12px;bottom:calc(var(--safe-bottom) + 12px);left:12px;max-height:calc(100% - var(--safe-top) - 120px);overflow-y:auto}.lc-panel{padding:12px;border:3px solid #d8bd78;background:rgba(30,34,36,.98);box-shadow:5px 5px #000}',
    '.lc-progress{margin:0 0 8px;color:#f2c86f;font-size:11px}.lc-message{padding:9px;border-left:3px solid #db9d53;background:#34383a;color:#f5e9c6;font-size:12px;line-height:1.5}.lc-message p{margin:4px 0 0;color:#ded8c9}',
    '.lc-scenario{display:flex;align-items:center;gap:7px;margin:0 0 8px;padding:6px 8px;border:1px solid #9d7b46;background:#292e30;color:#fff0c5;font-size:10px}.lc-scenario span{flex:none;color:#f0bd63}.lc-scenario strong{font-size:11px}',
    '.lc-npc-reaction{display:flex;align-items:flex-start;gap:8px;margin-top:8px;padding:7px;border:1px solid #78694d;background:#292f31;color:#e8dfca;font-size:10px;line-height:1.45}.lc-npc-mark{display:grid;width:24px;height:24px;flex:none;place-items:center;border:1px solid #bb9d5d;background:#5a4030;color:#f5d480;font-weight:bold}.lc-npc-reaction p{margin:0}.lc-npc-reaction strong{color:#f0cf7b}',
    '.lc-panel h2{margin:11px 0 8px;font-size:14px;color:#fff1ca}.lc-options{display:flex;flex-direction:column;gap:7px}.lc-option{display:flex;min-height:54px;flex-direction:column;justify-content:center;gap:3px;padding:7px 9px;border:2px solid #9e8d62;border-radius:0;background:#41474a;box-shadow:2px 2px #000;color:#fff0c7;text-align:left;font:inherit;cursor:pointer}.lc-option span{color:#d5ceba;font-size:10px}.lc-option:active,.lc-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.lc-option:focus-visible,.lc-return:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}.lc-evidence{display:flex;flex-direction:column;gap:4px;margin:8px 0 0;padding:0;list-style:none;color:#d7d0be;font-size:10px;line-height:1.4}.lc-evidence li{padding:4px 6px;border-left:2px solid #97865f;background:#2a2f31}.lc-abandon{min-height:44px;margin-top:8px;padding:5px 8px;border:1px solid #756d58;background:transparent;color:#bdb8ab;font:10px "Courier New",monospace;cursor:pointer}',
    '.lc-result h2{font-size:18px}.lc-verdict{margin:7px 0;padding:7px;border:1px solid #a9955f;background:#292f30;color:#f2d68e;font-size:11px}.lc-receipt,.lc-intel{color:#eee4ce;font-size:11px;line-height:1.5}.lc-review-list{display:flex;flex-direction:column;gap:4px;margin:7px 0;padding:0;list-style:none;color:#d7d0be;font-size:10px;line-height:1.4}.lc-review-list li{padding:5px 6px;border-left:2px solid #97865f;background:#2a2f31}.lc-intel{padding:6px;border-left:2px solid #db9d53;background:#34383a}.lc-confidence{color:#e8c873;font-size:10px}.lc-return{width:100%;min-height:48px;margin-top:8px;border:2px solid #e3ca82;border-radius:0;background:#46514b;box-shadow:3px 3px #000;color:#fff4d2;font:bold 13px "Courier New",monospace;cursor:pointer}',
    '@media(max-height:700px){.lc-content{bottom:calc(var(--safe-bottom) + 6px)}.lc-panel{padding:8px}.lc-option{min-height:46px}}',
    '</style>',
    '<img class="lc-backdrop" src="/art/longge-bbq-pixel-v1.webp" alt="" aria-hidden="true">',
    '<span class="lc-host" aria-hidden="true"><span class="lc-host-sprite"></span><b>龙哥</b></span>',
    '<header class="lc-header"><p class="lc-kicker">龙哥的烧烤摊 · 支线副本</p><h1 class="lc-title">群聊鉴伪</h1>' +
    '<p class="lc-stats">第 ' + initialState.day + ' 天 · 先看来源，再看成交，最后核对公告</p></header>',
    '<section class="lc-content" aria-live="polite"></section>',
  ].join('');

  const content = screen.querySelector<HTMLElement>('.lc-content')!;
  const stats = screen.querySelector<HTMLElement>('.lc-stats')!;
  const render = (current: GameState): void => {
    const run = current.activeActivity;
    const scenario = run?.id === 'LONGGE_CHAT' ? longgeScenarioForRun(run) : null;
    stats.textContent = scenario ? '第 ' + current.day + ' 天 · 今日群聊事件：' + scenario.title :
      '第 ' + current.day + ' 天 · 先看来源，再看成交，最后核对公告';
    if (!run || run.id !== 'LONGGE_CHAT') {
      content.innerHTML = '<section class="lc-panel"><h2>调查记录已结束</h2><button class="lc-return" data-action="return" type="button">回到街区</button></section>';
    } else if (run.status === 'RESULT') {
      content.innerHTML = renderLonggeResult(run);
    } else {
      content.innerHTML = run.step < 3 ? renderLonggeStep(run) : renderLonggeConclusion(run);
    }
    content.querySelector('.lc-panel')?.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 160, easing: 'steps(4, end)' },
    );
  };

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    const openingChoice = target.closest<HTMLElement>('[data-opening-choice]')?.dataset.openingChoice;
    const conclusion = target.closest<HTMLElement>('[data-conclusion]')?.dataset.conclusion;
    if (openingChoice === 'POST_CORRECTION' || openingChoice === 'KEEP_PRIVATE') {
      dispatch({ type: 'CHOOSE_LONGGE_OPENING', choice: openingChoice });
    } else if (choice === 'VERIFY_ORIGIN' || choice === 'FOLLOW_REPOST' || choice === 'READ_TAPE' || choice === 'WATCH_PRICE' || choice === 'CHECK_NOTICE' || choice === 'ASK_GROUP' || choice === 'CHECK_GROUP_REPLY' || choice === 'CHECK_PRIVATE_CHAIN') {
      dispatch({ type: 'CHOOSE_LONGGE_CLUE', choice });
    } else if (isLonggeConclusion(conclusion)) {
      dispatch({ type: 'CONCLUDE_LONGGE_CHAT', conclusion });
    } else if (target.closest('[data-action="abandon"]')) {
      dispatch({ type: 'ABANDON_LONGGE_CHAT' });
    } else if (target.closest('[data-action="return"]')) {
      dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    }
  });

  render(initialState);
  return screen;
}
