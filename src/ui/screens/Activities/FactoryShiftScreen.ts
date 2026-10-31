import { factoryInspectionForDay, factoryShiftBaseIncome, factoryShiftBonusPerCorrectCheck, factoryShiftEnergyCost, factoryShiftStops, minimumEnergyAfterFactoryCheck } from '../../../core/systems/factoryShift';
import type { GameAction } from '../../../core/reducer';
import { factoryIsolationAvailable, type FactoryShiftChoice, type FactoryShiftScenarioVersion } from '../../../core/factoryShiftTypes';
import type { GameState } from '../../../core/types';
import { factoryRelationshipDialogue } from './factoryRelationshipDialogue';

function renderDecision(choice: FactoryShiftChoice, energy: number, remaining: number): string {
  const energyCost = factoryShiftEnergyCost(choice);
  const blocked = energy - energyCost < remaining;
  const label = choice === 'REWORK' ? '返工复检' : choice === 'HOLD' ? '隔离待复核' : '合格放行';
  const detail = choice === 'REWORK' ? '复查并返工' : choice === 'HOLD' ? '暂存样品，补充证据' : '按现有记录放行';
  return '<button class="wf-choice" type="button" data-choice="' + choice + '"' + (blocked ? ' disabled' : '') + '>' +
    '<strong>' + label + '</strong><span>' + detail + '</span><small>精力 -' + energyCost + '</small></button>';
}

