import type { Component } from '../../../../components/Component';
import type { OrderFeedback } from '../types';

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function readDuration(token: string, fallback: number): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (value.endsWith('ms')) return Number.parseFloat(value) || fallback;
  if (value.endsWith('s')) return (Number.parseFloat(value) || fallback / 1000) * 1000;
  return fallback;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character] ?? character);
}

export interface SlippagePresentation {
  showPriceComparison: boolean;
  warningText: string | null;
}

export function getSlippagePresentation(slippagePct: number, side: OrderFeedback['side']): SlippagePresentation {
  const absoluteSlippage = Math.abs(slippagePct);
  const warningText = absoluteSlippage >= 0.002
    ? `⚠ ${side === 'BUY' ? '+' : '-'}${(absoluteSlippage * 100).toFixed(1)}%`
    : null;
  return {
    showPriceComparison: absoluteSlippage >= 0.001,
    warningText,
  };
}

export class OrderFeedbackCard implements Component<OrderFeedback> {
  readonly el: HTMLElement;

  private state: OrderFeedback;
  private readonly onDismiss: () => void;
  private dismissTimer: ReturnType<typeof setTimeout> | undefined;
  private mounted = false;
  private dismissed = false;
  private destroyed = false;
  private mountedAt = 0;
  private animations: Animation[] = [];

  private readonly onCloseClick = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest('.ofc-close')) this.dismiss();
  };

  constructor(feedback: OrderFeedback, onDismiss: () => void) {
    this.state = feedback;
    this.onDismiss = onDismiss;
    this.el = document.createElement('section');
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.update(feedback);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.addEventListener('click', this.onCloseClick);
  }

  update(state: OrderFeedback): void {
    if (this.dismissed || this.destroyed) return;
    const restoreCloseFocus = document.activeElement === this.el.querySelector('.ofc-close');
    this.cancelAnimations();
    this.state = state;
    this.el.className = this.getCardClassName();
    this.el.innerHTML = this.renderMarkup();
    if (restoreCloseFocus) {
      this.el.querySelector<HTMLButtonElement>('.ofc-close')?.focus({ preventScroll: true });
    }
    if (this.mounted) this.scheduleDismiss();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearDismissTimer();
    this.el.removeEventListener('click', this.onCloseClick);
    this.cancelAnimations();
    this.el.remove();
    this.mounted = false;
  }

  mount(parent: HTMLElement): void {
    if (this.mounted || this.dismissed || this.destroyed) return;
    parent.appendChild(this.el);
    this.mounted = true;
    this.mountedAt = Date.now();
    this.playEnterAnimation();
    this.scheduleDismiss();
  }

  dismiss(): void {
    if (this.dismissed || this.destroyed) return;
    this.dismissed = true;
    this.clearDismissTimer();
    this.cancelAnimations();

    if (!this.mounted) {
      this.finishDismiss();
      return;
    }

    const duration = readDuration('--dur-base', 200);
    const animation = this.el.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(40px)', opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' },
    );
    this.animations.push(animation);
    void animation.finished.then(() => {
      if (!this.destroyed) this.finishDismiss();
    }, () => { /* 销毁取消动画时不触发业务回调。 */ });
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer !== undefined) clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }

  private scheduleDismiss(): void {
    this.clearDismissTimer();
    if (this.state.result === 'REJECTED') return;
    const abnormal = this.state.slippagePct > 0.01
      || this.state.result === 'PARTIAL'
      || this.state.latencyMs > 1200;
    // 刷新展示不延长停留，仍从首次 mount 起计算原型时长。
    const remaining = (abnormal ? 4000 : 2500) - (Date.now() - this.mountedAt);
    this.dismissTimer = setTimeout(() => this.dismiss(), Math.max(0, remaining));
  }

  private cancelAnimations(): void {
    this.animations.forEach((animation) => animation.cancel());
    this.animations = [];
  }

  private getCardClassName(): string {
    if (this.state.result === 'REJECTED') return 'ofc-card ofc-card--danger';
    const abnormal = this.state.slippagePct > 0.01
      || this.state.result === 'PARTIAL'
      || this.state.latencyMs > 1200;
    return abnormal ? 'ofc-card ofc-card--warn' : 'ofc-card';
  }

  private renderMarkup(): string {
    const title = this.state.result === 'REJECTED'
      ? '订单被拒绝'
      : this.state.result === 'PARTIAL'
        ? `部分成交 ${this.state.filledShares}/${this.state.requestedShares} 股`
        : `已成交 ${this.state.filledShares} 股`;
    const rows = this.state.result === 'REJECTED'
      ? this.renderRejectedRows()
      : this.renderFilledRows();

    return `
      <div class="ofc-header"><span>${title}</span><button class="ofc-close" type="button" aria-label="关闭成交反馈">✕</button></div>
      ${rows}
    `;
  }

  private renderFilledRows(): string {
    const slippage = getSlippagePresentation(this.state.slippagePct, this.state.side);
    const priceRow = slippage.showPriceComparison
      ? `委托价 ${this.state.requestedPrice.toFixed(2)} → 成交价 ${this.state.filledPrice.toFixed(2)}`
      : `成交价 ${this.state.filledPrice.toFixed(2)}`;
    const warning = slippage.warningText
      ? `<span class="ofc-warning">${slippage.warningText}</span>`
      : '';
    const remaining = this.state.result === 'PARTIAL'
      ? `<div class="ofc-row ofc-remaining">剩余 ${this.state.requestedShares - this.state.filledShares} 股未成交，已自动撤单</div>`
      : '';
    const congestion = slippage.warningText || this.state.latencyMs > 1200
      ? '<div class="ofc-row ofc-latency">下单时网络拥堵，成交价可能与委托价存在偏差</div>'
      : '';

    return `
      <div class="ofc-row ofc-price-line">${priceRow} ${warning}</div>
      ${remaining}
      <div class="ofc-row">交易费用 ¥${this.state.fee.toFixed(2)}</div>
      <div class="ofc-row">到账后现金 ¥${this.state.cashAfter.toLocaleString()}</div>
      ${congestion}
    `;
  }

  private renderRejectedRows(): string {
    const reason = escapeHtml(this.state.rejectReason ?? '委托未能成交');
    return `
      <div class="ofc-row ofc-reject">${reason}</div>
      <div class="ofc-row">请调整数量后重试</div>
    `;
  }

  private playEnterAnimation(): void {
    const duration = readDuration('--dur-slow', 280);
    const stagger = readDuration('--dur-fast', 120);
    this.animations.push(this.el.animate(
      [
        { transform: 'translateY(40px) scale(0.96)', opacity: 0 },
        { transform: 'translateY(0) scale(1)', opacity: 1 },
      ],
      { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
    ));

    this.el.querySelectorAll<HTMLElement>('.ofc-header, .ofc-row').forEach((row, index) => {
      this.animations.push(row.animate(
        [
          { transform: 'translateY(8px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: stagger, delay: index * stagger, easing: 'ease-out', fill: 'both' },
      ));
    });
  }

  private finishDismiss(): void {
    if (this.destroyed) return;
    this.destroy();
    this.onDismiss();
  }
}
