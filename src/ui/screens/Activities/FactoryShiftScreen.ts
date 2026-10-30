import { factoryInspectionForDay, factoryShiftBaseIncome, factoryShiftBonusPerCorrectCheck, factoryShiftStops, minimumEnergyAfterFactoryCheck } from '../../../core/systems/factoryShift';
import type { GameAction } from '../../../core/reducer';
import type { FactoryShiftChoice } from '../../../core/factoryShiftTypes';
import type { GameState } from '../../../core/types';

function renderDecision(choice: FactoryShiftChoice, energy: number, remaining: number): string {
  const energyCost = choice === 'REWORK' ? 9 : 5;
  const blocked = energy - energyCost < remaining;
  const label = choice === 'REWORK' ? '返工复检' : '合格放行';
  const detail = choice === 'REWORK' ? '多花精力复查这一件' : '节省体力，按现有记录放行';
  return '<button class="wf-choice" type="button" data-choice="' + choice + '"' + (blocked ? ' disabled' : '') + '>' +
    '<strong>' + label + '</strong><span>' + detail + '</span><small>精力 -' + energyCost + '</small></button>';
}

function renderActive(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'WANG_FACTORY' || run.status !== 'ACTIVE') return '';
  const inspection = factoryInspectionForDay(run.day, run.step);
  const remaining = minimumEnergyAfterFactoryCheck(run.step);
  const history = run.decisions.map((decision, index) =>
    '<li><span>工位 ' + (index + 1) + (decision.correct ? ' · 质检通过' : ' · 漏检/过检') + '</span><strong>' +
    (decision.correct ? '+¥' + factoryShiftBonusPerCorrectCheck : '+¥0') + '</strong></li>').join('');
  return '<section class="wf-card" aria-live="polite"><div class="wf-progress">工位 ' + (run.step + 1) + ' / ' + factoryShiftStops +
    '<span>基础工资 ¥' + factoryShiftBaseIncome + ' · 质量奖已得 ¥' + run.qualityBonus + '</span></div>' +
    '<p class="wf-kicker">当前工单</p><h2>' + inspection.title + '</h2><p class="wf-clue">' + inspection.clue + '</p>' +
    '<p class="wf-question">按工单和实物记录，你怎么处理？</p><div class="wf-choices">' +
    renderDecision('REWORK', state.energy, remaining) + renderDecision('PASS', state.energy, remaining) + '</div>' +
    '<ol class="wf-history" aria-label="已完成工位">' + history + '</ol>' +
    (state.energy < 9 + remaining ? '<p class="wf-energy-note">剩余精力 ' + state.energy + '，可以完成后续工位；当前返工方案所需精力不足。</p>' : '') +
    '<button class="wf-quit" type="button" data-action="abandon">结束班次（已消耗精力不返还；未到账工资）</button>' +
    '</section>';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'WANG_FACTORY' || run.status !== 'RESULT') return '';
  const rows = run.decisions.map((decision, index) => {
    const choice = decision.choice === 'REWORK' ? '返工复检' : '合格放行';
    return '<li><span>工位 ' + (index + 1) + ' · ' + choice + (decision.correct ? '正确' : '未拿到质量奖') + '</span><strong>' +
      (decision.correct ? '+¥' + factoryShiftBonusPerCorrectCheck : '+¥0') + '</strong></li>';
  }).join('');
  return '<section class="wf-card wf-result" aria-live="polite"><p class="wf-kicker">班次结算</p><h2>到账 ¥' + run.income + '</h2>' +
    '<p class="wf-clue">基础工资 ¥' + factoryShiftBaseIncome + ' + 质量奖 ¥' + run.qualityBonus + '。正确质检增加奖金，判断失误只损失该项奖金。</p>' +
    '<p class="wf-summary">完成 ' + factoryShiftStops + ' 个工位 · 精力 -' + run.energySpent + ' · 当前精力 ' + state.energy + '</p>' +
    '<ol class="wf-history">' + rows + '</ol><button class="wf-return" type="button" data-action="return">回到盘城街区</button></section>';
}

