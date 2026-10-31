import { seededPermutationAt } from '../scenarioDeck';
import type { CompanyDossierCaseType, CompanyDossierFinding, CompanyDossierState } from '../types';

export const companyDossierScenarioVersion = 2 as const;
const topicCount = 30;
const counterpartyCount = 6;
const evidenceLensCount = 6;
const timelineCount = 5;
const pressureCount = 3;
const scenarioCount = topicCount * counterpartyCount * evidenceLensCount * timelineCount * pressureCount;
const scenarioSalt = 0x43484453;

const topics = [
  { title: '沿海冷库新增仓配订单', delivery: '冷链库容与车辆排期' },
  { title: '城郊园区二期设备单', delivery: '二期设备进场清单' },
  { title: '连锁药房系统改造', delivery: '门店切换与验收批次' },
  { title: '社区光伏安装计划', delivery: '屋顶施工与并网节点' },
  { title: '物流分拨线改造', delivery: '分拣设备安装窗口' },
  { title: '医院耗材框架采购', delivery: '首批配送与科室验收' },
  { title: '旧厂节能改造', delivery: '停机检修和设备替换计划' },
  { title: '冷链车队租赁项目', delivery: '车辆交接与租期起算' },
  { title: '跨境仓储合作', delivery: '保税仓启用与货权交接' },
  { title: '工业机器人调试', delivery: '产线安装和联机测试' },
  { title: '农产品产地直采', delivery: '产区供货和分批验收' },
  { title: '新能源汽车售后网点', delivery: '网点开业和配件到货' },
  { title: '数据中心机柜扩容', delivery: '机柜交付与上架验收' },
  { title: '校园餐饮供应合同', delivery: '学期供货与抽检批次' },
  { title: '地铁配套检修订单', delivery: '夜间检修窗口和验收签字' },
  { title: '雨污分流工程服务', delivery: '分段施工与监理确认' },
  { title: '智能水表更换项目', delivery: '片区安装数量和抽查记录' },
  { title: '县域直播基地合作', delivery: '场地交付与设备调试' },
  { title: '应急发电机采购', delivery: '设备到场与负载测试' },
  { title: '港区仓单系统升级', delivery: '系统联调与客户签收' },
  { title: '电池回收处理合同', delivery: '回收量、转运单与处置凭证' },
  { title: '电商包装耗材采购', delivery: '季度需求、分批送货单' },
  { title: '水厂在线监测升级', delivery: '仪器校准和连续运行记录' },
  { title: '轻轨站点屏幕采购', delivery: '站点清单与亮屏验收' },
  { title: '冷链温控软件续约', delivery: '续约范围与服务起始日' },
  { title: '工厂安全门禁改造', delivery: '施工范围与消防联验' },
  { title: '商超配送系统扩容', delivery: '新门店上线和订单承载量' },
  { title: '光学检测设备采购', delivery: '到货验收和精度复测' },
  { title: '新材料送样验证', delivery: '样品批次与量产前置条件' },
  { title: '经销商年度返利协议', delivery: '返利门槛和实际回款周期' },
] as const;

const counterparties = ['北岸冷链', '远桥设备', '启禾供应链', '嘉衡工程', '明川系统', '顺达商贸'] as const;
const evidenceLenses = [
  { label: '签约主体', detail: '公司名称、统一代码和盖章主体是否一致' },
  { label: '金额口径', detail: '含税金额、框架上限和已执行金额是否混用' },
  { label: '验收条件', detail: '验收完成前哪些部分仍不能确认交付' },
  { label: '付款条款', detail: '账期从签约、发货还是验收后开始计算' },
  { label: '适用范围', detail: '该材料覆盖哪些地区、门店或产品批次' },
  { label: '关联供应商', detail: '二级供应商是否承担了宣传中的关键交付' },
] as const;
const timelines = [
  { name: '签约与披露', detail: '合同落款日与对外披露日相隔两周' },
  { name: '下一季度交付', detail: '主要交付节点写在下一季度' },
  { name: '验收后回款', detail: '约定验收通过后才起算付款期限' },
  { name: '附件晚于简报', detail: '关键附件的生成时间晚于路演简报' },
  { name: '年度汇总口径', detail: '台账按年度汇总，不能直接当作单笔金额' },
] as const;
const pressures = [
  '董事会希望在下次例会前更新项目口径。',
  '供应商正在催排产，销售端希望先把项目写进简报。',
  '季度预期还没有定稿，陈总要求你把已签与待验收分开。',
] as const;

