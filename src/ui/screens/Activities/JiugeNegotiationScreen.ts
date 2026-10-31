import type { GameAction } from '../../../core/reducer';
import type { GameState, JiugeNegotiationChoice, JiugeNegotiationStep } from '../../../core/types';
import { periodicCostPolicy } from '../../../core/systems/periodicCosts';
import { DebtPlanPreview } from './DebtPlanPreview';
import { debtInstallmentPolicy } from '../../../core/systems/debtInstallments';
import { getJiugeNegotiationScenario } from '../../../core/jiugeNegotiationScenarios';

const options: Record<JiugeNegotiationStep, readonly { choice: JiugeNegotiationChoice; title: string; detail: string }[]> = {
  0: [
    { choice: 'SHOW_LEDGER', title: '拿出分项账本', detail: '先核对本金、利息和每项周期费用。' },
    { choice: 'BLUFF_CASHFLOW', title: '不看账单，先说周转没问题', detail: '没有凭据，九哥无法核实你的说法。' },
  ],
  1: [
    { choice: 'PROVE_INCOME', title: '展示已入账收入', detail: '用实际完成的工作或经营收入说明还款能力。' },
    { choice: 'PROMISE_FULL', title: '保证马上全额还清', detail: '承诺不等于现金，账面没有这笔余额。' },
  ],
  2: [
    { choice: 'ASK_INTEREST_GRACE', title: '申请宽限下一期周利息', detail: '需要核对账单并提供真实收入凭据；成功后下一次周结免计利息一次。' },
    { choice: 'SIGN_RATE_RESTRUCTURE', title: '签 8 期降息协议', detail: '' },
    { choice: 'SIGN_INSTALLMENTS', title: '签免费八期自动还款计划（原型）', detail: `每次周结计息和费用后，从现金最多还 ¥${debtInstallmentPolicy.weeklyPayment}，共 ${debtInstallmentPolicy.periods} 期；不降息、不收费、不卖股票。缺口后暂停，无罚款、不追加欠款，可在夜间恢复或取消；暂停周不占期，取消后不能重签。八期结束仍可能有欠款。需先核账、证明收入，无现行宽限或降息协议。` },
    { choice: 'SIGN_STANDARD', title: '按现行账单继续结算', detail: '不增加宽限，所有现行费用规则保持不变。' },
  ],
};

function isChoice(value: string | undefined): value is JiugeNegotiationChoice {
  return value !== undefined && Object.values(options).flat().some((option) => option.choice === value);
}

