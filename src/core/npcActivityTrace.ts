import type { ActiveActivityState, NpcActivityMemoryTrace } from './types';
import { cafeCustomerFor, cafeScenarioFor } from './systems/cafeShift';
import { factoryInspectionForDay, factoryShiftBonusPerCorrectCheck } from './systems/factoryShift';
import { bikeRepairCaseFor } from './systems/zhengBikeRepair';
import { streamScenarioFor } from './streamScenarios';

function createTrace(
  activity: ActiveActivityState,
  choiceKeys: string[],
  outcomeCode: string | null = null,
  cashDelta: number | null = null,
  score: number | null = null,
): NpcActivityMemoryTrace {
  return { day: activity.day, activityId: activity.id, choiceKeys, outcomeCode, cashDelta, score };
}

export function traceCompletedActivity(activity: ActiveActivityState): NpcActivityMemoryTrace | null {
  if (activity.status !== 'RESULT') return null;

  switch (activity.id) {
    case 'WANG_DELIVERY':
      return createTrace(activity, activity.decisions.map((decision) => decision.choice), null, activity.totalIncome);
    case 'LONGGE_CHAT':
      return {
        ...createTrace(
          activity,
          activity.openingChoice ? [`OPENING_${activity.openingChoice}`, ...activity.clues] : activity.clues,
          activity.conclusion,
          null,
          activity.correct ? 1 : 0,
        ),
        ...(activity.scenarioVersion === 2 || activity.scenarioVersion === 3 ? {
          scenarioVersion: activity.scenarioVersion,
          scenarioSeed: activity.scenarioSeed ?? 4,
        } : {}),
      };
    case 'XIAOLIAN_STREAM': {
      const scenario = streamScenarioFor(activity.day, activity.scenarioVersion ?? 1, activity.scenarioSeed ?? 4);
      return {
        ...createTrace(activity, activity.decisions.map((decision) => decision.choice), `FAME_${activity.fameDelta}`, activity.income, activity.fameDelta),
        ...(activity.scenarioVersion === undefined ? {} : { scenarioVersion: activity.scenarioVersion }),
        ...(activity.scenarioSeed === undefined ? {} : { scenarioSeed: activity.scenarioSeed }),
        streamScenarioTitle: scenario.title,
      };
    }
    case 'CHEN_DOSSIER':
      return {
        ...createTrace(activity, activity.evidence.map((evidence) => evidence.choice), activity.conclusion, null, activity.reliableCount),
        ...(activity.scenarioVersion === 2 ? {
          scenarioVersion: activity.scenarioVersion,
          scenarioSeed: activity.scenarioSeed ?? 4,
          ...(activity.scenarioIndex === undefined ? {} : { scenarioIndex: activity.scenarioIndex }),
        } : {}),
      };
    case 'JIUGE_NEGOTIATION':
      return createTrace(
        activity,
        [...activity.decisions.map((decision) => decision.choice), ...(activity.askedAboutHistory ? ['ASK_JIUGE_HISTORY'] : [])],
        activity.outcome,
      );
    case 'WANG_FACTORY': {
      const trace = createTrace(activity, activity.decisions.map((decision) => decision.choice), null, activity.income, activity.qualityBonus);
      const scenarioVersion = activity.scenarioVersion ?? 1;
      const scenarioSeed = activity.scenarioSeed ?? 4;
      const missedDecision = activity.decisions.find((decision) => !decision.correct);
      if (!missedDecision) return { ...trace, scenarioVersion, scenarioSeed };
      const inspection = factoryInspectionForDay(
        activity.day,
        missedDecision.step,
        scenarioVersion,
        scenarioSeed,
      );
      return {
        ...trace,
        scenarioVersion,
        scenarioSeed,
        factoryReturnContext: {
          previousDay: activity.day,
          step: missedDecision.step,
          caseTitle: inspection.title,
          choice: missedDecision.choice,
          correctChoice: inspection.correctChoice,
          qualityBonusMissed: factoryShiftBonusPerCorrectCheck,
        },
      };
    }
    case 'BODHISATTVA_CHART_LESSON':
      return {
        ...createTrace(activity, activity.decisions.map((decision) => decision.choice), null, null, activity.score),
        ...(activity.scenarioVersion === 2 ? {
          scenarioVersion: activity.scenarioVersion,
          scenarioSeed: activity.scenarioSeed ?? 4,
          ...(activity.scenarioIndex === undefined ? {} : { scenarioIndex: activity.scenarioIndex }),
        } : {}),
      };
    case 'SUJIE_CAFE_SHIFT': {
      const scenarioVersion = activity.scenarioVersion ?? 1;
      const scenarioSeed = activity.scenarioSeed ?? 4;
      const regularStep = ([0, 1, 2] as const).find((step) =>
        cafeCustomerFor(activity.day, step, scenarioVersion, scenarioSeed) === 'REGULAR');
      return {
        ...createTrace(
          activity,
          activity.decisions.map((decision) => decision.choice),
          null,
          activity.income,
          activity.decisions.filter((decision) => decision.correct).length,
        ),
        scenarioVersion,
        scenarioSeed,
        ...(regularStep === undefined ? {} : {
          sujieRegularCustomerName: cafeScenarioFor(
            activity.day,
            regularStep,
            scenarioVersion,
            scenarioSeed,
            activity.returnContext,
          ).name,
        }),
      };
    }
    case 'SWEEPER_RISK_REPLAY':
      return {
        ...createTrace(activity, activity.decisions.map((decision) => `ALLOCATION_${decision.allocation}`), null, null, activity.respectedBudget),
        ...(activity.scenarioVersion === 2 ? {
          scenarioVersion: activity.scenarioVersion,
          scenarioSeed: activity.scenarioSeed ?? 4,
          ...(activity.scenarioIndex === undefined ? {} : { scenarioIndex: activity.scenarioIndex }),
        } : {}),
      };
    case 'LAOLIANG_MARKET_STALL': {
      const trace = createTrace(activity, activity.decisions.map((decision) => `${decision.product}_${decision.priceTier}`), null, activity.income);
      const fairSales = activity.decisions.filter((decision) => decision.commission > 0 && decision.priceTier !== 'PREMIUM');
      if (activity.scenarioVersion !== 3 || fairSales.length < 2) return trace;
      const bestSale = fairSales.reduce((best, decision) => decision.commission > best.commission ? decision : best);
      return {
        ...trace,
        scenarioVersion: activity.scenarioVersion,
        scenarioSeed: activity.scenarioSeed ?? 4,
        laoLiangReturnContext: { previousDay: activity.day, product: bestSale.product },
      };
    }
    case 'ZHOU_BROKER_NEGOTIATION':
      return {
        ...createTrace(activity, [`PLAN_${activity.plan}`, `TURNOVER_${activity.projectedTurnover}`], activity.plan, -activity.serviceFeePaid),
        ...(activity.previousReview ? { brokerContractReview: activity.previousReview } : {}),
      };
    case 'ZHENG_BIKE_REPAIR': {
      const tests = activity.tests.map((test) => `TEST_${test.part}_${test.foundFault ? 'FAULT' : 'CLEAR'}`);
      const repairs = activity.decisions.map((decision) => `REPAIR_${decision.repairedPart}_${decision.verified ? 'VERIFIED' : 'UNVERIFIED'}_${decision.correct ? 'CORRECT' : 'MISSED'}`);
      const followUpDecision = activity.decisions.find((decision) => {
        const repairCase = bikeRepairCaseFor(
          activity.day,
          decision.step,
          activity.scenarioVersion ?? 1,
          activity.scenarioSeed ?? 4,
          activity.returnContext ?? null,
        );
        return !decision.correct || (repairCase.warrantyProofRequired && !decision.verified);
      });
      const trace = createTrace(activity, [...tests, ...repairs], null, activity.income, activity.qualityBonus);
      if (!followUpDecision) return trace;
      const repairCase = bikeRepairCaseFor(
        activity.day,
        followUpDecision.step,
        activity.scenarioVersion ?? 1,
        activity.scenarioSeed ?? 4,
        activity.returnContext ?? null,
      );
      return {
        ...trace,
        scenarioVersion: activity.scenarioVersion ?? 1,
        scenarioSeed: activity.scenarioSeed ?? 4,
        zhengRepairReturnContext: {
          previousDay: activity.day,
          customerName: repairCase.customerName,
          issueTitle: repairCase.title,
          faultPart: repairCase.faultyPart,
          kind: followUpDecision.correct ? 'MISSING_PROOF' : 'MISSED_REPAIR',
        },
      };
    }
    case 'PHONE_FLIP': {
      const trace = createTrace(activity, activity.decisions.map((decision) => decision.choice), null, activity.totalProfit);
      const uninspectedLoss = activity.decisions.find((decision) =>
        decision.bought && decision.inspection === null && decision.profit < 0);
      if (activity.scenarioVersion !== 5 || !uninspectedLoss) return trace;
      return {
        ...trace,
        scenarioVersion: activity.scenarioVersion,
        scenarioSeed: activity.scenarioSeed ?? 4,
        phoneFlipReturnContext: {
          previousDay: activity.day,
          phoneName: uninspectedLoss.phoneName,
          loss: Math.abs(uninspectedLoss.profit),
        },
      };
    }
  }
}
