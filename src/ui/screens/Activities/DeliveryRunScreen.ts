import { deliveryStopsFor, minimumEnergyAfterDeliveryStop } from '../../../core/systems/deliveryRun';
import type { GameAction } from '../../../core/reducer';
import type { DeliveryRouteOption, DeliveryStop } from '../../../core/systems/deliveryRun';
import type { DeliveryReturnContext, GameState } from '../../../core/types';

function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

function renderRoute(option: DeliveryRouteOption, energy: number, minimumAfter: number): string {
  const disabled = energy - option.energyCost < minimumAfter;
  return '<button class="dr-route" type="button" data-choice="' + option.choice + '"' +
    (disabled ? ' disabled' : '') + '><span class="dr-route-title">' + escapeHtml(option.label) + '</span>' +
    '<span class="dr-route-note">' + escapeHtml(option.description) + '</span>' +
    '<span class="dr-route-cost">预计收入 ¥' + option.income + ' · 精力 -' + option.energyCost + '</span></button>';
}

function renderDispatcherReturnLine(stopIndex: number, returnContext: DeliveryReturnContext | undefined): string {
  if (stopIndex !== 2 || !returnContext) return '';
  const message = returnContext.kind === 'RELIABLE'
    ? `“第 ${returnContext.previousDay} 天你按时把单送完了。这单熟客服务返 ¥8，少耗 2 点精力。”`
    : `“第 ${returnContext.previousDay} 天你接过加急单。这次加急补贴 ¥15，额外耗 3 点精力，接不接你自己定。”`;
  return '<p class="dr-dispatcher-note">调度员翻着记录：' + escapeHtml(message) + '</p>';
}

function renderStop(stop: DeliveryStop, stopIndex: number, state: GameState, stops: readonly DeliveryStop[]): string {
  const minimumAfter = minimumEnergyAfterDeliveryStop(stopIndex, stops);
  const run = state.activeActivity;
  const completedIncome = run?.id === 'WANG_DELIVERY' ? run.totalIncome : 0;
  const returnContext = run?.id === 'WANG_DELIVERY' ? run.returnContext : undefined;
  const quitLabel = run?.id === 'WANG_DELIVERY' && run.decisions.length > 0
    ? '提前收工 · 结算已完成订单 ¥' + run.totalIncome + '（今天不能再接工作）'
    : '离开这趟配送 · 没有完成订单，不发工资';
  return '<section class="dr-order" aria-label="当前订单">' +
    '<div class="dr-progress"><span>订单 ' + (stopIndex + 1) + ' / ' + stops.length + '</span>' +
    '<span>现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + ' · 已完成 ¥' + completedIncome + '</span></div>' +
    '<h2>' + escapeHtml(stop.title) + '</h2><p class="dr-briefing">' + escapeHtml(stop.briefing) + '</p>' +
    renderDispatcherReturnLine(stopIndex, returnContext) +
    '<p class="dr-prompt">你准备怎么送？</p><div class="dr-routes">' +
    stop.options.map((option) => renderRoute(option, state.energy, minimumAfter)).join('') + '</div>' +
    (stop.options.some((option) => state.energy - option.energyCost < minimumAfter)
      ? '<p class="dr-energy-hint">请选择后仍能完成剩余订单的路线。</p>' : '') +
    '<button class="dr-quit" type="button" data-action="abandon">' + escapeHtml(quitLabel) + '</button>' + '</section>';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'WANG_DELIVERY') return '';
  const rows = run.decisions.map((decision, index) =>
    '<li><span>订单 ' + (index + 1) + ' · ' + escapeHtml(decision.outcome) + '</span>' +
    '<strong>+¥' + decision.income + '</strong></li>').join('');
  return '<section class="dr-result" aria-label="跑单结算"><p class="dr-kicker">本次跑单完成</p>' +
    '<h2>今天赚到 ¥' + run.totalIncome.toLocaleString() + '</h2>' +
    '<p class="dr-summary">完成 ' + run.decisions.length + ' 单 · 消耗精力 ' + run.energySpent +
    ' · 当前精力 ' + state.energy + '</p><ol class="dr-receipt">' + rows + '</ol>' +
    '<button class="dr-return" type="button" data-action="return">回到盘城街区</button></section>';
}