const choiceLabels: Record<FactoryShiftChoice, string> = {
  REWORK: '返工复检',
  PASS: '合格放行',
  HOLD: '隔离待复核',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

export function factoryShiftChoices(day: number, scenarioVersion?: FactoryShiftScenarioVersion): readonly FactoryShiftChoice[] {
  return factoryIsolationAvailable(day, scenarioVersion) ? ['REWORK', 'PASS', 'HOLD'] : ['REWORK', 'PASS'];
}

function renderActive(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'WANG_FACTORY' || run.status !== 'ACTIVE') return '';
  const inspection = factoryInspectionForDay(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4);
  const choices = factoryShiftChoices(run.day, run.scenarioVersion);
  const remaining = minimumEnergyAfterFactoryCheck(run.step);
  const history = run.decisions.map((decision, index) =>
    '<li><span>工位 ' + (index + 1) + (decision.correct ? ' · 质检通过' : ' · 判断失误') + '</span><strong>' +
    (decision.correct ? '+¥' + factoryShiftBonusPerCorrectCheck : '+¥0') + '</strong></li>').join('');
  const priorReview = run.step === 0 && run.priorReview
    ? '<aside class="wf-memory"><strong>旧工单复盘 · 第 ' + run.priorReview.previousDay + ' 天</strong><span>“' +
      escapeHtml(run.priorReview.caseTitle) + '”上次你选了“' + choiceLabels[run.priorReview.choice] + '”，复核记录应为“' +
      choiceLabels[run.priorReview.correctChoice] + '”。这项质量奖 ¥' + run.priorReview.qualityBonusMissed + ' 没有入账，底薪没有倒扣；今天按新工单重新判断。</span></aside>'
    : '';
  const wangMemory = state.npcActivityMemory.wang;
  const wangHistory = wangMemory.recentTraces.length > 0
    ? wangMemory.recentTraces
    : wangMemory.lastTrace ? [wangMemory.lastTrace] : [];
  const relationshipLine = run.step === 0
    ? factoryRelationshipDialogue(wangHistory)
    : null;
  const relationship = relationshipLine
    ? '<aside class="wf-relationship"><strong>王老板把手机扣在工单上</strong><span>“' + escapeHtml(relationshipLine) + '”</span></aside>'
    : '';
  return '<section class="wf-card" aria-live="polite"><div class="wf-progress">工位 ' + (run.step + 1) + ' / ' + factoryShiftStops +
    '<span>基础工资 ¥' + factoryShiftBaseIncome + ' · 质量奖已得 ¥' + run.qualityBonus + '</span></div>' +
    '<p class="wf-kicker">当前工单</p><h2>' + inspection.title + '</h2><p class="wf-clue">' + inspection.clue + '</p>' +
    '<p class="wf-manager-line">' + inspection.managerLine + '</p>' + relationship + priorReview +
    '<p class="wf-question">按工单和现场规则，你怎么处理？</p><div class="wf-choices' + (choices.length === 3 ? ' wf-choices-extended' : '') + '">' +
    choices.map((choice) => renderDecision(choice, state.energy, remaining)).join('') + '</div>' +
    '<ol class="wf-history" aria-label="已完成工位">' + history + '</ol>' +
    (state.energy < 9 + remaining ? '<p class="wf-energy-note">剩余精力 ' + state.energy + '，可以完成后续工位；当前返工方案所需精力不足。</p>' : '') +
    '<button class="wf-quit" type="button" data-action="abandon">结束班次（已消耗精力不返还；未到账工资）</button>' +
    '</section>';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'WANG_FACTORY' || run.status !== 'RESULT') return '';
  const rows = run.decisions.map((decision, index) => {
    const choice = decision.choice === 'REWORK' ? '返工复检' : decision.choice === 'HOLD' ? '隔离复核' : '合格放行';
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
    '.wf-wall{position:absolute;z-index:0;inset:0;overflow:hidden;background:#27353a}.wf-scene-art{display:block;width:100%;height:100%;object-fit:cover;object-position:center center;image-rendering:pixelated}.wf-scene-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,22,26,.3),rgba(17,23,26,.12) 42%,rgba(16,23,25,.58) 100%)}',
    '.wf-owner{position:absolute;z-index:1;top:calc(var(--safe-top) + 21%);right:12%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:1px solid #c6ad75;background:rgba(26,31,35,.88);box-shadow:3px 3px #000;color:#f7efd9;font-size:9px;pointer-events:none}.wf-owner-sprite{display:block;width:50px;height:72px;background:url("/art/wang-factory-character-v3.png") center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.wf-header{position:absolute;z-index:2;top:var(--safe-top);right:10px;left:10px;padding:9px;border:2px solid #ddc67d;background:rgba(28,35,36,.95);box-shadow:4px 4px #000}',
    '.wf-title{margin:0;color:#ffe28a;font-size:16px}.wf-stats{margin:5px 0 0;color:#e0d9c5;font-size:10px}',
    '.wf-content{position:absolute;z-index:2;right:10px;bottom:calc(var(--safe-bottom) + 10px);left:10px;max-height:calc(100% - var(--safe-top) - 140px);overflow-y:auto;overscroll-behavior:contain}',
    '.wf-card{padding:12px;border:3px solid #ddc67d;background:rgba(29,34,36,.97);box-shadow:5px 5px #000}',
    '.wf-progress{display:flex;justify-content:space-between;gap:8px;color:#ffe28a;font-weight:bold}.wf-progress span{color:#d7d1c0;font-size:9px}',
    '.wf-kicker{margin:9px 0 3px;color:#e6bb68;font-size:10px}.wf-card h2{margin:0 0 7px;color:#fff0bd;font-size:16px}',
    '.wf-clue{margin:0 0 9px;color:#e4e0d2;font-size:12px;line-height:1.5}.wf-manager-line{margin:0;padding:6px;border-left:2px solid #d9b96a;background:#303a3a;color:#e8d29b;font-size:10px;line-height:1.4}.wf-question{margin:8px 0;color:#ffe28a;font-size:11px}',
    '.wf-memory{display:grid;gap:4px;margin-top:7px;padding:7px;border:1px solid #b9945c;background:#3b3028;color:#f2d69e;font-size:10px;line-height:1.4}.wf-memory span{color:#e2d7c1}',
    '.wf-relationship{display:grid;gap:4px;margin-top:7px;padding:7px;border-left:2px solid #76a89b;background:#283938;color:#d9e6d3;font-size:10px;line-height:1.4}.wf-relationship strong{color:#a8d0b9}.wf-relationship span{color:#e0dfd0}',
    '.wf-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.wf-choices-extended .wf-choice:last-child{grid-column:1/-1;min-height:54px}.wf-choice{display:flex;min-height:72px;flex-direction:column;align-items:flex-start;justify-content:space-between;padding:8px;border:2px solid #c8b77b;background:#3c4848;box-shadow:3px 3px #000;color:#fff4d2;font:inherit;text-align:left;cursor:pointer}',
    '.wf-choice strong{font-size:12px}.wf-choice span,.wf-choice small{font-size:9px;color:#d6d1c3}.wf-choice small{color:#a9ef8b}.wf-choice:disabled{opacity:.4;cursor:not-allowed}.wf-choice:active:not(:disabled){transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '.wf-history{display:flex;flex-direction:column;gap:4px;margin:9px 0 0;padding:0;list-style:none}.wf-history li{display:flex;justify-content:space-between;gap:8px;color:#d9d3c3;font-size:9px}.wf-history strong{color:#ff8978}',
    '.wf-energy-note,.wf-summary{margin:7px 0 0;color:#ffd27c;font-size:9px;line-height:1.4}.wf-result h2{font-size:21px}.wf-result .wf-clue{font-size:10px}',
    '.wf-return{width:100%;min-height:46px;margin-top:11px;border:2px solid #eed587;background:#4a5650;box-shadow:3px 3px #000;color:#fff4d2;font:bold 13px "Courier New",monospace;cursor:pointer}.wf-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '.wf-quit{min-height:44px;margin-top:9px;padding:5px 8px;border:1px solid #8d8673;background:transparent;color:#d3cbb8;font:10px "Courier New",monospace;cursor:pointer}.wf-quit:focus-visible,.wf-return:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}',
    '@media(max-height:700px){.wf-card{padding:8px}.wf-clue{margin-bottom:5px}.wf-choice{min-height:60px}}',
    '</style>',
    '<div class="wf-wall" aria-hidden="true"><img class="wf-scene-art" src="/art/factory-inspection-floor-v1.webp" alt=""><span class="wf-scene-shade"></span></div>',
    '<span class="wf-owner" aria-hidden="true"><span class="wf-owner-sprite"></span><b>王老板</b></span>',
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
    if (choice === 'REWORK' || choice === 'PASS' || choice === 'HOLD') {
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
