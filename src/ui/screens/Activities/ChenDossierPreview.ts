import { gameReducer } from '../../../core/reducer';
import { createInitialState } from '../../../core/state';
import { companyDossierScenarioIndex } from '../../../core/systems/companyDossierScenarios';
import type { CompanyDossierOpeningChoice, GameState, NpcActivityMemoryTrace } from '../../../core/types';

export function chenReturnPreviewChoiceFor(scenario: string | null): CompanyDossierOpeningChoice | null {
  if (scenario === 'chen-return-append') return 'APPEND_REVISION';
  if (scenario === 'chen-return-separate') return 'KEEP_SEPARATE';
  return null;
}

export function createChenReturnPreviewState(choice: CompanyDossierOpeningChoice): GameState {
  const selected = gameReducer(createInitialState(4), { type: 'SELECT_CHARACTER', gender: 'MALE' });
  const trace: NpcActivityMemoryTrace = {
    day: 4,
    scenarioVersion: 2,
    scenarioSeed: selected.scenarioSeed,
    scenarioIndex: companyDossierScenarioIndex(4, selected.scenarioSeed),
    activityId: 'CHEN_DOSSIER',
    choiceKeys: [`CHEN_OPENING_${choice}`, 'VERIFY_FILING', 'CHECK_SUPPLIER', 'MATCH_INVOICES'],
    outcomeCode: 'WAIT',
    cashDelta: null,
    score: 3,
  };
  return {
    ...selected,
    day: 5,
    phase: 'DAYTIME',
    npcActivityMemory: {
      ...selected.npcActivityMemory,
      chen: { completedRuns: 1, lastCompletedDay: 4, lastTrace: trace, recentTraces: [trace] },
    },
  };
}

export function chenReturnPreviewLinks(): string {
  return '<section><h2>陈总 · 跨日回访</h2><p>隔离预览：第 4 天已调查，第 5 天带着旧案卷回访；不会读取或写入正式存档。</p>' +
    '<a href="?artPreview=1&amp;scenario=chen-return-append">街区入口 · 并列归档</a>' +
    '<a href="?artPreview=1&amp;scenario=chen-return-append&amp;activity=CHEN_DOSSIER">调查入口 · 并列归档</a>' +
    '<a href="?artPreview=1&amp;scenario=chen-return-separate">街区入口 · 独立归档</a>' +
    '<a href="?artPreview=1&amp;scenario=chen-return-separate&amp;activity=CHEN_DOSSIER">调查入口 · 独立归档</a></section>';
}
