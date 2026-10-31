import { seededShuffle } from './scenarioDeck';
import type { StreamScenario } from './streamScenarios';

interface MarketPressure {
  id: string;
  title: string;
  briefing: string;
  topicHeat: -1 | 0 | 1;
  urgency: -1 | 0 | 1;
  dealFit: -1 | 0 | 1;
}

interface AudienceProfile {
  id: string;
  title: string;
  question: string;
  proofDemand: -1 | 0 | 1;
}

interface SellerPressure {
  id: string;
  title: string;
  briefing: string;
  xiaolianLine: string;
  claimRisk: -1 | 0 | 1;
  urgency: -1 | 0 | 1;
  dealFit: -1 | 0 | 1;
}

interface PlatformEvent {
  id: string;
  title: string;
  briefing: string;
  xiaolianLine: string;
  topicHeat: -1 | 0 | 1;
  proofDemand: -1 | 0 | 1;
}

const marketPressures: readonly MarketPressure[] = [
  { id: 'rain-commute', title: '阵雨晚高峰', briefing: '盘城开始下雨，通勤人群更关心商品能否应急。', topicHeat: 1, urgency: 1, dealFit: 0 },
  { id: 'rent-week', title: '交租前一周', briefing: '不少观众正在攒房租，评论区先问总价和后续成本。', topicHeat: 0, urgency: -1, dealFit: -1 },
  { id: 'exam-season', title: '考试周', briefing: '备考人群涌进直播间，弹幕更愿意听实测细节。', topicHeat: 1, urgency: 0, dealFit: 0 },
  { id: 'commute-delay', title: '公交临时绕行', briefing: '附近公交改道，等车的观众变多，但停留时间不确定。', topicHeat: 0, urgency: 1, dealFit: 0 },
  { id: 'cold-snap', title: '冷空气抵达', briefing: '气温突然下降，观众把注意力转向保暖和耗电。', topicHeat: 1, urgency: 0, dealFit: 1 },
  { id: 'power-work', title: '片区检修', briefing: '街区临时检修，直播设备和样品演示都要留出余量。', topicHeat: -1, urgency: -1, dealFit: 0 },
  { id: 'community-market', title: '社区集市', briefing: '附近办起社区集市，观众会拿线下标价逐项比较。', topicHeat: 1, urgency: 0, dealFit: -1 },
  { id: 'payday', title: '工厂发薪日', briefing: '周边工厂刚发薪，购买意愿增加，观众也更重视售后。', topicHeat: 1, urgency: 1, dealFit: 1 },
];

const audienceProfiles: readonly AudienceProfile[] = [
  { id: 'night-shift', title: '刚下夜班的人', question: '观众问连续使用会不会影响休息或安全。', proofDemand: 1 },
  { id: 'new-renters', title: '刚搬家的租客', question: '观众想先知道尺寸、安装条件和退换边界。', proofDemand: 1 },
  { id: 'caregivers', title: '照顾家人的子女', question: '观众追问使用对象和说明书里的限制条件。', proofDemand: 1 },
  { id: 'students', title: '预算紧张的学生', question: '观众反复核对到手价，问有没有必须加购的配件。', proofDemand: 0 },
  { id: 'small-shops', title: '附近小店经营者', question: '观众关心耐用度、耗材费用以及坏了找谁维修。', proofDemand: 1 },
  { id: 'commuters', title: '每天通勤的上班族', question: '观众想知道商品能否应付每天反复使用。', proofDemand: 0 },
  { id: 'careful-buyers', title: '习惯比价的老观众', question: '观众贴出另一家报价，要求把差价和条件说清楚。', proofDemand: 1 },
  { id: 'first-time-buyers', title: '第一次买这类商品的人', question: '观众需要听懂规格差异，不想只看一串参数。', proofDemand: 0 },
];

const sellerPressures: readonly SellerPressure[] = [
  { id: 'missing-report', title: '检测报告未到', briefing: '商家催着挂链接，但承诺的检测报告还没发来。', xiaolianLine: '“证据没到手，我不会替谁把结论说满。”', claimRisk: 1, urgency: -1, dealFit: -1 },
  { id: 'return-cost', title: '退货运费争议', briefing: '店铺没有把退货运费承担条件写进置顶说明。', xiaolianLine: '“先把退货谁出运费讲明白，省得下播后吵起来。”', claimRisk: 0, urgency: -1, dealFit: -1 },
  { id: 'real-coupon', title: '优惠券确实生效', briefing: '优惠券能实际使用，但门槛和适用型号并不相同。', xiaolianLine: '“券是真的，适用范围也得一起念出来。”', claimRisk: 0, urgency: 1, dealFit: 1 },
  { id: 'stock-pressure', title: '库存数字在变化', briefing: '仓库刚报来库存变化，商家让你不要说成全网只剩一件。', xiaolianLine: '“库存是仓库的事，不能拿来吓观众下单。”', claimRisk: 1, urgency: 0, dealFit: 0 },
  { id: 'warranty-gap', title: '保修范围不一致', briefing: '商品页和客服口头说法对保修范围写得不一样。', xiaolianLine: '“两份保修说法对不上，我得先把差异摆出来。”', claimRisk: 1, urgency: -1, dealFit: -1 },
  { id: 'bundle-push', title: '组合装更好看', briefing: '商家只给组合装额外优惠，单件价格没有同步下降。', xiaolianLine: '“组合价能省多少要算清，买不需要的也不叫省钱。”', claimRisk: 0, urgency: 0, dealFit: 0 },
  { id: 'limited-batch', title: '小批次补货', briefing: '这批货数量有限，但商家无法确认下一次补货日期。', xiaolianLine: '“这批不多是事实，下一批什么时候来我不知道。”', claimRisk: 0, urgency: 1, dealFit: 0 },
  { id: 'seller-correction', title: '商家临时更正参数', briefing: '商家更正了一项规格，上一版宣传页还没有同步。', xiaolianLine: '“参数改了就按新资料讲，之前说错的也要认。”', claimRisk: 1, urgency: -1, dealFit: -1 },
];

