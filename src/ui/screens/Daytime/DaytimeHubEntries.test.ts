import { describe, expect, it } from 'vitest';
import { activityContracts } from '../../../core/activityContracts';
import { createInitialState } from '../../../core/state';
import { cafeScenarioFor, cafeShiftBasePay, cafeShiftOrders, cafeShiftTipPerCorrectOrder } from '../../../core/systems/cafeShift';
import { deliveryRunProfile, deliveryStops, minimumDeliveryEnergy } from '../../../core/systems/deliveryRun';
import { factoryInspectionForDay, factoryShiftBaseIncome, factoryShiftBonusPerCorrectCheck, factoryShiftMaximumEnergy, factoryShiftMinimumEnergy, factoryShiftStops } from '../../../core/systems/factoryShift';
import { phoneFlipPolicy, phoneLotBriefFor, phoneLotPriceRangeFor } from '../../../core/systems/phoneFlip';
import { stallIncomeRange, stallPolicy } from '../../../core/systems/laoLiangMarketStall';
import { minimumStreamEnergy, streamIncomeRange } from '../../../core/systems/streamRun';
import { bikeRepairCaseFor, zhengRepairBasePay, zhengRepairJobs, zhengRepairQualityBonus } from '../../../core/systems/zhengBikeRepair';
import { getBrokerBreakEvenTurnover } from '../../../core/systems/brokerNegotiation';
import { entries, sprite } from './DaytimeHubEntries';
import { dialogueForEntry } from './npcReturnDialogue';

