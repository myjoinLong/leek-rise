import {
  factoryCaseCountPerProfile,
  factoryContinuationBaseCase,
  factoryContinuationProfileOrder,
  type FactoryScenario,
} from './factoryScenarios';
import { seededPermutationAt } from './scenarioDeck';

interface FactoryContinuationContext {
  id: string;
  title: string;
  detail: string;
  requiresIsolation: boolean;
  managerLine: string;
}

const contexts: readonly FactoryContinuationContext[] = [
  {
    id: 'supplier-recall', title: '供应商召回',
    detail: '供应商发出批次召回，但范围只到托盘号，当前箱号无法确认；先隔离，等书面清单。',
    requiresIsolation: true,
    managerLine: '王老板把工单翻到背面：“停线记我的名字，别让你们替供应商签字。”',
  },
  {
    id: 'handoff-gap', title: '交班记录缺页',
    detail: '上一班的复测签字缺失，现有读数无法追到操作者；补齐记录前不能放行或销毁样品。',
    requiresIsolation: true,
    managerLine: '“少一张签字不是小事，但我会查交接，不把责任推给最后接手的人。”',
  },
  {
    id: 'intermittent-return', title: '间歇故障返单',
    detail: '客户报告偶发断电，一次台架通过不能排除间歇故障；先留样复测，不直接返工整批。',
    requiresIsolation: true,
    managerLine: '王老板按住退货单：“客户说得未必全对，没复现之前也不能当没看见。”',
  },
  {
    id: 'gauge-expiry', title: '量具校准到期',
    detail: '检测仪校准标签已过期，本班读数失去依据；先隔离样品，换合格量具复测。',
    requiresIsolation: true,
    managerLine: '“机器校准是厂里的责任。读数不可信，就先别让任何人替它背书。”',
  },
  {
    id: 'rush-contract', title: '客户提前验货',
    detail: '客户把验货时间提前，交期压力不改变工单判定；仍按当前证据选择放行或返工。',
    requiresIsolation: false,
    managerLine: '“我会去谈交期，质检不能为了赶时间改答案。”',
  },
  {
    id: 'material-shortage', title: '替代料申请未批',
    detail: '仓库提出用替代料补缺，但变更单还没有客户签字；不要把口头同意当成批准。',
    requiresIsolation: false,
    managerLine: '王老板看了眼欠料单：“少料我去催，没批的替代料不能算通过。”',
  },
  {
    id: 'audit-trace', title: '客户抽查追溯',
    detail: '客户要求现场调取这批记录；当前工单证据仍是质量依据，不因有人旁观而改变。',
    requiresIsolation: false,
    managerLine: '“客户来不来都按同一把尺。记录拿出来，我和你一起解释。”',
  },
  {
    id: 'wage-pressure', title: '工资结算日',
    detail: '今天要核对加班工时和产线记录；工资压力不能代替工单证据，也不能掩盖返工。',
    requiresIsolation: false,
    managerLine: '他把工时表放到检验单旁：“工钱照记录算，质量也照记录算。”',
  },
  {
    id: 'missing-sample', title: '留样编号断档',
    detail: '抽检留样盒少了一段编号，现有样品无法证明覆盖了完整批次；先隔离并补齐抽样记录。',
    requiresIsolation: true,
    managerLine: '“缺号的地方不能靠猜。我会补查抽样流程，先别让这批货出门。”',
  },
  {
    id: 'late-revision', title: '客户图纸刚更新',
    detail: '客户刚发来新版图纸，当前箱内仍夹着旧版工艺卡；核实生效批次前暂停放行。',
    requiresIsolation: true,
    managerLine: '王老板把两张图纸摊开：“版本切换是厂里的事，不能让你替流程缺口签字。”',
  },
  {
    id: 'shared-line', title: '共线订单交接',
    detail: '相邻工位刚切换到另一张订单，当前工单和实物批号能逐项对应；按证据判定即可。',
    requiresIsolation: false,
    managerLine: '“两张单挨着做最容易拿错。对完批号再签，不用替交期背额外压力。”',
  },
  {
    id: 'customer-witness', title: '客户现场见证',
    detail: '客户代表在场观察抽检，记录显示样本符合工单要求；见证本身不改变放行标准。',
    requiresIsolation: false,
    managerLine: '“有人看着也按同一套标准。数据够就放，数据不够就先留住。”',
  },
];

