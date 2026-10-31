import { seededPermutationAt } from './scenarioDeck';

export interface PhoneFlipMarketContext {
  id: string;
  title: string;
  sellerSituation: string;
  appraiserLine: string;
  askingDelta: number;
  bargainDelta: number;
  repairDelta: number;
}

export const phoneFlipMarketContexts: readonly PhoneFlipMarketContext[] = [
  { id: 'campus-move', title: '毕业搬家季', sellerSituation: '附近毕业生集中搬家，几家回收铺都在收同款', appraiserLine: '“同款出货变多，卖家挂牌价松了，但整备不能跟着省。”', askingDelta: -15, bargainDelta: -8, repairDelta: 0 },
  { id: 'rent-week', title: '交租周转', sellerSituation: '卖家赶在交租前处理闲置，想尽快拿到现金', appraiserLine: '“着急不等于机器有问题，报价和验机还是分开算。”', askingDelta: -25, bargainDelta: -15, repairDelta: 10 },
  { id: 'live-promo', title: '商圈换机活动', sellerSituation: '商圈正在办换机活动，热门型号的问价变多了', appraiserLine: '“问价多不等于一定能卖掉，别把热闹直接算成利润。”', askingDelta: 20, bargainDelta: 15, repairDelta: 0 },
  { id: 'parts-backlog', title: '维修铺排队', sellerSituation: '合作维修铺积压了工单，常用配件要多等几天', appraiserLine: '“维修排期会占现金。先把整备成本和周转时间算进来。”', askingDelta: 0, bargainDelta: -10, repairDelta: 30 },
  { id: 'nearby-sale', title: '隔壁店促销', sellerSituation: '隔壁回收店本周降价清货，附近卖家都在比价', appraiserLine: '“同行低价会压转售价，别只盯着收购时省了多少。”', askingDelta: -30, bargainDelta: 12, repairDelta: 15 },
  { id: 'school-season', title: '开学换机潮', sellerSituation: '开学前家长和学生来问旧机抵价，成色好的更抢手', appraiserLine: '“需求起来了，报价也会抬；你要留意现金占用。”', askingDelta: 15, bargainDelta: 8, repairDelta: 5 },
  { id: 'rainy-week', title: '连雨慢市', sellerSituation: '连着下雨，街上客流少，卖家不想再跑第二趟', appraiserLine: '“客流慢，库存就更难周转。低进价也要留出等买家的余地。”', askingDelta: -10, bargainDelta: -20, repairDelta: 20 },
  { id: 'post-festival', title: '节后清库', sellerSituation: '节后几家店都在清理旧款，配件商也有一批现货', appraiserLine: '“清库价看着舒服，还是要按这台机器自己的状态落账。”', askingDelta: -20, bargainDelta: -5, repairDelta: 0 },
  { id: 'trade-in-week', title: '以旧换新周', sellerSituation: '商场回收柜台临时扩容，同型号旧机挂牌数增加', appraiserLine: '“货多让收购价松一点，成色和维修账仍得逐台核。”', askingDelta: -12, bargainDelta: -4, repairDelta: 8 },
  { id: 'repair-queue', title: '维修台排号', sellerSituation: '合作维修铺改成预约排号，整备设备要多等一个班次', appraiserLine: '“收购价和维修排期都写在单上，别把占用时间当成免费。”', askingDelta: 12, bargainDelta: 0, repairDelta: 20 },
];

