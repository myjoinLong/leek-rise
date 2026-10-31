import type { NpcActivityMemoryTrace } from '../../../core/types';
import { factoryInspectionForDay } from '../../../core/systems/factoryShift';
import type { FactoryShiftScenarioVersion } from '../../../core/factoryShiftTypes';

function isFactoryVersion(version: number): version is FactoryShiftScenarioVersion {
  return version === 1 || version === 2 || version === 3 || version === 4 || version === 5;
}

function verifiedScore(trace: NpcActivityMemoryTrace): number | null {
  if (trace.day === undefined || !Number.isInteger(trace.day) || trace.day < 1
    || trace.scenarioSeed === undefined || !Number.isInteger(trace.scenarioSeed)
    || trace.scenarioSeed < 0 || trace.scenarioSeed > 0xFFFFFFFF || trace.score === null
    || trace.scenarioVersion === undefined || !isFactoryVersion(trace.scenarioVersion)
    || trace.choiceKeys.length !== 3) return null;

  let correctChecks = 0;
  for (let step = 0; step < 3; step += 1) {
    const choice = trace.choiceKeys[step];
    if (choice !== 'REWORK' && choice !== 'PASS' && choice !== 'HOLD') return null;
    const inspection = factoryInspectionForDay(
      trace.day,
      step,
      trace.scenarioVersion,
      trace.scenarioSeed,
    );
    if (choice === inspection.correctChoice) correctChecks += 1;
  }
  const expectedScore = correctChecks * 20;
  return trace.score === expectedScore ? expectedScore : null;
}

export function factoryRelationshipDialogue(traces: readonly NpcActivityMemoryTrace[]): string | null {
  const factoryTraces = traces.filter((trace) => trace.activityId === 'WANG_FACTORY');
  const latest = factoryTraces[factoryTraces.length - 1];
  if (!latest) return null;
  const latestScore = verifiedScore(latest);
  if (latestScore === null) return null;

  let perfectStreak = 0;
  for (let index = factoryTraces.length - 1; index >= 0; index -= 1) {
    const score = factoryTraces[index] ? verifiedScore(factoryTraces[index]!) : null;
    if (score !== 60) break;
    perfectStreak += 1;
  }

  if (perfectStreak >= 3) {
    return '这几班你都按记录把问题拦下来了。返工款从我的承包账里扣，不该从你工资里扣；上游催得再急，我也不会让你替流程缺口签字。';
  }
  if (perfectStreak === 2) {
    return '连续两班都核得清楚。催交期的电话我来接，你先把手里的工单和实物对完再签。';
  }
  if (latestScore === 60) {
    return '上回三项都查准了。今天的工单还是按证据走，不用替我赶着签字。';
  }
  if (latest.factoryReturnContext) {
    return '上次漏掉的那项质量奖没拿到，底薪没有扣。今天按新工单重新核，问题记在流程上，不记到你工资里。';
  }
  return '上回有工位没拿到质量奖，底薪照发。先把今天的记录看完，别拿猜测替工单签字。';
}
