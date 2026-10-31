import type { CafeCustomerId, CafeReturnContext, CafeScenarioVersion, CafeShiftChoice, CafeShiftStep } from './cafeShiftTypes';
import type { GameState } from './types';
import { cafeShiftOrders, cafeShiftTipPerCorrectOrder } from './cafeShiftRules';
import { encounterIndex, seededPermutationAt, seededShuffle } from './scenarioDeck';
import { cafeContinuationScenarioFor, cafeServiceEnvironmentCount, cafeServiceEnvironmentFor } from './cafeContinuationScenarios';
export interface CafeCustomerScenario {
  id: string;
  customer: CafeCustomerId;
  name: string;
  request: string;
  need: string;
  avatar: string;
  correctChoice: CafeShiftChoice;
  availableChoices: readonly CafeShiftChoice[];
  scene?: string;
  availability?: string;
  sujieLine?: string;
}

const serviceOptions: Readonly<Record<CafeCustomerId, readonly CafeShiftChoice[]>> = {
  RIDER: ['BLACK_COFFEE', 'OAT_LATTE', 'CAKE'],
  REGULAR: ['SUGAR_FREE_LATTE', 'CARAMEL_MOCHA', 'SWEET_TEA'],
  PARENT: ['WARM_MILK', 'DOUBLE_ESPRESSO', 'ICED_TEA'],
};
const correctChoice: Readonly<Record<CafeCustomerId, CafeShiftChoice>> = {
  RIDER: 'BLACK_COFFEE', REGULAR: 'SUGAR_FREE_LATTE', PARENT: 'WARM_MILK',
};
const choiceNames: Readonly<Record<CafeShiftChoice, string>> = {
  BLACK_COFFEE: '美式黑咖啡', OAT_LATTE: '燕麦拿铁', CAKE: '当日小蛋糕',
  SUGAR_FREE_LATTE: '无糖拿铁', CARAMEL_MOCHA: '焦糖摩卡', SWEET_TEA: '蜜桃甜茶',
  WARM_MILK: '温热牛奶', DOUBLE_ESPRESSO: '双份浓缩', ICED_TEA: '冰柠茶',
};

const personas: Readonly<Record<CafeCustomerId, readonly string[]>> = {
  RIDER: ['骑手小岳', '夜班骑手阿拓', '代驾司机周哥', '站点新人小苏', '跑腿员阿哲'],
  REGULAR: ['熟客林姐', '会计师陈姐', '夜校学生小唐', '附近店主阿敏', '退休教师许叔'],
  PARENT: ['带娃的周女士', '幼儿园老师小叶', '接孩子的阿宁', '社区志愿者吴姨', '新手爸爸小许'],
};

const requestCards: Readonly<Record<CafeCustomerId, readonly { request: string; need: string; correctChoice: CafeShiftChoice }[]>> = {
  RIDER: [
    { request: '还要跑两小时夜路，想提神，别加糖。', need: '需要提神且不加糖', correctChoice: 'BLACK_COFFEE' },
    { request: '雨刚停，手有点冷，给我一杯热的纯咖啡。', need: '需要热饮且不加糖', correctChoice: 'BLACK_COFFEE' },
    { request: '今天胃不太舒服，想喝燕麦奶做的温和一点。', need: '需要植物奶与温和口感', correctChoice: 'OAT_LATTE' },
    { request: '乳糖不耐，普通奶不行；别太甜就好。', need: '需要植物奶且低甜度', correctChoice: 'OAT_LATTE' },
    { request: '午饭忙忘了吃，先拿块小蛋糕垫垫肚子。', need: '需要方便充饥的小食', correctChoice: 'CAKE' },
    { request: '队友生日，想带个甜点回站点一起分。', need: '需要方便分享的甜点', correctChoice: 'CAKE' },
  ],
  REGULAR: [
    { request: '医生让我少糖，想喝一杯顺口的拿铁。', need: '需要低糖奶咖', correctChoice: 'SUGAR_FREE_LATTE' },
    { request: '最近在控糖，但今天想喝咖啡加奶。', need: '需要低糖奶咖', correctChoice: 'SUGAR_FREE_LATTE' },
    { request: '想奖励自己一杯浓郁甜口的，今天不控糖。', need: '需要浓郁甜口奶咖', correctChoice: 'CARAMEL_MOCHA' },
    { request: '下午有空坐一会儿，想要焦糖和巧克力味。', need: '需要焦糖巧克力风味', correctChoice: 'CARAMEL_MOCHA' },
    { request: '不想喝奶咖，来杯清爽带果香的茶吧。', need: '需要清爽果茶', correctChoice: 'SWEET_TEA' },
    { request: '等朋友时想喝点甜的，但今天不想摄入咖啡因。', need: '需要无咖啡因甜茶', correctChoice: 'SWEET_TEA' },
  ],
  PARENT: [
    { request: '孩子刚运动完有点冷，想要温热、没有咖啡因的。', need: '需要温热且无咖啡因', correctChoice: 'WARM_MILK' },
    { request: '给小朋友买，别太烫，也不要咖啡和茶。', need: '需要温热且无咖啡因', correctChoice: 'WARM_MILK' },
    { request: '我还要赶一份材料，想要咖啡味重一点的。', need: '需要高浓度咖啡提神', correctChoice: 'DOUBLE_ESPRESSO' },
    { request: '今晚要值班，想快速提神，不需要加糖。', need: '需要高浓度咖啡提神', correctChoice: 'DOUBLE_ESPRESSO' },
    { request: '接完孩子口渴，天气热，想喝不含奶的冷饮。', need: '需要清爽无奶冷饮', correctChoice: 'ICED_TEA' },
    { request: '刚走了一路，想喝冰的，柠檬味清爽一点。', need: '需要柠檬风味冷饮', correctChoice: 'ICED_TEA' },
  ],
};

