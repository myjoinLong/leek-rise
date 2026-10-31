import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../../core/state';
import type { NpcActivityMemoryTrace, NpcId } from '../../../core/types';
import { entries } from './DaytimeHubEntries';
import { memoryDialogueFor } from './npcMemoryDialogue';
import { dialogueForEntry } from './npcReturnDialogue';

const memoryTraces: Record<NpcId, NpcActivityMemoryTrace> = {
  jiuge: { activityId: 'JIUGE_NEGOTIATION', choiceKeys: ['ASK_JIUGE_HISTORY', 'SHOW_LEDGER'], outcomeCode: 'INSTALLMENTS', cashDelta: null, score: null },
  longge: { activityId: 'LONGGE_CHAT', choiceKeys: ['VERIFY_ORIGIN', 'READ_TAPE'], outcomeCode: 'INSUFFICIENT', cashDelta: null, score: 0 },
  chen: { activityId: 'CHEN_DOSSIER', choiceKeys: ['VERIFY_FILING', 'CHECK_SUPPLIER'], outcomeCode: 'WAIT', cashDelta: null, score: 2 },
  bodhisattva: { activityId: 'BODHISATTVA_CHART_LESSON', choiceKeys: ['RIDE_HIGHER_LOWS'], outcomeCode: null, cashDelta: null, score: 2 },
  xiaolian: { activityId: 'XIAOLIAN_STREAM', choiceKeys: ['HONEST_REVIEW'], outcomeCode: 'FAME_-5', cashDelta: 100, score: -5 },
  sujie: { activityId: 'SUJIE_CAFE_SHIFT', choiceKeys: ['BLACK_COFFEE', 'WARM_MILK'], outcomeCode: null, cashDelta: 142, score: 2 },
  zhou: { activityId: 'ZHOU_BROKER_NEGOTIATION', choiceKeys: ['PLAN_LOW_COMMISSION'], outcomeCode: 'LOW_COMMISSION', cashDelta: -18, score: null },
  wang: { activityId: 'WANG_FACTORY', choiceKeys: ['PASS', 'REWORK', 'HOLD'], outcomeCode: null, cashDelta: 100, score: 20 },
  laoliang: { activityId: 'LAOLIANG_MARKET_STALL', choiceKeys: ['THERMOS_PREMIUM'], outcomeCode: null, cashDelta: 57, score: null },
  sweeper: { activityId: 'SWEEPER_RISK_REPLAY', choiceKeys: ['ALLOCATION_20', 'ALLOCATION_50', 'ALLOCATION_0'], outcomeCode: null, cashDelta: null, score: 2 },
  delivery: { activityId: 'WANG_DELIVERY', choiceKeys: ['ALLEY', 'MAIN', 'RUSH'], outcomeCode: null, cashDelta: 184, score: null },
  zheng: { activityId: 'ZHENG_BIKE_REPAIR', choiceKeys: ['TEST_BATTERY_FAULT', 'REPAIR_BATTERY_VERIFIED_CORRECT'], outcomeCode: null, cashDelta: 110, score: 50 },
  phoneflip: { activityId: 'PHONE_FLIP', choiceKeys: ['BARGAIN_QUICK', 'PASS', 'ASK_REFURB'], outcomeCode: null, cashDelta: -20, score: null },
};