export interface CompanyDossierScenario {
  index: number;
  headline: string;
  brief: string;
  recordNotes: Record<CompanyDossierFinding, readonly [string, string, string]>;
}

export function companyDossierScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), scenarioCount, seed, scenarioSalt);
}

export function companyDossierScenarioAt(index: number, caseType: CompanyDossierCaseType): CompanyDossierScenario {
  const safeIndex = ((Math.floor(index) % scenarioCount) + scenarioCount) % scenarioCount;
  const topicIndex = safeIndex % topicCount;
  const counterpartyIndex = Math.floor(safeIndex / topicCount) % counterpartyCount;
  const lensIndex = Math.floor(safeIndex / (topicCount * counterpartyCount)) % evidenceLensCount;
  const timelineIndex = Math.floor(safeIndex / (topicCount * counterpartyCount * evidenceLensCount)) % timelineCount;
  const pressureIndex = Math.floor(safeIndex / (topicCount * counterpartyCount * evidenceLensCount * timelineCount)) % pressureCount;
  const topic = topics[topicIndex]!;
  const counterparty = counterparties[counterpartyIndex]!;
  const lens = evidenceLenses[lensIndex]!;
  const timeline = timelines[timelineIndex]!;
  const pressure = pressures[pressureIndex]!;
  const filingRecord = `${counterparty} · ${topic.title}备案页`;
  const supplierRecord = `${counterparty} · ${topic.delivery}`;
  const invoiceRecord = `${counterparty} · ${topic.title}开票/回款台账`;
  const realContract: readonly [string, string, string] = [
    `${filingRecord}能检索到对应编号；重点核对${lens.detail}。时间线：${timeline.detail}。`,
    `${supplierRecord}与登记的交付范围相符；仍要区分排期、验收和实际回款。`,
    `${invoiceRecord}的发票与到账记录能按同一项目口径勾稽；${timeline.detail}。`,
  ];
  const inflatedOrder: readonly [string, string, string] = [
    `${filingRecord}没有找到路演稿声称的完整订单编号；核对${lens.detail}。`,
    `${supplierRecord}只支持阶段性供货，不能覆盖简报中的全部金额或范围。`,
    `${invoiceRecord}与宣传金额或项目范围对不上；重点核对${lens.detail}。`,
  ];
  const noCatalyst: readonly [string, string, string] = [
    `${filingRecord}没有检索到对应的新增订单；留意${lens.detail}。`,
    `${supplierRecord}没有新增项目的正式排产或验收记录。`,
    `${invoiceRecord}未发现该项目对应的新增开票或回款凭证。`,
  ];
  const unverified: readonly [string, string, string] = [
    `你只读了路演摘要，没有调取${filingRecord}原件。`,
    `你只听了口头说明，没有取得${supplierRecord}原始记录。`,
    `你只看了预测或汇总页，没有逐项核验${invoiceRecord}。`,
  ];
  const recordNotes: Record<CompanyDossierFinding, readonly [string, string, string]> = {
    CONTRACT: caseType === 'REAL_CONTRACT' ? realContract : [
      '备案中只支持部分合同内容，不能证明宣传的完整范围。', inflatedOrder[1], realContract[2],
    ],
    HYPE: inflatedOrder,
    NO_CATALYST: noCatalyst,
    UNVERIFIED: unverified,
  };

  return {
    index: safeIndex,
    headline: `${topic.title} · ${counterparty}`,
    brief: `陈总把这份项目材料推到你面前。${pressure} 当前核查切口：${lens.label}；资料时间线：${timeline.name}。`,
    recordNotes,
  };
}

export function companyDossierScenarioForRun(
  run: Pick<CompanyDossierState, 'scenarioVersion' | 'scenarioIndex' | 'caseType'>,
): CompanyDossierScenario | null {
  if (run.scenarioVersion !== companyDossierScenarioVersion || run.scenarioIndex === undefined) return null;
  return companyDossierScenarioAt(run.scenarioIndex, run.caseType);
}
