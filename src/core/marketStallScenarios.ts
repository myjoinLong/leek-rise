import { seededShuffle } from './scenarioDeck';
import { mulberry32 } from './rng';
import { stallMaxCustomerUnits, type StallProduct, type StallScenarioVersion, type StallStep } from './marketStallTypes';
import type { StallScenarioModifier } from './marketStallVariants';
import { competitionVariants, crowdVariants, needVariants, neighborhoodVariants } from './marketStallVariants';

export interface StallMarketDay {
  id: string;
  title: string;
  context: string;
  ownerLine: string;
  budgetAdjustments: readonly [number, number, number];
  demandAdjustments: readonly [number, number, number];
  standardDemandDrop: number;
  premiumDemandDrop: number;
}

export interface StallCustomerScenario {
  id: string;
  name: string;
  title: string;
  clue: string;
  ownerLine: string;
  product: StallProduct;
  budget: number;
  units: number;
  standardDemandDrop: number;
  premiumDemandDrop: number;
}

const products: readonly StallProduct[] = ['THERMOS', 'RAINCOAT', 'CABLE'];
const baseCustomers: Readonly<Record<StallProduct, { name: string; need: string; budget: number; units: number }>> = {
  THERMOS: { name: '早高峰通勤客', need: '想给通勤路上添个保温杯。', budget: 38, units: 3 },
  RAINCOAT: { name: '亲子活动家长', need: '临时下雨，想给孩子买件雨披。', budget: 52, units: 3 },
  CABLE: { name: '晚班通勤客', need: '手机快没电，只想买条应急快充线。', budget: 25, units: 4 },
};

