import type { Component } from '../../../components/Component';
import type { GameState } from '../../../core/types';
import type { DebtInstallmentAction, DebtInstallmentPlan } from '../../../core/debtInstallmentTypes';
import '../Trading/styles/trading.css';

const statuses: Record<DebtInstallmentPlan['status'], string> = {
  ACTIVE: '进行中', PAUSED: '现金不足，已暂停', FINISHED: '八期已结束，剩余欠款仍需偿还',
  CANCELLED: '已取消，欠款保留', DEBT_CLEARED: '欠款已清偿',
};

export class DebtInstallmentPanel implements Component<GameState> {
  el: HTMLElement;
  private state: GameState;

  constructor(state: GameState, private readonly dispatch: (action: DebtInstallmentAction) => void) {
    this.el = document.createElement('section');
    this.el.className = 'dip-panel';
    this.state = state;
    this.bindEvents();
    this.update(state);
  }

  private bindEvents(): void {
    this.el.addEventListener('click', this.onAction);
  }

  private onAction = (event: MouseEvent): void => {
    if (!(event.target instanceof Element) || !this.state.debtInstallmentPlan) return;
    const action = event.target.closest<HTMLButtonElement>('button')?.dataset.action;
    if (action === 'resume') this.dispatch({ type: 'RESUME_DEBT_INSTALLMENTS' });
    if (action === 'cancel') this.dispatch({ type: 'CANCEL_DEBT_INSTALLMENTS' });
  };

  update(state: GameState): void {
    this.state = state;
    const plan = state.debtInstallmentPlan;
    this.el.hidden = !plan;
    if (!plan) return;
    const receipt = plan.lastReceipt;
    this.el.innerHTML = `<h2>九哥 · 自动还款计划</h2><p>${statuses[plan.status]} · 剩余 ${plan.remaining} 期 · 每期 ¥${plan.weeklyPayment}</p>
      <p>周结先计利息和费用，再从现金还款；不卖股票，不改变现行利率。缺口不罚款、不重复计债，暂停后需手动恢复。可取消，已还金额不退且本次协商不再重签；八期结束不代表清债。</p>
      ${receipt ? `<p>最近回执：第 ${receipt.day} 天，应还 ¥${receipt.due}，实还 ¥${receipt.paid}，缺口 ¥${receipt.shortfall}。还款等额减少现金和欠款，不计入费用。</p>` : '<p>尚未到首次周结，不会在签约时扣款。</p>'}
      ${plan.status === 'PAUSED' ? '<button type="button" data-action="resume">从下次周结恢复</button>' : ''}
      ${plan.status === 'ACTIVE' || plan.status === 'PAUSED' ? '<button type="button" data-action="cancel">取消后续自动还款</button>' : ''}`;
  }

  destroy(): void {
    this.el.removeEventListener('click', this.onAction);
    this.el.remove();
  }
}
