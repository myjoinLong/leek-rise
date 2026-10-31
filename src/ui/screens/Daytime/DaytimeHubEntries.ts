import type { GameAction } from '../../../core/reducer';
import type { GameState, NpcId } from '../../../core/types';
import { activityContracts, type ActivityId } from '../../../core/activityContracts';
import { deliveryReturnContextFor, deliveryRunProfileForState } from '../../../core/systems/deliveryRun';
import { factoryInspectionForDay, factoryShiftBaseIncome, factoryShiftBonusPerCorrectCheck, factoryShiftMaximumEnergy, factoryShiftMinimumEnergy, factoryShiftPassEnergy, factoryShiftReworkEnergy, factoryShiftStops } from '../../../core/systems/factoryShift';
import { minimumDossierEnergy } from '../../../core/systems/companyDossier';
import { minimumChartLessonEnergy } from '../../../core/systems/chartLesson';
import { cafeScenarioFor, cafeShiftBasePay, cafeShiftOrders, cafeShiftTipPerCorrectOrder, minimumCafeShiftEnergy } from '../../../core/systems/cafeShift';
import { minimumStreamEnergy, streamIncomeRange } from '../../../core/systems/streamRun';
import { streamScenarioFor } from '../../../core/streamScenarios';
import { streamReturnConcern, streamReturnContextFor } from '../../../core/streamRunMemory';
import { riskReplayPolicy } from '../../../core/systems/riskReplay';
import { stallIncomeRange, stallPolicy, stallProducts } from '../../../core/systems/laoLiangMarketStall';
import { laoLiangReturnContextFor } from '../../../core/laoLiangStallMemory';
import { stallMarketDayFor } from '../../../core/marketStallScenarios';
import { bikeRepairCaseFor, zhengRepairBasePay, zhengRepairJobs, zhengRepairMinimumEnergy, zhengRepairQualityBonus } from '../../../core/systems/zhengBikeRepair';
import { zhengRepairReturnContextFor } from '../../../core/zhengBikeRepairMemory';
import { brokeragePolicy, getBrokerBreakEvenTurnover, reviewBrokerContract } from '../../../core/systems/brokerNegotiation';
import { phoneFlipPolicy, phoneLotBriefFor, phoneLotPriceRangeFor } from '../../../core/systems/phoneFlip';

export type EntryId = NpcId;

export interface HubEntryPresentation {
  prompt: string;
  label: string;
  nodeDisabled: boolean;
  primaryLabel: string;
  primaryAction: GameAction | null;
  primaryDisabled: boolean;
}

export interface HubEntry {
  id: EntryId;
  activityId?: ActivityId;
  name: string;
  place: string;
  x: number;
  y: number;
  palette: string;
  prompt: string;
  line: string;
  getPresentation: (state: GameState) => HubEntryPresentation;
  getDialogue: (state: GameState) => string;
}

const cafeShiftMaximumIncome = cafeShiftBasePay + cafeShiftOrders * cafeShiftTipPerCorrectOrder;
const zhengRepairMaximumIncome = zhengRepairJobs * (zhengRepairBasePay + zhengRepairQualityBonus);
const factoryIncomeMaximum = factoryShiftBaseIncome + factoryShiftStops * factoryShiftBonusPerCorrectCheck;

function chenDialogue(state: GameState): string {
  const stock = state.stocks[state.selectedStockId];
  const company = stock?.name ?? '当前自选股';
  return `“第 ${state.day} 天，${company} 的材料摆在这儿。宣传稿我先放一边，合同、供货、回款三份原件得互相对上；没对上的部分，我不会替谁写成已落地。”`;
}

function bodhisattvaDialogue(state: GameState): string {
  const stock = state.stocks[state.selectedStockId];
  if (!stock) return '“先把图上看得到的写下来。口诀说得再满，也不能替市场作保证。”';
  const history = stock.priceHistory.slice(-8);
  const first = history[0] ?? stock.price;
  const last = history[history.length - 1] ?? stock.price;
  const direction = last > first ? '重心略抬高' : last < first ? '重心略走低' : '仍在原位附近';
  return `“今天拿${stock.name}练图。近几个点的价格${direction}，这只是回看，不是预言；三张图分别练高低点、量能和区间边界。”`;
}

