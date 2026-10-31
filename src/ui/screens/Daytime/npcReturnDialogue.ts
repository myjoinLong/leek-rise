import type { GameState, NpcActivityMemoryEntry, NpcId } from '../../../core/types';
import type { HubEntry } from './DaytimeHubEntries';
import { memoryDialogueFor } from './npcMemoryDialogue';

type RelationshipStage = 'recognized' | 'familiar' | 'regular';
type ReturnVoice = (visit: string, count: number) => string;

const returnVoices: Record<NpcId, Record<RelationshipStage, ReturnVoice>> = {
  jiuge: {
    recognized: (visit, count) => `九哥拨了拨算盘：“${visit}你来过，这是第${count}回。本金、利息、费用，我都按条款分开算。”`,
    familiar: (visit, count) => `九哥把算盘推近些：“${visit}你来过${count}回了。熟面归熟面，账目我还是一项一项摊开。”`,
    regular: (visit, count) => `九哥敲敲账本：“${visit}你又来了，第${count}回。来得再勤，借出去的钱也不会自己变少。”`,
  },
  longge: {
    recognized: (visit, count) => `龙哥晃了晃手机：“${visit}你来过，这是第${count}回。群里消息跑得快，真假可没那么快分出来。”`,
    familiar: (visit, count) => `龙哥把手机扣在桌上：“${visit}你来过${count}回了。我最怕群里没人接话，也最怕大家只挑想听的消息。”`,
    regular: (visit, count) => `龙哥拨弄着烤串：“${visit}你又来了，第${count}回。热闹能把人留下，可我不敢说每条消息都有答案。”`,
  },
  chen: {
    recognized: (visit, count) => `陈总合上文件：“${visit}你来过，这是第${count}回。融资、供货、回款要分开看，口径不能混成一份。”`,
    familiar: (visit, count) => `陈总理了理袖口：“${visit}你来过${count}回了。公司需要资金，但我不能把需要说成已经拿到。”`,
    regular: (visit, count) => `陈总看着窗外的园区：“${visit}你又来了，第${count}回。报表能把风险写得很整齐，承担风险的人却不在表格里。”`,
  },
  bodhisattva: {
    recognized: (visit, count) => `K线菩萨敲敲黑板：“${visit}你来过，这是第${count}回。口诀好记，市场可没有义务照着口诀走。”`,
    familiar: (visit, count) => `K线菩萨翻着讲义：“${visit}你来过${count}回了。今天也先找反例，图形只能帮人提问题，不能替市场作答。”`,
    regular: (visit, count) => `K线菩萨把粉笔放下：“${visit}你又来了，第${count}回。我讲得越像答案，就越该提醒自己：那只是观察方法。”`,
  },
  xiaolian: {
    recognized: (visit, count) => `小镰刀调好补光灯：“${visit}你来过，这是第${count}回。后台数字看着亮，亮不代表钱已经到账。”`,
    familiar: (visit, count) => `小镰刀瞄了眼直播间：“${visit}你来过${count}回了。观众想听承诺，可我越来越怕自己把预估讲成保证。”`,
    regular: (visit, count) => `小镰刀把提词卡翻到背面：“${visit}你又来了，第${count}回。镜头关掉以后，我也得想想什么话值得留下。”`,
  },
  sujie: {
    recognized: (visit, count) => `苏姐认出你：“${visit}你来过，这是第${count}回。店里忙起来顾不上叹气，闲下来又得算下个月的租金。”`,
    familiar: (visit, count) => `苏姐把杯垫摆正：“${visit}你来过${count}回了。小店每天都要周转，我有时真想把账本合上歇一会儿。”`,
    regular: (visit, count) => `苏姐把菜单收好：“${visit}你又来了，第${count}回。熟客能让店里暖一点，可房租不会因此少一块钱。”`,
  },
  zhou: {
    recognized: (visit, count) => `周经理打开费率表：“${visit}你来过，这是第${count}回。优惠写在合同里，服务费也写在合同里。”`,
    familiar: (visit, count) => `周经理把工牌转正：“${visit}你来过${count}回了。每月指标压得人喘不过气，但数字不能靠改口径变好看。”`,
    regular: (visit, count) => `周经理合上费率表：“${visit}你又来了，第${count}回。平台要成交量，我要指标，客户至少该看清自己付了什么。”`,
  },
  wang: {
    recognized: (visit, count) => `王老板把工单放到台面：“${visit}你来过，这是第${count}回。上游催交期，下面催工资，我夹在两头都得回话。”`,
    familiar: (visit, count) => `王老板揉了揉眉心：“${visit}你来过${count}回了。我想保住订单，也不想把每一分压力都推给工人。”`,
    regular: (visit, count) => `王老板看了眼排班表：“${visit}你又来了，第${count}回。生意要活下去，人也得有喘气的地方。”`,
  },
  laoliang: {
    recognized: (visit, count) => `老梁收起价签：“${visit}你来过，这是第${count}回。大商户要特价，小摊主怕被挤走，这账没法只算一边。”`,
    familiar: (visit, count) => `老梁翻开市场简报：“${visit}你来过${count}回了。我想让摊位都活着，可每个人都盯着自己的那一份。”`,
    regular: (visit, count) => `老梁把账本摊开：“${visit}你又来了，第${count}回。公开规则不一定让所有人满意，但至少能让人知道怎么算的。”`,
  },
  sweeper: {
    recognized: (visit, count) => `扫地僧看着长椅：“${visit}你来过，这是第${count}回。旧账记得太牢，下一笔就容易变成报复。”`,
    familiar: (visit, count) => `扫地僧按灭账户提醒：“${visit}你来过${count}回了。复盘能记下错在哪，却不能保证下一次不再犯。”`,
    regular: (visit, count) => `扫地僧沉默了一会儿：“${visit}你又来了，第${count}回。爆仓那天我记得太清楚，后来才学会把屏幕关掉。”`,
  },
  delivery: {
    recognized: (visit, count) => `调度员把排班表推给你：“${visit}你来过，这是第${count}回。平台只考核准时率，绕路和疲劳也得算进成本。”`,
    familiar: (visit, count) => `调度员指着排班表：“${visit}你来过${count}回了。平台盯准时率，我先把时限和精力成本写清。”`,
    regular: (visit, count) => `调度员靠着柜台：“${visit}你又来了，第${count}回。急单加价不等于顺路，时间和体力都得算进账。”`,
  },
  zheng: {
    recognized: (visit, count) => `郑师傅擦着扳手：“${visit}你来过，这是第${count}回。机器响不等于零件坏，先测清楚再拆。”`,
    familiar: (visit, count) => `郑师傅翻开检测规程：“${visit}你来过${count}回了。旧故障不能替新故障作证，换件前得先找到原因。”`,
    regular: (visit, count) => `郑师傅把手套摘下来：“${visit}你又来了，第${count}回。我以前也有凭经验误判的时候，所以现在更愿意多测一次。”`,
  },
  phoneflip: {
    recognized: (visit, count) => `阿浩把手机转了个面：“${visit}你来过，这是第${count}回。成色、暗病和行情，少看一项都可能赔钱。”`,
    familiar: (visit, count) => `阿浩压着报价单：“${visit}你来过${count}回了。收购价、整备费、转售价得放在一起算，光看低价没用。”`,
    regular: (visit, count) => `阿浩看了眼库存箱：“${visit}你又来了，第${count}回。卖家越催，我越得把检测做完再报价。”`,
  },
};