const platformEvents: readonly PlatformEvent[] = [
  { id: 'lagging-comments', title: '弹幕延迟', briefing: '弹幕延迟涌入，重复问题里夹着一条新的售后疑问。', xiaolianLine: '“评论慢半拍，我再看一眼，别把问题漏过去。”', topicHeat: 0, proofDemand: 1 },
  { id: 'wrong-audience', title: '推荐人群偏移', briefing: '平台把直播推荐给了不熟悉这类商品的新观众。', xiaolianLine: '“人多不代表都适合，先把适用人群说清楚。”', topicHeat: 1, proofDemand: 0 },
  { id: 'competitor-price', title: '竞品比价弹幕', briefing: '观众贴出竞品截图，比较后发现型号和售后并不相同。', xiaolianLine: '“截图看起来便宜，型号和售后先对齐再比。”', topicHeat: 1, proofDemand: 1 },
  { id: 'dashboard-delay', title: '后台数据延迟', briefing: '成交面板慢了几分钟，不能把未确认的数字当实时销量。', xiaolianLine: '“后台还没刷新，我不报一个自己也没核实的数。”', topicHeat: -1, proofDemand: 1 },
  { id: 'return-comment', title: '旧买家留言', briefing: '一位旧买家分享了使用后的问题，另一位观众追问处理进度。', xiaolianLine: '“有问题就把处理进展说清楚，不能只念好评。”', topicHeat: 1, proofDemand: 1 },
  { id: 'audio-drop', title: '直播间短暂断音', briefing: '设备断音后重新接通，刚才的关键价格说明需要再讲一遍。', xiaolianLine: '“刚才没声音，我把价格和限制重新说一次。”', topicHeat: -1, proofDemand: 0 },
  { id: 'use-case-question', title: '使用场景追问', briefing: '观众问到商品页没有覆盖的使用场景，当前没有足够数据下结论。', xiaolianLine: '“这个用法我没验证过，不会为了留人乱答。”', topicHeat: 0, proofDemand: 1 },
  { id: 'coupon-conflict', title: '优惠规则冲突', briefing: '直播口播优惠和商品页显示的叠加规则不一致。', xiaolianLine: '“优惠以页面最后结算为准，咱们先别把折扣算高了。”', topicHeat: 0, proofDemand: 1 },
];

export const streamContinuationVariantCount = marketPressures.length * audienceProfiles.length * sellerPressures.length * platformEvents.length;

function level(value: number): 0 | 1 | 2 {
  return Math.max(0, Math.min(2, value)) as 0 | 1 | 2;
}

function fit(value: number): -1 | 0 | 1 {
  return Math.max(-1, Math.min(1, value)) as -1 | 0 | 1;
}

export function streamContinuationFor(
  index: number,
  seed: number,
  scenarios: readonly StreamScenario[],
): StreamScenario {
  const bases = seededShuffle(scenarios, seed, 0x51EA6);
  const markets = seededShuffle(marketPressures, seed, 0x51EA7);
  const audiences = seededShuffle(audienceProfiles, seed, 0x51EA8);
  const sellers = seededShuffle(sellerPressures, seed, 0x51EA9);
  const platforms = seededShuffle(platformEvents, seed, 0x51EAA);
  const baseIndex = index % bases.length;
  const combinationIndex = Math.floor(index / bases.length);
  const marketIndex = combinationIndex % markets.length;
  const audienceIndex = Math.floor(combinationIndex / markets.length) % audiences.length;
  const sellerIndex = Math.floor(combinationIndex / (markets.length * audiences.length)) % sellers.length;
  const platformIndex = Math.floor(combinationIndex / (markets.length * audiences.length * sellers.length)) % platforms.length;
  const base = bases[baseIndex]!;
  const market = markets[marketIndex]!;
  const audience = audiences[audienceIndex]!;
  const seller = sellers[sellerIndex]!;
  const platform = platforms[platformIndex]!;
  const variantId = [base.id, market.id, audience.id, seller.id, platform.id].join('-');

  return {
    id: `stream-v3-${variantId}`,
    title: `${base.title} · ${market.title} · ${platform.title}`,
    product: base.product,
    audience: `${audience.title}：${audience.question}`,
    xiaolianLine: `${base.xiaolianLine} ${platform.xiaolianLine} ${seller.xiaolianLine}`,
    beats: [
      { title: `${base.beats[0].title} · ${market.title}`, briefing: `${market.briefing} ${base.beats[0].briefing}` },
      { title: `${base.beats[1].title} · ${audience.title}`, briefing: `${audience.question} ${base.beats[1].briefing} ${platform.briefing}` },
      { title: `${base.beats[2].title} · ${seller.title}`, briefing: `${seller.briefing} ${base.beats[2].briefing}` },
    ],
    topicHeat: level(base.topicHeat + market.topicHeat + platform.topicHeat),
    claimRisk: level(base.claimRisk + seller.claimRisk),
    proofDemand: level(base.proofDemand + audience.proofDemand + platform.proofDemand),
    urgency: level(base.urgency + market.urgency + seller.urgency),
    dealFit: fit(base.dealFit + market.dealFit + seller.dealFit),
  };
}