export const factoryContinuationContextCount = contexts.length;
export const factoryContinuationCasesPerProfile = factoryCaseCountPerProfile * factoryContinuationContextCount;
const legacyContexts = contexts.slice(0, 8);

interface FactoryYearContext {
  id: string;
  title: string;
  detail: string;
  managerLine: string;
  requiresIsolation: boolean;
}

const yearContexts: readonly FactoryYearContext[] = [
  { id: 'wage-ledger', title: '工时复核', detail: '本年度工时与批次记录分开抽查，质量判定仍以本工单为准。', managerLine: '“工时我会按记录核，质量也按这张单核。”', requiresIsolation: false },
  { id: 'supplier-audit', title: '来料追溯', detail: '供应商批次号需要与当前箱号逐一对照，缺失项先隔离。', managerLine: '“供应商的编号对不上，就先留住这箱货。”', requiresIsolation: true },
  { id: 'repair-return', title: '返修回流', detail: '返修区有同型号回流件，当前批次要核清新旧工单边界。', managerLine: '“返修货不能混进新批次，单据先分开。”', requiresIsolation: true },
  { id: 'safety-review', title: '安全复核', detail: '安全项目的签字栏需有实测数据，口头确认不能替代读数。', managerLine: '“安全签字要有数值，别让口头承诺替流程背责。”', requiresIsolation: true },
  { id: 'overtime-shift', title: '加班交接', detail: '临时加班后换了操作班组，交接记录要和眼前样品相符。', managerLine: '“加班我去协调，交接记录咱们当场对清。”', requiresIsolation: false },
  { id: 'calibration-review', title: '年度校准', detail: '检测设备刚完成年度校准，读数仍须按本工单标准判断。', managerLine: '“设备校准了不代表产品自动合格，按数据走。”', requiresIsolation: false },
  { id: 'packaging-change', title: '包装换版', detail: '包装图稿刚换版，外箱标识要与当前订单版本一致。', managerLine: '“换版信息写清楚，别让旧标签跟着新货走。”', requiresIsolation: false },
  { id: 'urgent-replenish', title: '急单补货', detail: '客户追加了补货数量，交付压力不能替代抽检结果。', managerLine: '“补货我去谈时间，检验结论照样逐项留档。”', requiresIsolation: false },
  { id: 'warranty-audit', title: '质保抽查', detail: '售后抽查关注故障批次，留样编号要能追回对应工单。', managerLine: '“抽查问到哪箱，就得能从记录里找到哪箱。”', requiresIsolation: false },
  { id: 'material-substitution', title: '材料替换', detail: '替换料已经入库，但变更审批单必须和当前批次匹配。', managerLine: '“料到了不等于批文到了，先看变更单。”', requiresIsolation: true },
  { id: 'line-cleaning', title: '清线确认', detail: '上一张订单刚清线，首件确认记录不能借用上一批的数据。', managerLine: '“清线后重新确认首件，不能复制昨天的签字。”', requiresIsolation: false },
  { id: 'customer-sample', title: '客户留样', detail: '客户要求封存一份样品，封签和抽检编号需要同时登记。', managerLine: '“样品封好、编号写齐，后面复查才有凭据。”', requiresIsolation: false },
  { id: 'storage-condition', title: '仓储复检', detail: '仓库温湿度记录出现缺口，受影响箱号先隔离复核。', managerLine: '“仓储记录缺了几段，相关箱号先别放行。”', requiresIsolation: true },
  { id: 'supplier-deadline', title: '供应商催款', detail: '供应商催着结款，财务时限不改变来料与成品标准。', managerLine: '“催款我去回，质检不替结款速度改标准。”', requiresIsolation: false },
  { id: 'new-inspector', title: '新人跟岗', detail: '新检验员正在学习留档，判定理由需要写到工单上。', managerLine: '“把理由写完整，教会新人比催他快点更重要。”', requiresIsolation: false },
  { id: 'batch-boundary', title: '批次边界', detail: '相邻批次共用一条传送带，当前箱号要和工单再次核对。', managerLine: '“传送带能共用，批次号不能串。”', requiresIsolation: false },
  { id: 'machine-retrofit', title: '设备改造', detail: '一台旧设备刚完成改造，本批读数仍须与校准记录逐项核对。', managerLine: '“改造是厂里的事，合格与否还是看这次数据。”', requiresIsolation: false },
];

