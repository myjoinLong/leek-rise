import { describe, expect, it } from 'vitest';
import { getSlippagePresentation } from './OrderFeedbackCard';

describe('order feedback slippage presentation', () => {
  it('shows the price comparison without a warning below the 0.2% threshold', () => {
    expect(getSlippagePresentation(0.0019, 'BUY')).toEqual({
      showPriceComparison: true,
      warningText: null,
    });
  });

  it('adds a signed warning at exactly 0.2% for buy and sell orders', () => {
    expect(getSlippagePresentation(0.002, 'BUY')).toEqual({
      showPriceComparison: true,
      warningText: '⚠ +0.2%',
    });
    expect(getSlippagePresentation(0.002, 'SELL')).toEqual({
      showPriceComparison: true,
      warningText: '⚠ -0.2%',
    });
  });

  it('shows only the fill price for near-zero slippage', () => {
    expect(getSlippagePresentation(0.0009, 'BUY')).toEqual({
      showPriceComparison: false,
      warningText: null,
    });
  });
});