export const phoneFlipYearContexts: readonly PhoneFlipMarketContext[] = [
  { id: 'rent-renewal', title: '年度续租', sellerSituation: '几家回收铺刚续租，店主更看重库存周转', appraiserLine: '“租金变化已经计入挂牌和整备估价，别只看进价。”', askingDelta: -8, bargainDelta: -4, repairDelta: 0 },
  { id: 'campus-return', title: '校园返校', sellerSituation: '学生返校前集中处理旧设备，型号相近但成色不一', appraiserLine: '“同型号多不代表状态相同，逐台验机再报价。”', askingDelta: 5, bargainDelta: 2, repairDelta: 0 },
  { id: 'repair-parts-up', title: '配件涨价', sellerSituation: '常用维修配件价格上调，整备成本比上季更高', appraiserLine: '“修理费变了，预估利润要跟着重新算。”', askingDelta: 0, bargainDelta: -3, repairDelta: 12 },
  { id: 'trade-in-subsidy', title: '换新补贴季', sellerSituation: '官方换新补贴吸引卖家集中出货，旧机供给增加', appraiserLine: '“供给变多会压价，热闹本身不能当成交保证。”', askingDelta: -12, bargainDelta: -4, repairDelta: 0 },
  { id: 'holiday-travel', title: '假期出行', sellerSituation: '假期前有人急着回笼路费，也有人提前换机', appraiserLine: '“急售和换机都影响报价，先看当前这台的证据。”', askingDelta: 6, bargainDelta: 3, repairDelta: 0 },
  { id: 'screen-shortage', title: '屏幕缺货', sellerSituation: '合作维修点屏幕库存不足，等待时间也要算进周转', appraiserLine: '“缺货会占住现金，整备利润不能只看账面差价。”', askingDelta: 0, bargainDelta: 0, repairDelta: 18 },
  { id: 'market-clearance', title: '门店清库', sellerSituation: '附近门店清理旧款，二手买家有了更多比较选择', appraiserLine: '“隔壁降价会影响转手，不是让你跳过验机。”', askingDelta: -10, bargainDelta: -2, repairDelta: 0 },
  { id: 'camera-demand', title: '拍摄需求升温', sellerSituation: '本地活动多，买家更常问相机状态和镜头功能', appraiserLine: '“问得多不等于一定成交，摄像功能要现场核实。”', askingDelta: 8, bargainDelta: 1, repairDelta: 4 },
  { id: 'battery-return', title: '电池质保回访', sellerSituation: '电池售后回访增加，买家开始追问健康度和更换记录', appraiserLine: '“电池数据和外观分别看，不能用一个好消息盖住另一个。”', askingDelta: -2, bargainDelta: 2, repairDelta: 10 },
  { id: 'freight-delay', title: '物流延迟', sellerSituation: '外地二手货到店变慢，当前同款现货更受关注', appraiserLine: '“现货有周转价值，但成色和售后仍要明码算。”', askingDelta: 10, bargainDelta: 2, repairDelta: 0 },
  { id: 'school-fees', title: '学费周转', sellerSituation: '开学缴费让几位卖家希望尽快成交，议价更直接', appraiserLine: '“对方急用钱不代表机器没风险，价格和故障分开谈。”', askingDelta: -6, bargainDelta: -8, repairDelta: 0 },
  { id: 'warranty-policy', title: '质保规则调整', sellerSituation: '平台更新了二手机质保说明，缺少凭证的货更难出手', appraiserLine: '“保修凭证影响转售价，来源和维修记录都得问清。”', askingDelta: -4, bargainDelta: 0, repairDelta: 4 },
  { id: 'rainy-commute', title: '连雨通勤', sellerSituation: '连续降雨后进液咨询变多，买家对接口状态更谨慎', appraiserLine: '“雨天痕迹要仔细查，进液风险不能按外观折价完事。”', askingDelta: -7, bargainDelta: -1, repairDelta: 12 },
  { id: 'new-model-launch', title: '新机发布', sellerSituation: '新款上市后旧机报价下调，卖家正在重新比较渠道', appraiserLine: '“新品会影响旧机行情，别沿用上季的转售价。”', askingDelta: -14, bargainDelta: -4, repairDelta: 0 },
  { id: 'shop-renovation', title: '门店装修', sellerSituation: '回收铺装修期间仓位减少，店主暂时不愿压太多库存', appraiserLine: '“现金占用比平常更紧，先把最差周转情形算出来。”', askingDelta: -3, bargainDelta: -5, repairDelta: 0 },
  { id: 'used-market-fair', title: '旧机集市', sellerSituation: '街区举办旧机集市，卖家多、买家也更容易比价', appraiserLine: '“集市把选择变多了，出价要留出竞争空间。”', askingDelta: -5, bargainDelta: -2, repairDelta: 2 },
  { id: 'community-lease', title: '社区摊位续租', sellerSituation: '社区回收摊位调整了租期，店主在重新盘算压货时间', appraiserLine: '“摊位成本变了，周转时间也要放进估值里。”', askingDelta: -4, bargainDelta: -3, repairDelta: 0 },
];

