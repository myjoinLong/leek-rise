import type { Component } from '../../../components/Component';
import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import type { RiskReplayDecision } from '../../../core/riskReplayTypes';
import { getReplayExposure, riskReplayCases, riskReplayPolicy } from '../../../core/systems/riskReplay';
import '../Trading/styles/trading.css';

const scenes = [
  { title: '热闹的突破', clue: '旧行情在连续上涨后放量突破。上涨机会与快速回撤并存。', outcome: '后续片段继续上涨；控制仓位会少赚，这也是风险预算的代价。' },
  { title: '反弹还是继续下探', clue: '旧行情跌破支撑后短暂反弹，成交量没有跟上。不能把反弹等同于反转。', outcome: '后续片段再次下探；损失随投入本金放大。' },
  { title: '安静的区间', clue: '旧行情在窄幅区间反复，方向不清晰。保留现金也是可选操作。', outcome: '后续片段小幅上行；这个样本不能证明震荡以后必涨。' },
] as const;
const signed = (value: number): string => `${value < 0 ? '▼ −' : '▲ +'}¥${Math.abs(value).toFixed(2)}`;

function historyMarkup(decisions: RiskReplayDecision[]): string {
  return decisions.map((entry) => `<li><strong>${scenes[entry.step].title} · 仓位 ${entry.allocation}%</strong>
    <p>投入 ¥${entry.invested.toFixed(2)}；压力损失 ¥${entry.stressLoss.toFixed(2)}，${entry.withinBudget ? '在预算内' : `超过 ¥${riskReplayPolicy.lossBudget} 预算`}。</p>
    <p>历史后续 ${riskReplayCases[entry.step].returnPercent < 0 ? '▼' : '▲'} ${riskReplayCases[entry.step].returnPercent}% · 模拟盈亏 ${signed(entry.pnl)}。
    同起点满仓对照 ${signed(entry.fullPositionPnl)}（只比较这一段，不是另一条累计策略）。</p><p>${scenes[entry.step].outcome}</p></li>`).join('');
}

export class RiskReplayScreen implements Component<GameState> {
  el: HTMLElement;
  private state: GameState;

  constructor(state: GameState, private readonly dispatch: (action: GameAction) => GameState) {
    this.el = document.createElement('main');
    this.el.className = 'rr-screen';
    this.state = state;
    this.bindEvents();
    this.update(state);
  }

  private bindEvents(): void {
    this.el.addEventListener('click', this.onAction);
    this.el.addEventListener('input', this.onAllocation);
  }

  private onAllocation = (): void => {
    const run = this.state.activeActivity;
    const input = this.el.querySelector<HTMLInputElement>('input');
    const feedback = this.el.querySelector<HTMLElement>('[data-exposure]');
    if (run?.id !== 'SWEEPER_RISK_REPLAY' || run.status !== 'ACTIVE' || !input || !feedback) return;
    const allocation = input.valueAsNumber;
    const valid = input.value !== '' && Number.isInteger(allocation) && allocation >= 0 && allocation <= 100;
    const button = this.el.querySelector<HTMLButtonElement>('[data-action="commit"]');
    if (button) button.disabled = !valid;
    if (!valid) { feedback.textContent = '请输入 0–100 的整数仓位。'; return; }
    const exposure = getReplayExposure(run.equity, run.step, allocation);
    feedback.textContent = `投入 ¥${exposure.invested.toFixed(2)} · 压力损失 ¥${exposure.stressLoss.toFixed(2)} · ${exposure.stressLoss <= riskReplayPolicy.lossBudget ? '在预算内' : '超出预算，仍可提交并观察后果'}`;
  };

  private onAction = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const allocation = button.dataset.allocation;
    if (allocation !== undefined) {
      const input = this.el.querySelector<HTMLInputElement>('input');
      if (input) input.value = allocation;
      this.onAllocation();
      return;
    }
    if (button.dataset.action === 'commit') {
      const input = this.el.querySelector<HTMLInputElement>('input');
      if (input?.value !== '') this.dispatch({ type: 'COMMIT_RISK_ALLOCATION', allocation: input?.valueAsNumber ?? NaN });
    }
    if (button.dataset.action === 'abandon') this.dispatch({ type: 'ABANDON_RISK_REPLAY' });
    if (button.dataset.action === 'return') this.dispatch({ type: 'RETURN_FROM_ACTIVITY' });
  };

  private renderAllocation(step: 0 | 1 | 2): string {
    return `<p>片段 ${step + 1}/3 · ${scenes[step].title}</p><p>${scenes[step].clue}</p>
      <p>给定压力情景：投入部分下跌 ▼${riskReplayCases[step].stressPercent}%。先选择仓位再揭晓后续，每次提交精力 -${riskReplayPolicy.energyPerRound}。</p>
      <label>投入当前虚拟资金的百分比 <input type="number" min="0" max="100" step="1" value="0" inputmode="numeric" aria-label="投入仓位百分比"></label>
      <div class="rr-presets">${[0, 20, 50, 100].map((value) => `<button type="button" data-allocation="${value}">${value}%${value === 0 ? ' 空仓' : ''}</button>`).join('')}</div>
      <p data-exposure role="status" aria-live="polite"></p><button type="button" data-action="commit">锁定仓位并揭晓这一段</button>`;
  }

  update(state: GameState): void {
    this.state = state;
    const run = state.activeActivity;
    if (run?.id !== 'SWEEPER_RISK_REPLAY') { this.el.replaceChildren(); return; }
    const active = run.status === 'ACTIVE';
    this.el.innerHTML = `<header><p>扫地僧 · 口袋公园复盘桌</p><h1>先定仓位，再看结果</h1>
      <p>第 ${state.day} 天 · 真实精力 ${state.energy}/${state.energyMax} · 本次已耗 ${run.energySpent}</p></header>
      <p>原型练习：虚拟起始资金 ¥${riskReplayPolicy.startingEquity}，每段压力损失预算 ¥${riskReplayPolicy.lossBudget}。不是实盘，不发钱、不影响股票或情报。</p>
      <section class="rr-board"><h2>虚拟资金 ¥${run.equity.toFixed(2)}</h2>${active ? this.renderAllocation(run.step) :
        `<p>复盘完成 · ${run.respectedBudget}/3 段遵守预算 · 累计模拟盈亏 ${signed(run.equity - riskReplayPolicy.startingEquity)}</p>
        <p>空仓也可能遵守预算，但会错过上涨。预算内不等于一定赚钱，预算外也可能碰巧盈利；复盘关注选择能否承受，不按事后涨跌评判对错。</p>`}</section>
      <ol class="rr-history" aria-label="已揭晓的历史复盘记录">${historyMarkup(run.decisions)}</ol>
      <p>三个片段是固定教学样本，未计费、滑点或段内路径；压力损失是给定情景，不是最大可能损失或真实行情预测。数值和评分均待试玩。</p>
      <button type="button" data-action="${active ? 'abandon' : 'return'}">${active ? '结束复盘回街区（保留已耗精力，今日不重进）' : '带着复盘记录回街区'}</button>`;
    if (active) this.onAllocation();
  }

  destroy(): void {
    this.el.removeEventListener('click', this.onAction);
    this.el.removeEventListener('input', this.onAllocation);
    this.el.remove();
  }
}