const customerOrders: readonly (readonly CafeCustomerId[])[] = [
  ['RIDER', 'REGULAR', 'PARENT'], ['REGULAR', 'PARENT', 'RIDER'],
  ['PARENT', 'RIDER', 'REGULAR'], ['RIDER', 'PARENT', 'REGULAR'],
  ['REGULAR', 'RIDER', 'PARENT'], ['PARENT', 'REGULAR', 'RIDER'],
];

function customerOrderFor(day: number, seed: number): readonly CafeCustomerId[] {
  const orders = seededShuffle(customerOrders, seed, 0xCAFE701);
  return orders[(Math.max(1, Math.floor(day)) - 1) % orders.length]!;
}

function customerScenarioIndex(day: number, seed: number, customer: CafeCustomerId): number {
  const salt = customer === 'RIDER' ? 0xCAFE101 : customer === 'REGULAR' ? 0xCAFE202 : 0xCAFE303;
  const deck = seededShuffle(Array.from({ length: 30 }, (_, index) => index), seed, salt);
  return deck[(Math.max(1, Math.floor(day)) - 1) % deck.length]!;
}

function legacyScenario(customer: CafeCustomerId, day: number, step: CafeShiftStep): CafeCustomerScenario {
  const legacyRequests: Readonly<Record<CafeCustomerId, { name: string; request: string; need: string; avatar: string }>> = {
    RIDER: { name: '赶单骑手', request: '还要跑两个小时，想提神，别给我太甜的。', need: '需要提神、不要太甜', avatar: '骑' },
    REGULAR: { name: '熟客林姐', request: '医生让我少糖，来杯顺口、别太苦的。', need: '需要少糖、顺口', avatar: '林' },
    PARENT: { name: '带娃的妈妈', request: '孩子有点冷，想要一杯温热、不含咖啡因的。', need: '需要温热、不含咖啡因', avatar: '妈' },
  };
  const card = legacyRequests[customer];
  return {
    id: `cafe-v1-${day}-${step}`, customer, ...card, correctChoice: correctChoice[customer],
    availableChoices: serviceOptions[customer],
  };
}

function withReturningCustomer(
  scenario: CafeCustomerScenario,
  day: number,
  step: CafeShiftStep,
  seed: number,
  returnContext: CafeReturnContext | null,
): CafeCustomerScenario {
  if (!returnContext || scenario.customer !== 'REGULAR') return scenario;
  const returnCards = requestCards.REGULAR.filter((card) =>
    card.correctChoice !== returnContext.previousChoice && scenario.availableChoices.includes(card.correctChoice));
  if (returnCards.length === 0) return scenario;
  const card = returnCards[(customerScenarioIndex(day, seed, 'REGULAR') + step) % returnCards.length]!;
  const continuityLine = `熟客 ${returnContext.customerName} 上回在第 ${returnContext.previousDay} 天点了${choiceNames[returnContext.previousChoice]}；这次换了需求，请按当前订单重新判断。对单每杯小费 ¥${cafeShiftTipPerCorrectOrder}，答错不扣现金。`;
  const unavailable = serviceOptions.REGULAR.find((choice) => !scenario.availableChoices.includes(choice));
  const missingChoice = unavailable === card.correctChoice
    ? serviceOptions.REGULAR.find((choice) => choice !== card.correctChoice)
    : unavailable;
  const availableChoices = missingChoice
    ? serviceOptions.REGULAR.filter((choice) => choice !== missingChoice)
    : scenario.availableChoices;
  return {
    ...scenario,
    name: returnContext.customerName,
    request: card.request,
    need: card.need,
    avatar: returnContext.customerName.slice(0, 1),
    correctChoice: card.correctChoice,
    availableChoices,
    availability: missingChoice
      ? `临时缺货：${choiceNames[missingChoice]}；其余菜单仍可制作。`
      : scenario.availability,
    sujieLine: [continuityLine, scenario.sujieLine].filter((line): line is string => Boolean(line)).join(' '),
  };
}