function renderRouteMap(stopIndex: number, complete: boolean): string {
  const stops = [
    { x: 42, y: 20, label: '驿站' },
    { x: 130, y: 45, label: '1' },
    { x: 130, y: 130, label: '2' },
    { x: 320, y: 65, label: '3' },
  ] as const;
  const completedStops = complete ? 3 : Math.min(stopIndex, 3);
  const currentTarget = complete || stopIndex >= 3 ? -1 : stopIndex + 1;
  const rider = stops[Math.min(stopIndex, 3)]!;
  const routeSegments = [
    'M42 20L130 45',
    'M130 45L130 130',
    'M130 130L250 130L250 65L320 65',
  ];
  const routes = routeSegments.map((path, index) => {
    const isComplete = index < completedStops;
    const isCurrent = index === stopIndex && !complete;
    return '<path class="dr-route-segment' + (isComplete ? ' is-complete' : isCurrent ? ' is-current' : '') + '" d="' + path + '" />';
  }).join('');
  const markers = stops.map((stop, index) => {
    const isDone = index > 0 && index <= completedStops;
    const isCurrent = index === currentTarget;
    const markerClass = isDone ? 'is-done' : isCurrent ? 'is-current' : index === 0 ? 'is-depot' : 'is-future';
    const label = index === 0 ? '站' : isDone ? '✓' : String(index);
    return '<g class="dr-node ' + markerClass + '" transform="translate(' + stop.x + ' ' + stop.y + ')" aria-hidden="true">' +
      '<circle r="10" /><text y="3.5">' + label + '</text>' +
      '<text class="dr-node-name" y="23">' + stop.label + '</text></g>';
  }).join('');
  const progressLabel = complete
    ? '三单全部送达，路线完成'
    : '已完成 ' + completedStops + ' 单，当前目标第 ' + (stopIndex + 1) + ' 单';
  const riderPosition = 'translate(' + (rider.x - 13) + ' ' + (rider.y - 13) + ')';

  return '<svg viewBox="0 0 360 180" role="img" aria-label="' + progressLabel + '">' +
    '<path d="M0 45H130V130H250V65H360M42 0V45M130 45H250M250 65V180M75 130V180" fill="none" stroke="#7c8b83" stroke-width="28" />' +
    '<rect x="18" y="13" width="46" height="18" fill="#bb6948" /><rect x="104" y="54" width="50" height="34" fill="#d6ac61" />' +
    '<rect x="210" y="95" width="48" height="30" fill="#668e71" /><rect x="294" y="44" width="48" height="34" fill="#ad7352" />' +
    routes + markers +
    '<g class="dr-rider" transform="' + riderPosition + '" aria-hidden="true"><circle r="7" /><text y="3">你</text></g></svg>';
}