const cycleContexts: readonly FactoryYearContext[] = [
  { id: 'shift-shortage', title: '临时缺岗', detail: '本班少一名复核员，未经复核的样品先留在工位。', managerLine: '“缺人我来协调，没人复核的货不能先走。”', requiresIsolation: true },
  { id: 'trace-audit', title: '追溯抽查', detail: '抽查员随机核对箱号和签字，缺一项就要暂缓放行。', managerLine: '“追溯记录没对上，先暂停，我来补查流程。”', requiresIsolation: true },
  { id: 'rush-restock', title: '紧急补单', detail: '客户补单要求加快备货，但新增数量仍按原检验标准执行。', managerLine: '“补单我去谈，不能把赶货当成放行证。”', requiresIsolation: false },
  { id: 'warehouse-move', title: '仓库换位', detail: '成品区正在调整货位，箱号与存放位置要重新绑定。', managerLine: '“货位变了就更新记录，别让箱子失去来路。”', requiresIsolation: false },
  { id: 'sample-recheck', title: '留样复测', detail: '上批留样出现差异，本批抽样要独立编号并封存。', managerLine: '“上一批的结果只作线索，这一批重新测。”', requiresIsolation: false },
  { id: 'power-outage', title: '短时停电', detail: '昨晚短时停电，受影响设备的校验状态需先核实。', managerLine: '“停电记录我去查，设备状态不清就先别放行。”', requiresIsolation: true },
  { id: 'label-reprint', title: '标签补印', detail: '打印机故障后标签补印过一次，版本号必须与订单一致。', managerLine: '“补印不是问题，版本不对才是问题。”', requiresIsolation: false },
  { id: 'customer-visit', title: '客户驻厂', detail: '客户代表现场旁观，判定依据和操作前提示保持一致。', managerLine: '“客户在不在都按同一套证据说话。”', requiresIsolation: false },
  { id: 'line-balance', title: '产线平衡', detail: '工序调整了先后顺序，抽检仍须覆盖当前箱内的实际产品。', managerLine: '“换了顺序就重新确认，不把旧流程套上来。”', requiresIsolation: false },
  { id: 'seal-damage', title: '封签异常', detail: '一批样品封签有破损，相关箱号先隔离并补做记录。', managerLine: '“封签破了先停住，查清楚再决定下一步。”', requiresIsolation: true },
  { id: 'tool-share', title: '量具共享', detail: '隔壁工位借用量具后尚未归还，当前检测先核验设备编号。', managerLine: '“工具借走了就查编号，别拿错量具出结论。”', requiresIsolation: false },
  { id: 'shift-change', title: '换班高峰', detail: '两班交接重叠，上一班未签完的项目不能默认通过。', managerLine: '“没签完的我接着查，不会算到你头上。”', requiresIsolation: true },
  { id: 'carton-shortage', title: '纸箱短缺', detail: '临时换用备用纸箱，标签和装箱清单需重新核对。', managerLine: '“包装可以换，订单和标签得匹配。”', requiresIsolation: false },
  { id: 'complaint-review', title: '投诉复盘', detail: '售后投诉进入复盘，本批相关项目增加留样记录。', managerLine: '“投诉要查原因，不先找个人背锅。”', requiresIsolation: false },
  { id: 'supplier-visit', title: '供应商驻场', detail: '供应商工程师在场解释材料变更，最终判定仍看审批文件。', managerLine: '“解释我听，签过的变更单才算数。”', requiresIsolation: false },
  { id: 'night-delivery', title: '夜间出货', detail: '物流车提前到厂，出货时间不改变放行门槛。', managerLine: '“车等着我去沟通，合格记录一项也不能省。”', requiresIsolation: false },
  { id: 'first-article', title: '首件复核', detail: '新工位首件尚未完成双人签核，相关箱号先留待复核。', managerLine: '“首件签全之前，我不让整批跟着冒险。”', requiresIsolation: true },
  { id: 'overtime-limit', title: '加班时限', detail: '本班接近加班时限，超时项目应记录并安排复核。', managerLine: '“时间我记在排班上，不让人靠硬撑换质量。”', requiresIsolation: false },
  { id: 'batch-split', title: '批次拆分', detail: '客户把订单拆成两次交付，当前箱号要归到正确子批次。', managerLine: '“拆单不拆证据，箱号和子批次写清楚。”', requiresIsolation: false },
];

