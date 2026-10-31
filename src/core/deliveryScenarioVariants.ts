import type { DeliveryChoice } from './types';
import { deliveryDayScenarios, type DeliveryDayScenario, type DeliveryRouteEffect } from './deliveryScenarios';
import { seededShuffle } from './scenarioDeck';

interface SceneOverlay {
  id: string;
  title: string;
  detail: string;
}

interface RouteRule extends SceneOverlay {
  effects: Record<DeliveryChoice, readonly [incomeDelta: number, energyDelta: number, note: string]>;
}

const roadEvents: readonly SceneOverlay[] = [
  { id: 'school-dismissal', title: '放学人流', detail: '附近学校临时提前放学，路口人流把直线路段切成几段。' },
  { id: 'market-unload', title: '市场卸货', detail: '批发市场正在卸货，三轮车占住了两处常用转弯口。' },
  { id: 'bus-detour', title: '公交改线', detail: '公交线路临时绕行，熟悉的站点附近比平时更难通过。' },
  { id: 'road-repair', title: '夜间施工', detail: '施工围挡刚挪过位置，导航标记还没有完全更新。' },
  { id: 'event-crowd', title: '散场潮', detail: '会展中心刚散场，主路拥挤但路边临停位置增加。' },
  { id: 'power-cut', title: '片区检修', detail: '路灯检修让两条背街变暗，送达点需要再次确认门牌。' },
  { id: 'school-exam', title: '考试周', detail: '学校周边限制鸣笛，宿舍收餐点也改到了侧门。' },
  { id: 'market-sale', title: '社区促销', detail: '社区促销摊位延伸到人行道，几个入口需要绕行。' },
];

const customerEvents: readonly SceneOverlay[] = [
  { id: 'address-change', title: '临时改地址', detail: '第一位顾客刚发来新定位，旧地址附近的导航提示已经失效。' },
  { id: 'quiet-delivery', title: '轻声送达', detail: '第二位顾客正在休息，备注要求轻敲门并确认后再离开。' },
  { id: 'split-bags', title: '分袋交接', detail: '第三单有多份餐品，顾客要求按姓名核对后逐袋交接。' },
  { id: 'gate-call', title: '门岗核验', detail: '小区门岗要先联系住户确认，不能把餐品留在入口。' },
  { id: 'cold-food', title: '保温要求', detail: '顾客特别说明汤品需要保温，途中不宜长时间停留。' },
  { id: 'no-elevator', title: '电梯检修', detail: '目的地电梯临时停运，顾客可以到楼下接，也可继续送上楼。' },
  { id: 'phone-busy', title: '暂时失联', detail: '顾客电话一时无人接听，订单备注留了一个备用交接点。' },
  { id: 'careful-count', title: '当面清点', detail: '顾客需要当面核对餐品数量，放下就走可能引发售后争议。' },
];

function ruleEffects(
  main: readonly [number, number, string],
  alley: readonly [number, number, string],
  rush: readonly [number, number, string],
  steady: readonly [number, number, string],
): RouteRule['effects'] {
  return { MAIN: main, ALLEY: alley, RUSH: rush, STEADY: steady };
}