export const stallMarketDays: readonly StallMarketDay[] = [
  { id: 'school-fair', title: '校门口义卖日', context: '学校义卖刚散场，家长们顺路来街边补些日用品。', ownerLine: '“孩子们刚收摊，家长买东西看实用，也会多问一句价。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [0, 0, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'cold-front', title: '降温通勤日', context: '冷空气提前到了，早晚通勤的人比平常多。', ownerLine: '“降温确实能带动杯子，可别把每个路过的人都算成买家。”', budgetAdjustments: [4, -3, 0], demandAdjustments: [1, 0, -1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'rain-alert', title: '阵雨预警日', context: '天气预报临时加了阵雨提醒，附近接孩子的人在问雨具。', ownerLine: '“雨还没落下来。需求是真的，急不急可得看人家自己。”', budgetAdjustments: [-2, 5, -2], demandAdjustments: [-1, 1, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'payday', title: '发薪周末', context: '周边几家工厂刚发薪，街上人多了些，问价也更仔细。', ownerLine: '“手里宽一点不代表愿意多花，标价先摆明白。”', budgetAdjustments: [3, 2, 3], demandAdjustments: [0, 1, 1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'market-move', title: '早市迁摊日', context: '早市临时换到隔壁街，通勤客要绕路，熟客流量变少。', ownerLine: '“摊位挪了位置，老客未必找到这边。别按旺场的量进货。”', budgetAdjustments: [-4, -2, -3], demandAdjustments: [-1, -1, -1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'sports-day', title: '社区运动会', context: '社区运动会散场，人群里有带孩子的家庭，也有赶路的上班族。', ownerLine: '“散场人多，脚步也快。你得想清楚谁会停下来。”', budgetAdjustments: [0, 4, -1], demandAdjustments: [0, 1, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'power-repair', title: '片区检修日', context: '附近临时停电检修，摊位照明和手机充电都不太方便。', ownerLine: '“手机没电是真麻烦，但别趁人急就乱加价。”', budgetAdjustments: [-1, -2, 6], demandAdjustments: [0, -1, 2], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'tour-group', title: '老街导览日', context: '老街来了几拨短途游客，行李轻、停留时间也短。', ownerLine: '“游客会买顺手的东西，贵重不贵重还得看着办。”', budgetAdjustments: [5, 1, 2], demandAdjustments: [1, 0, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'school-exam', title: '考试接送日', context: '学校考试分批结束，家长在门口等候，手里拿着当天预算。', ownerLine: '“家长不是不舍得花，是每一笔都得对得起孩子。”', budgetAdjustments: [-3, 2, -1], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'night-shift', title: '夜班换岗日', context: '夜班与白班集中换岗，晚高峰比平日拖得更长。', ownerLine: '“交班的人赶时间，能少等一会儿就是实在好处。”', budgetAdjustments: [1, -1, 4], demandAdjustments: [0, 0, 1], standardDemandDrop: 1, premiumDemandDrop: 1 },
  { id: 'repair-street', title: '道路施工日', context: '路口施工缩窄了人行道，经过的人少了，但都走得很近。', ownerLine: '“人少了，摊子倒显眼。数量和单价今天只能挑一样冒进。”', budgetAdjustments: [2, 0, 1], demandAdjustments: [-1, -1, -1], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'club-sale', title: '社团义卖日', context: '学生社团在广场募款，附近年轻人把零钱花得很有计划。', ownerLine: '“年轻人看着热闹，买之前照样会比较两家。”', budgetAdjustments: [-1, -3, 2], demandAdjustments: [0, 0, 1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'clinic-visiting', title: '医院探视时段', context: '医院探视时间到了，陪护家属匆匆经过这条街。', ownerLine: '“着急的人更需要清楚标价，别让人回头觉得吃亏。”', budgetAdjustments: [0, 3, 1], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'river-festival', title: '河边灯会', context: '河边灯会开场前，附近临时增加了几处人流入口。', ownerLine: '“灯会带来客流，也带来摊贩。你这价得经得起旁边一眼。”', budgetAdjustments: [2, 2, 2], demandAdjustments: [1, 1, 1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'laundry-day', title: '宿舍洗衣日', context: '附近宿舍集中洗衣晾晒，学生在回程时顺路买小件。', ownerLine: '“一件小东西能救急，价格超了学生就会改天再买。”', budgetAdjustments: [-2, 0, -4], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'bus-detour', title: '公交绕行日', context: '公交线路临时绕行，等车的人在站牌附近停留更久。', ownerLine: '“等车时间长，问价的人多；别把问价当成交。”', budgetAdjustments: [1, 1, 3], demandAdjustments: [0, 0, 1], standardDemandDrop: 1, premiumDemandDrop: 1 },
  { id: 'humidity', title: '回南潮湿日', context: '空气返潮，摊位上纸箱都垫高了一层，路过的人撑着伞。', ownerLine: '“潮天雨具好卖点，可滞货受潮也是真成本。”', budgetAdjustments: [-2, 4, -2], demandAdjustments: [-1, 1, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'factory-overtime', title: '工厂加班日', context: '工厂临时延长了晚班，员工下工时附近店铺已经打烊。', ownerLine: '“加班的人需要方便，买不买得起仍得算自己的账。”', budgetAdjustments: [1, -2, 5], demandAdjustments: [0, 0, 2], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'neighborhood-cleanup', title: '街区清扫日', context: '街道组织清扫，商户把门前空出来，客人能慢慢挑货。', ownerLine: '“摊面清爽能让人停步，货好不好还得靠你说明白。”', budgetAdjustments: [2, 2, 0], demandAdjustments: [1, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'cold-rain', title: '冷雨下班日', context: '傍晚开始下冷雨，通勤客和接孩子的家长都赶着回家。', ownerLine: '“雨天会有人买，也会有人直接打车走。留点余地。”', budgetAdjustments: [3, 6, -1], demandAdjustments: [1, 2, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'mobile-payment', title: '支付故障日', context: '周边一度网络不稳，几位客人只带了有限的现金。', ownerLine: '“支付不顺，结账就会犹豫。价别标到预算边上试探。”', budgetAdjustments: [-3, -3, -3], demandAdjustments: [-1, 0, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'parent-meeting', title: '家长会散场', context: '家长会刚结束，家长们在门口交流，买东西前会先问清用途。', ownerLine: '“他们会比一比，但也愿意为孩子挑合适的东西。”', budgetAdjustments: [0, 5, -1], demandAdjustments: [0, 2, 0], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'sports-final', title: '球赛决赛日', context: '球赛结束时人群集中离场，附近商户都在争取最后一波客流。', ownerLine: '“人挤人时别急着抬价，能不能成交还是看需求。”', budgetAdjustments: [2, 1, 4], demandAdjustments: [1, 0, 1], standardDemandDrop: 1, premiumDemandDrop: 1 },
  { id: 'ferry-delay', title: '轮渡晚点日', context: '轮渡晚点，候船的人在站口周围找能临时应急的小物件。', ownerLine: '“候船客赶不上下一班就得多等，实用比包装更重要。”', budgetAdjustments: [2, -1, 5], demandAdjustments: [0, -1, 2], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'rent-week', title: '交租前一周', context: '附近几户租客正在凑月底房租，买日用品会压着预算。', ownerLine: '“手头紧的时候，一两块也要掂量。别替客人做决定。”', budgetAdjustments: [-5, -4, -4], demandAdjustments: [-1, -1, -1], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'plumbing-repair', title: '小区停水维修', context: '小区管道维修通知贴满了楼道，居民在外面多买了些应急用品。', ownerLine: '“临时需要会提高需求，可不能把一次急用当成常态。”', budgetAdjustments: [5, 0, 1], demandAdjustments: [2, 0, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'school-holiday', title: '学校放假日', context: '学校开始放假，接送路线空了下来，街边客流转向公交站。', ownerLine: '“熟悉的客人少了，今天就按眼前的人流做决定。”', budgetAdjustments: [1, -2, 2], demandAdjustments: [0, -1, 1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'community-checkup', title: '义诊活动日', context: '社区义诊吸引了不少老人和家属，活动结束后人群慢慢散开。', ownerLine: '“人情归人情，价目表还是要摆清楚。”', budgetAdjustments: [-1, 2, 0], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 2 },
  { id: 'roadside-picnic', title: '公园野餐日', context: '公园里有几场小型野餐，回程的人顺路经过社区摊位。', ownerLine: '“野餐会用到杯子，但买一件还是买三件，别靠想象。”', budgetAdjustments: [5, 0, 2], demandAdjustments: [2, 0, 1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'month-end', title: '月底盘账日', context: '商户都在盘月底流水，顾客也开始留意每笔零碎开销。', ownerLine: '“月底账面最诚实。卖多少、赚多少，都别替自己美化。”', budgetAdjustments: [-3, -2, -3], demandAdjustments: [-1, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 1 },
];

const scenarioSalt = 0x1A011A6;
const continuationSalt = 0x4C414F4C;
const continuationDimensions = [crowdVariants, needVariants, competitionVariants, neighborhoodVariants] as const;
export const stallContinuationScenarioCount = stallMarketDays.length * continuationDimensions.reduce((count, variants) => count * variants.length, 1);

function greatestCommonDivisor(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function continuationIndex(day: number, seed: number): number {
  const random = mulberry32((seed ^ continuationSalt) >>> 0);
  const offset = Math.floor(random() * stallContinuationScenarioCount);
  let stride = Math.floor(random() * (stallContinuationScenarioCount - 1)) + 1;
  while (greatestCommonDivisor(stride, stallContinuationScenarioCount) !== 1) {
    stride = stride % (stallContinuationScenarioCount - 1) + 1;
  }
  const dayIndex = (Math.max(0, Math.floor(day) - 31)) % stallContinuationScenarioCount;
  return (offset + dayIndex * stride) % stallContinuationScenarioCount;
}

function addAdjustments(
  ...adjustments: readonly (readonly [number, number, number])[]
): [number, number, number] {
  return [0, 1, 2].map((index) => adjustments.reduce((total, values) => total + values[index]!, 0)) as [number, number, number];
}

function continuationMarketDay(day: number, seed: number): StallMarketDay {
  const index = continuationIndex(day, seed);
  const baseIndex = index % stallMarketDays.length;
  const variantIndices: number[] = [];
  let divisor = stallMarketDays.length;
  for (const variants of continuationDimensions) {
    variantIndices.push(Math.floor(index / divisor) % variants.length);
    divisor *= variants.length;
  }
  const base = stallMarketDays[baseIndex]!;
  const crowd = crowdVariants[variantIndices[0]!]!;
  const need = needVariants[variantIndices[1]!]!;
  const competition = competitionVariants[variantIndices[2]!]!;
  const neighborhood = neighborhoodVariants[variantIndices[3]!]!;
  const modifiers: readonly StallScenarioModifier[] = [crowd, need, competition, neighborhood];
  return {
    id: [base.id, crowd.id, need.id, competition.id, neighborhood.id].join('-'),
    title: base.title + ' · ' + crowd.title + ' · ' + neighborhood.title,
    context: [base.context, ...modifiers.map((modifier) => modifier.context)].join(' '),
    ownerLine: [base.ownerLine, competition.ownerLine, neighborhood.ownerLine].join(' '),
    budgetAdjustments: addAdjustments(base.budgetAdjustments, ...modifiers.map((modifier) => modifier.budgetAdjustments)),
    demandAdjustments: addAdjustments(base.demandAdjustments, ...modifiers.map((modifier) => modifier.demandAdjustments)),
    standardDemandDrop: Math.max(0, base.standardDemandDrop + modifiers.reduce((total, modifier) => total + modifier.standardDemandDrop, 0)),
    premiumDemandDrop: Math.max(0, base.premiumDemandDrop + modifiers.reduce((total, modifier) => total + modifier.premiumDemandDrop, 0)),
  };
}

export function stallMarketDayFor(day: number, seed: number, scenarioVersion: StallScenarioVersion = 3): StallMarketDay {
  const safeDay = Math.max(1, Math.floor(day));
  if (safeDay > 30 && scenarioVersion === 3) return continuationMarketDay(safeDay, seed);
  const order = seededShuffle(stallMarketDays, seed, scenarioSalt);
  return order[(safeDay - 1) % order.length]!;
}

export function stallCustomerFor(day: number, step: StallStep, seed: number, scenarioVersion: StallScenarioVersion = 3): StallCustomerScenario {
  const marketDay = stallMarketDayFor(day, seed, scenarioVersion);
  const order = seededShuffle(products, seed, scenarioSalt ^ (Math.max(1, Math.floor(day)) * 31));
  const product = order[step]!;
  const productIndex = products.indexOf(product);
  const customer = baseCustomers[product];
  const budget = Math.max(1, customer.budget + marketDay.budgetAdjustments[productIndex]!);
  const units = Math.min(stallMaxCustomerUnits, Math.max(1, customer.units + marketDay.demandAdjustments[productIndex]!));
  return {
    id: marketDay.id + '-' + product.toLowerCase(),
    name: customer.name,
    title: marketDay.title,
    clue: marketDay.context + ' ' + customer.need + '预算 ¥' + budget + '，预计需求 ' + units + ' 件。',
    ownerLine: marketDay.ownerLine,
    product,
    budget,
    units,
    standardDemandDrop: marketDay.standardDemandDrop,
    premiumDemandDrop: marketDay.premiumDemandDrop,
  };
}
