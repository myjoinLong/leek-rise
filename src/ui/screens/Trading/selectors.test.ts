import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../core/state';
import { getBrokerTradingFeeRate } from '../../../core/systems/brokerNegotiation';
import { estimateOrderCost } from '../../../core/systems/orderBook';
import { executeOrder } from '../../../core/systems/tradeEngine';
import { selectTradingVM } from './selectors';

describe('trading order input validation', () => {
  it('matches the exact current-book settlement cost used by the trade engine', () => {
    const initial = { ...createInitialState(41), phase: 'TRADING' as const };
    const stock = initial.stocks[initial.selectedStockId];
    if (!stock) throw new Error('Expected the selected stock to exist.');
    const feeRate = getBrokerTradingFeeRate(initial.brokerContract, initial.day);
    const exactCost = estimateOrderCost(stock, 'BUY', 100, 1, false, feeRate);

    const oneCentShort = { ...initial, cash: exactCost - 0.01, inputShares: 100 };
    const shortfallVM = selectTradingVM(oneCentShort);
    expect(shortfallVM.maxBuyShares).toBe(0);
    expect(shortfallVM.inputError).toContain('买入资金不足');
    expect(executeOrder(oneCentShort, 'BUY', 100).feedback.result).toBe('REJECTED');

    const exactCash = { ...initial, cash: exactCost, inputShares: 100 };
    const affordableVM = selectTradingVM(exactCash);
    expect(affordableVM.maxBuyShares).toBe(100);
    expect(affordableVM.inputError).toBeNull();
    expect(executeOrder(exactCash, 'BUY', 100).feedback.result).not.toBe('REJECTED');
  });
});