describe('NPC return dialogue', () => {
  it('does not imply familiarity before a completed activity', () => {
    const state = createInitialState();
    for (const entry of entries) {
      expect(dialogueForEntry(entry, state)).toBe(entry.getDialogue(state));
    }
  });

  it('gives every NPC a distinct voice that references saved activity history', () => {
    const state = createInitialState();
    for (const entry of entries) {
      state.npcActivityMemory[entry.id] = { completedRuns: 1, lastCompletedDay: 8, lastTrace: null, recentTraces: [] };
    }

    const dialogues = entries.map((entry) => dialogueForEntry(entry, state));
    const returnLines = dialogues.map((dialogue, index) => dialogue.slice(entries[index]!.getDialogue(state).length).trim());

    expect(new Set(returnLines).size).toBe(entries.length);
    expect(returnLines.every((line) => line.includes('第 8 天那回'))).toBe(true);
    expect(returnLines.every((line) => line.length > 0)).toBe(true);
  });

  it('acknowledges repeat visits without inferring an unrecorded choice or outcome', () => {
    const state = createInitialState();
    state.npcActivityMemory.zheng = { completedRuns: 3, lastCompletedDay: 17, lastTrace: null, recentTraces: [] };

    const dialogue = dialogueForEntry(entries.find((entry) => entry.id === 'zheng')!, state);

    expect(dialogue).toContain('第 17 天那回');
    expect(dialogue).toContain('郑师傅翻开检测规程');
    expect(dialogue).toContain('换件前得先找到原因');
  });

  it('gives every NPC a three-stage relationship voice tied to completed activity history', () => {
    const state = createInitialState();
    const sujie = entries.find((entry) => entry.id === 'sujie');
    if (!sujie) throw new Error('Missing Sujie street entry.');
    const base = sujie.getDialogue(state);
    const voiceAt = (completedRuns: number): string => {
      state.npcActivityMemory.sujie = { completedRuns, lastCompletedDay: 11, lastTrace: null, recentTraces: [] };
      return dialogueForEntry(sujie, state).slice(base.length).trim();
    };

    expect(voiceAt(2)).toContain('苏姐认出你');
    expect(voiceAt(3)).toContain('苏姐把杯垫摆正');
    expect(voiceAt(5)).toContain('苏姐把杯垫摆正');
    expect(voiceAt(6)).toContain('苏姐把菜单收好');

    for (const completedRuns of [1, 3, 6]) {
      const voices = entries.map((entry) => {
        state.npcActivityMemory[entry.id] = { completedRuns, lastCompletedDay: 11, lastTrace: null, recentTraces: [] };
        return dialogueForEntry(entry, state).slice(entry.getDialogue(state).length).trim();
      });
      expect(new Set(voices).size).toBe(entries.length);
      expect(voices.every((voice) => voice.includes('第 11 天那回'))).toBe(true);
    }
  });

  it('lets Longge remember the player\'s last recorded conclusion without grading it as correct', () => {
    const state = createInitialState();
    const longge = entries.find((entry) => entry.id === 'longge');
    if (!longge) throw new Error('Missing Longge street entry.');
    state.npcActivityMemory.longge = { completedRuns: 1, lastCompletedDay: 8, lastTrace: null, recentTraces: [] };

    const expected = new Map([
      ['DISTRIBUTION', '你上回判断有人借利好出货'],
      ['REAL_CATALYST', '你上回判断有真实利好'],
      ['INSUFFICIENT', '你上回选证据还不够'],
    ] as const);

    for (const [conclusion, line] of expected) {
      state.longgeLastConclusion = conclusion;
      expect(dialogueForEntry(longge, state)).toContain(line);
    }
  });

  it('returns saved choices and outcomes through the matching NPC voice', () => {
    const state = createInitialState();
    const expectedMentions: Record<NpcId, string> = {
      jiuge: '你选的是办理分期',
      longge: '你查了核对原始来源、看成交明细',
      chen: '你核过核查公告、核对供应商',
      bodhisattva: '答对 2/3',
      xiaolian: '你选了如实测评',
      sujie: '听准了 2 杯',
      zhou: '你选了优惠费率',
      wang: '放行 1 项、返工 1 项、隔离 1 项',
      laoliang: '保温杯高价',
      sweeper: '仓位 20%',
      delivery: '走小巷',
      zheng: '做了 1 次处理',
      phoneflip: '议价后快修',
    };

    for (const entry of entries) {
      state.npcActivityMemory[entry.id] = {
        completedRuns: 1,
        lastCompletedDay: 11,
        lastTrace: memoryTraces[entry.id],
        recentTraces: [memoryTraces[entry.id]],
      };
      expect(dialogueForEntry(entry, state), entry.id).toContain(expectedMentions[entry.id]);
    }
    const jiuge = entries.find((entry) => entry.id === 'jiuge');
    if (!jiuge) throw new Error('Missing Jiuge street entry.');
    expect(dialogueForEntry(jiuge, state)).toContain('那张只写总数的糊涂账');
  });

  it('lets Sujie respond to the change between the previous and latest shift', () => {
    const state = createInitialState();
    const previous = { ...memoryTraces.sujie, day: 4, score: 1, cashDelta: 107 };
    const latest = { ...memoryTraces.sujie, day: 13, score: 3, cashDelta: 177 };
    const sujie = entries.find((entry) => entry.id === 'sujie');
    if (!sujie) throw new Error('Missing Sujie street entry.');
    state.npcActivityMemory.sujie = {
      completedRuns: 2,
      lastCompletedDay: 12,
      lastTrace: latest,
      recentTraces: [previous, latest],
    };

    expect(dialogueForEntry(sujie, state)).toContain('第 4 天听准 1 杯，第 13 天听准 3 杯');
    expect(dialogueForEntry(sujie, state)).toContain('熟客也要重新问需求');
  });

  it('gives all thirteen NPCs a continuity line grounded in their last two recorded activities', () => {
    const expectedOpening: Record<NpcId, string> = {
      jiuge: '上回', longge: '上回判断', chen: '上回找到', bodhisattva: '上回',
      xiaolian: '上回进账', sujie: '上回听准', zhou: '上回', wang: '上回质量奖',
      laoliang: '上回到手', sweeper: '上回有', delivery: '上回路线', zheng: '上回质量奖',
      phoneflip: '上回盈亏',
    };

    for (const entry of entries) {
      const latest = memoryTraces[entry.id];
      const previous: NpcActivityMemoryTrace = {
        ...latest,
        cashDelta: latest.cashDelta === null ? null : latest.cashDelta - 10,
        score: latest.score === null ? null : latest.score + 1,
      };
      const line = memoryDialogueFor(entry.id, [previous, latest]);

      expect(line, entry.id).not.toBeNull();
      expect(line, entry.id).toContain(expectedOpening[entry.id]);
    }
  });
});