describe('daytime hub entry manifest', () => {
  it('gives every NPC a distinct pixel-sprite signature for map and dialogue use', () => {
    const marks: string[] = [];
    const tiles: string[] = [];
    entries.forEach((entry) => {
      const rendered = sprite(entry.id, entry.palette);
      expect(rendered).toContain('data-npc="' + entry.id + '"');
      expect(rendered).toContain('--sprite-src');
      const mark = rendered.match(/data-mark="([^"]+)"/)?.[1];
      expect(mark).toBeDefined();
      marks.push(mark ?? '');
      const tile = rendered.match(/--sprite-x:([^;]+);--sprite-y:([^"]+)/);
      expect(tile).toBeDefined();
      tiles.push((tile?.[1] ?? '') + '|' + (tile?.[2] ?? ''));
    });
    expect(new Set(marks).size).toBe(entries.length);
    expect(new Set(tiles).size).toBe(entries.length);
    expect(sprite('delivery', '#3a3022|#e27032|#324052')).toContain('data-mark="delivery-box"');
    expect(sprite('xiaolian', '#3a2b32|#b64c69|#4b354d')).toContain('data-mark="phone-ringlight-scriptcard"');
    expect(sprite('jiuge', '#625a54|#46383c|#343239')).toContain('data-mark="pawn-silverhair-ledger-abacus"');
    expect(sprite('longge', '#171719|#292c31|#37383c')).toContain('data-mark="bbq-chat-phone-tongs"');
    expect(sprite('sujie', '')).toContain('data-mark="cafe-cup-apron-accountbook"');
    expect(sprite('zheng', '#625e58|#547b79|#3f4648')).toContain('data-mark="repair-diagnostic-ticket-wrench"');
    expect(sprite('jiuge', '')).toContain('--sprite-src:url(/art/jiuge-character-v3.png)');
    expect(sprite('longge', '')).toContain('--sprite-src:url(/art/longge-character-v4.png)');
    expect(sprite('zheng', '')).toContain('--sprite-src:url(/art/zheng-character-v2.png)');
    expect(sprite('sujie', '')).toContain('--sprite-src:url(/art/sujie-character-v3.png)');
    expect(sprite('xiaolian', '')).toContain('--sprite-src:url(/art/xiaolian-character-v3.png)');
    expect(sprite('delivery', '')).toContain('--sprite-src:url(/art/delivery-dispatcher-character-v1.webp)');
    expect(sprite('wang', '')).toContain('data-mark="factory-defect-clipboard-carton"');
    expect(sprite('wang', '')).toContain('--sprite-src:url(/art/wang-factory-character-v3.png)');
    expect(sprite('wang', '')).toContain('--sprite-width:48px');
    expect(sprite('wang', '')).toContain('--sprite-height:72px');
    expect(sprite('laoliang', '')).toContain('--sprite-src:url(/art/laoliang-market-character-v1.webp)');
    expect(sprite('chen', '')).toContain('--sprite-src:url(/art/chen-character-v1.webp)');
    expect(sprite('zhou', '')).toContain('--sprite-src:url(/art/zhou-character-v1.webp)');
    expect(sprite('bodhisattva', '')).toContain('--sprite-src:url(/art/bodhisattva-character-v1.webp)');
    expect(sprite('phoneflip', '')).toContain('--sprite-src:url(/art/ahao-character-v1.webp)');
    expect(sprite('sweeper', '')).toContain('--sprite-src:url(/art/sweeper-character-v1.webp)');
    expect(sprite('jiuge', '')).toContain('--sprite-width:56px');
    expect(sprite('jiuge', '')).toContain('--sprite-height:84px');
    expect(sprite('longge', '')).toContain('--sprite-width:56px');
    expect(sprite('longge', '')).toContain('--sprite-height:84px');
    expect(sprite('zheng', '')).toContain('--sprite-width:56px');
    expect(sprite('zheng', '')).toContain('--sprite-height:84px');
    expect(sprite('sujie', '')).toContain('--sprite-width:48px');
    expect(sprite('sujie', '')).toContain('--sprite-height:72px');
    expect(sprite('delivery', '')).toContain('--sprite-height:60px');
    expect(sprite('chen', '')).toContain('--sprite-height:60px');
  });

  it('keeps every scene hotspot uniquely placed and every implemented activity routed', () => {
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(entries.length);
    const positions = entries.map((entry) => entry.x + ':' + entry.y);
    expect(new Set(positions).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.x).toBeGreaterThanOrEqual(0);
      expect(entry.x).toBeLessThanOrEqual(100);
      expect(entry.y).toBeGreaterThanOrEqual(0);
      expect(entry.y).toBeLessThanOrEqual(100);
      expect(typeof entry.getPresentation).toBe('function');
    }

    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    const implementedIds = ids.filter((id) => id !== 'zhou');
    for (const id of implementedIds) {
      const entry = entries.find((candidate) => candidate.id === id);
      expect(entry?.getPresentation(state).primaryAction, id).not.toBeNull();
    }
    const zhou = entries.find((entry) => entry.id === 'zhou')?.getPresentation(state);
    expect(zhou).toMatchObject({
      primaryAction: { type: 'START_BROKER_NEGOTIATION' },
      primaryDisabled: false,
      primaryLabel: '进入佣金谈判副本 · 可免费保留标准账户',
    });

    const activityEntries = entries.filter((entry) => entry.activityId);
    expect(activityEntries.map((entry) => entry.activityId).sort()).toEqual(Object.keys(activityContracts).sort());
  });

  it('derives availability from shared game state, including Jiuge’s crisis branch', () => {
    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    const byId = (id: string) => entries.find((entry) => entry.id === id)!;

    expect(byId('delivery').getPresentation({ ...state, workedToday: true }).primaryDisabled).toBe(true);
    expect(byId('sujie').getPresentation({ ...state, energy: 14 }).prompt).toBe('精力不足');
    expect(byId('chen').getPresentation({ ...state, chenVisitedToday: true }).primaryLabel).toBe('今天已经核验过材料');
    expect(byId('jiuge').getPresentation(state).primaryAction).toEqual({ type: 'BORROW_FROM_NPC' });
    expect(byId('jiuge').getDialogue?.(state)).toContain('扣 10 点韭性');
    expect(byId('jiuge').getDialogue?.({ ...state, debtCrisisStarted: true })).toContain('欠款 ¥18,000');
    expect(byId('longge').getDialogue?.(state)).toContain('不替你保证');
    expect(byId('longge').getDialogue?.({ ...state, longgeVisitedToday: true })).toContain('原始聊天');
    expect(byId('jiuge').getPresentation({ ...state, debtCrisisStarted: true }).primaryAction)
      .toEqual({ type: 'START_JIUGE_NEGOTIATION' });
    const crisisState = { ...state, debtCrisisStarted: true };
    for (const entry of entries.filter((candidate) => candidate.activityId)) {
      const contract = activityContracts[entry.activityId!];
      const entryState = entry.id === 'jiuge' ? crisisState : state;
      expect(entry.getPresentation(entryState).primaryAction, entry.id).toEqual(contract.startAction);
    }
  });

  it('gives every NPC a distinctive, day-aware opening line tied to the actual activity scenario', () => {
    const state = { ...createInitialState(47), phase: 'DAYTIME' as const, day: 12 };
    const byId = (id: string) => entries.find((entry) => entry.id === id)!;
    const stockName = state.stocks[state.selectedStockId]?.name ?? '';
    const factory = factoryInspectionForDay(state.day, 0, 4, state.scenarioSeed);
    const cafe = cafeScenarioFor(state.day, 0, 3, state.scenarioSeed);
    const phoneLot = phoneLotBriefFor(state.day, 0, 3, state.scenarioSeed);
    const dialogues = entries.map((entry) => entry.getDialogue(state));

    expect(dialogues.every((dialogue) => dialogue.trim().length > 0)).toBe(true);
    expect(new Set(dialogues).size).toBe(entries.length);
    expect(byId('chen').getDialogue(state)).toContain(stockName);
    expect(byId('bodhisattva').getDialogue(state)).toContain(stockName);
    expect(byId('zhou').getDialogue(state)).toContain(getBrokerBreakEvenTurnover().toLocaleString());
    expect(byId('wang').getDialogue(state)).toContain(factory.title);
    expect(byId('sujie').getDialogue(state)).toContain(cafe.name);
    expect(byId('sujie').getDialogue(state)).toContain(cafe.request);
    const returningPlayer = {
      ...state,
      npcActivityMemory: {
        ...state.npcActivityMemory,
        sujie: { completedRuns: 1, lastCompletedDay: state.day - 1, lastTrace: null, recentTraces: [] },
      },
    };
    expect(dialogueForEntry(byId('sujie'), returningPlayer)).toContain('第 ' + (state.day - 1) + ' 天那回');
    expect(byId('sweeper').getDialogue(state)).toContain('虚拟');
    expect(byId('delivery').getDialogue(state)).toContain(String(deliveryRunProfile(state.day, 3, state.scenarioSeed).minimumIncome));
    expect(byId('phoneflip').getDialogue(state)).toContain(phoneLot.name);
    expect(byId('phoneflip').getDialogue(state)).toContain(phoneLot.sellerName);
  });

  it('keeps cafe and repair entry earnings aligned with the Core rules', () => {
    const state = { ...createInitialState(), phase: 'DAYTIME' as const };
    const byId = (id: string) => entries.find((entry) => entry.id === id)!;
    const cafe = byId('sujie');
    const repair = byId('zheng');
    const cafeMaximum = cafeShiftBasePay + cafeShiftOrders * cafeShiftTipPerCorrectOrder;
    const repairMaximum = zhengRepairJobs * (zhengRepairBasePay + zhengRepairQualityBonus);

    expect(cafe.line).toContain('底薪 ¥' + cafeShiftBasePay);
    expect(cafe.line).toContain('每杯服务正确加 ¥' + cafeShiftTipPerCorrectOrder);
    expect(cafe.getPresentation(state).primaryLabel).toContain('全对最多 ¥' + cafeMaximum);
    expect(repair.line).toContain('每单底薪 ¥' + zhengRepairBasePay);
    expect(repair.line).toContain('修对再拿 ¥' + zhengRepairQualityBonus);
    const continuation = { ...state, day: 31 };
    expect(repair.getDialogue?.(continuation)).toContain(bikeRepairCaseFor(31, 0, 4, state.scenarioSeed).title);
    expect(repair.getDialogue?.(state)).toContain('凭经验判断');
    expect(repair.getPresentation(state).primaryLabel).toContain('全对最多 ¥' + repairMaximum);
  });

  it('discloses route income ranges and material costs before entering cash activities', () => {
    const state = { ...createInitialState(), phase: 'DAYTIME' as const, gender: 'FEMALE' as const };
    const byId = (id: string) => entries.find((entry) => entry.id === id)!;
    const deliveryIncome = deliveryStops.reduce((sum, stop) => sum + Math.min(...stop.options.map((option) => option.income)), 0);
    const deliveryMaximum = deliveryStops.reduce((sum, stop) => sum + Math.max(...stop.options.map((option) => option.income)), 0);
    const factoryMaximum = factoryShiftBaseIncome + factoryShiftStops * factoryShiftBonusPerCorrectCheck;
    const stallIncomeBounds = stallIncomeRange();
    const streamBounds = streamIncomeRange(state.fame, state.gender, state.day, state.scenarioSeed, 3);
    const phoneOffers = phoneLotPriceRangeFor(state.day);

    expect(byId('delivery').getPresentation(state).primaryLabel).toContain('¥' + deliveryIncome + '–¥' + deliveryMaximum);
    expect(byId('delivery').getPresentation(state).primaryLabel).toContain(minimumDeliveryEnergy + '–');
    expect(byId('wang').getPresentation(state).primaryLabel).toContain('¥' + factoryShiftBaseIncome + '–¥' + factoryMaximum);
    expect(byId('wang').getPresentation(state).primaryLabel).toContain(factoryShiftMinimumEnergy + '–' + factoryShiftMaximumEnergy);
    expect(byId('laoliang').getPresentation(state).primaryLabel).toContain('¥' + stallIncomeBounds.minimum + '–¥' + stallIncomeBounds.maximum);
    expect(byId('laoliang').getPresentation(state).primaryLabel).toContain('精力 -' + stallPolicy.minimumEnergy);
    expect(byId('laoliang').line).toContain('不用你先垫进货款');
    expect(byId('xiaolian').getPresentation(state).primaryLabel).toContain('¥' + streamBounds.minimum + '–¥' + streamBounds.maximum);
    expect(byId('xiaolian').getDialogue?.(state)).toContain('精力 ' + minimumStreamEnergy);
    expect(byId('xiaolian').getDialogue?.(state)).not.toContain('““');
    expect(byId('xiaolian').getDialogue?.(state)).not.toContain('””');
    expect(byId('phoneflip').getPresentation(state).primaryLabel).toContain('¥' + phoneOffers.minimumOffer + '–¥' + phoneOffers.maximumOffer);
    expect(byId('phoneflip').getPresentation(state).primaryLabel).toContain('未验机整备需另留最多 ¥' + phoneFlipPolicy.maxUninspectedRepairReserve);
    expect(streamIncomeRange(0, 'MALE')).toEqual({ minimum: 90, maximum: 170 });
    expect(streamIncomeRange(0, 'FEMALE')).toEqual({ minimum: 108, maximum: 204 });
    expect(byId('wang').line).toContain('通过耗 5 点精力，返工耗 9 点');
    expect(byId('wang').line).toContain('离开不发工资');
    expect(byId('xiaolian').getDialogue?.(state)).toContain('中途离开不发收入');
    expect(byId('phoneflip').line).toContain('开始即占今天工作名额');
  });

  it('shows the continuation day’s exact delivery income and energy range before entry', () => {
    const state = { ...createInitialState(7331), day: 31, phase: 'DAYTIME' as const, energy: 100 };
    const delivery = entries.find((entry) => entry.id === 'delivery')!;
    const profile = deliveryRunProfile(state.day, 3, state.scenarioSeed);
    const presentation = delivery.getPresentation(state);

    expect(presentation.primaryLabel).toContain('¥' + profile.minimumIncome + '–¥' + profile.maximumIncome);
    expect(presentation.primaryLabel).toContain('精力 ' + profile.minimumEnergy + '–' + profile.maximumEnergy);
    expect(presentation.primaryDisabled).toBe(false);
    expect(delivery.getDialogue?.(state)).toContain('¥' + profile.minimumIncome + '–¥' + profile.maximumIncome);
  });

  it('lets Zhou cite the expired contract’s real turnover and net cost', () => {
    const state = {
      ...createInitialState(), day: 8, phase: 'DAYTIME' as const,
      brokerContract: {
        plan: 'LOW_COMMISSION' as const, signedDay: 1, expiresDay: 7, projectedTurnover: 36000 as const,
        actualTurnover: 10000, discountedFeesPaid: 10, standardFeesEquivalent: 15, serviceFee: 18 as const,
      },
    };
    const zhou = entries.find((entry) => entry.id === 'zhou');
    const dialogue = zhou?.getDialogue(state) ?? '';
    expect(dialogue).toContain('预估成交额 ¥36,000，实际 ¥10,000');
    expect(dialogue).toContain('比标准费率多支出 ¥13.00');
  });
});
