import type { CafeCustomerId, CafeShiftChoice, CafeShiftStep } from './cafeShiftTypes';
import { seededPermutationAt } from './scenarioDeck';
import type { CafeCustomerScenario } from './systems/cafeShift';

interface CafeContinuationCard {
  request: string;
  need: string;
  correctChoice: CafeShiftChoice;
}

const cardCount = 8;
const personaCount = 5;
const stockStateCount = 3;
const legacySceneCount = 8;
const legacyNeighborhoodCount = 8;
const continuationSceneCount = 16;
const continuationNeighborhoodCount = 16;
const adviceCount = 8;
export const cafeServiceEnvironmentCount = stockStateCount * legacySceneCount * legacyNeighborhoodCount;
const cafeContinuationEnvironmentCount = stockStateCount * continuationSceneCount * continuationNeighborhoodCount;
const continuationSlotsPerDay = 3;
const novelContinuationEnvironmentCount = cafeContinuationEnvironmentCount - cafeServiceEnvironmentCount;
const continuationDailyEnvironmentCount = novelContinuationEnvironmentCount
  * cafeContinuationEnvironmentCount ** (continuationSlotsPerDay - 1);

export const cafeContinuationScenarioCount = cardCount * personaCount * stockStateCount
  * legacySceneCount * legacyNeighborhoodCount * adviceCount;
export const cafeContinuationV4ScenarioCount = cardCount * personaCount * stockStateCount
  * continuationSceneCount * continuationNeighborhoodCount * adviceCount;

const continuationCards: Readonly<Record<CafeCustomerId, readonly CafeContinuationCard[]>> = {
  RIDER: [
    { request: '胃有些不舒服，想喝温和的植物奶，别太浓。', need: '植物奶、温和口感', correctChoice: 'OAT_LATTE' },
    { request: '夜路还要跑很久，来杯纯咖啡提神，不要加糖。', need: '纯咖啡、不要加糖', correctChoice: 'BLACK_COFFEE' },
    { request: '饭点全错过了，想带一份能直接垫肚子的小食。', need: '方便充饥的小食', correctChoice: 'CAKE' },
    { request: '雨停后还得接单，想喝热美式，不要额外糖浆。', need: '热咖啡、不要额外糖浆', correctChoice: 'BLACK_COFFEE' },
    { request: '站点伙伴过生日，想拿份方便分享的甜点。', need: '适合分享的甜点', correctChoice: 'CAKE' },
    { request: '连续跑单胃有点胀，燕麦奶可以，口味温和就行。', need: '温和口感、燕麦奶', correctChoice: 'OAT_LATTE' },
    { request: '车要在站点充电，趁这会儿先吃点东西。', need: '能快速垫肚子的小食', correctChoice: 'CAKE' },
    { request: '清早风大，想要温和热饮，别太甜。', need: '温和的热饮', correctChoice: 'OAT_LATTE' },
  ],
  REGULAR: [
    { request: '最近在控糖，还是想喝奶咖，甜味尽量少。', need: '低糖奶咖', correctChoice: 'SUGAR_FREE_LATTE' },
    { request: '今天想奖励自己，焦糖和巧克力味都要浓一点。', need: '焦糖巧克力风味', correctChoice: 'CARAMEL_MOCHA' },
    { request: '等人时想喝杯清爽的，不要奶，也不需要咖啡因。', need: '清爽无奶甜茶', correctChoice: 'SWEET_TEA' },
    { request: '医生让我少糖，但我不想喝黑咖啡。', need: '低糖奶咖', correctChoice: 'SUGAR_FREE_LATTE' },
    { request: '忙完想坐一下，来点浓郁甜口的奶咖。', need: '甜口奶咖', correctChoice: 'CARAMEL_MOCHA' },
    { request: '今天不喝咖啡，想要果香明显的茶饮。', need: '果香甜茶', correctChoice: 'SWEET_TEA' },
    { request: '下午要开会，别太甜，来杯顺口的低糖拿铁。', need: '低糖、顺口的奶咖', correctChoice: 'SUGAR_FREE_LATTE' },
    { request: '晚上不想摄入咖啡因，想喝点甜的茶。', need: '无咖啡因甜茶', correctChoice: 'SWEET_TEA' },
  ],
  PARENT: [
    { request: '孩子刚运动完，想喝温热、没有咖啡因的。', need: '温热、无咖啡因', correctChoice: 'WARM_MILK' },
    { request: '我等下要开车，想快点清醒，不用加糖。', need: '高浓度咖啡提神', correctChoice: 'DOUBLE_ESPRESSO' },
    { request: '天气热，孩子口渴，想喝没有奶的冷饮。', need: '清爽无奶冷饮', correctChoice: 'ICED_TEA' },
    { request: '小朋友有点冷，别给咖啡和茶，温温的就好。', need: '温热、无咖啡因', correctChoice: 'WARM_MILK' },
    { request: '今晚要值班，想快速提神，口味纯一点。', need: '高浓度纯咖啡', correctChoice: 'DOUBLE_ESPRESSO' },
    { request: '接完孩子口渴了，来杯冰的，不要加奶。', need: '冰饮、无奶', correctChoice: 'ICED_TEA' },
    { request: '孩子不舒服，不能喝茶和咖啡，想要温热的。', need: '温热、无咖啡因', correctChoice: 'WARM_MILK' },
    { request: '我还要整理材料，想快速喝一份浓缩咖啡。', need: '快速提神的浓咖啡', correctChoice: 'DOUBLE_ESPRESSO' },
  ],
};

