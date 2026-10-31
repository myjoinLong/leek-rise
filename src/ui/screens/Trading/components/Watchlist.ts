import type { Component } from '../../../../components/Component';
import type { StockCardVM, TradingVM } from '../types';

const sparklineWidth = 88;
const sparklineHeight = 16;
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

function createSparklinePoints(priceHistory: number[]): string {
  const prices = priceHistory.filter((price) => Number.isFinite(price));
  if (prices.length === 0) return '';

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return prices.map((price, index) => {
    const x = prices.length === 1
      ? sparklineWidth / 2
      : index * sparklineWidth / (prices.length - 1);
    const y = max === min
      ? sparklineHeight / 2
      : (max - price) / (max - min) * sparklineHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function renderStockCard(stock: StockCardVM, selected: boolean): string {
  const isUp = stock.changePct >= 0;
  const directionClass = isUp ? 'wl-change--up' : 'wl-change--down';
  const arrow = isUp ? '▲' : '▼';
  const holdingText = stock.holding
    ? `持仓 ${stock.holding.shares} 股 · 盈亏 ${stock.holding.pnlPct.toFixed(1)}%`
    : '未持仓';
  const cardClass = selected ? 'wl-card wl-card--selected' : 'wl-card';
  const identity = [stock.symbol, stock.sector].filter(Boolean).join(' · ');

  return `
    <button class="${cardClass}" type="button" data-id="${escapeHtml(stock.id)}" aria-pressed="${selected}">
      <span class="wl-card-top">
        <span class="wl-name-group"><span class="wl-name">${escapeHtml(stock.name)}</span>${identity ? `<span class="wl-identity">${escapeHtml(identity)}</span>` : ''}</span>
        <span class="wl-market">
          <span class="wl-price">${stock.price.toFixed(2)}</span>
          <span class="wl-change ${directionClass}"><span aria-hidden="true">${arrow}</span><span>${stock.changePct.toFixed(1)}%</span></span>
        </span>
      </span>
      <span class="wl-card-bottom">
        <span class="wl-holding">${holdingText}</span>
        <svg class="wl-sparkline" width="88" height="16" viewBox="0 0 88 16" aria-hidden="true">
          <polyline points="${createSparklinePoints(stock.priceHistory)}" fill="none" stroke="${isUp ? 'var(--up)' : 'var(--down)'}" stroke-width="1.2" />
        </svg>
      </span>
    </button>
  `;
}

export class Watchlist implements Component<TradingVM> {
  readonly el: HTMLElement;

  onSelect: (id: string) => void = () => {};

  private readonly headingEl: HTMLElement;
  private readonly listEl: HTMLElement;

  private readonly onCardClick = (event: Event): void => {
    if (!(event.target instanceof Element)) return;

    const card = event.target.closest<HTMLElement>('.wl-card');
    if (!card || !this.listEl.contains(card)) return;

    const id = card.dataset.id;
    if (id !== undefined) this.onSelect(id);
  };

  constructor() {
    this.el = document.createElement('section');
    this.el.className = 'wl-container';
    this.el.innerHTML = `
      <div class="wl-heading"></div>
      <div class="wl-list"></div>
    `;

    this.headingEl = this.el.querySelector<HTMLElement>('.wl-heading')!;
    this.listEl = this.el.querySelector<HTMLElement>('.wl-list')!;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.addEventListener('click', this.onCardClick);
  }

  update(state: TradingVM): void {
    const activeElement = document.activeElement;
    const focusedId = activeElement instanceof HTMLButtonElement && this.listEl.contains(activeElement)
      ? activeElement.dataset.id
      : undefined;

    this.headingEl.textContent = `盘城市场 · ${state.stocks.length}`;
    this.listEl.innerHTML = state.stocks
      .map((stock) => renderStockCard(stock, stock.id === state.selectedStockId))
      .join('');

    if (focusedId !== undefined) {
      const card = Array.from(this.listEl.querySelectorAll<HTMLButtonElement>('.wl-card'))
        .find((button) => button.dataset.id === focusedId);
      card?.focus({ preventScroll: true });
    }
  }

  destroy(): void {
    this.el.removeEventListener('click', this.onCardClick);
  }
}
