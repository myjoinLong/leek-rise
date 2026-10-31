import { firstChapterDeadlineDay, firstChapterMaximumDebt, firstChapterRepaymentTarget } from '../../../core/timeRules';
import { fixedOperatingCostMultiplierForDay } from '../../../core/chapterRules';
import type { NightVM } from './types';

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
function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}¥${Math.abs(value).toLocaleString()}`;
}
function formatUnsignedMoney(value: number): string {
  return Math.abs(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function progressWidth(value: number): number {
  return Math.max(0, Math.min(100, value));
}
function formatPreviewMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function updateRepaymentPreview(container: HTMLElement, state: NightVM): void {
  const input = container.querySelector<HTMLInputElement>('.ns-debt-input');
  const preview = container.querySelector<HTMLElement>('.ns-debt-preview');
  if (!input || !preview) return;
  const amount = Number(input.value);
  const roundedAmount = Number(amount.toFixed(2));
  const maxAmount = Number(input.max);
  if (!Number.isFinite(amount) || roundedAmount <= 0) {
    preview.textContent = '输入还款金额后，可预览还款后的现金和负债。';
    return;
  }
  if (!Number.isFinite(maxAmount) || roundedAmount > maxAmount) {
    preview.textContent = `超过当前可还上限 ¥${formatPreviewMoney(maxAmount)}。`;
    return;
  }
  const cashAfter = Number((state.cash - roundedAmount).toFixed(2));
  const debtAfter = Number((state.debt - roundedAmount).toFixed(2));
  const distanceToGoal = Math.max(0, debtAfter - firstChapterMaximumDebt);
  const goalNote = state.day > firstChapterDeadlineDay
    ? ''
    : state.debtCrisisStarted
      ? debtAfter <= firstChapterMaximumDebt ? ' · 将达到危机解除门槛' : ' · 仍高于危机解除门槛'
      : distanceToGoal === 0 ? ' · 首章债务门槛已达成' : ` · 距首章债务门槛还差 ¥${formatPreviewMoney(distanceToGoal)}`;
  preview.textContent = `还款后：现金 ¥${formatPreviewMoney(cashAfter)} · 负债 ¥${formatPreviewMoney(debtAfter)}${goalNote}`;
}
export function renderNightContent(state: NightVM): string {
    const { pnlBreakdown } = state;
    const breakdown = [
      ['交易盈亏', pnlBreakdown.tradingPnl],
      ['打工收入', pnlBreakdown.workIncome],
      ['副本收入', pnlBreakdown.activityIncome],
      ['手续费/滑点', pnlBreakdown.fees],
      ['协商签约费', pnlBreakdown.contractFee],
      [`周利息${state.interestGraceApplied ? '（本期宽限）' : state.rateRestructureApplied ? '（0.25%协议）' : ''}`, pnlBreakdown.interest],
      ['房租', pnlBreakdown.rent],
      ['会员费', pnlBreakdown.membership],
      ['设备费', pnlBreakdown.equipment],
      ['直播平台分成', pnlBreakdown.platformShare],
    ] as const;
    const netClass = pnlBreakdown.netChange >= 0 ? 'ns-net-change--up' : 'ns-net-change--down';
    const crisisMessage = state.debtNegotiationCompleted
      ? '九哥协商已完成，当前条款见下方账目。'
      : '可前往九哥处查看协商选项，也可通过工作、交易与还款逐步改善。';
    const warningMessages = state.debtCrisisStarted
      ? [...state.warnings, `第${firstChapterDeadlineDay}天夜间还款后负债仍超过 ¥${firstChapterMaximumDebt.toLocaleString()}，未达到偿还 ¥${firstChapterRepaymentTarget.toLocaleString()} 的第一章目标，已进入债务危机阶段。存档保留，可继续游玩。${crisisMessage}`]
      : state.warnings;
    const warnings = warningMessages.length > 0
      ? `<section class="ns-warnings" aria-label="警告">${warningMessages.map((warning) => `<div class="ns-warning">⚠ ${escapeHtml(warning)}</div>`).join('')}</section>`
      : '';
    const crisisRecovery = state.debtCrisisRecoveredTonight
      ? `<section class="ns-crisis-recovery" role="status"><strong>债务危机已解除</strong><div>当前负债 ¥${state.debt.toLocaleString()}，已回到 ¥${firstChapterMaximumDebt.toLocaleString()} 门槛内。存档继续保留，你可以按自己的节奏经营。</div></section>`
      : '';
    const costPolicy = state.periodicCostPolicy;
    const chapterGoal = state.day === firstChapterDeadlineDay
      ? (() => {
        const nextSettlementDay = (Math.floor(state.day / costPolicy.intervalDays) + 1) * costPolicy.intervalDays;
        const nextMultiplier = fixedOperatingCostMultiplierForDay(nextSettlementDay);
        const currentFixedCost = (costPolicy.rent + costPolicy.membership + costPolicy.equipment) * state.chapter.fixedCostMultiplier;
        const nextFixedCost = (costPolicy.rent + costPolicy.membership + costPolicy.equipment) * nextMultiplier;
        const nextFixedCostIncrease = nextFixedCost - currentFixedCost;
        return `<section class="ns-chapter-goal" aria-label="第一章还款目标"><strong>第一章 · 最后还款日</strong><div>第 ${firstChapterDeadlineDay} 天夜间还款后，负债需不高于 ¥${firstChapterMaximumDebt.toLocaleString()}（从 ¥18,000 起始负债计算，至少偿还 ¥${firstChapterRepaymentTarget.toLocaleString()}）。</div><div>当前负债 ¥${state.debt.toLocaleString()}${state.debt <= firstChapterMaximumDebt ? ' · 目标已达成' : ` · 还需偿还 ¥${(state.debt - firstChapterMaximumDebt).toLocaleString()}`}</div><div>点击进入下一天时检查；超过门槛将进入保留存档的债务危机阶段。</div><strong>下一次周结 · 第 ${nextSettlementDay} 天</strong><div>第 31 天起进入第二章；第 ${nextSettlementDay} 天周结时，房租 ¥${(costPolicy.rent * nextMultiplier).toLocaleString()}、会员费 ¥${(costPolicy.membership * nextMultiplier).toLocaleString()}、设备费 ¥${(costPolicy.equipment * nextMultiplier).toLocaleString()}，固定支出合计 ¥${nextFixedCost.toLocaleString()}，比当前每周增加 ¥${nextFixedCostIncrease.toLocaleString()}。利息按届时负债与协商条款计算，直播分成仍按流水另计。</div></section>`;
      })()
      : '';
    const chapterProgress = state.day < firstChapterDeadlineDay && !state.debtCrisisStarted
      ? (() => {
        const startingDebt = firstChapterMaximumDebt + firstChapterRepaymentTarget;
        const remainingDebt = Math.max(0, state.debt - firstChapterMaximumDebt);
        const repaidProgress = Math.min(firstChapterRepaymentTarget, Math.max(0, startingDebt - state.debt));
        const percentage = progressWidth((repaidProgress / firstChapterRepaymentTarget) * 100);
        const money = (value: number): string => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
        return `<section class="ns-chapter-progress" aria-label="第一章还款进度">
          <div class="ns-chapter-progress-head"><strong>第一章 · 还款目标</strong><span>第 ${state.day}/${firstChapterDeadlineDay} 天</span></div>
          <div class="ns-chapter-progress-track" role="progressbar" aria-label="偿还目标进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage.toFixed(1)}"><div class="ns-chapter-progress-fill" style="width:${percentage}%"></div></div>
          <p>第 ${firstChapterDeadlineDay} 天夜间还款后，负债需降至 ¥${firstChapterMaximumDebt.toLocaleString()}；当前 ¥${money(state.debt)}，还需净减少 ¥${money(remainingDebt)}。</p>
          <p>进度 ¥${money(repaidProgress)} / ¥${firstChapterRepaymentTarget.toLocaleString()}。利息或新增借款会让进度回退。</p>
          <p class="ns-chapter-progress-note">还款在结算页进行；达标继续前进，未达标进入保留存档的债务危机阶段。</p>
        </section>`;
      })()
      : '';
    const currentWeeklyRate = state.rateRestructureApplied || state.debtRatePlanWeeksRemaining > 0 ? costPolicy.restructuredWeeklyInterestRate : costPolicy.weeklyInterestRate;
    const costNote = state.interestGraceApplied ? '九哥协商宽限已生效：本期周利息暂停一次，其他费用照常结算。' : `${state.rateRestructureApplied ? `九哥降息协议本期按 ${(currentWeeklyRate * 100).toFixed(2)}% 计息；` : state.debtRatePlanWeeksRemaining > 0 ? `九哥降息协议剩余 ${state.debtRatePlanWeeksRemaining} 次周结，利率 ${(currentWeeklyRate * 100).toFixed(2)}%；` : ''}${state.periodicSettlementDue ? '本日为周结日。' : ''}每 ${costPolicy.intervalDays} 天结算：负债按 ${(currentWeeklyRate * 100).toFixed(2)}% 计周利息；房租 ¥${costPolicy.rent * state.chapter.fixedCostMultiplier}、会员 ¥${costPolicy.membership * state.chapter.fixedCostMultiplier}、设备 ¥${costPolicy.equipment * state.chapter.fixedCostMultiplier}${state.chapter.fixedCostMultiplier > 1 ? `（第${state.chapter.number}章经营开支 ×${state.chapter.fixedCostMultiplier}）` : ''}；直播流水分成 ${(costPolicy.streamPlatformShareRate * 100).toFixed(0)}%。利息计入负债，固定费用现金不足部分转入负债。`;
    const chapterStatus = state.chapter.number > 1
      ? `<section class="ns-chapter-status" aria-label="章节与经营成本"><strong>第${state.chapter.number}章 · ${state.chapter.title}</strong><div>${state.chapter.endDay ? `第 ${state.chapter.startDay}–${state.chapter.endDay} 天` : `第 ${state.chapter.startDay} 天起`} · 每 ${costPolicy.intervalDays} 天固定经营开支 ¥${((costPolicy.rent + costPolicy.membership + costPolicy.equipment) * state.chapter.fixedCostMultiplier).toLocaleString()}。利息按当前协议计算，直播分成规则不变。</div></section>`
      : '';
    const maxRepay = Number(Math.min(state.cash, state.debt).toFixed(2));
    const review = state.brokerageReview;
    const brokerageReview = review
      ? `<section class="ns-broker-review" aria-label="佣金协议回顾"><div>周经理优惠协议 · ${review.active ? `有效至第 ${review.expiresDay} 天` : '优惠期已结束'}</div><div>实际成交 ¥${formatUnsignedMoney(review.actualTurnover)} / 预估 ${review.projectedTurnover === null ? '未记录' : '¥' + formatUnsignedMoney(review.projectedTurnover)}</div><div>优惠期实付费用 ¥${formatUnsignedMoney(review.discountedFeesPaid)} · 标准费率对应 ¥${formatUnsignedMoney(review.standardFeesEquivalent)} · 服务费 ¥${formatUnsignedMoney(review.serviceFee)}</div><strong>${review.netSavings >= 0 ? '累计净省' : '累计净多支出'} ¥${formatUnsignedMoney(review.netSavings)}</strong></section>`
      : '';
    const inputDefault = Math.min(1000, maxRepay);
    const repay = maxRepay > 0
      ? `<section class="ns-debt-repay" aria-label="偿还负债">
          <h2 class="ns-debt-title">偿还本金</h2>
          <p class="ns-debt-summary">现金 ¥${state.cash.toLocaleString()} · 当前负债 ¥${state.debt.toLocaleString()}</p>
          <label class="ns-debt-label" for="ns-repay-amount">本次还款金额（最多 ¥${maxRepay.toLocaleString()}）</label>
          <div class="ns-debt-controls"><input class="ns-debt-input" id="ns-repay-amount" type="number" inputmode="decimal" min="0.01" max="${maxRepay}" step="0.01" value="${inputDefault}"><button class="ns-debt-button" type="button">确认还款</button></div>
          <p class="ns-debt-error" role="alert" aria-live="polite"></p>
          <p class="ns-debt-preview" role="status" aria-live="polite"></p>
          <p class="ns-debt-note">偿还本金会等额减少现金与负债，不改变当日净资产。</p>
        </section>`
      : '<section class="ns-debt-repay" aria-label="偿还负债"><h2 class="ns-debt-title">当前无需还款</h2><p class="ns-debt-summary">现金或负债余额为 ¥0。</p></section>';
    return `
      <section class="ns-finance-card" aria-label="收支明细">
        <div class="ns-finance-list">
          ${breakdown.map(([label, value]) => `<div class="ns-finance-item"><span>${label}</span><span class="ns-finance-value">${formatMoney(value)}</span></div>`).join('')}
        </div>
        <div class="ns-net-change ${netClass}"><span>今日净变动</span><span class="ns-finance-value">${formatMoney(pnlBreakdown.netChange)}</span></div>
        <p class="ns-cost-note">${escapeHtml(costNote)}</p>
      </section>
      ${chapterProgress}
      ${chapterStatus}
      ${crisisRecovery}
      ${brokerageReview}
      ${chapterGoal}
      <section class="ns-status" aria-label="状态变化">
        ${renderStat('心态', state.mental, 'mental')}
        ${renderStat('体面', state.dignity, 'dignity')}
        ${renderStat('流量', state.fame, 'fame')}
      </section>
      ${warnings}
      <section class="ns-npc" aria-label="NPC 评价">
        <div class="ns-npc-name">【${escapeHtml(state.npcReaction.npcName)}】</div>
        <div class="ns-npc-content">${escapeHtml(state.npcReaction.content)}</div>
      </section>
      ${repay}
    `;
  }
function renderStat(label: string, value: number, kind: 'mental' | 'dignity' | 'fame'): string {
    return `<div class="ns-stat"><div class="ns-stat-heading"><span>${label}</span><span class="ns-stat-value">${value}</span></div><div class="ns-progress"><div class="ns-progress-fill ns-progress-fill--${kind}" style="width:${progressWidth(value)}%"></div></div></div>`;
  }