export function cafeScenarioFor(
  day: number,
  step: CafeShiftStep,
  version: CafeScenarioVersion = 2,
  seed = 4,
  returnContext: CafeReturnContext | null = null,
): CafeCustomerScenario {
  const customer = cafeCustomerFor(day, step, version, seed);
  if (version === 1) return legacyScenario(customer, day, step);
  const dayIndex = Math.max(0, Math.floor(day) - 1);
  if ((version === 3 || version === 4) && day > 30) {
    return withReturningCustomer(
      cafeContinuationScenarioFor(day, step, customer, seed, personas[customer], serviceOptions[customer], version),
      day,
      step,
      seed,
      returnContext,
    );
  }
  const cycle = Math.floor(dayIndex / 30);
  const variant = customerScenarioIndex(day, seed, customer);
  const personaIndex = variant % personas[customer].length;
  const requestIndex = Math.floor(variant / personas[customer].length);
  const persona = personas[customer][personaIndex]!;
  const card = requestCards[customer][requestIndex]!;
  const cycleNarrative = cycle === 0 ? '' : ` 这是你们第 ${cycle + 1} 轮在盘城重逢，这次又带来新的情况。`;
  const scenario: CafeCustomerScenario = {
    id: `cafe-v2-${day}-${step}`,
    customer,
    name: cycle === 0 ? persona : `${persona} · 回访${cycle + 1}`,
    request: card.request + cycleNarrative,
    need: card.need,
    avatar: persona.slice(0, 1),
    correctChoice: card.correctChoice,
    availableChoices: serviceOptions[customer],
  };
  const customerScenario = withReturningCustomer(scenario, day, step, seed, returnContext);
  const environmentPosition = encounterIndex(day, step, cafeShiftOrders);
  const environmentIndex = seededPermutationAt(environmentPosition, cafeServiceEnvironmentCount, seed, 0xCAFE304);
  const environment = cafeServiceEnvironmentFor(
    environmentIndex,
    serviceOptions[customer],
    customerScenario.correctChoice,
  );
  return { ...customerScenario, ...environment };
}

export function cafeReturnContextFor(state: GameState): CafeReturnContext | null {
  const trace = state.npcActivityMemory.sujie.lastTrace;
  const scenarioVersion = trace?.scenarioVersion;
  if (!trace || trace.activityId !== 'SUJIE_CAFE_SHIFT'
    || (scenarioVersion !== 3 && scenarioVersion !== 4)
    || trace.scenarioSeed === undefined || trace.day === undefined || trace.day >= state.day
    || !trace.sujieRegularCustomerName) return null;
  const previousDay = trace.day;
  const previousSeed = trace.scenarioSeed;

  const regularStep = ([0, 1, 2] as const).find((step) =>
    cafeCustomerFor(previousDay, step, scenarioVersion, previousSeed) === 'REGULAR');
  if (regularStep === undefined) return null;
  const previousChoice = serviceOptions.REGULAR.find((choice) => choice === trace.choiceKeys[regularStep]);
  if (!previousChoice) return null;

  return {
    previousDay,
    customerName: trace.sujieRegularCustomerName,
    previousChoice,
  };
}

export function cafeCustomerFor(day: number, step: CafeShiftStep, version: CafeScenarioVersion = 2, seed = 4): CafeCustomerId {
  if (version === 1) return (['RIDER', 'REGULAR', 'PARENT'] as const)[(day - 1 + step) % cafeShiftOrders]!;
  const order = customerOrderFor(day, seed);
  return order[step]!;
}

export function cafeChoicesFor(customer: CafeCustomerId): readonly CafeShiftChoice[] {
  return serviceOptions[customer];
}

export function cafeChoicesForScenario(scenario: CafeCustomerScenario): readonly CafeShiftChoice[] {
  return scenario.availableChoices;
}

export function correctCafeChoiceFor(customer: CafeCustomerId): CafeShiftChoice {
  return correctChoice[customer];
}
