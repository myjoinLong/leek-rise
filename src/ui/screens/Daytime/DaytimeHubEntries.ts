import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { activityContracts, type ActivityId } from '../../../core/activityContracts';
import { minimumDeliveryEnergy } from '../../../core/systems/deliveryRun';
import { factoryShiftMinimumEnergy } from '../../../core/systems/factoryShift';
import { minimumDossierEnergy } from '../../../core/systems/companyDossier';
import { minimumChartLessonEnergy } from '../../../core/systems/chartLesson';
import { minimumCafeShiftEnergy } from '../../../core/systems/cafeShift';
import { minimumStreamEnergy } from '../../../core/systems/streamRun';
import { riskReplayPolicy } from '../../../core/systems/riskReplay';
import { stallPolicy } from '../../../core/systems/laoLiangMarketStall';
import { zhengRepairMinimumEnergy } from '../../../core/systems/zhengBikeRepair';

export type EntryId = 'jiuge' | 'longge' | 'chen' | 'bodhisattva' | 'xiaolian' | 'sujie' | 'zhou' | 'wang' | 'laoliang' | 'sweeper' | 'delivery' | 'zheng';

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
  getDialogue?: (state: GameState) => string;
}

export const entries: HubEntry[] = [
  { id: 'chen', activityId: 'CHEN_DOSSIER', name: '陈总', place: '写字楼', x: 65, y: 16, palette: '#47434b|#273e59|#292f3b', prompt: '查资料', line: '“路演稿写得漂亮不算数。去核对合同、供货和回款，再决定信不信。”', getPresentation: (s) => {
    const visited = s.chenVisitedToday;
    const lowEnergy = s.energy < minimumDossierEnergy;
    return { prompt: visited ? '✓' : '查资料', label: visited ? '今日已核验' : '陈总', nodeDisabled: visited, primaryLabel: visited ? '今天已经核验过材料' : '进入公司材料调查 · 精力至少 ' + minimumDossierEnergy, primaryAction: activityContracts.CHEN_DOSSIER.startAction, primaryDisabled: visited || lowEnergy };
  } },
  { id: 'xiaolian', activityId: 'XIAOLIAN_STREAM', name: '小镰刀', place: '直播间', x: 24, y: 23, palette: '#3a2b32|#b64c69|#4b354d', prompt: '开播', line: '“镜头前讲的是财富自由。来，试播三段，看看观众究竟买不买账。”', getPresentation: (s) => {
    const canStream = !s.streamedToday && s.energy >= minimumStreamEnergy;
    return { prompt: s.streamedToday ? '✓' : canStream ? '开播' : '精力不足', label: s.streamedToday ? '今日已开播' : '小镰刀', nodeDisabled: !canStream, primaryLabel: s.streamedToday ? '今天已经直播过' : '进入直播运营副本 · 精力 -15', primaryAction: activityContracts.XIAOLIAN_STREAM.startAction, primaryDisabled: !canStream };
  } },
  { id: 'bodhisattva', activityId: 'BODHISATTVA_CHART_LESSON', name: 'K线菩萨', place: '培训班', x: 43, y: 31, palette: '#5d4934|#d0a754|#4a4035', prompt: '练图', line: '“先别交学费。看三张图，练习分清趋势、量能和横盘。”', getPresentation: (s) => {
    const visited = s.chartLessonVisitedToday;
    const lowEnergy = s.energy < minimumChartLessonEnergy;
    return { prompt: visited ? '✓' : lowEnergy ? '精力不足' : '练图', label: visited ? '今日已练习' : 'K线菩萨', nodeDisabled: visited || lowEnergy, primaryLabel: visited ? '今天已经练习过' : '进入三轮读图练习 · 精力 -' + minimumChartLessonEnergy, primaryAction: activityContracts.BODHISATTVA_CHART_LESSON.startAction, primaryDisabled: visited || lowEnergy };
  } },
  { id: 'zhou', activityId: 'ZHOU_BROKER_NEGOTIATION', name: '周经理', place: '证券营业部', x: 77, y: 39, palette: '#292a31|#536273|#303641', prompt: '谈费率', line: '“你可以选标准账户，也可以先算清楚，再决定要不要付服务费换七天优惠费率。”', getPresentation: (s) => {
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
  } },
  { id: 'laoliang', activityId: 'LAOLIANG_MARKET_STALL', name: '老梁', place: '街道办', x: 28, y: 49, palette: '#403d34|#687b54|#47433b', prompt: '摆摊', line: '“社区活动缺个寄售摊主。货由我垫资。三轮做完有 ¥60 底薪和毛利分成；每轮耗 5 点精力，开摊就占今天工作名额，半路退出也不退。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < stallPolicy.minimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '摆摊', label: worked ? '今日已工作' : '老梁', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入社区寄售摊 · 完成得 ¥60 底薪 + 分成 · 最多耗精力 15 · 占用今日工作名额', primaryAction: activityContracts.LAOLIANG_MARKET_STALL.startAction, primaryDisabled: worked || lowEnergy };
  } },
  { id: 'wang', activityId: 'WANG_FACTORY', name: '王老板', place: '小工厂', x: 62, y: 53, palette: '#3c302b|#98643d|#494039', prompt: '上工', line: '“订单不赶，质量奖也能拿。来看看这批货里哪些该返工。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < factoryShiftMinimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '上工', label: worked ? '今日已上工' : '王老板', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入质检班 · 基础工资 ¥60 · 精力至少 ' + factoryShiftMinimumEnergy, primaryAction: activityContracts.WANG_FACTORY.startAction, primaryDisabled: worked || lowEnergy };
  } },
  { id: 'jiuge', activityId: 'JIUGE_NEGOTIATION', name: '九哥', place: '当铺', x: 9, y: 59, palette: '#202126|#76503c|#41434a', prompt: '…', line: '“手头紧？拿点东西押着，先借你一千。韭性可得扣一点。”', getPresentation: (s) => {
    if (s.debtCrisisStarted) {
      const completed = s.debtNegotiationCompleted;
      return { prompt: completed ? '已协商' : '协商', label: '债务协商', nodeDisabled: completed, primaryLabel: completed ? '本次协商已完成' : '进入债务协商副本', primaryAction: activityContracts.JIUGE_NEGOTIATION.startAction, primaryDisabled: completed };
    }
    const canBorrow = s.leechLevel >= 10;
    return { prompt: '…', label: '九哥', nodeDisabled: false, primaryLabel: '借钱 ¥1,000（韭性 -10）', primaryAction: { type: 'BORROW_FROM_NPC' }, primaryDisabled: !canBorrow };
  }, getDialogue: (s) => s.debtCrisisStarted ? '账单已经逐项列清。你可以拿账本和真实收入来谈一次下一期周利息宽限。' : '“手头紧？拿点东西押着，先借你一千。韭性可得扣一点。”' },
  { id: 'sujie', activityId: 'SUJIE_CAFE_SHIFT', name: '苏姐', place: '街角咖啡', x: 86, y: 68, palette: '#513342|#b87791|#504052', prompt: '接单', line: '“午间来客不少，帮我接三杯单。底薪 ¥72，照顾好客人还有小费。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < minimumCafeShiftEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '接单', label: worked ? '今日已上班' : '苏姐', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入咖啡短班 · 三位客人 · 底薪 ¥72 + 小费 · 精力 -15', primaryAction: activityContracts.SUJIE_CAFE_SHIFT.startAction, primaryDisabled: worked || lowEnergy };
  } },
  { id: 'sweeper', activityId: 'SWEEPER_RISK_REPLAY', name: '扫地僧', place: '口袋公园', x: 49, y: 72, palette: '#32352e|#72805a|#45483e', prompt: '复盘', line: '“给你一万元虚拟资金和三百元压力预算。先分仓位再看旧行情；不发奖金，每段精力 -4，每天一次。”', getPresentation: (s) => {
    const lowEnergy = s.energy < riskReplayPolicy.minimumEnergy;
    const visited = s.riskReplayVisitedToday;
    return { prompt: visited ? '✓' : lowEnergy ? '精力不足' : '复盘', label: visited ? '今日已复盘' : '扫地僧', nodeDisabled: visited || lowEnergy, primaryLabel: '进入仓位复盘桌 · 精力 -12 · 无现金奖励', primaryAction: activityContracts.SWEEPER_RISK_REPLAY.startAction, primaryDisabled: visited || lowEnergy };
  } },
  { id: 'longge', activityId: 'LONGGE_CHAT', name: '龙哥', place: '烧烤摊', x: 11, y: 79, palette: '#19191b|#292c31|#37383c', prompt: '鉴伪', line: '“先吃点东西。群里的消息我都发了，想看就自己点开。”', getPresentation: (s) => {
    const visited = s.longgeVisitedToday;
    return { prompt: visited ? '✓' : '鉴伪', label: visited ? '今日已调查' : '群聊线索', nodeDisabled: visited, primaryLabel: visited ? '今天已经调查过' : '进入群聊鉴伪副本', primaryAction: activityContracts.LONGGE_CHAT.startAction, primaryDisabled: visited };
  } },
  { id: 'delivery', activityId: 'WANG_DELIVERY', name: '工作入口', place: '外卖驿站', x: 66, y: 87, palette: '#3a3022|#e27032|#324052', prompt: '接单', line: '“王总今天临时缺人。先看清每单路线和报酬，再决定怎么跑。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < minimumDeliveryEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '接单', label: worked ? '今日已跑单' : '工作入口', nodeDisabled: worked, primaryLabel: worked ? '今天已经完成工作' : '进入跑单副本', primaryAction: activityContracts.WANG_DELIVERY.startAction, primaryDisabled: worked || lowEnergy };
  } },
  { id: 'zheng', activityId: 'ZHENG_BIKE_REPAIR', name: '郑师傅', place: '电驴快修铺', x: 92, y: 51, palette: '#302a24|#547b79|#3f4648', prompt: '修车', line: '“三辆车，三张工单。你可以花精力检测，也可以凭症状直接判断。每单底薪 ¥18，修对再拿 ¥12；开工占今天工作名额，半途离开不退精力。”', getPresentation: (s) => {
    const worked = s.workedToday;
    const lowEnergy = s.energy < zhengRepairMinimumEnergy;
    return { prompt: worked ? '✓' : lowEnergy ? '精力不足' : '修车', label: worked ? '今日已工作' : '郑师傅', nodeDisabled: worked || lowEnergy, primaryLabel: worked ? '今天已经完成工作' : '进入电驴故障诊断副本 · 3 单底薪 ¥54，质量奖最多 ¥36 · 至少精力 ' + zhengRepairMinimumEnergy + ' · 检测每项耗 2 精力', primaryAction: activityContracts.ZHENG_BIKE_REPAIR.startAction, primaryDisabled: worked || lowEnergy };
  } },
];

