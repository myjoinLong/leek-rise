import { describe, expect, it } from 'vitest';
import { createMockNightVM } from './mock';
import { renderNightContent } from './renderNightContent';

describe('night crisis recovery target', () => {
  it('shows the current debt, exit threshold, remaining amount, and available repayment', () => {
    const content = renderNightContent({
      ...createMockNightVM(),
      day: 45,
      cash: 750,
      debt: 5600,
      debtCrisisStarted: true,
    });

    expect(content).toContain('当前负债 ¥5,600 · 解除门槛 ¥3,000');
    expect(content).toContain('还需净减少 ¥2,600。当前现金最多可偿还 ¥750。');
    expect(content).toContain('利息或新增借款会改变差额；还清危机线不代表债务清零。');
  });

  it('does not show an active target after the crisis is resolved', () => {
    const content = renderNightContent({
      ...createMockNightVM(),
      day: 45,
      debt: 3000,
      debtCrisisStarted: false,
      debtCrisisRecoveredTonight: true,
    });

    expect(content).not.toContain('债务危机 · 恢复目标');
    expect(content).toContain('债务危机已解除');
  });
});

describe('chapter two fixed-cost preview', () => {
  it('previews the first weekly settlement after the first-chapter deadline', () => {
    const content = renderNightContent({ ...createMockNightVM(), day: 30 });

    expect(content).toContain('下一次周结 · 第 35 天');
    expect(content).toContain('房租 ¥480、会员费 ¥60、设备费 ¥120');
    expect(content).toContain('固定支出合计 ¥660，比当前每周增加 ¥330');
  });

  it('does not show the chapter transition preview on other nights', () => {
    const content = renderNightContent({ ...createMockNightVM(), day: 29 });

    expect(content).not.toContain('下一次周结 · 第 35 天');
  });
});
