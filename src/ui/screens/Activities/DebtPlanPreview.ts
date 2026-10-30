import type { Component } from '../../../components/Component';
import type { GameState } from '../../../core/types';
import { previewDebtOffers, type DebtOfferPreview } from '../../../core/systems/debtPlanPreview';
import '../Trading/styles/trading.css';

const titles: Record<DebtOfferPreview['choice'], string> = {
  SIGN_STANDARD: '现行账单',
  ASK_INTEREST_GRACE: '免费一次宽限',
  SIGN_RATE_RESTRUCTURE: '付费八期降息',
  SIGN_INSTALLMENTS: '免费八期自动还款',
};
const currency = (value: number): string => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export class DebtPlanPreview implements Component<GameState> {
  el: HTMLElement;
  private state: GameState;

  constructor(state: GameState) {
    this.el = document.createElement('section');
    this.el.className = 'dpp-preview';
    this.state = state;
    this.el.innerHTML = `<h3>签约前现金流试算</h3><p>原型情景，仅试算、不实际扣款，也不保证收入。比较未来八次周结：每期先加入你填写的工作净入账，再结周成本与利息，最后按现金和欠款上限还款。不卖股票，不计未来交易、借款或直播；当前已入账的本周直播仍扣平台分成。下一周结前也按完整一期收入假设。</p>
      <label>每期额外工作净入账（元）<input data-income type="number" min="0" max="1000000" step="0.01" value="0"></label>
      <label>每期计划偿债（元）<input data-repayment type="number" min="0" max="1000000" step="0.01" value="0"></label>
      <p>初值均为 0，请自行填入计划。只做比较，不影响存档；刷新或离开重置。自动还款方案每期固定 ¥300，忽略计划偿债输入，不追加手动还款；缺口后暂停且不自动恢复、不罚款。其他方案的缺口只作提示。</p><div data-results aria-live="polite"></div>`;
    this.bindEvents();
    this.update(state);
  }

  private bindEvents(): void {
    this.el.addEventListener('input', this.onInput);
  }

  private onInput = (): void => {
    this.update(this.state);
  };

  update(state: GameState): void {
    this.state = state;
    const income = this.el.querySelector<HTMLInputElement>('[data-income]');
    const repayment = this.el.querySelector<HTMLInputElement>('[data-repayment]');
    const results = this.el.querySelector<HTMLElement>('[data-results]');
    if (!income || !repayment || !results) return;
    if ([income, repayment].some((input) => input.value === '' || !input.validity.valid)) {
      results.textContent = '请输入 0–1,000,000 元、最多两位小数的金额。';
      return;
    }
    const previews = previewDebtOffers(state, { weeklyWorkIncome: income.valueAsNumber, weeklyRepayment: repayment.valueAsNumber });
    results.innerHTML = previews.map((preview) => {
      if (!preview.available) return `<p>${titles[preview.choice]}：当前不满足签约凭据或现金条件。</p>`;
      const last = preview.weeks[preview.weeks.length - 1];
      if (!last) return '';
      const interest = preview.weeks.reduce((sum, week) => sum + week.interest, 0);
      const costs = preview.weeks.reduce((sum, week) => sum + week.operatingCosts, 0);
      const base = previews[0];
      const difference = Number((preview.cashMinusDebtChange - (base?.cashMinusDebtChange ?? 0)).toFixed(2));
      const comparison = difference === 0 ? '持平' : `${difference > 0 ? '▲ 改善' : '▼ 减少'} ${currency(Math.abs(difference))}`;
      return `<details><summary>${titles[preview.choice]}：期末欠款 ${currency(last.debt)}；相对现行方案 ${comparison}</summary>
        <p>签约费 ${currency(preview.contractFee)} · 累计利息 ${currency(interest)} · 周成本 ${currency(costs)}<br>期末现金 ${currency(last.cash)} · 现金减欠款变化 ${currency(preview.cashMinusDebtChange)}<br>相对现行方案 ${comparison}（不含不变的股票市值）</p>
        <ol>${preview.weeks.map((week) => `<li>第${week.day}天：利息 ${currency(week.interest)}；偿债 ${currency(week.repaid)}；现金不足的还款缺口 ${currency(week.repaymentShortfall)}；费用转债 ${currency(week.deferred)}；现金 ${currency(week.cash)}；欠款 ${currency(week.debt)}${week.installmentStatus ? `；自动计划${week.installmentStatus.status === 'PAUSED' ? '暂停' : week.installmentStatus.status === 'ACTIVE' ? '进行中' : '已结束'}` : ''}</li>`).join('')}</ol></details>`;
    }).join('');
  }

  destroy(): void {
    this.el.removeEventListener('input', this.onInput);
    this.el.remove();
  }
}
