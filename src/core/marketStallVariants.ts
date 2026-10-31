export interface StallScenarioModifier {
  id: string;
  title: string;
  context: string;
  ownerLine: string;
  budgetAdjustments: readonly [number, number, number];
  demandAdjustments: readonly [number, number, number];
  standardDemandDrop: number;
  premiumDemandDrop: number;
}

export const crowdVariants: readonly StallScenarioModifier[] = [
  { id: 'early-shift', title: '早班换岗', context: '工厂早班提前换岗，通勤客集中经过摊位。', ownerLine: '“人来得急，先看他们真正要买什么。”', budgetAdjustments: [1, 0, 1], demandAdjustments: [1, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'school-pickup', title: '放学接送', context: '学校临时调整放学时间，接孩子的家长在附近等候。', ownerLine: '“等孩子的时候会问价，预算还是各家自己的。”', budgetAdjustments: [-1, 2, -1], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'night-workers', title: '夜班散工', context: '昨夜的夜班工人正在回家，附近早点摊也刚开门。', ownerLine: '“熬了一夜的人只想省心，别拿高价试探。”', budgetAdjustments: [0, -1, 2], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'bus-queue', title: '公交排队', context: '公交临时缩短班次，站牌旁等车的人停留更久。', ownerLine: '“站着等车的人多，不等于人人都要买东西。”', budgetAdjustments: [1, 0, 2], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'clinic-visitors', title: '陪诊人流', context: '社区诊所今天加开门诊，陪诊家属分批经过街口。', ownerLine: '“有急用就讲清楚用途，别替客人做主。”', budgetAdjustments: [0, 1, 0], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'river-walk', title: '河岸散步', context: '河边步道重新开放，傍晚散步的人流转到这条街。', ownerLine: '“散步的人有空挑，不一定愿意多花钱。”', budgetAdjustments: [2, 1, 0], demandAdjustments: [1, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'rent-week', title: '月底留钱', context: '月底缴租提醒贴出来了，街坊买日用品会多比较几家。', ownerLine: '“月底每一块都算数，价格就摆在明面上。”', budgetAdjustments: [-2, -2, -2], demandAdjustments: [-1, -1, -1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'market-return', title: '早市回迁', context: '早市摊位迁回原址，老顾客重新从巷口经过。', ownerLine: '“熟客回来是好事，老价目也得算得过账。”', budgetAdjustments: [1, 0, 1], demandAdjustments: [1, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
];

export const needVariants: readonly StallScenarioModifier[] = [
  { id: 'phone-low-battery', title: '手机低电', context: '附近充电柜暂停服务，几位通勤客在找临时充电线。', ownerLine: '“应急需求是真的，愿意付多少还是要看标价。”', budgetAdjustments: [0, 0, 3], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'rainy-school-run', title: '接送遇雨', context: '放学时段有短时降雨，家长们在附近找轻便雨具。', ownerLine: '“雨下得不大，别把临时需要当成必买。”', budgetAdjustments: [0, 3, 0], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'cold-commute', title: '降温通勤', context: '早晚温差变大，通勤客开始打听保温杯。', ownerLine: '“天冷会有人问杯子，问过不代表马上成交。”', budgetAdjustments: [3, 0, 0], demandAdjustments: [1, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'charging-stop', title: '临时断电', context: '街角检修让手机充电不方便，路过的人更关注快充线。', ownerLine: '“急着充电的人也会看一眼价钱，别漏了这点。”', budgetAdjustments: [0, 0, 2], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'family-outing', title: '亲子出行', context: '社区亲子活动临时改到户外，家长在补齐随身用品。', ownerLine: '“孩子要用的东西看实用，别只讲包装。”', budgetAdjustments: [1, 3, 0], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'warehouse-overtime', title: '仓库加班', context: '物流园临时延长夜班，工人下工时小店大多已关门。', ownerLine: '“加班的人图方便，能不能接受这价要问清楚。”', budgetAdjustments: [0, -1, 3], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'shared-bikes', title: '骑行客增加', context: '共享单车集中停在街口，短途骑行的人经过摊前。', ownerLine: '“骑车的人东西带得少，买之前会先看大小。”', budgetAdjustments: [1, 1, 1], demandAdjustments: [0, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'no-special-need', title: '平常日用品', context: '附近没有大型活动，顾客多按平时计划补日用品。', ownerLine: '“没什么特殊情况，就按正常客流稳稳做。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [0, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
];

export const competitionVariants: readonly StallScenarioModifier[] = [
  { id: 'no-neighbor', title: '邻摊歇业', context: '隔壁摊主临时休息，摊前少了一块竞价牌。', ownerLine: '“少个对手不等于你就能随便抬价。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [0, 0, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'discount-cart', title: '折扣推车', context: '流动折扣车停在路口，保温杯和雨具都在促销。', ownerLine: '“隔壁在打折，你的质量和价格都得讲明白。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'online-pickup', title: '团购自提', context: '团购自提点开到街尾，部分街坊已经线上订好商品。', ownerLine: '“线上便宜，但现在就能拿走也是价值。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, -1], standardDemandDrop: 1, premiumDemandDrop: 1 },
  { id: 'premium-booth', title: '精品临展', context: '广场办了精品日用品展，愿意为品质多花钱的客人变多。', ownerLine: '“有人看品质，不代表每个人都不在意价格。”', budgetAdjustments: [2, 2, 1], demandAdjustments: [0, 0, 0], standardDemandDrop: 0, premiumDemandDrop: -1 },
  { id: 'street-vendor', title: '临时摊贩', context: '新摊贩在街角卖同类小商品，客人能直接比较价格。', ownerLine: '“别跟着别人乱降价，先算清自己能拿多少。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, -1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'repair-kiosk', title: '维修点开张', context: '手机维修点提供免费快充线试用，部分客人暂时不急着买。', ownerLine: '“有人先借用就会少买，剩下的客人再认真接待。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [0, 0, -1], standardDemandDrop: 1, premiumDemandDrop: 1 },
  { id: 'member-day', title: '会员折扣日', context: '商场会员日带来满减活动，顾客会比较摊位与商场的到手价。', ownerLine: '“满减看起来便宜，先把实际花费算给人家听。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, -1], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'local-recommendation', title: '街坊推荐', context: '老顾客在群里推荐这处寄售摊，更多人愿意停下了解。', ownerLine: '“口碑不是免检牌，今天卖出去的也得对得起人。”', budgetAdjustments: [0, 1, 0], demandAdjustments: [1, 1, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
];

export const neighborhoodVariants: readonly StallScenarioModifier[] = [
  { id: 'community-fair', title: '邻里义卖', context: '社区活动安排了邻里义卖，居民会把钱分给多家摊位。', ownerLine: '“摊多了就得比实用，别把人流当成独家生意。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, -1], standardDemandDrop: 0, premiumDemandDrop: 1 },
  { id: 'new-residents', title: '新住户搬入', context: '新住户集中搬进小区，家里还缺不少日常小物件。', ownerLine: '“新面孔多，先讲清用途和价钱，别急着推贵的。”', budgetAdjustments: [1, 1, 1], demandAdjustments: [1, 1, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'street-cleanup', title: '街道清扫', context: '街道组织清扫后重新开放步行通道，客人能靠近摊位看货。', ownerLine: '“路好走了，客人能慢慢挑，咱也不能催着买。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [1, 1, 1], standardDemandDrop: 0, premiumDemandDrop: -1 },
  { id: 'community-meeting', title: '居民议事', context: '小区开完居民议事会，街坊讨论最近的生活开支。', ownerLine: '“大家都在算日子，报价得经得起当面比较。”', budgetAdjustments: [-1, -1, -1], demandAdjustments: [0, 0, 0], standardDemandDrop: 1, premiumDemandDrop: 2 },
  { id: 'courier-pickup', title: '快递集中到站', context: '快递站通知居民集中取件，街口短时间内人流变密。', ownerLine: '“取件的人手上有包裹，别挡路，先把卖点说清。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [1, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 1 },
  { id: 'water-outage', title: '管线检修', context: '小区管线检修通知临时延期，居民仍按原计划出门采买。', ownerLine: '“消息变了就重新看客流，昨天的估计不能照搬。”', budgetAdjustments: [0, 1, 0], demandAdjustments: [0, 1, 0], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'sports-practice', title: '球场训练', context: '附近球场增加晚间训练场次，家长和队员分时经过。', ownerLine: '“人会分批来，别一开摊就把整晚销量算满。”', budgetAdjustments: [1, 0, 1], demandAdjustments: [0, 0, 1], standardDemandDrop: 0, premiumDemandDrop: 0 },
  { id: 'quiet-street', title: '街区安静日', context: '附近活动都已结束，今天街上没有额外客流。', ownerLine: '“安静日就稳着来，没卖掉的寄售货我会收回。”', budgetAdjustments: [0, 0, 0], demandAdjustments: [-1, -1, -1], standardDemandDrop: 0, premiumDemandDrop: 1 },
];