const legacyScenes = [
  '雨刚停，送单的人陆续回到路边避雨。', '午休人潮挤到窗口，队伍开始变长。',
  '隔壁修车铺开门，来往的街坊多了起来。', '社区活动散场，有人边走边找饮料。',
  '写字楼刚下班，几位同事结伴经过。', '旧书摊收摊后，街口慢慢安静下来。',
  '门口临时修路，客人绕到窗口这边。', '夜校散场，熟客顺路进来歇脚。',
] as const;

const continuationScenes = [
  ...legacyScenes,
  '雨棚边摆出临时取餐架，窗口内外需要错开交接。', '制冰机刚补满，冷饮单集中涌进来。',
  '街道临时封了一条车道，客人从后巷绕到店门口。', '店里调整了咖啡豆研磨刻度，第一轮需要多留意出杯。',
  '社区展板换了新内容，路过的人停下来看了一会儿。', '晚班同事刚交接，收银台旁还放着未拆的补货箱。',
  '隔壁店铺做盘点，街口的步行路线临时改道。', '收音机播报降雨提醒，骑手们把保温箱搬到檐下。',
] as const;

const legacyNeighborhoodEvents = [
  '街坊在公告栏讨论周末义卖。', '外卖站刚换班，骑手们在核对路线。',
  '楼上培训班提前下课，学员分批离开。', '附近诊所结束午间排队，门口恢复通畅。',
  '物业正在清理积水，行人都贴着店檐走。', '隔壁摊主在搬货，留出了一段临时通道。',
  '社区广播提醒降温，大家把外套重新穿上。', '公交晚点，等车的人暂时聚在街角。',
] as const;

const continuationNeighborhoodEvents = [
  ...legacyNeighborhoodEvents,
  '公交站临时迁到路口，等车的人经过店门。', '写字楼电梯检修，午休人流比平时晚到。',
  '社区志愿者在附近分发活动传单。', '路边摊提前收摊，行人开始从这条街穿行。',
  '楼上会议延时结束，几组客人分批下楼。', '夜市摊主开始布置灯牌，街边逐渐热闹起来。',
  '附近学校今天提早放学，家长在路口等候。', '街角施工暂停，原本绕行的人流回到主路。',
] as const;

const novelContinuationEnvironments = Array.from({ length: cafeContinuationEnvironmentCount }, (_, index) => index)
  .filter((index) => {
    const sceneIndex = Math.floor(index / continuationNeighborhoodCount) % continuationSceneCount;
    const eventIndex = index % continuationNeighborhoodCount;
    return sceneIndex >= legacySceneCount || eventIndex >= legacyNeighborhoodCount;
  });

const sujieAdvice = [
  '先听完客人的话，别急着把贵的推过去。', '菜单上的缺货我会标清，别答应做不到的。',
  '忙的时候先把手里的这一杯做好。', '熟客愿意回来，说明上次没有糊弄人。',
  '价格写在牌上，账就按牌子上的算。', '客人说少糖，就别替他改主意。',
  '杯子返工还能补，口碑掉了不好补。', '我顾着周转，也不能把坏单推给你。',
] as const;

const choiceNames: Readonly<Record<CafeShiftChoice, string>> = {
  BLACK_COFFEE: '美式黑咖啡', OAT_LATTE: '燕麦拿铁', CAKE: '当日小蛋糕',
  SUGAR_FREE_LATTE: '无糖拿铁', CARAMEL_MOCHA: '焦糖摩卡', SWEET_TEA: '蜜桃甜茶',
  WARM_MILK: '温热牛奶', DOUBLE_ESPRESSO: '双份浓缩', ICED_TEA: '冰柠茶',
};

export function cafeServiceEnvironmentFor(
  index: number,
  menu: readonly CafeShiftChoice[],
  correctChoice: CafeShiftChoice,
): Pick<CafeCustomerScenario, 'scene' | 'availability' | 'availableChoices'> {
  const safeIndex = Math.max(0, Math.floor(index)) % cafeServiceEnvironmentCount;
  return serviceEnvironmentForIndex(safeIndex, menu, correctChoice, legacyScenes, legacyNeighborhoodEvents, legacySceneCount, legacyNeighborhoodCount);
}

