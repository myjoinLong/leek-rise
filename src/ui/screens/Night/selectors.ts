import { isPeriodicSettlementDay, periodicCostPolicy } from '../../../core/systems/periodicCosts';
import type { GameState } from '../../../core/types';
import { createMockNightVM } from './mock';
import type { NightVM } from './types';

export function selectNightVM(state: GameState): NightVM {
  const mock = createMockNightVM();
  const portfolioValue = Object.values(state.stocks).reduce(
    (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
    0,
  );
  const assets = state.cash + portfolioValue;
  const netChange = Number((assets - state.debt - state.dayStartEquity).toFixed(2));
  const workIncome = state.dailyWorkIncome, activityIncome = state.dailyStreamIncome;
  const fees = -state.dailyFees, contractFee = -state.dailyContractFees;
  const interest = -state.periodicCostLedger.interest, rent = -state.periodicCostLedger.rent, membership = -state.periodicCostLedger.membership, equipment = -state.periodicCostLedger.equipment;
  const platformShare = -state.periodicCostLedger.platformShare;
  const tradingPnl = Number((netChange - workIncome - activityIncome - fees - contractFee - interest - rent - membership - equipment - platformShare).toFixed(2));
  const warnings = state.debt > assets ? ['负债已超过总资产，请留意强平线'] : [];
  if (state.periodicCostLedger.deferred > 0) warnings.push(`本周固定费用有 ¥${state.periodicCostLedger.deferred.toLocaleString()} 未付，已计入负债。`);
  const contract = state.brokerContract;
  return {
    ...mock,
    day: state.day,
    cash: state.cash,
    debt: state.debt,
    fame: state.fame,
    pnlBreakdown: {
      tradingPnl, workIncome, activityIncome, fees, contractFee, interest,
      rent, membership, equipment, platformShare, netChange,
    },
    periodicCostPolicy: { ...periodicCostPolicy },
    periodicSettlementDue: isPeriodicSettlementDay(state.day),
    deferredCosts: state.periodicCostLedger.deferred,
    interestGraceApplied: state.periodicCostLedger.interestGraceApplied,
    rateRestructureApplied: state.periodicCostLedger.rateRestructureApplied,
    debtRatePlanWeeksRemaining: state.debtRatePlanWeeksRemaining,
    debtCrisisStarted: state.debtCrisisStarted,
    debtNegotiationCompleted: state.debtNegotiationCompleted,
    warnings,
    brokerageReview: contract ? {
      active: state.day <= contract.expiresDay,
      signedDay: contract.signedDay,
      expiresDay: contract.expiresDay,
      projectedTurnover: contract.projectedTurnover,
      actualTurnover: contract.actualTurnover,
      discountedFeesPaid: contract.discountedFeesPaid,
      standardFeesEquivalent: contract.standardFeesEquivalent,
      serviceFee: contract.serviceFee,
      netSavings: Number((contract.standardFeesEquivalent - contract.discountedFeesPaid - contract.serviceFee).toFixed(2)),
    } : null,
  };
}
