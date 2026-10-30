import type { Component } from '../../../../components/Component';
import { standardTradingFeeRate, type OrderEstimate } from '../../../../core/systems/orderBook';
import type { TradingHandlers, TradingVM } from '../types';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const sharesFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export class OrderPanel implements Component<TradingVM> {
  readonly el: HTMLElement;

  private handlers: TradingHandlers | null = null;
  private state: TradingVM | null = null;
  private readonly inputEl: HTMLInputElement;
  private readonly leverageInputEl: HTMLInputElement;
  private readonly leverageStatusEl: HTMLElement;
  private readonly buyEstimateEl: HTMLElement;
  private readonly sellEstimateEl: HTMLElement;
  private readonly capacityEl: HTMLElement;
  private readonly partialFillNoteEl: HTMLElement;
  private readonly errorEl: HTMLElement;
  private readonly buyButtonEl: HTMLButtonElement;
  private readonly sellButtonEl: HTMLButtonElement;

  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-op-action]');
    if (!button || button.disabled) return;

    switch (button.dataset.opAction) {
      case 'decrease': {
        const current = this.state?.inputShares ?? 100;
        this.handlers?.onInputShares(Math.max(100, current - 100));
        break;
      }
      case 'increase':
        this.handlers?.onInputShares((this.state?.inputShares ?? 100) + 100);
        break;
      case 'half':
        this.handlers?.onQuickAmount(0.5);
        break;
      case 'all':
        this.handlers?.onQuickAmount(1);
        break;
      case 'buy':
        this.handlers?.onSubmit('BUY');
        break;
      case 'sell':
        this.handlers?.onSubmit('SELL');
        break;
      case 'skip':
        this.handlers?.onSkipDay();
        break;
    }
  };

  private readonly onInput = (): void => {
    const value = Number(this.inputEl.value);
    this.handlers?.onInputShares(Number.isFinite(value) ? value : 0);
  };

  private readonly onToggleLeverage = (): void => {
    this.handlers?.onToggleLeverage();
  };

  constructor() {
    this.el = document.createElement('section');
    this.el.className = 'op-container';
    this.el.setAttribute('aria-label', '下单面板');
    this.el.innerHTML = `
      <div class="op-quantity-row">
        <button class="op-step-button" type="button" data-op-action="decrease" aria-label="减少100股"><span class="op-step-glyph">−</span></button>
        <input class="op-input" type="number" inputmode="numeric" min="100" step="100" aria-label="委托数量（股）">
        <button class="op-step-button" type="button" data-op-action="increase" aria-label="增加100股"><span class="op-step-glyph">+</span></button>
        <button class="op-quick-button" type="button" data-op-action="half">½仓</button>
        <button class="op-quick-button" type="button" data-op-action="all">全仓</button>
      </div>
      <div class="op-meta-row">
        <label class="op-leverage-label"><input type="checkbox" class="op-lev-input"> 融资 2x</label>
        <span class="op-leverage-status"></span>
      </div>
      <div class="op-estimates" aria-label="订单金额预估">
        <span class="op-estimate-buy"></span>
        <span class="op-estimate-sell"></span>
        <span class="op-estimate-capacity"></span>
        <span class="op-estimate-partial"></span>
      </div>
      <div class="op-actions">
        <button class="op-submit-button op-buy-button" type="button" data-op-action="buy">买入</button>
        <button class="op-submit-button op-sell-button" type="button" data-op-action="sell">卖出</button>
      </div>
      <div class="op-error" role="status" aria-live="polite" hidden></div>
      <button class="op-skip-button" type="button" data-op-action="skip">今天不操作，去结算</button>
    `;

    this.inputEl = this.el.querySelector<HTMLInputElement>('.op-input')!;
    this.leverageInputEl = this.el.querySelector<HTMLInputElement>('.op-lev-input')!;
    this.leverageStatusEl = this.el.querySelector<HTMLElement>('.op-leverage-status')!;
    this.buyEstimateEl = this.el.querySelector<HTMLElement>('.op-estimate-buy')!;
    this.sellEstimateEl = this.el.querySelector<HTMLElement>('.op-estimate-sell')!;
    this.capacityEl = this.el.querySelector<HTMLElement>('.op-estimate-capacity')!;
    this.partialFillNoteEl = this.el.querySelector<HTMLElement>('.op-estimate-partial')!;
    this.errorEl = this.el.querySelector<HTMLElement>('.op-error')!;
    this.buyButtonEl = this.el.querySelector<HTMLButtonElement>('.op-buy-button')!;
    this.sellButtonEl = this.el.querySelector<HTMLButtonElement>('.op-sell-button')!;
    this.bindEvents();
  }

  bind(handlers: TradingHandlers): void {
    this.handlers = handlers;
  }

  private bindEvents(): void {
    this.el.addEventListener('click', this.onClick);
    this.inputEl.addEventListener('input', this.onInput);
    this.leverageInputEl.addEventListener('change', this.onToggleLeverage);
  }

  update(
    state: TradingVM,
    estimates?: { buy: OrderEstimate; sell: OrderEstimate },
    feeRate = standardTradingFeeRate,
  ): void {
    this.state = state;
    if (document.activeElement !== this.inputEl) {
      this.inputEl.value = String(state.inputShares);
    }

    const hasError = Boolean(state.inputError);
    this.inputEl.classList.toggle('op-input--error', hasError);
    this.inputEl.setAttribute('aria-invalid', String(hasError));
    this.errorEl.textContent = state.inputError ?? '';
    this.errorEl.hidden = !hasError;

    this.leverageInputEl.checked = state.leverageOn;
    this.leverageInputEl.disabled = !state.leverageAvailable;
    this.leverageStatusEl.textContent = state.leverageAvailable ? '' : '融资账务未开放';

    if (estimates) {
      const feeLabel = `${(feeRate * 100).toFixed(2)}% 综合费率`;
      this.buyEstimateEl.textContent = `预计买入支出 ¥${moneyFormatter.format(Math.abs(estimates.buy.cashDelta))}（费用 ¥${moneyFormatter.format(estimates.buy.fee)} · ${feeLabel}）`;
      this.sellEstimateEl.textContent = `预计卖出净收 ¥${moneyFormatter.format(estimates.sell.cashDelta)}（费用 ¥${moneyFormatter.format(estimates.sell.fee)} · ${feeLabel}）`;
    } else {
      this.buyEstimateEl.textContent = '买入金额待计算';
      this.sellEstimateEl.textContent = '卖出金额待计算';
    }
    this.capacityEl.textContent = `可买 ${sharesFormatter.format(state.maxBuyShares)} 股 · 可卖 ${sharesFormatter.format(state.maxSellShares)} 股`;
    this.partialFillNoteEl.textContent = '部分成交概率 15%，余量自动撤单';

    const quantityIsValid = Number.isInteger(state.inputShares)
      && state.inputShares >= 100
      && !this.inputEl.validity.badInput
      && !this.inputEl.validity.stepMismatch;
    this.buyButtonEl.disabled = !quantityIsValid || state.inputShares > state.maxBuyShares;
    this.sellButtonEl.disabled = !quantityIsValid || state.inputShares > state.maxSellShares;
  }

  destroy(): void {
    this.el.removeEventListener('click', this.onClick);
    this.inputEl.removeEventListener('input', this.onInput);
    this.leverageInputEl.removeEventListener('change', this.onToggleLeverage);
  }
}
