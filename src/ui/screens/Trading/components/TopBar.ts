import type { Component } from '../../../../components/Component';
import type { Phase, TradingVM } from '../types';

const phaseLabels: Record<Phase, string> = {
  PRE_MARKET: '早盘',
  DAYTIME: '白天',
  TRADING: '交易',
  NIGHT: '结算',
};

const amountFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export class TopBar implements Component<TradingVM> {
  readonly el: HTMLElement;

  private readonly periodEl: HTMLElement;
  private readonly cashEl: HTMLElement;
  private readonly debtEl: HTMLElement;

  constructor() {
    this.el = document.createElement('header');
    this.el.className = 'top-bar';
    this.el.innerHTML = `
      <div class="top-bar__row top-bar__heading">
        <span class="top-bar__period"></span>
        <span class="top-bar__menu" aria-hidden="true">⋮</span>
      </div>
      <div class="top-bar__row top-bar__balances">
        <span class="top-bar__cash">现金 <span class="tabular-nums"></span></span>
        <span class="top-bar__debt">负债 <span class="tabular-nums"></span></span>
      </div>
    `;

    this.periodEl = this.el.querySelector<HTMLElement>('.top-bar__period')!;
    this.cashEl = this.el.querySelector<HTMLElement>('.top-bar__cash .tabular-nums')!;
    this.debtEl = this.el.querySelector<HTMLElement>('.top-bar__debt .tabular-nums')!;
  }

  update(state: TradingVM): void {
    this.periodEl.textContent = `第 ${state.day} 天 · ${phaseLabels[state.phase]}`;
    this.cashEl.textContent = `¥${amountFormatter.format(state.cash)}`;
    this.debtEl.textContent = `¥${amountFormatter.format(state.debt)}`;
  }
}
