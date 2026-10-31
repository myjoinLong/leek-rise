import type { DeliveryChoice } from './types';
import { encounterIndex, seededShuffle } from './scenarioDeck';

export interface DeliveryRouteEffect {
  incomeDelta: number;
  energyDelta: number;
  description: string;
  outcome: string;
}

export interface DeliveryStopStory {
  id: string;
  title: string;
  briefing: string;
  routeEffects?: Readonly<Partial<Record<DeliveryChoice, DeliveryRouteEffect>>>;
}

export interface DeliveryDayScenario {
  id: string;
  stops: readonly [DeliveryStopStory, DeliveryStopStory, DeliveryStopStory];
}

interface DistrictProfile {
  id: string;
  name: string;
  orders: readonly [
    { title: string; detail: string },
    { title: string; detail: string },
    { title: string; detail: string },
  ];
}

interface DayCondition {
  id: string;
  title: string;
  opening: string;
  routeSignals: readonly [string, string, string];
}

const districts: readonly DistrictProfile[] = [
  { id: 'old-town', name: '老城片区', orders: [
    { title: '早点铺 · 热汤加急', detail: '老板把汤面封好才交单，备注要求汤汁不能洒。' },
    { title: '巷口杂货店 · 补货单', detail: '店主下班前等着收货，后门小巷可以直接进院。' },
    { title: '旧楼顶层 · 夜间送达', detail: '收货人在六楼，楼道灯坏了，电梯今天停运。' },
  ] },
  { id: 'riverside', name: '河滨新村', orders: [
    { title: '河鲜面馆 · 午市打包', detail: '两份汤面分装，顾客反复提醒不要把辣油放错袋。' },
    { title: '沿河小区 · 门岗代收', detail: '门岗不替人保管冷藏食品，送到后要当面确认。' },
    { title: '滨河公寓 · 末班订单', detail: '顾客刚下夜班，要求轻敲门，不要按门铃。' },
  ] },
  { id: 'tech-park', name: '软件园', orders: [
    { title: '园区食堂 · 会议餐', detail: '会议提前十分钟开始，前台只留了一个收餐窗口。' },
    { title: '研发楼 · 电梯预约', detail: '午休人流集中，外卖只能从东侧货梯上楼。' },
    { title: '加班工位 · 深夜咖啡', detail: '客户在园区另一栋楼，访客通道夜间需要登记。' },
  ] },
  { id: 'night-market', name: '南门夜市', orders: [
    { title: '烧烤摊 · 多袋分装', detail: '三桌客人合并下单，摊主要求按桌号分别交付。' },
    { title: '夜市入口 · 冰饮补单', detail: '摊位在临时通道里，不能把饮料放在太阳下等人。' },
    { title: '收摊档口 · 最后一单', detail: '老板准备收摊，送晚了只能把餐品带回家。' },
  ] },
  { id: 'hospital', name: '市二院周边', orders: [
    { title: '医院后街 · 清淡餐', detail: '顾客备注少油少盐，送到住院部外的指定窗口。' },
    { title: '门诊楼 · 家属餐', detail: '家属正在排队缴费，只能在门诊东门短暂停留。' },
    { title: '夜间值班室 · 热粥', detail: '值班护士不能离岗，交接时段门口会短暂无人。' },
  ] },
  { id: 'school-lane', name: '职校后街', orders: [
    { title: '早餐车 · 集体加单', detail: '宿舍几个人拼单，饮料和主食需要按姓名分开。' },
    { title: '校门口 · 午休取餐', detail: '学生只能在放学铃后出校，提前到要等在指定点。' },
    { title: '实训楼 · 晚自习补给', detail: '校内不让电动车进入，收餐点在操场北门外。' },
  ] },
  { id: 'industrial', name: '东郊工业园', orders: [
    { title: '工棚食堂 · 夜班开饭', detail: '夜班提前换岗，餐盒要赶在交接前送到工棚门口。' },
    { title: '物流仓 · 叉车通道', detail: '仓库正在装货，骑车进场必须绕过叉车作业区。' },
    { title: '门卫室 · 轮班宵夜', detail: '厂区西门夜里锁闭，门卫说南侧小门仍有人值守。' },
  ] },
  { id: 'rail-station', name: '客运站北广场', orders: [
    { title: '站前包子铺 · 打包单', detail: '顾客赶早班车，餐袋要送到安检外的临停车位。' },
    { title: '候车厅外 · 旅客加单', detail: '站前不能长时间停车，接单后要先确认具体出口。' },
    { title: '末班车 · 司机夜宵', detail: '司机发车前只有几分钟，错过就要等到下一班。' },
  ] },
  { id: 'sports-center', name: '体育中心', orders: [
    { title: '训练馆 · 低糖餐', detail: '训练结束时间不固定，顾客要求餐品先不要拆封。' },
    { title: '看台西门 · 观众加餐', detail: '散场人流会封住正门，工作人员建议走西侧通道。' },
    { title: '场馆后勤 · 夜班便当', detail: '后勤人员在卸货区接餐，货车到场时该入口会暂时封闭。' },
  ] },
  { id: 'wholesale', name: '城南批发市场', orders: [
    { title: '熟食档 · 一早备货', detail: '老板要赶在开市前整理摊位，餐盒放错档口就找不到。' },
    { title: '蔬菜区 · 临时午餐', detail: '市场内部通道窄，三轮车卸货会占住主路一侧。' },
    { title: '冷库值班点 · 夜宵', detail: '冷库边不能久停，交餐后要从南门绕出市场。' },
  ] },
];

const conditions: readonly DayCondition[] = [
  { id: 'heat', title: '热浪晚峰', opening: '热浪压着盘城，站点提示晚峰加价窗口很短。', routeSignals: [
    '主路车流排队，小巷畅通但路面颠簸。', '主路有遮阴连廊，小巷路面晒得发软。', '加价单快超时，冲刺能赶上，稳送更省体力。',
  ] },
  { id: 'rain', title: '阵雨突至', opening: '阵雨突然落下，骑手群里刚发了几处积水提醒。', routeSignals: [
    '高架下车流变慢，背街小巷积水不深但需要减速。', '主路有连续雨棚，小巷转弯处容易打滑。', '雨势还在变大，冲刺收入高但雨衣和体力都要留余量。',
  ] },
  { id: 'works', title: '临时交通管制', opening: '城区临时施工，导航更新比路口公告慢了半拍。', routeSignals: [
    '主路施工排队，小巷允许通行但需要多看路牌。', '主路绕行距离变长，熟悉的侧门仍然开放。', '管制解除时间不确定，赶时效单能多拿加价也更耗精力。',
  ] },
];

export const deliveryDayScenarios: readonly DeliveryDayScenario[] = districts.flatMap((district) =>
  conditions.map((condition) => {
    const stops = district.orders.map((order, index) => ({
      id: `${district.id}-${condition.id}-${index + 1}`,
      title: `${district.name} · ${order.title} · ${condition.title}`,
      briefing: `${condition.opening} ${order.detail} ${condition.routeSignals[index]!}`,
    }));
    return { id: `${district.id}-${condition.id}`, stops: [stops[0]!, stops[1]!, stops[2]!] };
  }),
);

export function deliveryDayScenarioFor(day: number, seed: number): DeliveryDayScenario {
  const deck = seededShuffle(deliveryDayScenarios, seed, 0xD3117E2);
  return deck[encounterIndex(day, 0, 1) % deck.length]!;
}
