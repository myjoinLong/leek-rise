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

export class NewsHint implements Component<TradingVM> {
  readonly el: HTMLElement;

  private readonly contentEl: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'nh-container';
    this.el.innerHTML = `
      <span class="nh-content"></span>
    `;
    this.contentEl = this.el.querySelector<HTMLElement>('.nh-content')!;
    this.el.hidden = true;
  }

  update(state: TradingVM): void {
    const newsHint = state.selectedDetail?.newsHint;
    if (!newsHint) {
      this.el.hidden = true;
      this.contentEl.innerHTML = '';
      return;
    }

    this.contentEl.innerHTML = `
      <span class="nh-name">【${escapeHtml(newsHint.npcName)}】</span>${escapeHtml(newsHint.time)}：${escapeHtml(newsHint.text)}
      <span class="nh-arrow">›</span>
    `;
    this.el.hidden = false;
  }
}
