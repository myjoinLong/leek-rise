import { createMockNightVM } from './mock';
import type { NightVM } from './types';
import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { DebtInstallmentPanel } from '../Activities/DebtInstallmentPanel';
import { selectNightVM } from './selectors';
import { renderNightContent, updateRepaymentPreview } from './renderNightContent';
export class NightScreen {
  readonly el: HTMLElement;
  private currentState: NightVM;
  private readonly contentEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly onNextDay: () => void;
  private readonly onRepay: (amount: number) => void;
  private readonly onNextDayClick = (): void => {
    this.onNextDay();
  };
  constructor(state: NightVM = createMockNightVM(), onNextDay: () => void = () => {}, onRepay: (amount: number) => void = () => {}) {
    this.currentState = state;
    this.onNextDay = onNextDay;
    this.onRepay = onRepay;
    this.el = document.createElement('div');
    this.el.className = 'ns-screen scene-screen';
    this.el.innerHTML = `
      <style>
        .ns-screen { box-sizing: border-box; position:relative; display: flex; flex-direction: column; width: 100%; height: 100vh; height:100dvh; max-width: 480px; margin: 0 auto; overflow: hidden; color: var(--text-primary); font-family: var(--font-sans); }
        .ns-header { flex: 0 0 auto; padding: var(--sp-4); }
        .ns-kicker { margin-bottom:6px; color:#e5c77a; font-size:10px; letter-spacing:2px; text-shadow:2px 2px #111; }
        .ns-title { color: var(--text-primary); font-size: var(--fs-title); font-weight: 600; line-height: 1.3; }
        .ns-scroll-area { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 var(--sp-4) calc(var(--safe-bottom) + 84px); }
        .ns-content { display: flex; flex-direction: column; gap: var(--sp-4); }
        .ns-finance-card { padding: var(--sp-4); background: rgba(25,28,35,.93); border:2px solid #787461; border-radius: 0; box-shadow: 4px 4px #000; }
        .ns-finance-list { display: flex; flex-direction: column; gap: var(--sp-2); }
        .ns-finance-item { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); color: var(--text-secondary); font-size: var(--fs-body); }
        .ns-cost-note { margin: var(--sp-3) 0 0; color: var(--text-weak); font-size: var(--fs-tiny); line-height: 1.5; }
        .ns-broker-review { padding: var(--sp-3); border: 2px solid #88816e; background: rgba(34,38,45,.94); color: var(--text-secondary); font-size: var(--fs-caption); line-height: 1.5; }
        .ns-broker-review strong { display: block; margin-top: var(--sp-1); color: var(--text-primary); font-variant-numeric: tabular-nums; }
        .ns-finance-value { color: var(--text-primary); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .ns-net-change { display: flex; justify-content: space-between; gap: var(--sp-3); margin-top: var(--sp-3); padding-top: var(--sp-3); border-top: 2px solid var(--border-strong); font-size: var(--fs-title); font-weight: 700; }
        .ns-net-change--up { color: var(--up); }
        .ns-net-change--down { color: var(--down); }
        .ns-net-change .ns-finance-value { color: inherit; }
        .ns-status { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-3); }
        .ns-stat { min-width: 0; }
        .ns-stat-heading { display: flex; justify-content: space-between; gap: var(--sp-1); margin-bottom: var(--sp-2); color: var(--text-secondary); font-size: var(--fs-caption); }
        .ns-stat-value { color: var(--text-primary); font-variant-numeric: tabular-nums; }
        .ns-progress { height: 6px; overflow: hidden; background: var(--bg-input); border-radius: var(--radius-pill); }
        .ns-progress-fill { height: 100%; border-radius: inherit; }
        .ns-progress-fill--mental { background: var(--info); }
        .ns-progress-fill--dignity { background: var(--warn); }
        .ns-progress-fill--fame { background: var(--up); }
        .ns-warnings { display: flex; flex-direction: column; gap: var(--sp-2); color: var(--warn); font-size: var(--fs-caption); }
        .ns-warning { line-height: 1.4; }
        .ns-chapter-goal { padding:var(--sp-3); border:2px solid #c9a94c; background:rgba(54,47,30,.94); color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
        .ns-chapter-goal strong { display:block; margin-bottom:var(--sp-1); color:var(--text-primary); }
        .ns-chapter-status { padding:var(--sp-3); border:2px solid #847244; background:rgba(38,36,31,.94); color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
        .ns-chapter-status strong { display:block; margin-bottom:var(--sp-1); color:var(--text-primary); }
        .ns-chapter-progress { padding:var(--sp-3); border:2px solid #847244; background:rgba(38,36,31,.94); color:var(--text-secondary); font-size:var(--fs-caption); line-height:1.5; }
        .ns-chapter-progress-head { display:flex; justify-content:space-between; gap:var(--sp-2); margin-bottom:var(--sp-2); }
        .ns-chapter-progress-head strong { color:var(--text-primary); }
        .ns-chapter-progress-head span { color:var(--warn); white-space:nowrap; }
        .ns-chapter-progress-track { height:8px; margin-bottom:var(--sp-2); overflow:hidden; background:var(--bg-input); border:1px solid #6d674f; }
        .ns-chapter-progress-fill { height:100%; background:var(--warn); }
        .ns-chapter-progress p { margin:var(--sp-1) 0 0; }
        .ns-chapter-progress .ns-chapter-progress-note { color:var(--text-weak); font-size:var(--fs-tiny); }
        .ns-crisis-recovery { padding:var(--sp-3); border:2px solid var(--up); background:rgba(26,50,40,.94); box-shadow:3px 3px #000; color:var(--text-primary); font-size:var(--fs-caption); line-height:1.5; }
        .ns-crisis-target { padding:var(--sp-3); border:2px solid var(--warn); background:rgba(48,40,28,.94); box-shadow:3px 3px #000; color:var(--text-primary); font-size:var(--fs-caption); line-height:1.5; }
        .ns-crisis-target strong { display:block; margin-bottom:var(--sp-1); color:var(--warn); }
        .ns-crisis-target-note { margin-top:var(--sp-1); color:var(--text-secondary); font-size:var(--fs-tiny); }
        .ns-npc { padding: var(--sp-3); background: rgba(25,28,35,.90); border:2px solid #777264; border-left: 4px solid #c6ae6d; border-radius: 0; box-shadow:3px 3px #000; }
        .ns-npc-name { margin-bottom: var(--sp-1); color: var(--text-secondary); font-size: var(--fs-caption); }
        .ns-npc-content { color: var(--text-secondary); font-size: var(--fs-body); line-height: 1.5; }
        .ns-debt-repay { padding: var(--sp-4); background: rgba(25,28,35,.93); border:2px solid #787461; box-shadow:4px 4px #000; }
        .ns-debt-title { margin-bottom: var(--sp-2); color: var(--text-primary); font-size: var(--fs-section); }
        .ns-debt-summary,.ns-debt-note { color: var(--text-secondary); font-size: var(--fs-caption); line-height:1.45; }
        .ns-debt-label { display:block; margin:var(--sp-3) 0 var(--sp-1); color:var(--text-secondary); font-size:var(--fs-caption); }
        .ns-debt-controls { display:flex; gap:var(--sp-2); }
        .ns-debt-input { box-sizing:border-box; flex:1; min-width:0; min-height:44px; padding:var(--sp-2); border:2px solid var(--border-strong); border-radius:0; background:var(--bg-input); color:var(--text-primary); font:inherit; font-variant-numeric:tabular-nums; }
        .ns-debt-button { min-width:84px; min-height:44px; border:2px solid #c9b77b; border-radius:0; background:#343743; box-shadow:3px 3px #000; color:var(--text-primary); font-weight:bold; cursor:pointer; }
        .ns-debt-button:active { transform:translate(2px,2px); box-shadow:1px 1px #000; }
        .ns-debt-button:disabled { opacity:.5; cursor:not-allowed; }
        .ns-debt-error { min-height:1.3em; margin-top:var(--sp-1); color:var(--warn); font-size:var(--fs-caption); }
        .ns-debt-preview { margin:var(--sp-2) 0 0; color:var(--text-primary); font-size:var(--fs-caption); line-height:1.5; font-variant-numeric:tabular-nums; }
        .ns-debt-note { margin-top:var(--sp-2); }
        .ns-footer { box-sizing: border-box; position: fixed; z-index: 10; right: 0; bottom: 0; left: 0; width: 100%; max-width: 480px; margin: 0 auto; padding: var(--sp-3) var(--sp-4) var(--safe-bottom); background: rgba(20,23,31,.94); border-top: 2px solid #625e50; }
        .ns-next-button { width: 100%; min-height: 50px; color: var(--text-primary); background: #343743; border: 2px solid #c9b77b; border-radius: 0; box-shadow:4px 4px #000; font-family: inherit; font-size: var(--fs-body); cursor: pointer; }
        .ns-next-button:active { transform: scale(0.97); }
        .ns-next-button:focus-visible { outline: 2px solid var(--info); outline-offset: 2px; }
        .ns-screen button { font-family: inherit; }
      </style>
      <header class="ns-header"><p class="ns-kicker">盘城 · 夜间账本</p><h1 class="ns-title"></h1></header>
      <main class="ns-scroll-area"><div class="ns-content"></div></main>
      <footer class="ns-footer"><button class="ns-next-button" type="button"></button></footer>
    `;
    this.titleEl = this.el.querySelector<HTMLElement>('.ns-title')!;
    this.contentEl = this.el.querySelector<HTMLElement>('.ns-content')!;
    this.nextButton = this.el.querySelector<HTMLButtonElement>('.ns-next-button')!;
    this.bindEvents();
    this.update(state);
  }
  update(state: NightVM): void {
    this.currentState = state;
    this.titleEl.textContent = `第 ${state.day} 天 · 结算`;
    this.nextButton.textContent = `进入第 ${state.day + 1} 天`;
    this.contentEl.innerHTML = renderNightContent(state);
    updateRepaymentPreview(this.el, state);
    this.contentEl.querySelectorAll<HTMLElement>('.ns-finance-item, .ns-net-change').forEach((item, index) => {
      item.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 200, delay: index * 150, easing: 'ease-out', fill: 'both' },
      );
    });
  }
  private bindEvents(): void {
    this.nextButton.addEventListener('click', this.onNextDayClick);
    this.el.addEventListener('input', (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.classList.contains('ns-debt-input')) {
        updateRepaymentPreview(this.el, this.currentState);
      }
    });
    this.el.addEventListener('click', (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const repayButton = target.closest<HTMLButtonElement>('.ns-debt-button');
      if (!repayButton || repayButton.disabled) return;
      const input = this.el.querySelector<HTMLInputElement>('.ns-debt-input');
      const error = this.el.querySelector<HTMLElement>('.ns-debt-error');
      const amount = Number(input?.value);
      const maxAmount = Number(input?.max);
      const roundedAmount = Number(amount.toFixed(2));
      if (!Number.isFinite(amount) || roundedAmount <= 0) {
        if (error) error.textContent = '请输入大于 ¥0 的还款金额。';
        return;
      }
      if (!Number.isFinite(maxAmount) || roundedAmount > maxAmount) {
        if (error) error.textContent = '还款金额不能超过当前现金或负债。';
        return;
      }
      this.onRepay(roundedAmount);
    });
  }

}
export function createNightScreen(state: GameState, dispatch: (action: GameAction) => GameState): HTMLElement {
  const showPlan = (next: GameState): void => {
    const panel = new DebtInstallmentPanel(next, (action) => {
      const updated = dispatch(action);
      screen.update(selectNightVM(updated)); showPlan(updated);
    });
    screen.el.querySelector('.ns-content')?.append(panel.el);
  };
  const screen = new NightScreen(
    selectNightVM(state),
    () => dispatch({ type: 'ADVANCE_PHASE' }), (amount) => {
      const nextState = dispatch({ type: 'REPAY_DEBT', amount });
      screen.update(selectNightVM(nextState)); showPlan(nextState);
    });
  showPlan(state);
  return screen.el;
}
