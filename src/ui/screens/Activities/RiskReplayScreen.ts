import type { Component } from '../../../components/Component';
import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import type { RiskReplayDecision } from '../../../core/riskReplayTypes';
import type { RiskReplayState } from '../../../core/riskReplayTypes';
import { riskReplayCaseForRun, riskReplayScenarioForRun } from '../../../core/riskReplayScenarios';
import { getReplayExposure, riskReplayPolicy } from '../../../core/systems/riskReplay';
import '../Trading/styles/trading.css';

const scenes = [
  { title: '突破附近', clue: '旧行情在连续上涨后放量突破。上涨机会与快速回撤并存。' },
  { title: '反弹测试', clue: '旧行情跌破支撑后短暂反弹，成交量没有跟上。不能把反弹等同于反转。' },
  { title: '区间观察', clue: '旧行情在窄幅区间反复，方向不清晰。保留现金也是可选操作。' },
] as const;
const signed = (value: number): string => `${value < 0 ? '▼ −' : '▲ +'}¥${Math.abs(value).toFixed(2)}`;
const outcomeFor = (returnPercent: number): string => returnPercent < 0
  ? '后续片段下跌，投入越多模拟亏损越大；单次下跌也不代表任何时候都该空仓。'
  : '后续片段上涨，空仓会错过这段收益；单次上涨不代表超预算仓位就是好选择。';

function percent(value: number): string { return Number.isInteger(value) ? String(value) : value.toFixed(1); }

function historyMarkup(run: RiskReplayState): string {
  const decisions: RiskReplayDecision[] = run.decisions;
  return decisions.map((entry) => {
    const sample = riskReplayCaseForRun(run, entry.step);
    return `<li><strong>${scenes[entry.step].title} · 仓位 ${entry.allocation}%</strong>
    <p>投入 ¥${entry.invested.toFixed(2)}；压力损失 ¥${entry.stressLoss.toFixed(2)}，${entry.withinBudget ? '在预算内' : `超过 ¥${riskReplayPolicy.lossBudget} 预算`}。</p>
    <p>历史后续 ${sample.returnPercent < 0 ? '▼' : '▲'} ${sample.returnPercent}% · 模拟盈亏 ${signed(entry.pnl)}。
    同起点满仓对照 ${signed(entry.fullPositionPnl)}（只比较这一段，不是另一条累计策略）。</p><p>${outcomeFor(sample.returnPercent)}</p></li>`;
  }).join('');
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
    const exposure = getReplayExposure(run.equity, run.step, allocation, riskReplayCaseForRun(run, run.step).stressPercent);
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
    const run = this.state.activeActivity;
    if (run?.id !== 'SWEEPER_RISK_REPLAY') return '';
    const sample = riskReplayCaseForRun(run, step);
    const scenario = riskReplayScenarioForRun(run);
    const reusingPriorPressure = step === 0 && run.priorReview;
    const stressLabel = reusingPriorPressure ? '上次超预算压力重练' : scenario?.stressLabel ?? '给定压力情景';
    return `<p>片段 ${step + 1}/3 · ${scenes[step].title}</p><p>${scenes[step].clue}</p>
      <p>虚构复盘：${scenario?.topic ?? '固定历史样本'} · ${scenario?.observationWindow ?? '旧行情观察'} · ${stressLabel}。</p>
      <p>先公开压力情景：投入部分下跌 ▼${percent(sample.stressPercent)}%；${reusingPriorPressure ? '只复用上次压力幅度，后续走势来自本次新情境。' : ''}后续走势在锁定仓位后揭晓。每次提交精力 -${riskReplayPolicy.energyPerRound}。</p>
      <label>投入当前虚拟资金的百分比 <input type="number" min="0" max="100" step="1" value="0" inputmode="numeric" aria-label="投入仓位百分比"></label>
      <div class="rr-presets">${[0, 20, 50, 100].map((value) => `<button type="button" data-allocation="${value}">${value}%${value === 0 ? ' 空仓' : ''}</button>`).join('')}</div>
      <p data-exposure role="status" aria-live="polite"></p><button type="button" data-action="commit">锁定仓位并揭晓这一段</button>`;
  }

  update(state: GameState): void {
    this.state = state;
    const run = state.activeActivity;
    if (run?.id !== 'SWEEPER_RISK_REPLAY') { this.el.replaceChildren(); return; }
    const active = run.status === 'ACTIVE';
    const scenario = riskReplayScenarioForRun(run);
    const coachLine = run.priorReview
      ? `上次第 ${run.priorReview.previousDay} 天第 ${run.priorReview.previousStep + 1} 段，你用 ${run.priorReview.previousAllocation}% 仓位，压力损失 ¥${run.priorReview.stressLoss.toFixed(2)}，超过 ¥${riskReplayPolicy.lossBudget} 预算 ¥${(run.priorReview.stressLoss - riskReplayPolicy.lossBudget).toFixed(2)}。今天先重练同等下跌幅度，后续走势会换成新情境。`
      : run.priorBudgetScore === null || run.priorBudgetScore === undefined
        ? scenario?.coachLine ?? '先给下行留空间；方向我不替你猜。'
        : `上次你有 ${run.priorBudgetScore}/3 段守住预算。这次是${scenario?.topic ?? '另一组旧行情'}，压力也不同，别照抄上次仓位。`;
    this.el.innerHTML = `<div class="rr-backdrop" aria-hidden="true"></div>
      <div class="rr-owner" aria-hidden="true"><span class="rr-owner-sprite"></span><b>扫地僧</b></div>
      <header class="rr-header"><p>扫地僧 · 口袋公园复盘桌</p><h1>先定仓位，再看结果</h1>
      <p>第 ${state.day} 天 · 真实精力 ${state.energy}/${state.energyMax} · 本次已耗 ${run.energySpent}</p></header>
      <section class="rr-content" aria-live="polite">
        <p class="rr-coach">扫地僧：“${coachLine}”</p>
        <p class="rr-brief">原型练习：虚拟起始资金 ¥${riskReplayPolicy.startingEquity}，每段压力损失预算 ¥${riskReplayPolicy.lossBudget}。不是实盘，不发钱、不影响股票或情报。</p>
        <section class="rr-board"><h2>虚拟资金 ¥${run.equity.toFixed(2)}</h2>${active ? this.renderAllocation(run.step) :
          `<p>复盘完成 · ${run.respectedBudget}/3 段遵守预算 · 累计模拟盈亏 ${signed(run.equity - riskReplayPolicy.startingEquity)}</p>
          <p>空仓也可能遵守预算，但会错过上涨。预算内不等于一定赚钱，预算外也可能碰巧盈利；复盘关注选择能否承受，不按事后涨跌评判对错。</p>`}</section>
        <ol class="rr-history" aria-label="已揭晓的历史复盘记录">${historyMarkup(run)}</ol>
        <p class="rr-disclaimer">三个片段是虚构教学样本，未计费、滑点或段内路径；压力损失是给定情景，不是最大可能损失或真实行情预测。组合会在有限牌库用尽后循环。</p>
        <button type="button" data-action="${active ? 'abandon' : 'return'}">${active ? '结束复盘回街区（保留已耗精力，今日不重进）' : '带着复盘记录回街区'}</button>
      </section>`;
    if (active) this.onAllocation();
  }

  destroy(): void {
    this.el.removeEventListener('click', this.onAction);
    this.el.removeEventListener('input', this.onAllocation);
    this.el.remove();
  }
}
