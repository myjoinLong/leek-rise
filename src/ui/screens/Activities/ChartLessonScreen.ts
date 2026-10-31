import type { GameAction } from '../../../core/reducer';
import type { ChartLessonChoice, ChartLessonSignal, ChartLessonState, ChartLessonStep } from '../../../core/chartLessonTypes';
import { chartLessonPromptStep, getChartLessonSample, minimumChartLessonEnergy } from '../../../core/systems/chartLesson';
import { chartLessonScenarioForRun } from '../../../core/chartLessonScenarios';
import type { GameState } from '../../../core/types';

interface LessonOption { choice: ChartLessonChoice; title: string; note: string; }
interface LessonPrompt { title: string; clue: string; chartLabel: string; options: readonly LessonOption[]; }

const prompts: Record<ChartLessonStep, LessonPrompt> = {
  0: {
    title: '低点正在抬高', clue: '回撤没有跌破前一个低点，短线高点也逐渐上移。', chartLabel: '高点和低点整体抬高',
    options: [
      { choice: 'RIDE_HIGHER_LOWS', title: '顺势观察，先定风险位', note: '趋势偏强不等于可以满仓追涨。' },
      { choice: 'CHASE_LAST_SPIKE', title: '看到拉升就追进去', note: '忽略回撤和仓位风险。' },
      { choice: 'SELL_FIRST_PULLBACK', title: '第一次回撤就全部卖出', note: '没有确认结构已经走坏。' },
    ],
  },
  1: {
    title: '突破时量能转弱', clue: '价格碰到前高，但成交量比此前一轮上行更低。', chartLabel: '冲高但量能未确认',
    options: [
      { choice: 'WAIT_FOR_VOLUME', title: '等量能或回踩确认', note: '没有确认前，不把突破当成确定信号。' },
      { choice: 'BUY_ANY_BREAKOUT', title: '只要过前高就买入', note: '忽略量价背离带来的不确定性。' },
      { choice: 'IGNORE_VOLUME', title: '成交量永远不重要', note: '单看价格会丢掉一部分背景。' },
    ],
  },
  2: {
    title: '价格在窄区间来回', clue: '高低点接近，成交也没有明显放大，暂时看不出方向。', chartLabel: '价格在窄区间震荡',
    options: [
      { choice: 'WAIT_FOR_RANGE_BREAK', title: '先等区间出现有效变化', note: '观望也是主动控制风险。' },
      { choice: 'ASSUME_REVERSAL', title: '认定马上会反转', note: '横盘本身不能证明方向。' },
      { choice: 'DOUBLE_POSITION', title: '加倍仓位赌方向', note: '不确定时放大仓位会放大损失。' },
    ],
  },
};

const choiceTitles: Record<ChartLessonChoice, string> = {
  RIDE_HIGHER_LOWS: '顺势观察，先定风险位',
  CHASE_LAST_SPIKE: '看到拉升就追进去',
  SELL_FIRST_PULLBACK: '第一次回撤就全部卖出',
  WAIT_FOR_VOLUME: '等量能或回踩确认',
  BUY_ANY_BREAKOUT: '只要过前高就买入',
  IGNORE_VOLUME: '成交量永远不重要',
  WAIT_FOR_RANGE_BREAK: '先等区间出现有效变化',
  ASSUME_REVERSAL: '认定马上会反转',
  DOUBLE_POSITION: '加倍仓位赌方向',
};