export const phoneFlipCycleContexts: readonly PhoneFlipMarketContext[] = [
  { id: 'weekend-traffic', title: '周末客流', sellerSituation: '周末到店买家变多，成色好的机型更容易被比较', appraiserLine: '“人多只能说明选择多，不能当成卖出的保证。”', askingDelta: 4, bargainDelta: 1, repairDelta: 0 },
  { id: 'bulk-listing', title: '同款集中挂牌', sellerSituation: '线上出现一批同型号挂牌，转售价需要留出议价空间', appraiserLine: '“同款供给上来了，按当前挂牌重新算转手价。”', askingDelta: -7, bargainDelta: -2, repairDelta: 0 },
  { id: 'repair-labor', title: '维修工时调整', sellerSituation: '合作维修点调整工时费，整备周期和费用都变了', appraiserLine: '“维修工时有变化，报价前把真实成本填进去。”', askingDelta: 0, bargainDelta: 1, repairDelta: 8 },
  { id: 'cash-counter', title: '柜台现金紧', sellerSituation: '店里要留现金支付日常开支，收货量暂时收紧', appraiserLine: '“进价占住现金，卖得慢时会影响下一单周转。”', askingDelta: -3, bargainDelta: -5, repairDelta: 0 },
  { id: 'gift-season', title: '礼品季换机', sellerSituation: '节日前有人换新机，旧机挂牌量和成色差异都增加', appraiserLine: '“换机潮有供给也有需求，别只看其中一边。”', askingDelta: 5, bargainDelta: 2, repairDelta: 0 },
  { id: 'parts-ration', title: '配件限量', sellerSituation: '合作商限制每店配件数量，整备方案需要提前算成本', appraiserLine: '“配件数量有限，别用尚未确认的维修价做利润。”', askingDelta: 0, bargainDelta: 0, repairDelta: 10 },
  { id: 'online-coupon', title: '平台优惠券', sellerSituation: '线上平台发出回收券，部分买家会拿补贴价来比较', appraiserLine: '“补贴价不一定可兑现，按真实到手价比较。”', askingDelta: -6, bargainDelta: -1, repairDelta: 0 },
  { id: 'travel-return', title: '返程出货', sellerSituation: '返程客集中处理备用设备，卖家约定当面验机', appraiserLine: '“约得急也照样验账号、接口和电池。”', askingDelta: -2, bargainDelta: 2, repairDelta: 0 },
  { id: 'screen-inspection', title: '屏幕检测升级', sellerSituation: '维修点更新屏幕检测设备，压痕和残影更容易被识别', appraiserLine: '“检查能力变强了，发现的问题要重新计入估价。”', askingDelta: -3, bargainDelta: 0, repairDelta: 5 },
  { id: 'storage-clearance', title: '仓库清理', sellerSituation: '仓库整理出一批旧款，门店给同类设备加了促销', appraiserLine: '“清货会影响转售价，别拿上月成交价硬套。”', askingDelta: -9, bargainDelta: -2, repairDelta: 0 },
  { id: 'holiday-delivery', title: '节前快递拥堵', sellerSituation: '节前物流变慢，外地收货的周转周期拉长', appraiserLine: '“货款压得更久，库存成本也要算进来。”', askingDelta: -1, bargainDelta: -2, repairDelta: 0 },
  { id: 'repair-warranty', title: '维修质保延长', sellerSituation: '维修点延长了整备质保，报价中需核对适用范围', appraiserLine: '“质保有范围，不能把它当成所有故障都兜底。”', askingDelta: 1, bargainDelta: 1, repairDelta: 6 },
  { id: 'trade-show', title: '数码展后', sellerSituation: '数码展结束后新机优惠增加，旧机卖家开始调整预期', appraiserLine: '“新机价格动了，旧机转售价也要按今天行情估。”', askingDelta: -11, bargainDelta: -3, repairDelta: 0 },
  { id: 'community-repair', title: '社区检修日', sellerSituation: '社区检修活动带来更多故障咨询，修理成本差异变大', appraiserLine: '“咨询多不代表每台都要修，按实测故障算。”', askingDelta: 0, bargainDelta: 0, repairDelta: 9 },
  { id: 'seller-fee', title: '平台服务费调整', sellerSituation: '线上转售服务费调整，预计到手价低于挂牌价', appraiserLine: '“挂牌价不是到手价，平台成本要在账上扣出来。”', askingDelta: -4, bargainDelta: 2, repairDelta: 0 },
  { id: 'battery-check', title: '电池检测排队', sellerSituation: '电池检测要排队，未核实续航的设备占用时间更长', appraiserLine: '“没测完的续航先按未知处理，别按健康电池估值。”', askingDelta: -2, bargainDelta: 0, repairDelta: 7 },
  { id: 'shop-relocation', title: '门店搬迁', sellerSituation: '合作店准备搬迁，近期只收能快速周转的型号', appraiserLine: '“快速周转有价值，但买入价也得承受得住。”', askingDelta: -5, bargainDelta: -3, repairDelta: 0 },
  { id: 'new-buyer', title: '新渠道试运营', sellerSituation: '新转售渠道开始试运营，型号受众还没有稳定数据', appraiserLine: '“新渠道的报价只是参考，不能把试运营当确定买家。”', askingDelta: 3, bargainDelta: 0, repairDelta: 0 },
  { id: 'service-backlog', title: '售后积压', sellerSituation: '售后点积压了一批维修单，整备后的交付时间可能变长', appraiserLine: '“维修排队会延长压货时间，先看现金能否周转。”', askingDelta: -1, bargainDelta: 1, repairDelta: 11 },
];

export function phoneFlipMarketContextAt(
  position: number,
  seed: number,
  salt: number,
  contexts: readonly PhoneFlipMarketContext[] = phoneFlipMarketContexts,
): { index: number; context: PhoneFlipMarketContext } {
  const safePosition = Math.max(0, Math.floor(position));
  const index = seededPermutationAt(safePosition % contexts.length, contexts.length, seed, salt);
  return { index, context: contexts[index]! };
}