function describeVisit(memory: NpcActivityMemoryEntry): string {
  return memory.lastCompletedDay === null ? '上回' : `第 ${memory.lastCompletedDay} 天那回`;
}

function relationshipStage(completedRuns: number): RelationshipStage {
  if (completedRuns >= 6) return 'regular';
  if (completedRuns >= 3) return 'familiar';
  return 'recognized';
}

function longgeFollowUp(state: GameState): string | null {
  switch (state.longgeLastConclusion) {
    case 'DISTRIBUTION':
      return '龙哥说：“你上回判断有人借利好出货。结论我记得，今天的来源和成交还得重新核。”';
    case 'REAL_CATALYST':
      return '龙哥说：“你上回判断有真实利好。公告是那天的证据，不能直接替今天作答。”';
    case 'INSUFFICIENT':
      return '龙哥说：“你上回选证据还不够。不急着站队也算判断，新线索来了再看。”';
    default:
      return null;
  }
}

export function dialogueForEntry(entry: HubEntry, state: GameState): string {
  const base = entry.getDialogue(state) || entry.line;
  const memory = state.npcActivityMemory[entry.id];
  if (memory.completedRuns <= 0) return base;
  const stage = relationshipStage(memory.completedRuns);
  const returnVoice = returnVoices[entry.id][stage](describeVisit(memory), memory.completedRuns + 1);
  const traces = memory.recentTraces.length > 0
    ? memory.recentTraces
    : memory.lastTrace ? [memory.lastTrace] : [];
  const memoryVoice = memoryDialogueFor(entry.id, traces);
  const followUp = entry.id === 'longge' && traces.length === 0 ? longgeFollowUp(state) : null;
  return [base, returnVoice, memoryVoice, followUp].filter((line): line is string => line !== null).join('\n');
}