function serviceEnvironmentForIndex(
  index: number,
  menu: readonly CafeShiftChoice[],
  correctChoice: CafeShiftChoice,
  scenes: readonly string[],
  neighborhoodEvents: readonly string[],
  sceneCount: number,
  neighborhoodCount: number,
): Pick<CafeCustomerScenario, 'scene' | 'availability' | 'availableChoices'> {
  const stockState = Math.floor(index / (sceneCount * neighborhoodCount)) % stockStateCount;
  const sceneIndex = Math.floor(index / neighborhoodCount) % sceneCount;
  const eventIndex = index % neighborhoodCount;
  const wrongChoices = menu.filter((choice) => choice !== correctChoice);
  const unavailable = stockState === 0 ? null : wrongChoices[stockState - 1]!;
  const availableChoices = unavailable ? menu.filter((choice) => choice !== unavailable) : menu;

  return {
    scene: `${scenes[sceneIndex]}${neighborhoodEvents[eventIndex]}`,
    availableChoices,
    availability: unavailable
      ? `临时缺货：${choiceNames[unavailable]}；其余菜单仍可制作。`
      : '常用原料齐全，三种菜单均可制作。',
  };
}

function continuationEnvironmentIndexFor(day: number, step: CafeShiftStep, seed: number): number {
  const position = Math.max(0, Math.floor(day) - 31);
  const dailyIndex = seededPermutationAt(position, continuationDailyEnvironmentCount, seed, 0xCAFE404);
  if (step === 0) return novelContinuationEnvironments[dailyIndex % novelContinuationEnvironmentCount]!;
  const divider = novelContinuationEnvironmentCount * cafeContinuationEnvironmentCount ** (step - 1);
  return Math.floor(dailyIndex / divider) % cafeContinuationEnvironmentCount;
}

export function cafeContinuationScenarioFor(
  day: number,
  step: CafeShiftStep,
  customer: CafeCustomerId,
  seed: number,
  personaNames: readonly string[],
  menu: readonly CafeShiftChoice[],
  scenarioVersion: 3 | 4 = 3,
): CafeCustomerScenario {
  const position = Math.max(0, Math.floor(day) - 31);
  const sceneCount = scenarioVersion === 3 ? legacySceneCount : continuationSceneCount;
  const neighborhoodCount = scenarioVersion === 3 ? legacyNeighborhoodCount : continuationNeighborhoodCount;
  const scenarioCount = scenarioVersion === 3 ? cafeContinuationScenarioCount : cafeContinuationV4ScenarioCount;
  const versionSalt = scenarioVersion === 3 ? 0xCAFE303 : [0xCAFE403, 0xCAFE413, 0xCAFE423][step]!;
  const index = seededPermutationAt(position, scenarioCount, seed, versionSalt);
  let remainder = index;
  const cardIndex = remainder % cardCount;
  remainder = Math.floor(remainder / cardCount);
  const personaIndex = remainder % personaCount;
  remainder = Math.floor(remainder / personaCount);
  const stockState = remainder % stockStateCount;
  remainder = Math.floor(remainder / stockStateCount);
  const sceneIndex = remainder % sceneCount;
  remainder = Math.floor(remainder / sceneCount);
  const eventIndex = remainder % neighborhoodCount;
  remainder = Math.floor(remainder / neighborhoodCount);
  const adviceIndex = remainder % adviceCount;
  const card = continuationCards[customer][cardIndex]!;
  const legacyEnvironment = scenarioVersion === 3
    ? serviceEnvironmentForIndex(stockState * sceneCount * neighborhoodCount + sceneIndex * neighborhoodCount + eventIndex,
      menu, card.correctChoice, legacyScenes, legacyNeighborhoodEvents, legacySceneCount, legacyNeighborhoodCount)
    : null;
  const continuationEnvironment = scenarioVersion === 4
    ? serviceEnvironmentForIndex(continuationEnvironmentIndexFor(day, step, seed),
      menu, card.correctChoice, continuationScenes, continuationNeighborhoodEvents, continuationSceneCount, continuationNeighborhoodCount)
    : null;
  const persona = personaNames[personaIndex]!;
  const advice = sujieAdvice[(adviceIndex + step) % adviceCount]!;

  return {
    id: `cafe-v${scenarioVersion}-${day}-${step}-${index}`,
    customer,
    name: persona,
    request: card.request,
    need: card.need,
    avatar: persona.slice(0, 1),
    correctChoice: card.correctChoice,
    availableChoices: continuationEnvironment?.availableChoices ?? legacyEnvironment!.availableChoices,
    scene: continuationEnvironment
      ? `${continuationEnvironment.scene}`
      : `${legacyEnvironment!.scene}`,
    availability: continuationEnvironment?.availability ?? legacyEnvironment!.availability,
    sujieLine: advice,
  };
}