function brokerReviewMessage(state: GameState): string | null {
  const review = reviewBrokerContract(state.brokerContract);
  if (!review) return null;
  const variance = review.projectedTurnover === null ? '' : review.actualTurnover >= review.projectedTurnover
    ? `，实际比预估多 ¥${(review.actualTurnover - review.projectedTurnover).toLocaleString('zh-CN')}`
    : `，实际比预估少 ¥${(review.projectedTurnover - review.actualTurnover).toLocaleString('zh-CN')}`;
  const savings = review.netSavingsVsStandard;
  const costResult = savings >= 0
    ? `比标准费率少支出 ¥${savings.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `比标准费率多支出 ¥${Math.abs(savings).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `预估成交额 ¥${review.projectedTurnover?.toLocaleString('zh-CN') ?? '未记录'}，实际 ¥${review.actualTurnover.toLocaleString('zh-CN')}${variance}；优惠佣金 ¥${review.discountedFeesPaid.toFixed(2)} + 服务费 ¥${review.serviceFee.toFixed(2)}，${costResult}。`;
}

function zhouDialogue(state: GameState): string {
  const contract = state.brokerContract;
  const previous = brokerReviewMessage(state);
  if (contract && state.day <= contract.expiresDay) {
    const daysLeft = contract.expiresDay - state.day + 1;
    return `“优惠费率还剩 ${daysLeft} 天。${previous ?? `服务费 ¥${brokeragePolicy.serviceFee} 已经付了。`}签约时的预估不算回本。”`;
  }
  if (contract && previous) {
    return `“上期合同到期了。${previous}这回我先把旧账摊开，再谈要不要续。”`;
  }
  if (state.brokerNegotiationVisitedToday) {
    return '“今天的费率方案已经算过。先按自己的节奏交易，收盘后再拿真实成交额对账。”';
  }
  return `“七天优惠要先付 ¥${brokeragePolicy.serviceFee}；按两档费率差，累计成交额约 ¥${getBrokerBreakEvenTurnover().toLocaleString()} 才打平。低频交易未必划算，不签也能照常用标准费率。”`;
}

function wangDialogue(state: GameState): string {
  const inspection = factoryInspectionForDay(state.day, 0, 4, state.scenarioSeed);
  return `“${inspection.title}这批货催得紧，上游也在压交期。${inspection.managerLine}我急着交货，但没核过的东西不能推给下游；按工单留好记录。”`;
}

function sujieDialogue(state: GameState): string {
  const customer = cafeScenarioFor(state.day, 0, 3, state.scenarioSeed);
  const advice = customer.sujieLine ?? '先听完客人的话，别急着把贵的推过去。';
  const stockNote = customer.availability ? `柜台情况：${customer.availability}` : '';
  return `苏姐擦着杯子说：“${customer.name}刚坐下：${customer.request} ${advice} ${stockNote}菜单和库存会写清，别替客人改主意。”`;
}

function sweeperDialogue(state: GameState): string {
  if (state.riskReplayVisitedToday) {
    return '“今天这盘已经走完。别只记最后赚亏，仓位、压力预算和当时的选择都记下来。”';
  }
  return `“我也有一笔没设边界的旧账。今天只用虚拟 ¥${riskReplayPolicy.startingEquity.toLocaleString()} 练仓位，压力预算 ¥${riskReplayPolicy.lossBudget}；不发现金，每轮耗 ${riskReplayPolicy.energyPerRound} 点精力。先算最坏情况，再谈看多看空。”`;
}

function phoneFlipDialogue(state: GameState): string {
  const lot = phoneLotBriefFor(state.day, 0, 3, state.scenarioSeed);
  return `“${lot.sellerName}带来${lot.name}：${lot.sellerLine}${lot.clue}卖家着急有卖家的原因，别把他的说法当检测结果；验机后再算整备和转售价。”`;
}

export const entries: HubEntry[] = [
  { id: 'chen', activityId: 'CHEN_DOSSIER', name: '陈总', place: '写字楼', x: 65, y: 16, palette: '#47434b|#273e59|#292f3b', prompt: '查资料', line: '“路演稿写得漂亮不算数。去核对合同、供货和回款，再决定信不信。”', getPresentation: (s) => {
    const visited = s.chenVisitedToday;
    const lowEnergy = s.energy < minimumDossierEnergy;
    return { prompt: visited ? '✓' : '查资料', label: visited ? '今日已核验' : '陈总', nodeDisabled: visited, primaryLabel: visited ? '今天已经核验过材料' : '进入公司材料调查 · 精力至少 ' + minimumDossierEnergy, primaryAction: activityContracts.CHEN_DOSSIER.startAction, primaryDisabled: visited || lowEnergy };
  }, getDialogue: chenDialogue },
  { id: 'xiaolian', activityId: 'XIAOLIAN_STREAM', name: '小镰刀', place: '直播间', x: 24, y: 23, palette: '#3a2b32|#b64c69|#4b354d', prompt: '开播', line: '“镜头前讲的是财富自由。来，试播三段；收入看当前人气和你的选题，夸大宣传会伤信任。”', getPresentation: (s) => {
    const canStream = !s.streamedToday && s.energy >= minimumStreamEnergy;
    const income = streamIncomeRange(s.fame, s.gender, s.day, s.scenarioSeed, 3, streamReturnContextFor(s) ?? undefined);
    return { prompt: s.streamedToday ? '✓' : canStream ? '开播' : '精力不足', label: s.streamedToday ? '今日已开播' : '小镰刀', nodeDisabled: !canStream, primaryLabel: s.streamedToday ? '今天已经直播过' : '进入三段直播运营 · 当前人气预计收入 ¥' + income.minimum + '–¥' + income.maximum + ' · 精力 -' + minimumStreamEnergy, primaryAction: activityContracts.XIAOLIAN_STREAM.startAction, primaryDisabled: !canStream };
  }, getDialogue: (s) => {
    const returnContext = streamReturnContextFor(s);
    const income = streamIncomeRange(s.fame, s.gender, s.day, s.scenarioSeed, 3, returnContext ?? undefined);
    const scenario = streamScenarioFor(s.day, 3, s.scenarioSeed);
    const returnLine = returnContext
      ? `第 ${returnContext.previousDay} 天的「${returnContext.previousProduct}」之后，有老观众回来追问：你${streamReturnConcern(returnContext)}，这次还要这么说吗？`
      : '';
    const openingLine = scenario.xiaolianLine.startsWith('“') && scenario.xiaolianLine.endsWith('”')
      ? scenario.xiaolianLine
      : `“${scenario.xiaolianLine}”`;
    return `${openingLine}${returnLine ? ` ${returnLine}` : ''}本场是「${scenario.title}」，预计收入 ¥${income.minimum}–¥${income.maximum}，消耗精力 ${minimumStreamEnergy}。开播即占今天的直播次数；中途离开不发收入，已耗精力不退。每个选项会提前列出对热度、信任和成交意向的影响。`;
  } },
  { id: 'bodhisattva', activityId: 'BODHISATTVA_CHART_LESSON', name: 'K线菩萨', place: '培训班', x: 43, y: 31, palette: '#5d4934|#d0a754|#4a4035', prompt: '练图', line: '“先别交学费。看三张图，练习分清趋势、量能和横盘。”', getPresentation: (s) => {
    const visited = s.chartLessonVisitedToday;
    const lowEnergy = s.energy < minimumChartLessonEnergy;
    return { prompt: visited ? '✓' : lowEnergy ? '精力不足' : '练图', label: visited ? '今日已练习' : 'K线菩萨', nodeDisabled: visited || lowEnergy, primaryLabel: visited ? '今天已经练习过' : '进入三轮读图练习 · 精力 -' + minimumChartLessonEnergy, primaryAction: activityContracts.BODHISATTVA_CHART_LESSON.startAction, primaryDisabled: visited || lowEnergy };
  }, getDialogue: bodhisattvaDialogue },
  { id: 'zhou', activityId: 'ZHOU_BROKER_NEGOTIATION', name: '周经理', place: '证券营业部', x: 74, y: 39, palette: '#292a31|#536273|#303641', prompt: '谈费率', line: '“你可以选标准账户，也可以先算清楚，再决定要不要付服务费换七天优惠费率。”', getPresentation: (s) => {
    const activeContract = s.brokerContract && s.day <= s.brokerContract.expiresDay;
    const visited = s.brokerNegotiationVisitedToday;
    const prompt = activeContract ? '费率生效' : visited ? '✓' : '谈费率';
    const label = activeContract ? '佣金优惠' : visited ? '今日已谈' : '周经理';
    return {
      prompt, label, nodeDisabled: Boolean(activeContract) || visited,
      primaryLabel: activeContract ? `优惠费率已生效 · 有效至第 ${s.brokerContract?.expiresDay ?? s.day} 天` : visited ? '今天已经比较过方案' : '进入佣金谈判副本 · 可免费保留标准账户',
      primaryAction: activityContracts.ZHOU_BROKER_NEGOTIATION.startAction,
      primaryDisabled: Boolean(activeContract) || visited,
    };
  }, getDialogue: zhouDialogue },
  { id: 'laoliang', activityId: 'LAOLIANG_MARKET_STALL', name: '老梁', place: '街道办', x: 28, y: 49, palette: '#403d34|#687b54|#47433b', prompt: '摆摊', line: '“社区活动缺个寄售摊主。货由我垫资，不用你先垫进货款。三轮做完有底薪和毛利分成，今天能卖多少得看客人预算和需求。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < stallPolicy.minimumEnergy;
    const income = stallIncomeRange(s.day, s.scenarioSeed, 3, laoLiangReturnContextFor(s));
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '摆摊', label: worked ? '今日已工作' : '老梁', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入社区寄售摊 · 今日预计收入 ¥' + income.minimum + '–¥' + income.maximum + ' · 精力 -' + stallPolicy.minimumEnergy + ' · 老梁垫资 · 占用今日工作名额', primaryAction: activityContracts.LAOLIANG_MARKET_STALL.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: (s) => { const context = laoLiangReturnContextFor(s); const income = stallIncomeRange(s.day, s.scenarioSeed, 3, context); const marketDay = stallMarketDayFor(s.day, s.scenarioSeed); const returnLine = context ? ` 上次第 ${context.previousDay} 天的${stallProducts[context.product].name}街坊价带来熟客转介绍，今天多 1 件需求。` : ''; return '“' + marketDay.ownerLine + '今天预计总收入 ¥' + income.minimum + '–¥' + income.maximum + '；底薪 ¥' + stallPolicy.baseWage + '，三轮各耗 ' + stallPolicy.energyPerSale + ' 点精力。货由我垫资，你不用先付款；半途离开不发底薪，已耗精力不退。' + returnLine + '”'; } },
  { id: 'wang', activityId: 'WANG_FACTORY', name: '王老板', place: '小工厂', x: 62, y: 53, palette: '#3c302b|#98643d|#494039', prompt: '上工', line: '“三轮检查，底薪 ¥' + factoryShiftBaseIncome + '，每次判断正确再加 ¥' + factoryShiftBonusPerCorrectCheck + '，最高 ¥' + factoryIncomeMaximum + '。通过耗 ' + factoryShiftPassEnergy + ' 点精力，返工耗 ' + factoryShiftReworkEnergy + ' 点；离开不发工资，已耗精力不退。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < factoryShiftMinimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '上工', label: worked ? '今日已上工' : '王老板', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入三轮质检班 · 收入 ¥' + factoryShiftBaseIncome + '–¥' + factoryIncomeMaximum + ' · 精力 ' + factoryShiftMinimumEnergy + '–' + factoryShiftMaximumEnergy, primaryAction: activityContracts.WANG_FACTORY.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: wangDialogue },
  { id: 'jiuge', activityId: 'JIUGE_NEGOTIATION', name: '九哥', place: '当铺', x: 9, y: 59, palette: '#625a54|#46383c|#343239', prompt: '…', line: '“账单我给你对到分。借 ¥1,000 会扣 10 点韭性；签之前，条款一条条看。”', getPresentation: (s) => {
    if (s.debtCrisisStarted) {
      const completed = s.debtNegotiationCompleted;
      return { prompt: completed ? '已协商' : '协商', label: '债务协商', nodeDisabled: completed, primaryLabel: completed ? '本次协商已完成' : '进入债务协商副本', primaryAction: activityContracts.JIUGE_NEGOTIATION.startAction, primaryDisabled: completed };
    }
    const canBorrow = s.leechLevel >= 10;
    return { prompt: '…', label: '九哥', nodeDisabled: false, primaryLabel: '借钱 ¥1,000（韭性 -10）', primaryAction: { type: 'BORROW_FROM_NPC' }, primaryDisabled: !canBorrow };
  }, getDialogue: (s) => {
    if (s.debtCrisisStarted) {
      const contractStatus = s.debtNegotiationCompleted ? '这次宽限已经按合同记账。' : '拿账本和真实收入来谈下一期周利息宽限。';
      return '“欠款 ¥' + s.debt.toLocaleString() + '，现金 ¥' + s.cash.toLocaleString() + '，我给你对到分。' + contractStatus + '”';
    }
    return '“缺周转可以谈，但别把本金当收入。借 ¥1,000 要扣 10 点韭性；先想清楚再签。”';
  } },
  { id: 'sujie', activityId: 'SUJIE_CAFE_SHIFT', name: '苏姐', place: '街角咖啡', x: 86, y: 68, palette: '#513342|#b87791|#504052', prompt: '接单', line: '“午间来客不少，帮我接三杯单。底薪 ¥' + cafeShiftBasePay + '；每杯服务正确加 ¥' + cafeShiftTipPerCorrectOrder + ' 小费，三杯全对最多 ¥' + cafeShiftMaximumIncome + '。中途离开不发工资，已耗精力不退。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < minimumCafeShiftEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '接单', label: worked ? '今日已上班' : '苏姐', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入咖啡短班 · ' + cafeShiftOrders + ' 位客人 · 底薪 ¥' + cafeShiftBasePay + ' + 每杯正确服务小费 ¥' + cafeShiftTipPerCorrectOrder + '（全对最多 ¥' + cafeShiftMaximumIncome + '）· 精力 -' + minimumCafeShiftEnergy, primaryAction: activityContracts.SUJIE_CAFE_SHIFT.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: sujieDialogue },
  { id: 'sweeper', activityId: 'SWEEPER_RISK_REPLAY', name: '扫地僧', place: '口袋公园', x: 49, y: 72, palette: '#32352e|#72805a|#45483e', prompt: '复盘', line: '“给你一万元虚拟资金和三百元压力预算。先分仓位再看旧行情；不发奖金，每段精力 -4，每天一次。”', getPresentation: (s) => {
    const lowEnergy = s.energy < riskReplayPolicy.minimumEnergy;
    const visited = s.riskReplayVisitedToday;
    return { prompt: visited ? '✓' : lowEnergy ? '精力不足' : '复盘', label: visited ? '今日已复盘' : '扫地僧', nodeDisabled: visited || lowEnergy, primaryLabel: '进入仓位复盘桌 · 精力 -12 · 无现金奖励', primaryAction: activityContracts.SWEEPER_RISK_REPLAY.startAction, primaryDisabled: visited || lowEnergy };
  }, getDialogue: sweeperDialogue },
  { id: 'longge', activityId: 'LONGGE_CHAT', name: '龙哥', place: '烧烤摊', x: 11, y: 79, palette: '#171719|#292c31|#37383c', prompt: '鉴伪', line: '“群里没人说话，我也不习惯。消息给你看，跟不跟单你自己担。”', getPresentation: (s) => {
    const visited = s.longgeVisitedToday;
    return { prompt: visited ? '✓' : '鉴伪', label: visited ? '今日已调查' : '群聊线索', nodeDisabled: visited, primaryLabel: visited ? '今天已经调查过' : '进入群聊鉴伪副本', primaryAction: activityContracts.LONGGE_CHAT.startAction, primaryDisabled: visited };
  }, getDialogue: (s) => s.longgeVisitedToday
    ? '“今天别再转了。把原始聊天、时间和成交记录对上，别拿我转发那半句当凭据。”'
    : '“叫声龙哥，我听着顺耳。群里没人说话，我也不习惯；不过我发的消息不替你保证，去对时间和成交记录。”' },
  { id: 'delivery', activityId: 'WANG_DELIVERY', name: '王师傅', place: '外卖驿站', x: 66, y: 87, palette: '#3a3022|#e27032|#324052', prompt: '接单', line: '“三张订单，逐单选择路线。接单前能看到每条路线的报酬和精力消耗；中途收工按已完成订单结算。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const profile = deliveryRunProfileForState(s);
    const lowEnergy = s.energy < profile.minimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '接单', label: worked ? '今日已跑单' : '王师傅', nodeDisabled: worked, primaryLabel: worked ? '今天已经完成工作' : '进入三单跑单副本 · 收入 ¥' + profile.minimumIncome + '–¥' + profile.maximumIncome + ' · 精力 ' + profile.minimumEnergy + '–' + profile.maximumEnergy + ' · 中途收工结算已完成订单', primaryAction: activityContracts.WANG_DELIVERY.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: (s) => { const profile = deliveryRunProfileForState(s); const context = deliveryReturnContextFor(s); const returnLine = context?.kind === 'RELIABLE' ? ' 上次第 ' + context.previousDay + ' 天的准时记录带来 ¥8 熟客服务返还、少耗 2 点精力。' : context?.kind === 'RUSH' ? ' 上次第 ' + context.previousDay + ' 天接过加急单，这次末单可选 ¥15 补贴、额外耗 3 点精力。' : ''; return '“今天三张路线单预计收入 ¥' + profile.minimumIncome + '–¥' + profile.maximumIncome + '、精力消耗 ' + profile.minimumEnergy + '–' + profile.maximumEnergy + '。每项成本和报酬都会明示；中途收工只结已完成订单。' + returnLine + '”'; } },
  { id: 'zheng', activityId: 'ZHENG_BIKE_REPAIR', name: '郑师傅', place: '电驴快修铺', x: 92, y: 51, palette: '#625e58|#547b79|#3f4648', prompt: '修车', line: '“别急着换件。上回我凭经验判断，害人多跑一趟；这次把检测值写进工单。每单底薪 ¥' + zhengRepairBasePay + '，修对再拿 ¥' + zhengRepairQualityBonus + '；检测每项耗 2 点精力。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < zhengRepairMinimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '修车', label: worked ? '今日已工作' : '郑师傅', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入电驴故障诊断副本 · ' + zhengRepairJobs + ' 单底薪 ¥' + (zhengRepairJobs * zhengRepairBasePay) + '，质量奖最多 ¥' + (zhengRepairJobs * zhengRepairQualityBonus) + '（全对最多 ¥' + zhengRepairMaximumIncome + '）· 至少精力 ' + zhengRepairMinimumEnergy + ' · 检测每项耗 2 精力', primaryAction: activityContracts.ZHENG_BIKE_REPAIR.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: (s) => {
    if (s.workedToday) return '“今天的工单交完了。工资进了账，检测记录我收好了。”';
    if (s.energy < zhengRepairMinimumEnergy) return '“手都累了就别硬撑。修车要稳，明天再来接活。”';
    const returnContext = zhengRepairReturnContextFor(s);
    const repairCase = bikeRepairCaseFor(s.day, 0, 5, s.scenarioSeed, returnContext);
    const dailyLine = returnContext
      ? '“' + returnContext.customerName + '带着第 ' + returnContext.previousDay + ' 天的旧工单回来了。今天是新症状：「' + repairCase.title + '」。先把当前线索过一遍。”'
      : '“先别急着换件。上回我凭经验判断，害人多跑一趟。今天这单是「' + repairCase.title + '」，先把症状过一遍。”';
    return dailyLine + (repairCase.workshopLine ? repairCase.workshopLine : ' 检测值写进工单，咱们再动手。') + ' 每单底薪 ¥' + zhengRepairBasePay + '，修对再拿 ¥' + zhengRepairQualityBonus + '；检测每项耗 2 点精力。';
  } },
  { id: 'phoneflip', activityId: 'PHONE_FLIP', name: '阿浩', place: '旧机回收铺', x: 91, y: 31, palette: '#292f38|#4e8291|#35414b', prompt: '验机', line: '“三台旧手机，先看外观和卖家说法。买入需现款，整备最多另花 ¥' + phoneFlipPolicy.maxUninspectedRepairReserve + '，错买会亏；每台验机耗 ' + phoneFlipPolicy.inspectEnergy + ' 点精力。开始即占今天工作名额；结束营业保留已成交价差，已耗验机精力不退。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < phoneFlipPolicy.minimumEnergy;
    const offers = phoneLotPriceRangeFor(s.day, s.scenarioSeed, 4);
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '验机', label: worked ? '今日已工作' : '阿浩', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入三台旧机回收 · 报价 ¥' + offers.minimumOffer + '–¥' + offers.maximumOffer + ' · 未验机整备需另留最多 ¥' + phoneFlipPolicy.maxUninspectedRepairReserve + ' · 验机 ' + phoneFlipPolicy.inspectEnergy + ' 精力/台，至少精力 ' + phoneFlipPolicy.minimumEnergy, primaryAction: activityContracts.PHONE_FLIP.startAction, primaryDisabled: worked || lowEnergy };
  }, getDialogue: phoneFlipDialogue },
];

interface SpriteDetail {
  mark: string;
  x: string;
  y: string;
  asset?: string;
  width?: number;
  height?: number;
}

const spriteDetails: Record<EntryId, SpriteDetail> = {
  jiuge: { mark: 'pawn-silverhair-ledger-abacus', x: '0%', y: '0%', asset: '/art/jiuge-character-v3.png', width: 56, height: 84 },
  longge: { mark: 'bbq-chat-phone-tongs', x: '33.333%', y: '0%', asset: '/art/longge-character-v4.png', width: 56, height: 84 },
  zheng: { mark: 'repair-diagnostic-ticket-wrench', x: '66.667%', y: '0%', asset: '/art/zheng-character-v2.png', width: 56, height: 84 },
  sujie: { mark: 'cafe-cup-apron-accountbook', x: '100%', y: '0%', asset: '/art/sujie-character-v3.png', width: 48, height: 72 },
  delivery: { mark: 'delivery-box', x: '0%', y: '33.333%', asset: '/art/delivery-dispatcher-character-v1.webp', width: 40, height: 60 },
  wang: { mark: 'factory-defect-clipboard-carton', x: '33.333%', y: '33.333%', asset: '/art/wang-factory-character-v3.png', width: 48, height: 72 },
  phoneflip: { mark: 'smartphone', x: '66.667%', y: '33.333%', asset: '/art/ahao-character-v1.webp', width: 40, height: 60 },
  laoliang: { mark: 'market-hat', x: '100%', y: '33.333%', asset: '/art/laoliang-market-character-v1.webp', width: 40, height: 60 },
  xiaolian: { mark: 'phone-ringlight-scriptcard', x: '0%', y: '66.667%', asset: '/art/xiaolian-character-v3.png', width: 40, height: 60 },
  zhou: { mark: 'necktie-folder', x: '33.333%', y: '66.667%', asset: '/art/zhou-character-v1.webp', width: 40, height: 60 },
  bodhisattva: { mark: 'monk-robe', x: '66.667%', y: '66.667%', asset: '/art/bodhisattva-character-v1.webp', width: 40, height: 60 },
  sweeper: { mark: 'walking-stick', x: '100%', y: '66.667%', asset: '/art/sweeper-character-v1.webp', width: 40, height: 60 },
  chen: { mark: 'briefcase', x: '0%', y: '100%', asset: '/art/chen-character-v1.webp', width: 40, height: 60 },
};

export function sprite(kind: EntryId, palette: string): string {
  void palette;
  const detail = spriteDetails[kind];
  const assetStyle = detail.asset
    ? ';--sprite-src:url(' + detail.asset + ');--sprite-size:contain;--sprite-pos:center;--sprite-width:' + detail.width + 'px;--sprite-height:' + detail.height + 'px'
    : '';
  return '<span class="dt-person" data-npc="' + kind + '" data-mark="' + detail.mark + '" aria-hidden="true" style="--sprite-x:' + detail.x + ';--sprite-y:' + detail.y + assetStyle + '"></span>' +
    '<span class="dt-ground-shadow" aria-hidden="true" style="--shadow-width:' + ((detail.width ?? 48) * 0.46) + 'px"></span>';
}

export function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}