export function createJiugeNegotiationScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const run = state.activeActivity;
  if (!run || run.id !== 'JIUGE_NEGOTIATION') throw new Error('Jiuge negotiation screen requires an active negotiation.');
  const scenario = run.scenarioVersion === 2 && run.scenarioIndex !== undefined
    ? getJiugeNegotiationScenario(run.scenarioIndex)
    : null;
  const screen = document.createElement('main');
  screen.className = 'jgn-screen scene-screen';
  const active = run.status === 'ACTIVE';
  const hasIncomeEvidence = state.dailyWorkIncome + state.dailyStreamIncome > 0 || state.weeklyStreamIncome > 0;
  const hasLedger = run.decisions.some((decision) => decision.choice === 'SHOW_LEDGER');
  const hasIncomeProof = run.decisions.some((decision) => decision.choice === 'PROVE_INCOME');
  const incomeToday = state.dailyWorkIncome + state.dailyStreamIncome;
  const npcLine = !scenario
    ? '“我只按账面说话。你把材料和打算讲明白，能谈的我再考虑。”'
    : run.step === 0
      ? scenario.openingLine
    : run.step === 1
      ? hasLedger
        ? `“账单先核过了。今天实际到账 ¥${incomeToday.toLocaleString()}，有流水就摆出来，预期收入不算。”`
        : '“账还没核，先别拿一句周转没问题当凭据。账本和账单摆出来再谈。”'
      : hasLedger && hasIncomeProof
        ? '“账单和流水都核过了。宽限、降息、分期各有边界，你选能承担的。”'
        : `“现有材料还不齐。当前欠款 ¥${state.debt.toLocaleString()}，没有核实的部分我不会写进协议。”`;
  const historyInteraction = active && run.step === 0
    ? run.askedAboutHistory
      ? '<p class="jgn-history-reply">“我刚入行时，拿过一张只写总数的账。人家以为还清了，后来才发现杂费还在往上走。我那时只会照抄。现在每一栏都得能对回凭据。”</p>'
      : '<button class="jgn-history-button" type="button" data-action="ask-history">问九哥：为什么每笔都要分开记？<span>可选对话，不影响协商条件</span></button>'
    : '';
  const ratePlanDisabled = !hasLedger || !hasIncomeProof || state.cash < periodicCostPolicy.restructuringFee
    || state.debtRatePlanWeeksRemaining > 0 || state.debtInterestGraceWeeksRemaining > 0 || state.debt <= 0;
  const ratePlanEstimate = '可先用现金流试算比较三种方案；省息不保证覆盖签约费。';
  const stepOptions = active ? options[run.step].map((option) => {
    const disabled = (option.choice === 'PROVE_INCOME' && !hasIncomeEvidence) || (option.choice === 'SIGN_RATE_RESTRUCTURE' && ratePlanDisabled)
      || (option.choice === 'SIGN_INSTALLMENTS' && (!hasLedger || !hasIncomeProof || !!state.debtInstallmentPlan || state.debt <= 0 || state.debtRatePlanWeeksRemaining > 0 || state.debtInterestGraceWeeksRemaining > 0));
    const detail = option.choice === 'PROVE_INCOME' && !hasIncomeEvidence
      ? '先完成打工或直播，取得一笔实际入账记录。'
      : option.choice === 'SIGN_RATE_RESTRUCTURE'
        ? `签约费¥${periodicCostPolicy.restructuringFee}；最多${periodicCostPolicy.restructuringWeeks}次周结按${(periodicCostPolicy.restructuredWeeklyInterestRate * 100).toFixed(2)}%计息（现${(periodicCostPolicy.weeklyInterestRate * 100).toFixed(1)}%）。${ratePlanEstimate}提前还清会减少节省，签约费不退。${!hasLedger ? '需先核对账单。' : !hasIncomeProof ? '需先证明真实收入。' : state.cash < periodicCostPolicy.restructuringFee ? '当前现金不足签约。' : state.debtRatePlanWeeksRemaining > 0 ? '已有降息协议。' : state.debtInterestGraceWeeksRemaining > 0 ? '已有待使用的利息宽限。' : state.debt <= 0 ? '当前没有欠款。' : ''}`
        : option.detail;
    return `<button class="jgn-option" type="button" data-choice="${option.choice}"${disabled ? ' disabled' : ''}><strong>${option.title}</strong><span>${detail}</span></button>`;
  }).join('') : '';
  const result = run.status === 'RESULT' && run.outcome === 'INSTALLMENTS'
    ? `<section class="jgn-result"><h2>自动还款计划已生效</h2><p>签约没有扣款。未来 ${debtInstallmentPolicy.periods} 次有效周结每期最多还 ¥${debtInstallmentPolicy.weeklyPayment}；先结费用，现金不足则部分还款并暂停，夜间可恢复或取消。没有罚款，不自动卖股，现行利率照常。期满不等于清债。</p><button class="jgn-back" type="button" data-action="return">回到盘城街区</button></section>`
    : run.status === 'RESULT'
    ? `<section class="jgn-result"><h2>${run.outcome === 'INTEREST_GRACE' ? '拿到一次利息宽限' : run.outcome === 'RATE_RESTRUCTURE' ? '签下 8 期降息协议' : '按现行账单继续'}</h2><p>${run.outcome === 'INTEREST_GRACE' ? '你核对了账单并出示真实收入，九哥同意下一次周结免计利息一次。本金与其他费用照常。' : run.outcome === 'RATE_RESTRUCTURE' ? `已扣签约费¥${periodicCostPolicy.restructuringFee}。未来最多${periodicCostPolicy.restructuringWeeks}次周结按${(periodicCostPolicy.restructuredWeeklyInterestRate * 100).toFixed(2)}%计息，提前还清则停止；每期仍可自主还款，其他周期费用照常。` : '本次没有取得利息宽限。你仍可继续经营、交易、还款并保留存档。'}</p><button class="jgn-back" type="button" data-action="return">回到盘城街区</button></section>`
    : `<section class="jgn-dialog"><p class="jgn-step">协商 ${run.step + 1} / 3</p><h2>${['先把账对清楚', '再看现金流凭据', '最后谈下一期账单'][run.step]}</h2>${scenario ? `<p class="jgn-context">${scenario.context}</p>` : ''}<p class="jgn-line">九哥：${npcLine}</p>${historyInteraction}<div class="jgn-options">${stepOptions}</div><button class="jgn-leave" type="button" data-action="abandon">暂时离开，之后还能继续</button></section>`;

  screen.innerHTML = `<style>
    .jgn-screen{box-sizing:border-box;position:relative;display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;padding:calc(var(--safe-top) + 14px) 14px calc(var(--safe-bottom) + 14px);overflow:hidden;background:#191c23;color:#f1e7ce;font-family:"Courier New",monospace}
    .jgn-screen::before{z-index:-1;background-image:linear-gradient(180deg,rgba(12,17,22,.28),rgba(12,17,22,.12) 38%,rgba(12,17,22,.5) 63%,rgba(12,17,22,.94)),url('/art/jiuge-pawnshop-v1.webp');background-position:center;background-size:100% 100%,cover;background-repeat:no-repeat;image-rendering:pixelated;content:"";pointer-events:none}
    .jgn-owner{position:absolute;z-index:1;top:calc(var(--safe-top) + 30%);right:11%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:1px solid #c6ad75;background:rgba(26,31,35,.88);box-shadow:3px 3px #000;color:#f7efd9;font-size:9px;pointer-events:none}.jgn-owner-sprite{display:block;width:58px;height:66px;background-image:url('/art/jiuge-character-v3.png');background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}
    .jgn-header,.jgn-dialog,.jgn-result{position:relative;z-index:2;border:3px solid #95815e;background:rgba(35,38,44,.94);box-shadow:5px 5px #000}.jgn-header{flex:none;padding:12px}.jgn-title{margin:0;color:#f2cf82;font-size:18px}.jgn-stats{margin:8px 0 0;color:#d5cebc;font-size:12px}.jgn-dialog,.jgn-result{max-height:50%;margin:auto 0 0;padding:14px;overflow-y:auto;overscroll-behavior:contain}.jgn-step{color:#f2cf82;font-size:12px}.jgn-dialog h2,.jgn-result h2{font-size:17px}.jgn-context{margin:8px 0;padding:7px 9px;border-left:2px solid #9b8c68;background:rgba(16,19,23,.72);color:#bdb5a2;font-size:11px;line-height:1.45}.jgn-line,.jgn-result p{color:#ddd6c6;font-size:13px;line-height:1.55}.jgn-history-button,.jgn-history-reply{display:block;width:100%;min-height:44px;margin:8px 0;padding:10px;border:2px solid #857c69;background:#292c32;color:#f1d99b;font:inherit;font-size:12px;line-height:1.5;text-align:left}.jgn-history-button{cursor:pointer}.jgn-history-button:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}.jgn-history-button span{display:block;margin-top:3px;color:#bdb5a2;font-size:10px}.jgn-history-reply{border-left:3px solid #c1aa73;color:#ddd6c6}.jgn-options{display:grid;gap:9px;margin:14px 0}.jgn-option{display:flex;min-height:60px;flex-direction:column;justify-content:center;gap:5px;padding:9px;border:2px solid #aaa080;background:#373a43;color:#fff4d8;font:inherit;text-align:left;cursor:pointer}.jgn-option span{color:#d3ccba;font-size:11px;line-height:1.4}.jgn-option:active,.jgn-history-button:active,.jgn-back:active{transform:translate(2px,2px)}.jgn-option:disabled{opacity:.55;cursor:not-allowed}.jgn-leave,.jgn-back{width:100%;min-height:46px;border:2px solid #c7b278;background:#463e32;color:#fff2d3;font:inherit;cursor:pointer}
    @media(max-height:700px){.jgn-dialog,.jgn-result{max-height:47%;padding:10px}.jgn-owner{top:calc(var(--safe-top) + 24%)}.jgn-owner-sprite{width:48px;height:55px}}
  </style><span class="jgn-owner" aria-hidden="true"><span class="jgn-owner-sprite"></span><b>九哥</b></span><header class="jgn-header"><h1 class="jgn-title">第 ${state.day} 天 · 九哥的当铺</h1><p class="jgn-stats">现金 ¥${state.cash.toLocaleString()} · 欠款 ¥${state.debt.toLocaleString()} · 今日入账 ¥${(state.dailyWorkIncome + state.dailyStreamIncome).toLocaleString()} · 本周直播 ¥${state.weeklyStreamIncome.toLocaleString()}</p></header>${result}`;

  if (active && run.step === 2) {
    const preview = new DebtPlanPreview(state);
    screen.querySelector('.jgn-options')?.before(preview.el);
  }
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    if (isChoice(choice)) {
      dispatch({ type: 'CHOOSE_JIUGE_NEGOTIATION', choice });
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    if (action === 'abandon') dispatch({ type: 'ABANDON_JIUGE_NEGOTIATION' });
    if (action === 'ask-history') dispatch({ type: 'ASK_JIUGE_HISTORY' });
  });
  return screen;
}
