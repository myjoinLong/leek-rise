import type { Component } from '../../../../components/Component';
import type { TradingVM } from '../types';

export class QuoteGrid implements Component<TradingVM> {
  readonly el: HTMLElement;

  private readonly contentEl: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'qg-container';
    this.el.innerHTML = `
      <div class="qg-content"></div>
    `;
    this.contentEl = this.el.querySelector<HTMLElement>('.qg-content')!;
  }

  update(state: TradingVM): void {
    const detail = state.selectedDetail;
    if (!detail) {
      this.contentEl.innerHTML = '';
      return;
    }

    this.contentEl.innerHTML = `
      <div class="qg-grid">
        <div class="qg-cell">
          <span class="qg-label">今开</span>
          <span class="qg-value qg-primary">${detail.open.toFixed(2)}</span>
        </div>
        <div class="qg-cell">
          <span class="qg-label">最高</span>
          <span class="qg-value qg-up">${detail.high.toFixed(2)}</span>
        </div>
        <div class="qg-cell">
          <span class="qg-label">最低</span>
          <span class="qg-value qg-down">${detail.low.toFixed(2)}</span>
        </div>
        <div class="qg-cell">
          <span class="qg-label">成交</span>
          <span class="qg-value qg-primary">${(detail.volume / 10000).toFixed(1)}万手</span>
        </div>
      </div>
    `;
  }
}
