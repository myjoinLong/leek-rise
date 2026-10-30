import { createMockNightVM } from './mock';
import type { NightVM } from './types';
import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { DebtInstallmentPanel } from '../Activities/DebtInstallmentPanel';
import { selectNightVM } from './selectors';
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character] ?? character);
}
function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}¥${Math.abs(value).toLocaleString()}`;
}
function formatUnsignedMoney(value: number): string {
  return Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function progressWidth(value: number): number {
  return Math.max(0, Math.min(100, value));
}
export class NightScreen {
  readonly el: HTMLElement;
  private readonly contentEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly onNextDay: () => void;
  private readonly onRepay: (amount: number) => void;
  private readonly onNextDayClick = (): void => {
    this.onNextDay();
  };
  constructor(state: NightVM = createMockNightVM(), onNextDay: () => void = () => {}, onRepay: (amount: number) => void = () => {}) {
    this.onNextDay = onNextDay;
    this.onRepay = onRepay;
    this.el = document.createElement('div');
    this.el.className = 'ns-screen scene-screen';
    this.el.innerHTML = `
      <style>
        .ns-screen { box-sizing: border-box; position:relative; display: flex; flex-direction: column; width: 100%; height: 100vh; height:100dvh; max-width: 480px; margin: 0 auto; overflow: hidden; color: var(--text-primary); font-family: var(--font-sans); }
        .ns-header { flex: 0 0 auto; padding: var(--sp-4); }
        .ns-kicker { margin-bottom:6px; color:#e5c77a; font-size:10px; letter-spacing:2px; text-shadow:2px 2px #111; }
        .ns-title { color: var(--text-primary); font-size: var(--fs-title); font-weight: 600; line-height: 1.3; }
        .ns-scroll-area { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 var(--sp-4) calc(var(--safe-bottom) + 84px); }
        .ns-content { display: flex; flex-direction: column; gap: var(--sp-4); }
        .ns-finance-card { padding: var(--sp-4); background: rgba(25,28,35,.93); border:2px solid #787461; border-radius: 0; box-shadow: 4px 4px #000; }
        .ns-finance-list { display: flex; flex-direction: column; gap: var(--sp-2); }
        .ns-finance-item { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); color: var(--text-secondary); font-size: var(--fs-body); }
        .ns-cost-note { margin: var(--sp-3) 0 0; color: var(--text-weak); font-size: var(--fs-tiny); line-height: 1.5; }
        .ns-broker-review { padding: var(--sp-3); border: 2px solid #88816e; background: rgba(34,38,45,.94); color: var(--text-secondary); font-size: var(--fs-caption); line-height: 1.5; }
        .ns-broker-review strong { display: block; margin-top: var(--sp-1); color: var(--text-primary); font-variant-numeric: tabular-nums; }
        .ns-finance-value { color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ns-net-change { display: flex; justify-content: space-between; gap: var(--sp-3); margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 2px solid var(--border-strong); font-size: var(--fs-title); font-weight: 700; }
        .ns-net-change--up { color: var(--up); }
        .ns-net-change--down { color: var(--down); }
        .ns-net-change .ns-finance-value { color: inherit; }
        .ns-status { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-3); }
        .ns-stat { min-width: 0; }
        .ns-stat-heading { display: flex; justify-content: space-between; gap: var(--sp-1); margin-bottom: var(--sp-2); color: var(--text-secondary); font-size: var(--fs-caption); }
        .ns-stat-value { color: var(--text-primary); font-variant-numeric: tabular-nums; }
        .ns-progress { height: 6px; overflow: hidden; background: var(--bg-input); border-radius: var(--radius-pill); }
        .ns-progress-fill { height: 100%; border-radius: inherit; }
        .ns-progress-fill--mental { background: var(--info); }
        .ns-progress-fill--dignity { background: var(--warn); }
        .ns-progress-fill--fame { background: var(--up); }
        .ns-warnings { display: flex; flex-direction: column; gap: var(--sp-2); color: var(--warn); font-size: var(--fs-caption); }
        .ns-warning { line-height: 1.4; }
        .ns-npc { padding: var(--sp-3); background: rgba(25,28,35,.90); border:2px solid #777264; border-left: 4px solid #c6ae6d; border-radius: 0; box-shadow:3px 3px #000; }
        .ns-npc-name { margin-bottom: var(--sp-1); color: var(--text-secondary); font-size: var(--fs-caption); }
        .ns-npc-content { color: var(--text-secondary); font-size: var(--fs-body); line-height: 1.5; }
        .ns-debt-repay { padding: var(--sp-4); background: rgba(25,28,35,.93); border:2px solid #787461; box-shadow:4px 4px #000; }
        .ns-debt-title { margin-bottom: var(--sp-2); color: var(--text-primary); font-size: var(--fs-section); }
        .ns-debt-summary,.ns-debt-note { color: var(--text-secondary); font-size: var(--fs-caption); line-height:1.45; }
        .ns-debt-label { display:block; margin:var(--sp-3) 0 var(--sp-1); color:var(--text-secondary); font-size:var(--fs-caption); }
        .ns-debt-controls { display:flex; gap:var(--sp-2); }
        .ns-debt-input { box-sizing:border-box; flex:1; min-width:0; min-height:44px; padding:var(--sp-2); border:2px solid var(--border-strong); border-radius:0; background:var(--bg-input); color:var(--text-primary); font:inherit; font-variant-numeric:tabular-nums; }
        .ns-debt-button { min-width:84px; min-height:44px; border:2px solid #c9b77b; border-radius:0; background:#343743; box-shadow:3px 3px #000; color:var(--text-primary); font-weight:bold; cursor:pointer; }
        .ns-debt-button:active { transform:translate(2px,2px); box-shadow:1px 1px #000; }
        .ns-debt-button:disabled { opacity:.5; cursor:not-allowed; }
        .ns-debt-error { min-height:1.3em; margin-top:var(--sp-1); color:var(--warn); font-size:var(--fs-caption); }
        .ns-debt-note { margin-top:var(--sp-2); }
        .ns-footer { box-sizing: border-box; position: fixed; z-index: 10; right: 0; bottom: 0; left: 0; width: 100%; max-width: 480px; margin: 0 auto; padding: var(--sp-3) var(--sp-4) var(--safe-bottom); background: rgba(20,23,31,.94); border-top: 2px solid #625e50; }
        .ns-next-button { width: 100%; min-height: 50px; color: var(--text-primary); background: #343743; border: 2px solid #c9b77b; border-radius: 0; box-shadow:4px 4px #000; font-family: inherit; font-size: var(--fs-body); cursor: pointer; }
        .ns-next-button:active { transform: scale(0.97); }
        .ns-next-button:focus-visible { outline: 2px solid var(--info); outline-offset: 2px; }
        .ns-screen button { font-family: inherit; }
      </style>
      <header class="ns-header"><p class="ns-kicker">盘城 · 夜间账本</p><h1 class="ns-title"></h1></header>
      <main class="ns-scroll-area"><div class="ns-content"></div></main>
      <footer class="ns-footer"><button class="ns-next-button" type="button"></button></footer>
    `;
    this.titleEl = this.el.querySelector<HTMLElement>('.ns-title')!;
    this.contentEl = this.el.querySelector<HTMLElement>('.ns-content')!;
    this.nextButton = this.el.querySelector<HTMLButtonElement>('.ns-next-button')!;
    this.bindEvents();
    this.update(state);
  }
  update(state: NightVM): void {
    this.titleEl.textContent = `第 ${state.day} 天 · 结算`;
    this.nextButton.textContent = `进入第 ${state.day + 1} 天`;
    this.contentEl.innerHTML = this.renderContent(state);
    this.contentEl.querySelectorAll<HTMLElement>('.ns-finance-item, .ns-net-change').forEach((item, index) => {
      item.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 200, delay: index * 150, easing: 'ease-out', fill: 'both' },
      );
    });
  }
  private bindEvents(): void {
    this.nextButton.addEventListener('click', this.onNextDayClick);
    this.el.addEventListener('click', (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const repayButton = target.closest<HTMLButtonElement>('.ns-debt-button');
      if (!repayButton || repayButton.disabled) return;
      const input = this.el.querySelector<HTMLInputElement>('.ns-debt-input');
      const error = this.el.querySelector<HTMLElement>('.ns-debt-error');
      const amount = Number(input?.value);
      const maxAmount = Number(input?.max);
      if (!Number.isFinite(amount) || amount <= 0) {
        if (error) error.textContent = '请输入大于 ¥0 的还款金额。';
        return;
      }
      if (!Number.isFinite(maxAmount) || amount > maxAmount) {
        if (error) error.textContent = '还款金额不能超过当前现金或负债。';
        return;
      }
      this.onRepay(amount);
    });
  }
  private renderContent(state: NightVM): string {
    const { pnlBreakdown } = state;
    const breakdown = [
      ['交易盈亏', pnlBreakdown.tradingPnl],
      ['打工收入', pnlBreakdown.workIncome],
      ['副本收入', pnlBreakdown.activityIncome],
      ['手续费/滑点', pnlBreakdown.fees],
      ['协商签约费', pnlBreakdown.contractFee],
      [`周利息${state.interestGraceApplied ? '（本期宽限）' : state.rateRestructureApplied ? '（0.25%协议）' : ''}`, pnlBreakdown.interest],
      ['房租', pnlBreakdown.rent],
      ['会员费', pnlBreakdown.membership],
      ['设备费', pnlBreakdown.equipment],
      ['直播平台分成', pnlBreakdown.platformShare],
    ] as const;
    const netClass = pnlBreakdown.netChange >= 0 ? 'ns-net-change--up' : 'ns-net-change--down';
    const crisisMessage = state.debtNegotiationCompleted
      ? '九哥协商已完成，当前条款见下方账目。'
      : '可前往九哥处查看协商选项，也可通过工作、交易与还款逐步改善。';
    const warningMessages = state.debtCrisisStarted
      ? [...state.warnings, `第30天未清偿，已进入债务重组/危机阶段。存档保留，可继续游玩。${crisisMessage}`]
      : state.warnings;
    const warnings = warningMessages.length > 0
      ? `<section class="ns-warnings" aria-label="警告">${warningMessages.map((warning) => `<div class="ns-warning">⚠ ${escapeHtml(warning)}</div>`).join('')}</section>`
      : '';
    const costPolicy = state.periodicCostPolicy, currentWeeklyRate = state.rateRestructureApplied || state.debtRatePlanWeeksRemaining > 0 ? costPolicy.restructuredWeeklyInterestRate : costPolicy.weeklyInterestRate;
    const costNote = state.interestGraceApplied ? '九哥协商宽限已生效：本期周利息暂停一次，其他费用照常结算。' : `${state.rateRestructureApplied ? `九哥降息协议本期按 ${(currentWeeklyRate * 100).toFixed(2)}% 计息；` : state.debtRatePlanWeeksRemaining > 0 ? `九哥降息协议剩余 ${state.debtRatePlanWeeksRemaining} 次周结，利率 ${(currentWeeklyRate * 100).toFixed(2)}%；` : ''}${state.periodicSettlementDue ? '本日为周结日。' : ''}每 ${costPolicy.intervalDays} 天结算：负债按 ${(currentWeeklyRate * 100).toFixed(2)}% 计周利息；房租 ¥${costPolicy.rent}、会员 ¥${costPolicy.membership}、设备 ¥${costPolicy.equipment}；直播流水分成 ${(costPolicy.streamPlatformShareRate * 100).toFixed(0)}%。利息计入负债，固定费用现金不足部分转入负债。`;
    const maxRepay = Number(Math.min(state.cash, state.debt).toFixed(2));
    const review = state.brokerageReview;
    const brokerageReview = review
      ? `<section class="ns-broker-review" aria-label="佣金协议回顾"><div>周经理优惠协议 · ${review.active ? `有效至第 ${review.expiresDay} 天` : '优惠期已结束'}</div><div>实际成交 ¥${formatUnsignedMoney(review.actualTurnover)} / 预估 ${review.projectedTurnover === null ? '未记录' : '¥' + formatUnsignedMoney(review.projectedTurnover)}</div><div>优惠期实付费用 ¥${formatUnsignedMoney(review.discountedFeesPaid)} · 标准费率对应 ¥${formatUnsignedMoney(review.standardFeesEquivalent)} · 服务费 ¥${formatUnsignedMoney(review.serviceFee)}</div><strong>${review.netSavings >= 0 ? '累计净省' : '累计净多支出'} ¥${formatUnsignedMoney(review.netSavings)}</strong></section>`
      : '';
    const inputDefault = Math.min(1000, maxRepay);
    const repay = maxRepay > 0
      ? `<section class="ns-debt-repay" aria-label="偿还负债">
          <h2 class="ns-debt-title">偿还本金</h2>
          <p class="ns-debt-summary">现金 ¥${state.cash.toLocaleString()} · 当前负债 ¥${state.debt.toLocaleString()}</p>
          <label class="ns-debt-label" for="ns-repay-amount">本次还款金额（最多 ¥${maxRepay.toLocaleString()}）</label>
          <div class="ns-debt-controls"><input class="ns-debt-input" id="ns-repay-amount" type="number" inputmode="decimal" min="0.01" max="${maxRepay}" step="0.01" value="${inputDefault}"><button class="ns-debt-button" type="button">确认还款</button></div>
          <p class="ns-debt-error" role="alert" aria-live="polite"></p>
          <p class="ns-debt-note">偿还本金会等额减少现金与负债，不改变当日净资产。</p>
        </section>`
      : '<section class="ns-debt-repay" aria-label="偿还负债"><h2 class="ns-debt-title">当前无需还款</h2><p class="ns-debt-summary">现金或负债余额为 ¥0。</p></section>';
    return `
      <section class="ns-finance-card" aria-label="收支明细">
        <div class="ns-finance-list">
          ${breakdown.map(([label, value]) => `<div class="ns-finance-item"><span>${label}</span><span class="ns-finance-value">${formatMoney(value)}</span></div>`).join('')}
        </div>
        <div class="ns-net-change ${netClass}"><span>今日净变动</span><span class="ns-finance-value">${formatMoney(pnlBreakdown.netChange)}</span></div>
        <p class="ns-cost-note">${escapeHtml(costNote)}</p>
      </section>
      ${brokerageReview}
      <section class="ns-status" aria-label="状态变化">
        ${this.renderStat('心态', state.mental, 'mental')}
        ${this.renderStat('体面', state.dignity, 'dignity')}
        ${this.renderStat('流量', state.fame, 'fame')}
      </section>
      ${warnings}
      <section class="ns-npc" aria-label="NPC 评价">
        <div class="ns-npc-name">【${escapeHtml(state.npcReaction.npcName)}】</div>
        <div class="ns-npc-content">${escapeHtml(state.npcReaction.content)}</div>
      </section>
      ${repay}
    `;
  }
  private renderStat(label: string, value: number, kind: 'mental' | 'dignity' | 'fame'): string {
    return `<div class="ns-stat"><div class="ns-stat-heading"><span>${label}</span><span class="ns-stat-value">${value}</span></div><div class="ns-progress"><div class="ns-progress-fill ns-progress-fill--${kind}" style="width:${progressWidth(value)}%"></div></div></div>`;
  }
}
export function createNightScreen(state: GameState, dispatch: (action: GameAction) => GameState): HTMLElement {
  const showPlan = (next: GameState): void => {
    const panel = new DebtInstallmentPanel(next, (action) => {
      const updated = dispatch(action);
      screen.update(selectNightVM(updated)); showPlan(updated);
    });
    screen.el.querySelector('.ns-content')?.append(panel.el);
  };
  const screen = new NightScreen(
    selectNightVM(state),
    () => dispatch({ type: 'ADVANCE_PHASE' }), (amount) => {
      const nextState = dispatch({ type: 'REPAY_DEBT', amount });
      screen.update(selectNightVM(nextState)); showPlan(nextState);
    });
  showPlan(state);
  return screen.el;
}
