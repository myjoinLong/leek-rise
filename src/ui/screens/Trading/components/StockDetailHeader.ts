import type { Component } from '../../../../components/Component';
import type { TradingVM } from '../types';

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

export class StockDetailHeader implements Component<TradingVM> {
  readonly el: HTMLElement;

  private readonly contentEl: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'sdh-container';
    this.el.innerHTML = `
      <div class="sdh-content"></div>
    `;
    this.contentEl = this.el.querySelector<HTMLElement>('.sdh-content')!;
  }

  update(state: TradingVM): void {
    const detail = state.selectedDetail;
    if (!detail) {
      this.contentEl.innerHTML = '';
      return;
    }

    const isUp = detail.changePct >= 0;
    const directionClass = isUp ? 'sdh-up' : 'sdh-down';
    const changeSign = isUp ? '+' : '-';
    const directionSymbol = detail.changePct > 0 ? '▲ ' : detail.changePct < 0 ? '▼ ' : '';
    const changeText = `${changeSign}${Math.abs(detail.changeAmount).toFixed(2)}`;

    this.contentEl.innerHTML = `
      <div class="sdh-layout">
        <div class="sdh-name">${escapeHtml(detail.name)}</div>
        <div class="sdh-values ${directionClass}">
          <span class="sdh-price tabular-nums">${detail.price.toFixed(2)}</span>
          <span class="sdh-change tabular-nums">${directionSymbol}${changeText}</span>
        </div>
      </div>
    `;
  }
}