const riderConditions: readonly RouteRule[] = [
  { id: 'battery-low', title: '电量偏低', detail: '电动车电量只够跑完这班，少绕路能省下返程风险。', effects: ruleEffects([0, 0, '电量不足，主路续航更稳。'], [-3, 1, '小巷多次启停，电量消耗增加。'], [5, 4, '高速加速可以拿加价，但电耗最高。'], [2, 0, '匀速行驶保留了返程电量。']) },
  { id: 'raincoat-worn', title: '雨衣破损', detail: '雨衣接缝开始渗水，暴露在路面上的时间会影响状态。', effects: ruleEffects([-2, 0, '主路有遮挡，减少淋雨时间。'], [2, 2, '小巷积水增加了整理餐袋的时间。'], [7, 3, '赶时间能拿补贴，但更容易淋湿。'], [0, 0, '稳速送达，避免额外暴露。']) },
  { id: 'brake-noise', title: '刹车异响', detail: '车闸出现轻微异响，王老板要求下坡和转弯不要抢速度。', effects: ruleEffects([0, 0, '主路转弯少，按常速通过。'], [-2, 1, '窄巷转弯多，需要额外减速。'], [-8, 2, '车辆状态不适合冲刺，时效补贴减少。'], [1, 0, '稳速路线符合安全要求。']) },
  { id: 'cargo-strap', title: '绑带松动', detail: '保温箱绑带有些松，颠簸路段需要停车复查。', effects: ruleEffects([0, 0, '路面平整，绑带保持稳定。'], [-3, 2, '巷道颠簸，需要停下重新固定。'], [4, 3, '冲刺途中复查绑带，额外消耗精力。'], [0, 0, '稳速行驶，不额外折腾货箱。']) },
  { id: 'tire-pressure', title: '轮胎偏软', detail: '后轮胎压偏低，长距离和急加速都会更费力。', effects: ruleEffects([-1, 1, '长路胎阻增加，额外消耗精力。'], [1, 0, '小巷距离短，减少轮胎负担。'], [-5, 4, '急加速不划算，补贴抵不过体力消耗。'], [0, 1, '保持低速但路程较长。']) },
  { id: 'phone-mount', title: '手机支架松动', detail: '手机支架角度不稳，复杂路口要停下确认导航。', effects: ruleEffects([-1, 1, '主路导航清晰，偶尔停下查看。'], [0, 2, '小巷岔口多，反复确认路线。'], [3, 3, '抢时效时仍需停车看导航。'], [1, 1, '稳速并留出看导航的时间。']) },
  { id: 'thermal-bag', title: '保温箱完好', detail: '保温箱刚换了新扣带，餐品可以少受路况影响。', effects: ruleEffects([1, -1, '保温箱固定牢靠，减少一次整理。'], [3, -1, '箱扣稳固，小巷颠簸也不用停车。'], [4, 1, '赶单能拿补贴，仍要注意急停。'], [2, -1, '稳速路线省力，餐品状态也稳定。']) },
  { id: 'old-battery', title: '旧电池发热', detail: '电池连续使用后温度偏高，少做急加速更安全。', effects: ruleEffects([0, 0, '主路匀速行驶。'], [1, 1, '频繁起步多耗精力。'], [-7, 3, '高负载冲刺被平台降了时效补贴。'], [1, 0, '稳速送达，避免电池过载。']) },
];

const dispatchPolicies: readonly RouteRule[] = [
  { id: 'batch-bonus', title: '合单奖励', detail: '平台开放合单奖励，路线越顺越容易赶上奖励窗口。', effects: ruleEffects([7, 0, '合单奖励按时到账。'], [4, 1, '小巷绕行占用奖励时间。'], [12, 3, '冲刺赶上奖励窗口。'], [3, 0, '稳送拿到基础合单奖励。']) },
  { id: 'rain-subsidy', title: '天气补贴', detail: '平台按恶劣天气发放补贴，但高峰单仍然紧张。', effects: ruleEffects([5, 0, '主路天气补贴到账。'], [8, 2, '小巷避开积水但多耗精力。'], [10, 4, '加急单补贴高，体力消耗也高。'], [4, 0, '稳速路线拿到基础补贴。']) },
  { id: 'late-window', title: '时段奖励收窄', detail: '平台缩短了加价窗口，只有赶上时段的订单能拿满奖励。', effects: ruleEffects([-3, 0, '主路未赶上加价窗口。'], [2, 1, '小巷缩短路程，拿到部分奖励。'], [8, 3, '冲刺赶上窄窗口。'], [-2, 0, '稳送错过时段奖励。']) },
  { id: 'service-score', title: '服务分加奖', detail: '平台把准时和交接记录纳入奖励，服务质量也影响报酬。', effects: ruleEffects([3, 0, '按时交接拿到服务分奖励。'], [2, 1, '小巷路线多花精力。'], [6, 3, '冲刺完成，但没有额外服务分。'], [5, 0, '稳妥交接拿到服务分奖励。']) },
  { id: 'fuel-rebate', title: '里程返还', detail: '平台按路线里程返还少量车费，绕行与冲刺都会增加消耗。', effects: ruleEffects([4, 0, '主路里程返还到账。'], [5, 1, '绕行里程更多，返还略高。'], [7, 3, '冲刺里程费更高，额外耗力。'], [3, 0, '稳速拿到基础里程返还。']) },
  { id: 'surge-fee', title: '短时加价', detail: '短时加价即将结束，抢单能多拿钱，但会压缩休息时间。', effects: ruleEffects([0, 0, '加价结束，主路只拿基础报酬。'], [5, 1, '小巷赶上部分加价。'], [13, 4, '赶上加价，体力消耗明显增加。'], [1, 0, '稳送只拿到少量加价。']) },
  { id: 'order-deduction', title: '超时扣款规则', detail: '平台更新了超时扣款规则，迟到会从本单报酬中扣除。', effects: ruleEffects([-6, 0, '主路拥堵触发少量扣款。'], [4, 1, '小巷避开拥堵，保住大部分报酬。'], [8, 3, '冲刺避免扣款并拿到加急费。'], [-3, 0, '稳送触发部分超时扣款。']) },
  { id: 'guaranteed-base', title: '保底单调整', detail: '平台提高了基础单保底，但加价单的额外奖励减少。', effects: ruleEffects([5, 0, '基础单保底提高。'], [3, 1, '保底提高，绕巷仍有体力成本。'], [4, 3, '加急奖励减少，冲刺性价比下降。'], [6, 0, '稳送拿到调整后的保底。']) },
];

