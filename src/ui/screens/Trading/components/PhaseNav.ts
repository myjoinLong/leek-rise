import type { Component } from '../../../../components/Component';
import type { Phase, TradingVM } from '../types';

const phases: readonly Phase[] = ['PRE_MARKET', 'DAYTIME', 'TRADING', 'NIGHT'];

export class PhaseNav implements Component<TradingVM> {
  readonly el: HTMLElement;

  private readonly items: HTMLElement[];

  constructor() {
    this.el = document.createElement('nav');
    this.el.className = 'pn-container';
    this.el.setAttribute('aria-label', '交易阶段');
    this.el.innerHTML = `
      <span class="pn-item pn-item--future" data-phase="PRE_MARKET">
        <span class="pn-indicator"></span>
        <span class="pn-label"><span class="pn-check" aria-hidden="true"></span><span>早盘</span></span>
      </span>
      <span class="pn-item pn-item--future" data-phase="DAYTIME">
        <span class="pn-indicator"></span>
        <span class="pn-label"><span class="pn-check" aria-hidden="true"></span><span>白天</span></span>
      </span>
      <span class="pn-item pn-item--future" data-phase="TRADING">
        <span class="pn-indicator"></span>
        <span class="pn-label"><span class="pn-check" aria-hidden="true"></span><span>交易</span></span>
      </span>
      <span class="pn-item pn-item--future" data-phase="NIGHT">
        <span class="pn-indicator"></span>
        <span class="pn-label"><span class="pn-check" aria-hidden="true"></span><span>结算</span></span>
      </span>
    `;
    this.items = Array.from(this.el.querySelectorAll<HTMLElement>('.pn-item'));
  }

  update(state: TradingVM): void {
    const currentIndex = phases.indexOf(state.phase);

    this.items.forEach((item, index) => {
      const isCurrent = index === currentIndex;
      const isCompleted = index < currentIndex;
      const statusClass = isCurrent
        ? 'pn-item--current'
        : isCompleted
          ? 'pn-item--completed'
          : 'pn-item--future';
      const indicator = item.querySelector<HTMLElement>('.pn-indicator')!;
      const check = item.querySelector<HTMLElement>('.pn-check')!;

      item.classList.remove('pn-item--future', 'pn-item--current', 'pn-item--completed');
      item.classList.add(statusClass);
      indicator.classList.toggle('pn-indicator--active', isCurrent);
      check.textContent = isCompleted ? '✓' : '';

      if (isCurrent) {
        item.setAttribute('aria-current', 'step');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }
}