export function sprite(palette: string): string {
  const colors = palette.split('|');
  return '<svg class="dt-person" viewBox="0 0 24 32" aria-hidden="true" style="--hair:' + colors[0] + ';--shirt:' + colors[1] + ';--pants:' + colors[2] + '">' +
    '<rect class="dt-hair" x="6" y="2" width="12" height="4"/><rect x="5" y="5" width="14" height="8" fill="#d6a77b"/>' +
    '<rect class="dt-hair" x="4" y="4" width="3" height="6"/><rect class="dt-hair" x="17" y="4" width="3" height="6"/>' +
    '<rect x="7" y="8" width="2" height="2" fill="#26211f"/><rect x="15" y="8" width="2" height="2" fill="#26211f"/>' +
    '<rect class="dt-shirt" x="4" y="13" width="16" height="10"/><rect class="dt-shirt" x="1" y="14" width="4" height="9"/><rect class="dt-shirt" x="19" y="14" width="4" height="9"/>' +
    '<rect class="dt-pants" x="5" y="23" width="6" height="7"/><rect class="dt-pants" x="13" y="23" width="6" height="7"/>' +
    '<rect x="4" y="29" width="7" height="3" fill="#25252a"/><rect x="13" y="29" width="7" height="3" fill="#25252a"/></svg>';
}

export function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}
