import { getStreamOptionEffect } from '../../../core/systems/streamRun';
import type { GameAction } from '../../../core/reducer';
import type { GameState, StreamChoice, StreamStep } from '../../../core/types';
import '../Trading/styles/trading.css';

interface StreamSegmentDisplay {
  title: string;
  briefing: string;
  options: readonly { choice: StreamChoice; title: string; note: string }[];
}

const segments: readonly StreamSegmentDisplay[] = [
  {
    title: '开场选题',
    briefing: '镜头亮起，第一句话决定观众留下还是划走。',
    options: [
      { choice: 'HONEST_REVIEW', title: '实测后讲优缺点', note: '信任增长稳定，成交节奏偏慢。' },
      { choice: 'HYPE_CLAIM', title: '追热点夸大效果', note: '短期热度高，观众信任会下降。' },
    ],
  },
  {
    title: '弹幕升温',
    briefing: '有人追问价格和效果，运营催你赶紧把订单数据拉起来。',
    options: [
      { choice: 'ANSWER_QUESTIONS', title: '停下来认真答疑', note: '热度和信任稳步上升。' },
      { choice: 'REPEAT_CTA', title: '循环口播催下单', note: '成交意向和热度上升，信任略降。' },
    ],
  },
  {
    title: '最后冲刺',
    briefing: '下播倒计时开始，你决定如何介绍最后一轮优惠。',
    options: [
      { choice: 'TRANSPARENT_DEAL', title: '说明真实价格与条件', note: '信任提升，成交较稳。' },
      { choice: 'FAKE_SCARCITY', title: '制造限量和倒计时', note: '成交意向最高，但会损害口碑。' },
    ],
  },
];

const choiceLabels: Record<StreamChoice, string> = {
  HONEST_REVIEW: '实测后讲优缺点',
  HYPE_CLAIM: '追热点夸大效果',
  ANSWER_QUESTIONS: '停下来认真答疑',
  REPEAT_CTA: '循环口播催下单',
  TRANSPARENT_DEAL: '说明真实价格与条件',
  FAKE_SCARCITY: '制造限量和倒计时',
};

function signed(value: number): string {
  return value > 0 ? '+' + value : String(value);
}

function isStreamChoice(value: string | undefined): value is StreamChoice {
  return value !== undefined && Object.hasOwn(choiceLabels, value);
}

