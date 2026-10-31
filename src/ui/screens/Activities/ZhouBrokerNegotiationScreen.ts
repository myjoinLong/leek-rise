import type { GameAction } from '../../../core/reducer';
import { brokeragePolicy, estimateBrokerPlanCost, getBrokerBreakEvenTurnover } from '../../../core/systems/brokerNegotiation';
import type { BrokerContractReview, BrokerMarketSnapshot, BrokerPlan, BrokerTurnover } from '../../../core/brokerNegotiationTypes';
import type { GameState } from '../../../core/types';
import { getBrokerNegotiationScenario } from '../../../core/brokerNegotiationScenarios';

const money = (amount: number): string => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(amount);
const turnoverOptions: readonly BrokerTurnover[] = brokeragePolicy.turnoverChoices;

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

function isTurnover(value: string | undefined): value is `${BrokerTurnover}` {
  return value !== undefined && turnoverOptions.some((turnover) => String(turnover) === value);
}

function isPlan(value: string | undefined): value is BrokerPlan {
  return value === 'STANDARD' || value === 'LOW_COMMISSION';
}

function reviewMarkup(review: BrokerContractReview | undefined): string {
  if (!review) return '';
  const outcome = review.netSavingsVsStandard >= 0
    ? `含服务费后比标准费率少支出 ¥${money(review.netSavingsVsStandard)}`
    : `含服务费后比标准费率多支出 ¥${money(Math.abs(review.netSavingsVsStandard))}`;
  const projected = review.projectedTurnover === null ? '未记录' : '¥' + money(review.projectedTurnover);
  return `<aside class="zbn-review"><strong>第 ${review.signedDay}–${review.expiresDay} 天 · 上期合同复盘</strong><span>预估成交额 ${projected}，实际 ¥${money(review.actualTurnover)}；佣金 ¥${money(review.discountedFeesPaid)} + 服务费 ¥${money(review.serviceFee)}。</span><b>${outcome}</b></aside>`;
}

function scenarioMarkup(
  scenarioIndex: number | undefined,
  snapshot: BrokerMarketSnapshot | undefined,
): string {
  if (scenarioIndex === undefined) return '';
  const scenario = getBrokerNegotiationScenario(scenarioIndex);
  if (!scenario) return '';
  const snapshotMarkup = snapshot
    ? `<div class="zbn-market"><strong>${escapeHtml(snapshot.stockName)} · 盘面快照</strong><span>今开 ¥${money(snapshot.openPrice)} · 现价 ¥${money(snapshot.currentPrice)} · 当日成交量 ${money(snapshot.dayVolume)} 股</span><span>近 ${snapshot.recentTradeCount} 笔成交额 ¥${money(snapshot.recentTurnover)}</span><span>主动买入 ${money(snapshot.recentBuyShares)} 股 · 主动卖出 ${money(snapshot.recentSellShares)} 股</span><span>${snapshot.bestSpread === null ? '盘口价差暂无报价' : `买卖一档价差 ¥${money(snapshot.bestSpread)}`}</span></div>`
    : '';
  return `<aside class="zbn-brief"><strong>${scenario.deskContext}</strong>${snapshotMarkup}<b>${scenario.focusTitle}</b><span>${scenario.focusPrompt}</span></aside>`;
}

export function createZhouBrokerNegotiationScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const run = state.activeActivity;
  if (!run || run.id !== 'ZHOU_BROKER_NEGOTIATION') throw new Error('Broker negotiation requires an active session.');

  const screen = document.createElement('main');
  screen.className = 'zbn-screen scene-screen';
  const currentRate = state.brokerContract && state.day <= state.brokerContract.expiresDay
    ? brokeragePolicy.lowFeeRate
    : brokeragePolicy.standardFeeRate;
  const scenarioContent = run.scenarioVersion === 2
    ? scenarioMarkup(run.scenarioIndex, run.marketSnapshot)
    : '';
  let body: string;

  if (run.status === 'RESULT') {
    const lowChosen = run.plan === 'LOW_COMMISSION';
    body = `<section class="zbn-card">${scenarioContent}${reviewMarkup(run.previousReview)}<p class="zbn-kicker">方案回执</p><h2>${lowChosen ? '七天优惠账户已签' : '保留标准账户'}</h2><p>${lowChosen
      ? `已扣服务费 ¥${money(run.serviceFeePaid)}，并计入今日结算。优惠综合费率为 ${(brokeragePolicy.lowFeeRate * 100).toFixed(2)}%，有效至第 ${run.expiresDay ?? run.day} 天；之后自动恢复标准费率，不自动续约。`
      : '没有签约费，继续按标准综合费率结算。你可以继续打工、经营和交易。'}</p><p class="zbn-note">刚才选择的七日成交额 ¥${money(run.projectedTurnover)} 只是估算，不保证未来成交量。</p><button class="zbn-primary" type="button" data-action="return">回到街区</button></section>`;
  } else if (run.step === 0) {
    body = `<section class="zbn-card">${scenarioContent}${reviewMarkup(run.previousReview)}<p class="zbn-kicker">第一步 · 先估成交量</p><h2>你觉得未来七天会交易多少？</h2><p>佣金按实际成交额收取。先选一个估算档位，比较两种账户的总成本；选择不会锁定你必须签约。</p><div class="zbn-options">${turnoverOptions.map((turnover) => `<button class="zbn-option" type="button" data-turnover="${turnover}"><strong>¥${money(turnover)}</strong><span>七天预估成交额</span></button>`).join('')}</div><button class="zbn-leave" type="button" data-action="abandon">暂时离开，不产生费用</button></section>`;
  } else {
    const turnover = run.projectedTurnover;
    if (turnover === null) throw new Error('Broker negotiation is missing its turnover estimate.');
    const standardCost = estimateBrokerPlanCost(turnover, 'STANDARD');
    const lowCost = estimateBrokerPlanCost(turnover, 'LOW_COMMISSION');
    const difference = Number((standardCost - lowCost).toFixed(2));
    const lowDisabled = state.cash < brokeragePolicy.serviceFee;
    body = `<section class="zbn-card">${scenarioContent}<p class="zbn-kicker">第二步 · 对比七天预估总费用</p><h2>按 ¥${money(turnover)} 成交额估算</h2><div class="zbn-compare"><div><strong>标准账户</strong><span>${(brokeragePolicy.standardFeeRate * 100).toFixed(2)}% 综合费率</span><b>约 ¥${money(standardCost)}</b><small>无签约费</small></div><div><strong>优惠账户</strong><span>${(brokeragePolicy.lowFeeRate * 100).toFixed(2)}% 综合费率</span><b>约 ¥${money(lowCost)}</b><small>含 ¥${money(brokeragePolicy.serviceFee)} 服务费</small></div></div><p class="zbn-break-even">盈亏平衡成交额：¥${money(getBrokerBreakEvenTurnover())}。按当前估算，优惠方案约 ${difference >= 0 ? '少' : '多'}支出 ¥${money(Math.abs(difference))}。</p><p class="zbn-note">这是基于你选择的成交额所做的费用试算，不是收益承诺。七天未达到平衡点，优惠账户总费用可能更高；服务费不退。</p><div class="zbn-options"><button class="zbn-option" type="button" data-plan="STANDARD"><strong>保留标准账户</strong><span>不付服务费，按 ${(brokeragePolicy.standardFeeRate * 100).toFixed(2)}% 结算</span></button><button class="zbn-option zbn-discount" type="button" data-plan="LOW_COMMISSION"${lowDisabled ? ' disabled' : ''}><strong>签七天优惠账户</strong><span>现在付 ¥${money(brokeragePolicy.serviceFee)} · 现金余额 ¥${money(state.cash)}${lowDisabled ? ' · 现金不足' : ''}</span></button></div><button class="zbn-leave" type="button" data-action="abandon">暂时离开，不签约也不收费</button></section>`;
  }

  screen.innerHTML = `<style>
    .zbn-screen{box-sizing:border-box;position:relative;display:flex;flex-direction:column;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;padding:calc(var(--safe-top) + 12px) 12px calc(var(--safe-bottom) + 12px);color:#fff1cc;font:12px "Courier New",monospace;background:#171d26}
    .zbn-screen::before{position:absolute;inset:0;z-index:0;background-image:linear-gradient(180deg,rgba(13,18,25,.28),rgba(13,18,25,.12) 42%,rgba(13,18,25,.55) 64%,rgba(13,18,25,.95)),url('/art/zhou-brokerage-office-v1.webp');background-position:center;background-size:100% 100%,cover;background-repeat:no-repeat;image-rendering:pixelated;content:"";pointer-events:none}
    .zbn-owner{position:absolute;z-index:1;top:calc(var(--safe-top) + 27%);left:12%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border:1px solid #c6ad75;background:rgba(26,31,35,.88);box-shadow:3px 3px #000;color:#f7efd9;font-size:9px;pointer-events:none}.zbn-owner-sprite{display:block;width:58px;height:66px;background-image:url('/art/zhou-character-v1.webp');background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}
    .zbn-header,.zbn-card{position:relative;z-index:2;border:3px solid #95815e;background:rgba(35,38,44,.94);box-shadow:5px 5px #000}.zbn-header{flex:none;padding:12px}.zbn-title{margin:0;color:#f2cf82;font-size:18px}.zbn-stats{margin:8px 0 0;color:#d5cebc;font-size:11px}.zbn-card{max-height:52%;margin:auto 0 0;padding:14px;overflow-y:auto;overscroll-behavior:contain}.zbn-kicker{margin:0 0 7px;color:#f2cf82;font-size:11px}.zbn-card h2{margin:0 0 9px;font-size:16px}.zbn-card p{color:#ddd6c6;line-height:1.55}.zbn-options{display:grid;gap:8px;margin:14px 0}.zbn-option{display:flex;min-height:54px;flex-direction:column;justify-content:center;gap:4px;padding:9px;border:2px solid #aaa080;background:#373a43;color:#fff4d8;font:inherit;text-align:left;cursor:pointer}.zbn-option span,.zbn-option small{color:#d3ccba;font-size:10px}.zbn-option:active,.zbn-primary:active{transform:translate(2px,2px)}.zbn-option:disabled{opacity:.5;cursor:not-allowed}.zbn-discount{border-color:#d9a35d}.zbn-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px}.zbn-compare div{display:grid;gap:6px;padding:9px;border:1px solid #756b54;background:#22272d}.zbn-compare span,.zbn-compare small{color:#c9c2b3;font-size:9px}.zbn-compare b{color:#f3d27f;font-size:14px}.zbn-break-even{padding:8px;border-left:3px solid #e6b763;background:#22272d}.zbn-note{color:#beb9ad!important;font-size:10px}.zbn-primary,.zbn-leave{width:100%;min-height:46px;border:2px solid #c7b278;background:#463e32;color:#fff2d3;font:inherit;cursor:pointer}.zbn-primary{margin-top:10px;background:#58503d}.zbn-header{position:relative;z-index:2}
    .zbn-review{display:grid;gap:5px;margin-bottom:12px;padding:9px;border:2px solid #c99d5d;background:#2f2a29;color:#f0e1c6;font-size:10px;line-height:1.45}.zbn-review strong{color:#f3ce83}.zbn-review b{color:#fff0c4}
    .zbn-brief,.zbn-market{display:grid;gap:5px}.zbn-brief{margin:8px 0;padding:9px;border:2px solid #81785f;background:#282b30;font-size:10px;line-height:1.45}.zbn-brief strong,.zbn-brief b{color:#f3ce83}.zbn-brief>span{color:#d3ccba}.zbn-market{margin:4px 0;padding:7px;border-left:2px solid #9d936f;background:#202329;color:#ddd6c6}.zbn-market strong{font-size:10px}.zbn-market span{font-size:9px}
    @media(max-height:700px){.zbn-card{max-height:46%;padding:10px}.zbn-owner{top:calc(var(--safe-top) + 23%)}.zbn-owner-sprite{width:48px;height:55px}}
  </style><span class="zbn-owner" aria-hidden="true"><span class="zbn-owner-sprite"></span><b>周经理</b></span><header class="zbn-header"><h1 class="zbn-title">第 ${state.day} 天 · 周经理的佣金谈判</h1><p class="zbn-stats">现金 ¥${money(state.cash)} · 当前综合费率 ${(currentRate * 100).toFixed(2)}% · 七天标准账户免费</p></header>${body}`;

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const turnover = target.closest<HTMLElement>('[data-turnover]')?.dataset.turnover;
    if (isTurnover(turnover)) {
      dispatch({ type: 'ESTIMATE_BROKER_TURNOVER', turnover: Number(turnover) as BrokerTurnover });
      return;
    }
    const plan = target.closest<HTMLElement>('[data-plan]')?.dataset.plan;
    if (isPlan(plan)) {
      dispatch({ type: 'CHOOSE_BROKER_PLAN', plan });
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    if (action === 'abandon') dispatch({ type: 'ABANDON_BROKER_NEGOTIATION' });
  });
  return screen;
}
