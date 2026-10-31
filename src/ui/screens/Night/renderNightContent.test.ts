import { describe, expect, it } from 'vitest';
import { createMockNightVM } from './mock';
import { renderNightContent } from './renderNightContent';

describe('renderNightContent', () => {
  it('previews chapter two fixed costs on the first-chapter deadline night', () => {
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