export function createDeliveryRunScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  let state = initialState;
  const screen = document.createElement('main');
  screen.className = 'dr-screen';
  screen.innerHTML = [
    '<style>',
    '.dr-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#fff4d2;font-family:"Courier New",monospace;background:#263744}',
    '.dr-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;image-rendering:pixelated}',
    '.dr-screen::before{position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,rgba(13,22,28,.15),rgba(13,22,28,.12) 30%,rgba(13,22,28,.8));content:""}',
    '.dr-header{position:absolute;z-index:2;top:var(--safe-top);right:12px;left:12px;padding:10px;border:2px solid #e4ca78;background:rgba(25,34,38,.91);box-shadow:4px 4px #000}',
    '.dr-kicker{margin-bottom:4px;color:#ffc85b;font-size:11px;letter-spacing:1px}.dr-title{font-size:18px}.dr-stats{margin-top:6px;color:#e3dcc5;font-size:11px}',
    '.dr-courier{position:absolute;z-index:3;top:calc(var(--safe-top) + 84px);left:7%;pointer-events:none}.dr-courier-sprite{display:block;width:auto;height:clamp(132px,38vw,164px);object-fit:contain;object-position:center bottom;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.dr-dispatcher{position:absolute;z-index:2;top:calc(var(--safe-top) + 15%);right:13%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;border:1px solid #d4bd78;background:rgba(25,34,38,.88);box-shadow:3px 3px #000;color:#fff0d2;font-size:9px;pointer-events:none}.dr-dispatcher-sprite{display:block;width:44px;height:58px;background:url("/art/delivery-dispatcher-character-v1.webp") center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.dr-map{position:absolute;z-index:2;top:31%;right:18px;left:18px;height:18%;min-height:150px;border:3px solid #e4ca78;background:rgba(24,41,48,.89);box-shadow:5px 5px #000}',
    '.dr-map svg{width:100%;height:100%}.dr-route-segment{fill:none;stroke:#83908a;stroke-width:4;stroke-dasharray:5 6;opacity:.75}.dr-route-segment.is-current{stroke:#ffdf76;stroke-width:5;opacity:1}.dr-route-segment.is-complete{stroke:#ffdf76;stroke-width:5;stroke-dasharray:none;opacity:1}',
    '.dr-node circle{fill:#46514d;stroke:#e5dcc1;stroke-width:2}.dr-node text{fill:#fff4d2;font-size:8px;text-anchor:middle;font-weight:bold}.dr-node.is-done circle{fill:#75b779;stroke:#173c2a}.dr-node.is-current circle{fill:#ffdf76;stroke:#4a3914;stroke-width:3}.dr-node.is-depot circle{fill:#80908b}.dr-node-name{fill:#fff3cc!important;font-size:7px!important;font-weight:normal!important}.dr-rider circle{fill:#ec684f;stroke:#211f1c;stroke-width:2}.dr-rider text{fill:#fff;font-size:7px;text-anchor:middle;font-weight:bold}',
    '.dr-order{position:absolute;z-index:3;right:12px;bottom:calc(var(--safe-bottom) + 10px);left:12px;max-height:52%;overflow-y:auto;padding:12px;border:3px solid #e4ca78;background:rgba(29,34,38,.97);box-shadow:5px 5px #000}',
    '.dr-progress{display:flex;justify-content:space-between;gap:8px;color:#d7cfae;font-size:10px}.dr-order h2,.dr-result h2{margin:8px 0;color:#ffe28a;font-size:17px}',
    '.dr-briefing{color:#e9e2d1;font-size:12px;line-height:1.5}.dr-prompt{margin:8px 0 6px;color:#f2cf79;font-size:11px}',
    '.dr-dispatcher-note{margin:8px 0;padding:6px 8px;border-left:2px solid #e4ca78;background:rgba(20,28,31,.75);color:#ffe3a0;font-size:10px;line-height:1.4}',
    '.dr-routes{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dr-route{display:flex;min-height:88px;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:8px;border:2px solid #c7b77e;border-radius:0;background:#38434a;box-shadow:3px 3px #000;color:#fff4d2;text-align:left;font-family:inherit;cursor:pointer}',
    '.dr-energy-hint{margin-top:7px;color:#ffd37b;font-size:10px}',
    '.dr-quit{min-height:44px;margin-top:9px;padding:5px 8px;border:1px solid #8e8878;background:transparent;color:#ddd5c1;font:10px "Courier New",monospace;cursor:pointer}.dr-quit:focus-visible,.dr-return:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}',
    '.dr-route:active:not(:disabled){transform:translate(2px,2px);box-shadow:1px 1px #000}.dr-route:disabled{opacity:.45;cursor:not-allowed}.dr-route-title{font-size:13px;font-weight:bold}.dr-route-note{font-size:10px;line-height:1.35;color:#d6d4c8}.dr-route-cost{font-size:10px;color:#a9ef8b}',
    '.dr-result{position:absolute;z-index:3;right:12px;bottom:calc(var(--safe-bottom) + 10px);left:12px;padding:14px;border:3px solid #e4ca78;background:rgba(29,34,38,.97);box-shadow:5px 5px #000}',
    '.dr-result h2{font-size:22px}.dr-summary{margin-bottom:10px;color:#d7cfae;font-size:12px}.dr-receipt{display:flex;flex-direction:column;gap:6px;margin:10px 0 14px;padding:0;list-style:none}',
    '.dr-receipt li{display:flex;justify-content:space-between;gap:8px;padding-bottom:5px;border-bottom:1px solid #52534c;color:#dedaca;font-size:10px}.dr-receipt strong{flex:none;color:#ff8170}',
    '.dr-return{width:100%;min-height:48px;border:2px solid #f3d477;border-radius:0;background:#43505a;box-shadow:3px 3px #000;color:#fff4d2;font:bold 14px "Courier New",monospace;cursor:pointer}',
    '.dr-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '@media(max-height:700px){.dr-courier-sprite{height:124px}.dr-map{top:32%;height:14%;min-height:96px}.dr-order{max-height:55%;padding:8px}.dr-route{min-height:72px}}',
    '</style>',
    '<img class="dr-backdrop" src="/art/delivery-dispatch-street-v1.webp" alt="" aria-hidden="true">',
    '<header class="dr-header"><p class="dr-kicker">王总的临时单 · 支线副本</p><h1 class="dr-title">外卖跑单</h1><p class="dr-stats"></p></header>',
    '<span class="dr-courier" aria-hidden="true"><img class="dr-courier-sprite" alt=""></span>',
    '<span class="dr-dispatcher" aria-hidden="true"><span class="dr-dispatcher-sprite"></span><b>调度员</b></span>',
    '<div class="dr-map"></div>',
    '<section class="dr-content" aria-live="polite"></section>',
  ].join('');

  const content = screen.querySelector<HTMLElement>('.dr-content')!;
  const stats = screen.querySelector<HTMLElement>('.dr-stats')!;
  const courier = screen.querySelector<HTMLImageElement>('.dr-courier-sprite')!;

  const render = (): void => {
    const courierImage = state.gender === 'FEMALE'
      ? '/art/player-courier-female-v1.png'
      : '/art/player-courier-male-v1.png';
    if (courier.getAttribute('src') !== courierImage) courier.src = courierImage;
    const run = state.activeActivity;
    if (!run || run.id !== 'WANG_DELIVERY') {
      screen.querySelector<HTMLElement>('.dr-map')!.replaceChildren();
      content.innerHTML = '<section class="dr-result"><h2>跑单记录已结束</h2><button class="dr-return" type="button" data-action="return">回到盘城街区</button></section>';
      return;
    }
    screen.querySelector<HTMLElement>('.dr-map')!.innerHTML = renderRouteMap(run.stopIndex, run.status === 'RESULT');
    stats.textContent = '第 ' + run.day + ' 天 · 精力 ' + state.energy + '/' + state.energyMax;
    const stops = deliveryStopsFor(run.day, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    content.innerHTML = run.status === 'RESULT'
      ? renderResult(state)
      : renderStop(stops[run.stopIndex]!, run.stopIndex, state, stops);
    content.querySelectorAll<HTMLElement>('.dr-result, .dr-order').forEach((panel) => {
      panel.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 180,
        easing: 'steps(4, end)',
      });
    });
  };

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLButtonElement>('[data-choice]')?.dataset.choice;
    if (choice === 'ALLEY' || choice === 'MAIN' || choice === 'RUSH' || choice === 'STEADY') {
      state = dispatch({ type: 'CHOOSE_DELIVERY_ROUTE', choice });
      return;
    }
    if (target.closest('[data-action="return"]')) {
      state = dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    } else if (target.closest('[data-action="abandon"]')) {
      state = dispatch({ type: 'ABANDON_DELIVERY_RUN' });
    }
  });

  render();
  return screen;
}