export function factoryContinuationScenarioForDay(day: number, step: number, seed: number, version: 3 | 4 | 5 = 4): FactoryScenario {
  const safeDay = Math.max(31, Math.floor(day));
  const profile = factoryContinuationProfileOrder(safeDay, seed)[Math.max(0, Math.min(2, Math.floor(step)))]!;
  const profileSalt = profile === 'TRACE' ? 0xFAC931 : profile === 'PACKING' ? 0xFAC932 : 0xFAC933;
  const contextPool = version === 3 ? legacyContexts : contexts;
  const casesPerProfile = factoryCaseCountPerProfile * contextPool.length;
  const combination = seededPermutationAt(safeDay - 31, casesPerProfile, seed, profileSalt);
  const caseIndex = combination % factoryCaseCountPerProfile;
  const context = contextPool[Math.floor(combination / factoryCaseCountPerProfile)]!;
  const base = factoryContinuationBaseCase(profile, caseIndex);
  const cadenceMonth = Math.floor((safeDay - 31) / 30);
  const yearContext = version === 5 ? yearContexts[cadenceMonth % yearContexts.length]! : null;
  const cycleContext = version === 5
    ? cycleContexts[Math.floor(cadenceMonth / yearContexts.length) % cycleContexts.length]!
    : null;
  const correctChoice = yearContext?.requiresIsolation || cycleContext?.requiresIsolation || context.requiresIsolation
    ? 'HOLD'
    : base.correctChoice;
  const extraTitle = [yearContext?.title, cycleContext?.title].filter((title): title is string => title !== undefined).join(' · ');
  const extraClue = [yearContext?.detail, cycleContext?.detail].filter((detail): detail is string => detail !== undefined).join(' ');
  const extraVoice = [yearContext?.managerLine, cycleContext?.managerLine].filter((line): line is string => line !== undefined).join(' ');

  return {
    ...base,
    id: `factory-v${version === 5 ? 5 : 3}-${base.caseId}-${context.id}${yearContext ? `-${yearContext.id}-${cycleContext?.id}` : ''}`,
    title: `${base.title} · ${context.title}${extraTitle ? ` · ${extraTitle}` : ''}`,
    clue: `${base.clue} ${context.detail}${extraClue ? ` ${extraClue}` : ''}`,
    correctChoice,
    managerLine: extraVoice ? `${context.managerLine} ${extraVoice}` : context.managerLine,
  };
}