export const deliveryContinuationScenarioCount = deliveryDayScenarios.length
  * roadEvents.length * customerEvents.length * riderConditions.length * dispatchPolicies.length;

function combineEffect(rider: RouteRule, dispatch: RouteRule, choice: DeliveryChoice): DeliveryRouteEffect {
  const [riderIncome, riderEnergy, riderNote] = rider.effects[choice];
  const [dispatchIncome, dispatchEnergy, dispatchNote] = dispatch.effects[choice];
  return {
    incomeDelta: riderIncome + dispatchIncome,
    energyDelta: riderEnergy + dispatchEnergy,
    description: rider.title + ' · ' + riderNote + ' ' + dispatch.title + ' · ' + dispatchNote,
    outcome: riderNote + ' ' + dispatchNote,
  };
}

export function deliveryContinuationFor(day: number, seed: number): DeliveryDayScenario {
  const baseDeck = seededShuffle(deliveryDayScenarios, seed, 0xD3117E2);
  const roads = seededShuffle(roadEvents, seed, 0xD3117E3);
  const customers = seededShuffle(customerEvents, seed, 0xD3117E4);
  const riders = seededShuffle(riderConditions, seed, 0xD3117E5);
  const dispatches = seededShuffle(dispatchPolicies, seed, 0xD3117E6);
  const cursor = Math.max(0, Math.floor(day) - 31);
  const serial = (cursor + ((seed >>> 0) % deliveryContinuationScenarioCount)) % deliveryContinuationScenarioCount;
  const baseIndex = serial % baseDeck.length;
  const roadIndex = Math.floor(serial / baseDeck.length) % roads.length;
  const customerIndex = Math.floor(serial / (baseDeck.length * roads.length)) % customers.length;
  const riderIndex = Math.floor(serial / (baseDeck.length * roads.length * customerEvents.length)) % riders.length;
  const dispatchIndex = Math.floor(serial / (baseDeck.length * roads.length * customerEvents.length * riderConditions.length)) % dispatches.length;
  const base = baseDeck[baseIndex]!;
  const road = roads[roadIndex]!;
  const customer = customers[customerIndex]!;
  const rider = riders[riderIndex]!;
  const dispatch = dispatches[dispatchIndex]!;
  const routeEffects: Record<DeliveryChoice, DeliveryRouteEffect> = {
    MAIN: combineEffect(rider, dispatch, 'MAIN'),
    ALLEY: combineEffect(rider, dispatch, 'ALLEY'),
    RUSH: combineEffect(rider, dispatch, 'RUSH'),
    STEADY: combineEffect(rider, dispatch, 'STEADY'),
  };

  const stops = base.stops.map((stop) => ({
    ...stop,
    id: `delivery-v3-${stop.id}-${road.id}-${customer.id}-${rider.id}-${dispatch.id}`,
    title: `${road.title} · ${stop.title} · ${customer.title}`,
    briefing: `${stop.briefing} ${road.detail} ${customer.detail} ${rider.detail} ${dispatch.detail}`,
    routeEffects,
  }));

  return {
    id: `delivery-v3-${base.id}-${road.id}-${customer.id}-${rider.id}-${dispatch.id}`,
    stops: [stops[0]!, stops[1]!, stops[2]!],
  };
}