export function createStreamRunScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const run = state.activeActivity;
  if (!run || run.id !== 'XIAOLIAN_STREAM') throw new Error('Stream screen requires an active stream run.');

  const screen = document.createElement('main');
  screen.className = 'sr-screen';
  const currentSegment = run.status === 'ACTIVE' ? segments[run.step] : null;
  const options = currentSegment?.options.map((option) => {
    const effect = getStreamOptionEffect(run.step as StreamStep, option.choice);
    if (!effect) return '';
    return `<button class="sr-option" type="button" data-choice="${option.choice}">
      <strong>${option.title}</strong><span>${option.note}</span>
      <small>热度 ${signed(effect.audienceDelta)} · 信任 ${signed(effect.trustDelta)} · 成交意向 +${effect.salesPoints} · 精力 -${effect.energyCost}</small>
    </button>`;
  }).join('') ?? '';

  const result = run.status === 'RESULT'
    ? `<section class="sr-result"><p class="sr-kicker">直播结束</p><h2>到账 ¥${run.income.toLocaleString()}</h2>
        <p>热度 ${run.audience} · 信任 ${run.trust} · 粉丝流量 ${signed(run.fameDelta)}</p>
        <p>消耗精力 ${run.energySpent} · 当前现金 ¥${state.cash.toLocaleString()}</p>
        <p>本场收入已计入今日直播账目；平台分成在周结扣除，不在此重复扣款。</p>
        <ol class="sr-receipt">${run.decisions.map((decision, index) => `<li><span>第 ${index + 1} 段 · ${choiceLabels[decision.choice]}</span><span>热度 ${signed(decision.audienceDelta)} / 信任 ${signed(decision.trustDelta)}</span></li>`).join('')}</ol>
        <button class="sr-return" type="button" data-action="return">回到盘城街区</button></section>`
    : `<section class="sr-play"><p class="sr-kicker">第 ${run.step + 1} / 3 段 · ${currentSegment?.title ?? ''}</p>
        <p class="sr-briefing">${currentSegment?.briefing ?? ''}</p><div class="sr-options">${options}</div>
        <p class="sr-progress">当前热度 ${run.audience} · 信任 ${run.trust} · 成交意向 ${run.salesPoints}</p>
        <p class="sr-note">完成三段后统一结算。中途离开不发收入或粉丝奖励，已耗精力不返还，今天不能再次开播。</p>
        <button class="sr-quit" type="button" data-action="abandon">结束直播（不结算，今日不可重开）</button></section>`;

  screen.innerHTML = `<style>
    .sr-screen{box-sizing:border-box;position:relative;display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;padding:calc(var(--safe-top) + 14px) 14px calc(var(--safe-bottom) + 14px);background:linear-gradient(180deg,#33253b,#211f2b 58%,#171b24);color:#fff2d2;font-family:"Courier New",monospace}
    .sr-screen::before{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px);content:"";pointer-events:none}
    .sr-header,.sr-stage,.sr-play,.sr-result{position:relative;z-index:1;border:3px solid #d5b96e;background:rgba(27,27,36,.96);box-shadow:5px 5px #000}
    .sr-header{display:flex;align-items:center;gap:12px;padding:10px}
    .sr-avatar{width:54px;height:54px;flex:none;border:2px solid #dbc77d;background-image:url('/art/pancheng-characters.png');background-position:33.333% 0;background-size:400% 200%;image-rendering:pixelated}
    .sr-heading{margin:0;color:#ffe38d;font-size:18px}.sr-subtitle,.sr-stats{margin-top:5px;color:#d2c8ad;font-size:11px;line-height:1.4}
    .sr-stage{display:flex;align-items:flex-end;justify-content:center;gap:6px;height:24vh;min-height:135px;margin:16px 0;padding:12px;background:linear-gradient(180deg,#533e58 0 64%,#795043 64% 72%,#24242e 72%);overflow:hidden}
    .sr-light{width:12px;height:60%;background:#f5d877;box-shadow:0 0 12px #f5a35a}.sr-light:nth-child(2){height:85%;background:#e892c6}.sr-light:nth-child(3){height:72%;background:#74d6d0}
    .sr-play,.sr-result{margin-top:auto;padding:14px}.sr-kicker{margin:0 0 8px;color:#f2cf79;font-size:12px;letter-spacing:1px}.sr-briefing{color:#f2ebd9;font-size:13px;line-height:1.5}
    .sr-options{display:grid;gap:9px;margin:12px 0}.sr-option{display:flex;min-height:82px;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:6px;padding:9px;border:2px solid #b9a879;background:#353544;color:#fff2d2;text-align:left;font:inherit;cursor:pointer}
    .sr-option:active,.sr-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.sr-option strong{font-size:13px}.sr-option span{color:#d5ceb9;font-size:11px}.sr-option small{color:#f4d678;font-size:10px}
    .sr-quit{width:100%;min-height:44px;border:1px solid #807867;background:#282a32;color:#c7c2b5;font:inherit;font-size:11px;cursor:pointer}
    .sr-result h2{margin:5px 0 10px;color:#ff8d76;font-size:25px}.sr-result p{color:#ddd4bd;font-size:12px;line-height:1.5}
    .sr-receipt{display:grid;gap:7px;margin:14px 0;padding:0;list-style:none}.sr-receipt li{display:flex;flex-direction:column;gap:3px;padding-bottom:6px;border-bottom:1px solid #5c5660;color:#e7dec9;font-size:10px}.sr-receipt li span:last-child{color:#d4c381}
    .sr-return{width:100%;min-height:48px;border:2px solid #e8d177;background:#554539;box-shadow:3px 3px #000;color:#fff2d2;font:inherit;font-weight:bold;cursor:pointer}
  </style>
  <header class="sr-header"><span class="sr-avatar" aria-hidden="true"></span><div><h1 class="sr-heading">小镰刀的直播间</h1><p class="sr-subtitle">每段消耗精力 5。基础收入=成交意向×¥10+热度每满10点¥5${state.gender === 'FEMALE' ? '；当前角色整笔直播收入 +20%' : ''}；周结时扣流水 5% 平台分成。</p><p class="sr-stats">第 ${state.day} 天 · 现金 ¥${state.cash.toLocaleString()} · 精力 ${state.energy} · 当前粉丝 ${state.fame}</p></div></header>
  <div class="sr-stage" aria-hidden="true"><i class="sr-light"></i><i class="sr-light"></i><i class="sr-light"></i></div>
  ${result}`;

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    if (isStreamChoice(choice)) {
      dispatch({ type: 'CHOOSE_STREAM_OPTION', choice });
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    if (action === 'abandon') dispatch({ type: 'ABANDON_STREAM_RUN' });
  });
  return screen;
}
