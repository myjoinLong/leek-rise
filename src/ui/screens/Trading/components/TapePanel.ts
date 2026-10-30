import type { Component } from '../../../../components/Component';
import type { OrderBookLevel, TradeRecord } from '../../../../core/types';

export interface TapePanelVM {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  recentTrades: TradeRecord[];
}

export class TapePanel implements Component<TapePanelVM> {
  readonly el: HTMLElement;

  private readonly bookEl: HTMLElement;
  private readonly tradesEl: HTMLElement;
  private newestTradeId: string | null = null;

  constructor() {
    this.el = document.createElement('section');
    this.el.className = 'tp-container';
    this.el.setAttribute('aria-label', '盘口与成交明细');
    this.el.innerHTML = `
      <div class="tp-title">盘口</div>
      <div class="tp-book"></div>
      <div class="tp-tape-title">实时成交</div>
      <div class="tp-trades" aria-live="polite"></div>
    `;
    this.bookEl = this.el.querySelector<HTMLElement>('.tp-book')!;
    this.tradesEl = this.el.querySelector<HTMLElement>('.tp-trades')!;
  }

  update(state: TapePanelVM): void {
    const asks = state.asks.slice(0, 3).reverse();
    const bids = state.bids.slice(0, 3);
    this.bookEl.innerHTML = `
      <div class="tp-book-side">
        <div class="tp-book-heading"><span>卖盘</span><span>数量</span></div>
        ${asks.map((level) => this.renderBookLevel(level, 'tp-ask')).join('')}
      </div>
      <div class="tp-book-side">
        <div class="tp-book-heading"><span>买盘</span><span>数量</span></div>
        ${bids.map((level) => this.renderBookLevel(level, 'tp-bid')).join('')}
      </div>
    `;

    const newestTradeId = state.recentTrades[0]?.id ?? null;
    this.tradesEl.innerHTML = state.recentTrades.length > 0
      ? state.recentTrades.map((trade) => this.renderTrade(trade)).join('')
      : '<div class="tp-empty">等待成交</div>';
    if (newestTradeId && newestTradeId !== this.newestTradeId) {
      this.tradesEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    this.newestTradeId = newestTradeId;
  }

  private renderBookLevel(level: OrderBookLevel, className: string): string {
    return `<div class="tp-book-row ${className}"><span>${level.price.toFixed(2)}</span><span>${level.volume.toLocaleString()}</span></div>`;
  }

  private renderTrade(trade: TradeRecord): string {
    const sideClass = trade.side === 'BUY' ? 'tp-buy' : 'tp-sell';
    const sideLabel = trade.side === 'BUY' ? '买入' : '卖出';
    const player = trade.isPlayer ? '🌟 ' : '';
    const playerClass = trade.isPlayer ? 'tp-player' : '';
    return `<div class="tp-trade-row ${sideClass} ${playerClass}"><span>${player}${sideLabel}</span><span>${trade.price.toFixed(2)}</span><span>${trade.shares.toLocaleString()}</span></div>`;
  }
}