const reviewGuidance: Record<ChartLessonSignal, { label: string; reminder: string }> = {
  HIGHER_LOWS: { label: '低点抬高', reminder: '先核对回撤低点和风险位。' },
  WEAK_BREAKOUT: { label: '量能偏弱的突破', reminder: '先确认成交量有没有跟上。' },
  NARROW_RANGE: { label: '窄幅震荡', reminder: '先找有效的区间变化，没确认前别加仓。' },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function isChartLessonState(activity: GameState['activeActivity']): activity is ChartLessonState {
  return activity?.id === 'BODHISATTVA_CHART_LESSON';
}

function isChoice(value: string | undefined): value is ChartLessonChoice {
  return value !== undefined && Object.hasOwn(choiceTitles, value);
}

function chartMarkup(step: ChartLessonStep, scenarioIndex?: number): string {
  const sample = getChartLessonSample(step, scenarioIndex);
  const minimum = Math.min(...sample.prices);
  const range = Math.max(...sample.prices) - minimum || 1;
  const points = sample.prices.map((price, index) =>
    (index * 240 / (sample.prices.length - 1)).toFixed(1) + ',' + (64 - (price - minimum) / range * 54).toFixed(1),
  ).join(' ');
  const prompt = prompts[step];
  return '<figure class="cl-chart"><svg viewBox="0 0 240 72" role="img" aria-label="' + prompt.chartLabel + '">' +
    '<path class="cl-grid" d="M0 12H240 M0 36H240 M0 60H240"/><polyline points="' + points + '"/></svg>' +
    '<figcaption>' + prompt.chartLabel + ' · 示意练习图</figcaption></figure>';
}

function renderScenario(run: ChartLessonState): string {
  const scenario = chartLessonScenarioForRun(run);
  if (!scenario) return '';
  const previous = run.priorReview
    ? `上次第 ${run.priorReview.previousDay} 天，你在“${reviewGuidance[run.priorReview.signal].label}”里选了“${choiceTitles[run.priorReview.choice]}”。${reviewGuidance[run.priorReview.signal].reminder}`
    : run.priorScore === null
    ? '先从这一课开始，别把形态当成确定答案。'
    : run.priorScore === undefined
      ? ''
      : `上次 ${run.priorScore}/3，这次换题；继续找反例。`;
  const mentorLine = [scenario.coachingLine, previous].filter(Boolean).join(' ');
  return '<aside class="cl-scenario"><strong>' + escapeHtml(scenario.headline) + ' · ' + escapeHtml(scenario.volatilityLabel) +
    '</strong><p>' + escapeHtml(scenario.brief) + '</p><p>' + escapeHtml(mentorLine) + '</p></aside>';
}

function renderActive(run: Extract<ChartLessonState, { status: 'ACTIVE' }>): string {
  const promptStep = chartLessonPromptStep(run);
  const prompt = prompts[promptStep];
  const history = run.decisions.map((decision, index) => '<li><span>练习 ' + (index + 1) + ' · ' +
    escapeHtml(choiceTitles[decision.choice]) + '</span><strong class="' + (decision.correct ? 'cl-correct' : 'cl-missed') + '">' +
    (decision.correct ? '判断成立' : '再核对线索') + '</strong></li>').join('');
  const options = prompt.options.map((option) => '<button type="button" class="cl-option" data-choice="' + option.choice + '">' +
    '<strong>' + option.title + '</strong><span>' + option.note + '</span><small>精力 -3</small></button>').join('');
  const focus = run.priorReview && run.step === 0 ? ' · 优先复习 ' + reviewGuidance[run.priorReview.signal].label : '';
  return '<section class="cl-card"><p class="cl-progress">读图练习 ' + (run.step + 1) + ' / 3' + focus + ' · 已耗精力 ' +
    run.energySpent + ' / ' + minimumChartLessonEnergy + '</p>' + renderScenario(run) + '<h2>' + prompt.title + '</h2><p class="cl-clue">' + prompt.clue + '</p>' +
    chartMarkup(promptStep, run.scenarioIndex) + '<div class="cl-options">' + options + '</div>' +
    (history ? '<ol class="cl-history" aria-label="练习记录">' + history + '</ol>' : '') +
    '<p class="cl-clue">练习不发现金。中途离开不生成走势提示，已耗精力不退，今天不能再次练习。</p>' +
    '<button class="cl-quit" type="button" data-action="abandon">结束练习并离开</button></section>';
}

function renderResult(run: Extract<ChartLessonState, { status: 'RESULT' }>): string {
  const rows = run.decisions.map((decision, index) => '<li><span>练习 ' + (index + 1) + ' · ' +
    escapeHtml(choiceTitles[decision.choice]) + '</span><strong class="' + (decision.correct ? 'cl-correct' : 'cl-missed') + '">' +
    (decision.correct ? '正确' : '待复习') + '</strong></li>').join('');
  return '<section class="cl-card cl-result"><p class="cl-progress">训练回执 · 精力 -' + run.energySpent + '</p>' + renderScenario(run) +
    '<h2>读图得分 ' + run.score + ' / 3</h2><p class="cl-clue">现金收入 ¥0 · 债务不变。练习用于识别图形，不代表预测未来；每次交易仍要自行判断风险。</p>' +
    '<ol class="cl-history">' + rows + '</ol><p class="cl-intel">' + escapeHtml(run.intel?.message ??
      '本次没有形成可用的近期走势提示。可以复盘线索，明天再来练习。') + '</p>' +
    '<button class="cl-return" type="button" data-action="return">带着练习记录回街区</button></section>';
}

export function createChartLessonScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const activity = state.activeActivity;
  if (!isChartLessonState(activity)) throw new Error('Chart lesson screen requires an active lesson.');
  const stock = state.stocks[activity.stockId];
  const screen = document.createElement('main');
  screen.className = 'cl-screen';
  screen.innerHTML = [
    '<style>',
    '.cl-screen{box-sizing:border-box;position:relative;isolation:isolate;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;padding:calc(var(--safe-top) + 12px) 12px calc(var(--safe-bottom) + 10px);color:#fff1cc;font:12px "Courier New",monospace;background:#17202a}',
    '.cl-screen::before{position:absolute;z-index:0;inset:0;background:url(/art/chart-lesson-classroom-v1.webp) center/cover no-repeat;image-rendering:pixelated;content:""}',
    '.cl-screen::after{position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,rgba(15,22,29,.34),rgba(15,22,29,.12) 38%,rgba(15,22,29,.92));content:"";pointer-events:none}',
    '.cl-owner{position:absolute;z-index:2;top:calc(var(--safe-top) + 22%);left:12%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:1px solid #c2a86b;background:rgba(25,30,37,.9);box-shadow:3px 3px #000;color:#fff0ce;font-size:9px;pointer-events:none}.cl-owner-sprite{display:block;width:56px;height:64px;background-image:url(/art/bodhisattva-character-v1.webp);background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.cl-header,.cl-content{position:relative;z-index:3}.cl-header{padding:10px;border:2px solid #d5bd78;background:rgba(25,31,38,.95);box-shadow:4px 4px #000}.cl-kicker{margin:0;color:#f4cf77;font-size:10px}.cl-title{margin:5px 0;color:#fff0be;font-size:17px}.cl-stats{margin:0;color:#d8d1bf;font-size:10px}',
    '.cl-content{position:absolute;top:auto;right:12px;bottom:calc(var(--safe-bottom) + 10px);left:12px;max-height:58%;overflow:auto;overscroll-behavior:contain}.cl-card{padding:12px;border:3px solid #d9c27f;background:rgba(30,35,39,.97);box-shadow:5px 5px #000}.cl-progress{margin:0 0 8px;color:#f1cc72;font-size:10px}.cl-card h2{margin:0 0 6px;color:#fff1c8;font-size:17px}.cl-clue{margin:0 0 8px;color:#e0dac9;font-size:11px;line-height:1.5}',
    '.cl-scenario{margin:0 0 6px;padding:6px;border-left:2px solid #d5bd78;background:#273137;color:#f4e8c8;font-size:9px;line-height:1.35}.cl-scenario p{margin:3px 0 0;color:#d8d1bf}',
    '.cl-chart{margin:0 0 8px;padding:7px;border:1px solid #686757;background:#202b32}.cl-chart svg{display:block;width:100%;height:76px}.cl-chart polyline{fill:none;stroke:#f0cc63;stroke-width:2;vector-effect:non-scaling-stroke}.cl-grid{fill:none;stroke:#627078;stroke-width:1;stroke-dasharray:3 4}.cl-chart figcaption{margin-top:4px;color:#c4c4b9;font-size:9px}',
    '.cl-stock{margin:0 0 6px;color:#d9cfb0;font-size:9px}.cl-options{display:grid;gap:6px}.cl-option{display:grid;grid-template-columns:1fr auto;gap:3px 8px;min-height:54px;padding:7px;border:2px solid #9f9167;background:#3b4549;box-shadow:2px 2px #000;color:#fff0c9;font:inherit;text-align:left;cursor:pointer}.cl-option strong{font-size:11px}.cl-option span{grid-column:1;color:#d5d0c2;font-size:9px}.cl-option small{grid-column:2;grid-row:1/3;align-self:center;color:#f2ce72;font-size:9px}.cl-option:active,.cl-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.cl-option:focus-visible,.cl-return:focus-visible,.cl-quit:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}',
    '.cl-history{display:grid;gap:4px;margin:8px 0;padding:0;list-style:none}.cl-history li{display:flex;justify-content:space-between;gap:8px;padding:5px;background:#292f32;color:#ddd6c4;font-size:9px}.cl-correct{color:#9ae58d}.cl-missed{color:#ffc378}.cl-quit{min-height:44px;padding:5px 8px;border:1px solid #817b6b;background:#282c30;color:#ccc5b4;font:10px "Courier New",monospace;cursor:pointer}.cl-intel{padding:8px;border-left:3px solid #d9c27f;background:#292e30;color:#e9dfc2;font-size:10px;line-height:1.5}.cl-return{width:100%;min-height:48px;margin-top:8px;border:2px solid #e4ce85;background:#4b5148;box-shadow:3px 3px #000;color:#fff2d2;font:bold 12px "Courier New",monospace;cursor:pointer}',
    '@media(max-height:700px){.cl-content{max-height:52%;bottom:calc(var(--safe-bottom) + 6px)}.cl-owner{top:calc(var(--safe-top) + 19%)}.cl-owner-sprite{width:48px;height:55px}.cl-card{padding:8px}.cl-chart svg{height:56px}.cl-option{min-height:48px}}',
    '</style>',
    '<div class="cl-owner" aria-hidden="true"><span class="cl-owner-sprite"></span><b>K线菩萨</b></div>' +
    '<header class="cl-header"><p class="cl-kicker">K线菩萨 · 培训班副本</p><h1 class="cl-title">三张图，看懂风险</h1>' +
      '<p class="cl-stats">第 ' + state.day + ' 天 · 现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax + '</p></header>',
    '<section class="cl-content" aria-live="polite"></section>',
  ].join('');

  const content = screen.querySelector<HTMLElement>('.cl-content')!;
  content.innerHTML = activity.status === 'RESULT' ? renderResult(activity) : renderActive(activity);
  if (stock && activity.status === 'ACTIVE') {
    const stockNotice = document.createElement('p');
    stockNotice.className = 'cl-stock';
    stockNotice.textContent = '练习对象：' + stock.name + ' · 每题消耗 3 点精力';
    content.querySelector('.cl-card')?.prepend(stockNotice);
  }
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    if (isChoice(choice)) {
      dispatch({ type: 'ANSWER_CHART_LESSON', choice });
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'abandon') dispatch({ type: 'ABANDON_CHART_LESSON' });
    if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
  });
  return screen;
}