export function createFactoryShiftScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  let state = initialState;
  const screen = document.createElement('main');
  screen.className = 'wf-screen';
  screen.innerHTML = [
    '<style>',
    '.wf-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f6edcf;font:12px "Courier New",monospace;background:#27353a}',
    '.wf-wall{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 46px,rgba(230,211,156,.08) 47px 49px),linear-gradient(#47585a 0 42%,#665d49 42% 44%,#303c3b 44%)}',
    '.wf-window{position:absolute;top:17%;left:9%;width:35%;height:20%;border:6px solid #322f2b;background:repeating-linear-gradient(0deg,#78949a 0 4px,#637b80 4px 8px);box-shadow:inset 0 0 0 3px #c7b779}',
    '.wf-lamp{position:absolute;top:11%;right:13%;width:28%;height:8px;background:#f6d879;box-shadow:0 0 22px #f6d879,0 28px 28px rgba(255,220,120,.22)}',
    '.wf-conveyor{position:absolute;right:-10%;bottom:34%;left:-10%;height:48px;border:6px solid #252c2e;background:repeating-linear-gradient(90deg,#657174 0 14px,#313a3b 14px 22px);box-shadow:0 9px #111}',
    '.wf-box{position:absolute;bottom:calc(34% + 46px);left:52%;width:58px;height:50px;border:4px solid #322a21;background:linear-gradient(90deg,transparent 45%,#95734a 46% 54%,transparent 55%),#bd935b;box-shadow:4px 4px #111}',
    '.wf-tag{position:absolute;top:15px;left:7px;padding:2px 4px;background:#eadca8;color:#30291f;font-size:9px;font-weight:bold}',
    '.wf-header{position:absolute;z-index:2;top:var(--safe-top);right:10px;left:10px;padding:9px;border:2px solid #ddc67d;background:rgba(28,35,36,.95);box-shadow:4px 4px #000}',
    '.wf-title{margin:0;color:#ffe28a;font-size:16px}.wf-stats{margin:5px 0 0;color:#e0d9c5;font-size:10px}',
    '.wf-content{position:absolute;z-index:2;right:10px;bottom:calc(var(--safe-bottom) + 10px);left:10px}',
    '.wf-card{padding:12px;border:3px solid #ddc67d;background:rgba(29,34,36,.97);box-shadow:5px 5px #000}',
    '.wf-progress{display:flex;justify-content:space-between;gap:8px;color:#ffe28a;font-weight:bold}.wf-progress span{color:#d7d1c0;font-size:9px}',
    '.wf-kicker{margin:9px 0 3px;color:#e6bb68;font-size:10px}.wf-card h2{margin:0 0 7px;color:#fff0bd;font-size:16px}',
    '.wf-clue{margin:0 0 9px;color:#e4e0d2;font-size:12px;line-height:1.5}.wf-question{margin:8px 0;color:#ffe28a;font-size:11px}',
    '.wf-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wf-choice{display:flex;min-height:72px;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:8px;border:2px solid #c8b77b;background:#3c4848;box-shadow:3px 3px #000;color:#fff4d2;font:inherit;text-align:left;cursor:pointer}',
    '.wf-choice strong{font-size:12px}.wf-choice span,.wf-choice small{font-size:9px;color:#d6d1c3}.wf-choice small{color:#a9ef8b}.wf-choice:disabled{opacity:.4;cursor:not-allowed}.wf-choice:active:not(:disabled){transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '.wf-history{display:flex;flex-direction:column;gap:4px;margin:9px 0 0;padding:0;list-style:none}.wf-history li{display:flex;justify-content:space-between;gap:8px;color:#d9d3c3;font-size:9px}.wf-history strong{color:#ff8978}',
    '.wf-energy-note,.wf-summary{margin:7px 0 0;color:#ffd27c;font-size:9px;line-height:1.4}.wf-result h2{font-size:21px}.wf-result .wf-clue{font-size:10px}',
    '.wf-return{width:100%;min-height:46px;margin-top:11px;border:2px solid #eed587;background:#4a5650;box-shadow:3px 3px #000;color:#fff4d2;font:bold 13px "Courier New",monospace;cursor:pointer}.wf-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '.wf-quit{min-height:44px;margin-top:9px;padding:5px 8px;border:1px solid #8d8673;background:transparent;color:#d3cbb8;font:10px "Courier New",monospace;cursor:pointer}.wf-quit:focus-visible,.wf-return:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}',
    '@media(max-height:700px){.wf-window{top:14%;height:17%}.wf-conveyor{bottom:32%}.wf-box{bottom:calc(32% + 46px)}.wf-card{padding:8px}.wf-clue{margin-bottom:5px}.wf-choice{min-height:60px}}',
    '</style>',
    '<div class="wf-wall" aria-hidden="true"><span class="wf-window"></span><span class="wf-lamp"></span><span class="wf-conveyor"></span><span class="wf-box"><span class="wf-tag">A-17</span></span></div>',
    '<header class="wf-header"><h1 class="wf-title">王老板的小工厂 · 质检班</h1><p class="wf-stats">第 ' + state.day + ' 天 · 现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax + ' · 基础工资 ¥' + factoryShiftBaseIncome + '</p></header>',
    '<section class="wf-content"></section>',
  ].join('');

  const content = screen.querySelector<HTMLElement>('.wf-content')!;
  const render = (): void => {
    const run = state.activeActivity;
    content.innerHTML = run?.id === 'WANG_FACTORY' && run.status === 'RESULT'
      ? renderResult(state)
      : renderActive(state);
  };

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    if (choice === 'REWORK' || choice === 'PASS') {
      state = dispatch({ type: 'CHOOSE_FACTORY_CHECK', choice });
      render();
    } else if (target.closest('[data-action="return"]')) {
      state = dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    } else if (target.closest('[data-action="abandon"]')) {
      state = dispatch({ type: 'ABANDON_FACTORY_SHIFT' });
    }
  });

  render();
  return screen;
}
