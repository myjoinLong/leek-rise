import type { BikeRepairPart, BikeRepairStep } from './zhengBikeRepairTypes';
import { encounterIndex, seededPermutationAt, seededShuffle } from './scenarioDeck';

export interface BikeRepairCase {
  id: string;
  title: string;
  customerName: string;
  customerContext: string;
  symptom: string;
  faultyPart: BikeRepairPart;
  diagnostic: string;
  workshopLine?: string;
  testLimit?: number;
  warrantyProofRequired?: boolean;
}

interface FailurePattern {
  id: string;
  title: string;
  symptom: string;
  diagnostic: string;
}

const customers = [
  { id: 'rider', name: '夜班骑手阿拓', context: '阿拓把车停在门口，下一趟夜单还有半小时出发。' },
  { id: 'vendor', name: '菜摊老板罗姨', context: '罗姨刚进完货，想先确认故障再决定是否换件。' },
  { id: 'student', name: '夜校学徒小梁', context: '小梁刚下课赶来，想弄清这是旧件老化还是使用不当。' },
] as const;

const continuationContexts = [
  { id: 'warranty-ledger', title: '返修留档', customerLine: '这台车上周返过一次，客户把旧单据也带来了', workshopLine: '郑师傅翻开返修本：“这次把检测数值写上，修对了才给质保质量奖。”', testLimit: 1, warrantyProofRequired: true },
  { id: 'night-handover', title: '夜班交接', customerLine: '夜班骑手马上接单，交车时另一位师傅会复核工单', workshopLine: '“人要换班，判断不能只留在嘴上。需要质保奖就先把故障测出来。”', testLimit: 1, warrantyProofRequired: true },
  { id: 'shared-meter', title: '共用检测仪', customerLine: '隔壁工位也在排查故障，这张单最多借用检测仪两次', workshopLine: '“先挑最能缩小范围的一项测，工具空出来还要给隔壁用。”', testLimit: 2, warrantyProofRequired: false },
  { id: 'insurance-review', title: '保险复核', customerLine: '这台车要走保险报修，客户要求把故障依据附在维修单后', workshopLine: '“保险单要有检测记录。没证据我照样修，但质量奖不能按已核实结。”', testLimit: 1, warrantyProofRequired: true },
  { id: 'courier-rush', title: '配送催单', customerLine: '配送站催着取车，症状已经现场复现，检测台只剩一个空档', workshopLine: '郑师傅看了眼排队的人：“时间紧也别乱换件，测一项再决定。”', testLimit: 1, warrantyProofRequired: false },
  { id: 'community-audit', title: '社区回访', customerLine: '社区服务点在回访上月修过的车辆，客户想知道故障有没有复发', workshopLine: '“回访单要能对得上原症状。测准并留档，这笔质量奖才算数。”', testLimit: 2, warrantyProofRequired: true },
  { id: 'parts-shortage', title: '配件紧张', customerLine: '常用配件还在路上，若换错部件，车辆今天就无法交付', workshopLine: '“现在没多余配件给我们试错，先用检测把范围缩小。”', testLimit: 2, warrantyProofRequired: false },
  { id: 'apprentice-audit', title: '学徒跟班', customerLine: '维修学徒正在旁听，郑师傅要求把判断依据讲清楚', workshopLine: '“我带徒弟时也犯过凭感觉换件的错。今天把证据留给他看。”', testLimit: 1, warrantyProofRequired: true },
  { id: 'fleet-inspection', title: '车队集中复检', customerLine: '配送站把同批次车辆送来复检，客户要求工单能逐项追溯', workshopLine: '“车队后面还有车等着，但检测结论要写进单子里。”', testLimit: 2, warrantyProofRequired: true },
  { id: 'wet-road-return', title: '雨后返场', customerLine: '车辆淋雨后出现间歇问题，客户想确认是否和上次维修有关', workshopLine: '“先复现故障再定责任，不能因为返场就默认换件。”', testLimit: 2, warrantyProofRequired: false },
  { id: 'warranty-deadline', title: '质保截止前复核', customerLine: '质保期今天到期，客户带来了上次的维修凭证和行驶记录', workshopLine: '郑师傅核对旧工单：“凭证齐不齐，决定这次质量奖能不能算。”', testLimit: 1, warrantyProofRequired: true },
  { id: 'tool-calibration', title: '检测仪校准日', customerLine: '检测台刚完成校准，工单要求留一项有效读数作为维修凭据', workshopLine: '“新校准的仪器先测关键项，数字和故障部件都写进工单。”', testLimit: 1, warrantyProofRequired: true },
] as const;
const legacyContinuationContexts = continuationContexts.slice(0, 8);
const yearContexts = [
  { id: 'warranty-audit', title: '年度质保抽查', detail: '本年度售后会抽查返修凭证。', testLimit: 1, warrantyProofRequired: true },
  { id: 'fleet-route', title: '车队集中保养', detail: '配送车队分批进场，优先检查最能排除安全风险的部件。', testLimit: 1, warrantyProofRequired: false },
  { id: 'rainy-season', title: '雨季回访', detail: '近期雨天返修较多，接头和制动痕迹需要留档。', testLimit: 2, warrantyProofRequired: true },
  { id: 'night-shift', title: '夜班交车', detail: '车辆要赶在夜班前交付，检测机会只够做一项。', testLimit: 1, warrantyProofRequired: false },
  { id: 'parts-inventory', title: '配件盘点', detail: '月底盘点期间，换件前需要留下故障依据。', testLimit: 2, warrantyProofRequired: true },
  { id: 'battery-recall', title: '电池批次核验', detail: '电池供应批次正在追溯，相关凭证需附在工单后。', testLimit: 1, warrantyProofRequired: true },
  { id: 'brake-safety', title: '制动专项复查', detail: '本期复查关注制动安全，测量记录需可复核。', testLimit: 2, warrantyProofRequired: true },
  { id: 'controller-update', title: '控制器版本变更', detail: '控制器固件刚更新，报码不能只靠重启消除。', testLimit: 2, warrantyProofRequired: false },
  { id: 'warranty-renewal', title: '质保续签', detail: '合作车队续签质保，处理结果需关联旧工单。', testLimit: 1, warrantyProofRequired: true },
  { id: 'community-day', title: '社区检修日', detail: '社区集中检修排队较长，检查顺序要先说清楚。', testLimit: 2, warrantyProofRequired: false },
  { id: 'tool-sharing', title: '工具跨店借用', detail: '检测仪稍后要借给隔壁门店，当前只能测两项。', testLimit: 2, warrantyProofRequired: false },
  { id: 'return-claim', title: '旧件索赔', detail: '客户申请旧件索赔，确认故障后要保留检测记录。', testLimit: 2, warrantyProofRequired: true },
  { id: 'heat-wave', title: '高温巡检', detail: '高温天气让电池和控制器负荷升高，按症状选检查项。', testLimit: 2, warrantyProofRequired: false },
  { id: 'safety-briefing', title: '安全培训复核', detail: '新员工跟班学习，维修结论需能从记录中复述。', testLimit: 1, warrantyProofRequired: true },
  { id: 'supplier-delay', title: '配件延迟到货', detail: '常用配件未到，误拆会延误交车，先缩小故障范围。', testLimit: 2, warrantyProofRequired: false },
  { id: 'insurance-file', title: '保险资料补录', detail: '本单要补保险资料，检测依据必须和维修部件对应。', testLimit: 1, warrantyProofRequired: true },
  { id: 'motor-heat', title: '电机温升回访', detail: '近期有电机过热返修，负载测试需和本次故障部件对应。', testLimit: 2, warrantyProofRequired: true },
] as const;
const cycleContexts = [
  { id: 'queue-overflow', title: '工位排队', detail: '工位排队较长，先挑最能排除安全问题的一项检测。', testLimit: 1, warrantyProofRequired: false },
  { id: 'return-customer', title: '熟客返修', detail: '熟客带来旧工单，新的症状不能直接沿用旧结论。', testLimit: 2, warrantyProofRequired: true },
  { id: 'rain-check', title: '淋雨复检', detail: '车辆刚经历降雨，插头与线束状态需要留在本单记录。', testLimit: 1, warrantyProofRequired: true },
  { id: 'battery-charge', title: '电池补电', detail: '电池刚补过电，静态电量不能代替负载检测。', testLimit: 2, warrantyProofRequired: false },
  { id: 'insurance-photo', title: '保险拍照', detail: '保险人员需要维修前照片，故障证据要先拍照留档。', testLimit: 1, warrantyProofRequired: true },
  { id: 'delivery-window', title: '配送窗口', detail: '车主有配送时限，开始检测前要先说明可检查的范围。', testLimit: 1, warrantyProofRequired: false },
  { id: 'used-part', title: '旧件回收', detail: '客户希望留回旧件，拆下前要确认故障并标注部件。', testLimit: 2, warrantyProofRequired: true },
  { id: 'apprentice-question', title: '学徒提问', detail: '学徒会按记录复述判断过程，检测与维修步骤要对齐。', testLimit: 2, warrantyProofRequired: false },
  { id: 'fleet-deadline', title: '车队交车', detail: '车队要分批领车，工单需明确哪一项尚未核实。', testLimit: 1, warrantyProofRequired: true },
  { id: 'tool-calibration', title: '工具校验', detail: '检测工具刚核过校准标签，数值仍要对应正确部件。', testLimit: 2, warrantyProofRequired: true },
  { id: 'parts-arrive', title: '配件到货', detail: '常用配件刚到店，避免为了用掉库存而提前换件。', testLimit: 2, warrantyProofRequired: false },
  { id: 'noise-repeat', title: '异响复现', detail: '客户带来录音但故障未必持续，先复现再按读数下结论。', testLimit: 1, warrantyProofRequired: false },
  { id: 'claim-recheck', title: '索赔复核', detail: '旧索赔单需要补检测过程，单据结论不能替代当前读数。', testLimit: 2, warrantyProofRequired: true },
  { id: 'shop-sharing', title: '门店共用台', detail: '检测台马上要交给隔壁工位，先告知客户本单检查上限。', testLimit: 1, warrantyProofRequired: false },
  { id: 'safety-campaign', title: '安全宣传周', detail: '社区宣传关注骑行安全，制动结论需要有明确测量记录。', testLimit: 2, warrantyProofRequired: true },
  { id: 'old-invoice', title: '旧单据补录', detail: '客户找回以前的维修票据，本次故障仍需单独定位。', testLimit: 2, warrantyProofRequired: false },
  { id: 'weather-cold', title: '低温晨检', detail: '低温影响电池负载表现，说明检测条件后再解读结果。', testLimit: 1, warrantyProofRequired: true },
  { id: 'parts-backorder', title: '配件待补', detail: '关键配件仍在路上，先确定故障范围再安排交车时间。', testLimit: 2, warrantyProofRequired: false },
  { id: 'handover-signature', title: '交车签字', detail: '客户要求逐项签收，未经检测的部件要明确标为未验证。', testLimit: 1, warrantyProofRequired: true },
] as const;
const continuationPartSalt: Readonly<Record<BikeRepairPart, number>> = {
  BATTERY: 0x2E6701, BRAKES: 0x2E6702, CONTROLLER: 0x2E6703,
};
const repairParts: readonly BikeRepairPart[] = ['BATTERY', 'BRAKES', 'CONTROLLER'];

const failures: Readonly<Record<BikeRepairPart, readonly FailurePattern[]>> = {
  BATTERY: [
    { id: 'load-sag', title: '满格却跑不远', symptom: '仪表刚开机显示满格，一拧转把电量就掉两格；松开后又弹回来。', diagnostic: '负载电压快速下坠，电池组压差超出正常范围' },
    { id: 'charge-cutoff', title: '充电总在半路停', symptom: '充电器工作一会儿就转绿灯，拔插后又能继续充一阵。', diagnostic: '充电末段电压提前触顶，电池组容量衰减明显' },
    { id: 'cold-range', title: '降温后续航腰斩', symptom: '天气转凉后续航突然减少，停车暖一会儿又能多跑几公里。', diagnostic: '多节电芯内阻偏高，低温负载能力不足' },
    { id: 'park-drain', title: '停一夜就掉电', symptom: '昨晚充满后没有骑行，今早出门前电量已经少了三格。', diagnostic: '静置电压持续下滑，电池组存在异常自放电' },
    { id: 'connector-heat', title: '插头附近发烫', symptom: '骑一段路后电池插头摸起来烫手，偶尔还会闻到塑料味。', diagnostic: '电池输出端接触电阻过大，负载时局部温升异常' },
    { id: 'range-meter', title: '电量显示乱跳', symptom: '平路骑行时电量从四格跳到一格，关机重启又恢复三格。', diagnostic: '电池组各串电芯电压不一致，仪表估算值失真' },
    { id: 'water-pack', title: '雨后无法稳定供电', symptom: '淋雨后第一次启动正常，骑过积水路段就突然断电。', diagnostic: '电池仓内有潮湿痕迹，输出保护在震动后间歇触发' },
    { id: 'charge-overheat', title: '充电时外壳发热', symptom: '充电到后半程电池外壳明显变热，风扇声也比以前更大。', diagnostic: '充电过程中单体温升不均，电池组热保护提前介入' },
    { id: 'hill-cut', title: '上坡时突然熄火', symptom: '平路还能正常骑，一上长坡就断电；推下坡后又能启动。', diagnostic: '高负载下电池电压跌破控制器保护阈值' },
    { id: 'old-pack', title: '备用电池也不耐用', symptom: '换上闲置半年的备用电池后，车能启动但跑不了多久就报警。', diagnostic: '电池组长期闲置后容量衰减，单体一致性已变差' },
    { id: 'cell-lag', title: '电量过半就突然掉速', symptom: '电量显示还有三格，载人起步时速度却明显发闷，卸载后恢复。', diagnostic: '其中一组电芯负载压降异常，整组电池被保护阈值拖住' },
    { id: 'port-loose', title: '挪动电池就断电', symptom: '电池锁上后骑行正常，过坑时车会熄火；重新压紧电池又能启动。', diagnostic: '电池输出座触点磨损，震动时正极接触不连续' },
    { id: 'bms-current', title: '急加速后要等一会儿', symptom: '急加速后电机立刻断电，等几分钟再开机又能短暂骑行。', diagnostic: '电池管理板过流保护动作，电芯本身仍能保持静置电压' },
    { id: 'capacity-loss', title: '换过电池还是跑不远', symptom: '电池更换不到半年，日常短途尚可，连续配送时续航很快见底。', diagnostic: '替换电池的可用容量低于标称，持续放电测试提前到达截止电压' },
    { id: 'charge-rebound', title: '充完电静置后掉格', symptom: '充电结束立刻显示满格，停放一小时后电量稳定落到七成左右。', diagnostic: '充电后电压回落幅度过大，电芯容量与内阻状态不一致' },
    { id: 'charge-socket', title: '充电头要斜着插', symptom: '充电插头正着插没有指示灯，往一边掰时才开始充电。', diagnostic: '电池充电口内部焊点松脱，插头受力时才接通' },
    { id: 'cargo-sag', title: '带货上坡反复保护', symptom: '空车爬坡正常，装上两箱货后爬到一半仪表就断电重启。', diagnostic: '满载电流下单体压差迅速扩大，电池管理板触发欠压保护' },
    { id: 'idle-recover', title: '停几分钟又能继续骑', symptom: '骑到一半突然没力，停车喝口水再启动，短距离内又恢复正常。', diagnostic: '电池组温度与负载电压共同触发保护，静置后暂时解除' },
    { id: 'early-full', title: '充电器总是提前变绿', symptom: '充电器显示已满，但车上电量只有五格；换另一只充电器也一样。', diagnostic: '电池组中一节电芯先达到充电上限，整组被迫提前停止充电' },
    { id: 'cold-charge', title: '低温时充电特别慢', symptom: '室外充电几小时进度不动，推到室内回暖后充电速度才恢复。', diagnostic: '低温电芯内阻升高，电池管理板限制了充电电流' },
    { id: 'pack-leak', title: '电池仓有白色粉末', symptom: '打开电池仓发现端子旁有白色结晶，最近颠簸时偶尔会断电。', diagnostic: '电池端子受潮氧化，腐蚀层造成接触电阻和温升' },
    { id: 'range-stairs', title: '电量格数一格一格跳', symptom: '刚出门就从五格掉到三格，接下来几公里又一直停在三格。', diagnostic: '电量采样曲线校准偏移，电芯组总电压仍在可用范围' },
    { id: 'pack-rattle', title: '车架里有东西晃', symptom: '过石板路时电池仓传来轻响，随后仪表会闪一下再恢复。', diagnostic: '电池组内部固定件松动，振动时采样线束间歇接触' },
    { id: 'balance-delay', title: '最后一格怎么也充不满', symptom: '充到九成后充电速度变得极慢，充电器长时间维持红灯。', diagnostic: '电池组单体电压差过大，均衡阶段耗时异常且无法稳定收尾' },
    { id: 'restart-warning', title: '重启后才亮电量', symptom: '车放一夜后第一次开机没有电量显示，关机再开才出现读数。', diagnostic: '电池管理板唤醒电路不稳定，首轮采样未能读取电芯组' },
    { id: 'spare-mismatch', title: '借来的电池一拧就报警', symptom: '朋友的同规格电池可以开机，但一加速仪表就提示欠压。', diagnostic: '电池组放电能力与车辆控制器需求不匹配，负载电压立即跌落' },
    { id: 'charge-spark', title: '插上充电器会闪火花', symptom: '插头接触瞬间会有小火花，充电时接口还会间歇发出滋滋声。', diagnostic: '充电端子烧蚀并有局部短接风险，电池端保护器记录过流' },
    { id: 'parallel-group', title: '续航剩一点时反复断电', symptom: '满电和半电都正常，电量剩最后一格时每隔几百米就熄火。', diagnostic: '电池并联组容量衰退严重，低电量时无法维持稳定输出' },
    { id: 'charger-no-current', title: '显示充电却不进电', symptom: '充电器指示灯正常变红，第二天拔掉后电量和昨晚完全一样。', diagnostic: '电池充电回路电流为零，管理板没有开放充电 MOS 输出' },
    { id: 'wake-drop', title: '开锁后电量灯立刻熄灭', symptom: '钥匙刚打开电量灯亮一下就灭，静置测得的电压却看起来正常。', diagnostic: '电池管理板唤醒后检测到一组电芯瞬间欠压，随即切断总输出' },
  ],
  BRAKES: [
    { id: 'lever-bottom', title: '刹把快碰到车把', symptom: '捏刹车要压到底才有制动力，连续捏几次手感会暂时变硬。', diagnostic: '刹车间隙过大，制动片磨损导致有效行程不足' },
    { id: 'wheel-drag', title: '后轮转起来发涩', symptom: '松开刹把后后轮仍有摩擦声，支起车转轮也很快停下。', diagnostic: '制动片回位不畅，制动钳持续轻微夹紧' },
    { id: 'rain-squeal', title: '雨天制动尖叫', symptom: '晴天制动正常，雨后每次轻捏刹车都会发出尖锐摩擦声。', diagnostic: '制动片表面受潮并有不均匀磨耗，接触面需要处理' },
    { id: 'hill-fade', title: '下坡越刹越软', symptom: '连续下坡时刹车手感逐渐变软，停一会儿又恢复一些。', diagnostic: '制动系统连续过热，制动片和制动液工作状态异常' },
    { id: 'front-pull', title: '急刹时车头偏向一边', symptom: '慢速捏刹车没事，速度稍快时车头会朝右侧偏。', diagnostic: '前轮制动片受力不均，两侧间隙与磨耗差异过大' },
    { id: 'disc-rub', title: '每转一圈就蹭一下', symptom: '推车时能听见规律的擦碰声，刹把没有被碰也会出现。', diagnostic: '制动盘局部偏摆，旋转到固定位置时会碰到制动片' },
    { id: 'cable-stretch', title: '刹车需要反复调整', symptom: '上周刚调紧刹车，这两天行程又变长，线管外观没有破损。', diagnostic: '拉线伸长且固定端松动，制动行程再次超出范围' },
    { id: 'handle-vibration', title: '轻刹车把手发抖', symptom: '轻轻制动时车把有节奏地震动，重刹反而不太明显。', diagnostic: '制动盘表面磨耗不均，轻载接触时产生周期性振动' },
    { id: 'brake-light', title: '刹车灯亮但制动弱', symptom: '刹车灯能正常点亮，后轮却要捏很紧才明显减速。', diagnostic: '电气开关动作正常，机械制动片厚度已低于安全值' },
    { id: 'storage-rust', title: '久停后刹车卡住', symptom: '车在楼道放了一个月，第一次骑行后轮发沉并有锈色粉末。', diagnostic: '制动部件锈蚀卡滞，回位弹簧无法完全复位' },
    { id: 'front-hiss', title: '前刹像漏气一样嘶嘶响', symptom: '捏前刹时能听见细小嘶声，车轮减速不明显，油管表面有油印。', diagnostic: '液压制动管路存在渗漏，制动压力无法稳定建立' },
    { id: 'rear-lock', title: '后轮轻轻一捏就抱死', symptom: '低速轻捏后刹后轮就锁住，松手后又能转动，没有明显异响。', diagnostic: '后轮制动间隙过小，制动片与轮毂持续接近锁止点' },
    { id: 'front-disc-blue', title: '刹车盘出现蓝紫色', symptom: '长下坡后前轮刹车盘变色，冷却后仍能看到一圈蓝紫色痕迹。', diagnostic: '制动盘反复过热后硬化变形，表面摩擦系数不均' },
    { id: 'cable-fray', title: '刹车线有几根散丝', symptom: '刹把最近变沉，转向时还会突然变松，线头处能看到金属散丝。', diagnostic: '制动拉线内部断股，拉力传递不稳定且有断线风险' },
    { id: 'pad-contamination', title: '刚换的新片也刹不住', symptom: '昨天换过制动片，今天刹车还是发滑，盘面能看到油亮痕迹。', diagnostic: '新制动片被润滑油污染，摩擦面无法有效咬合' },
    { id: 'brake-knock', title: '制动时车架咔哒一声', symptom: '每次重刹都听见前叉附近响一声，刹住后轻推车也能复现。', diagnostic: '制动钳固定螺栓松动，受力时钳体产生位移' },
    { id: 'rear-drift', title: '湿路刹车时后轮甩动', symptom: '干燥路面制动正常，雨后刹车时后轮会向左侧滑开。', diagnostic: '后轮制动左右受力不均，轮毂摩擦面污染' },
    { id: 'long-lever', title: '换过刹把后行程变长', symptom: '更换折叠刹把后手感变软，拉到最后才触发电机断电。', diagnostic: '刹把拉线比与原车型不匹配，机械行程无法覆盖制动所需距离' },
    { id: 'disc-bolt', title: '刹车盘附近有金属敲击声', symptom: '过减速带会响，捏刹车时声音消失，盘面没有明显偏摆。', diagnostic: '制动盘固定螺钉松动，车架振动时产生间歇敲击' },
    { id: 'rear-oil', title: '后轮刹车有油腻味', symptom: '刹车后轮毂有焦味，擦拭后纸巾上留下浅褐色油迹。', diagnostic: '轮毂制动区域受到润滑油污染，制动片摩擦性能下降' },
    { id: 'lever-return', title: '刹把松开后不回位', symptom: '捏过刹车后刹把停在半路，手动拨回去车轮才能完全释放。', diagnostic: '刹车回位弹簧疲劳或拉线锈蚀，回程阻力超过弹簧拉力' },
    { id: 'front-tick', title: '前轮每次转动都轻响', symptom: '慢推车时前轮有固定节奏的滴答声，制动后声音会短暂消失。', diagnostic: '制动片边缘与盘面轻触，固定位置存在局部磨损凸点' },
    { id: 'caliper-sticky', title: '单侧制动片磨得特别快', symptom: '拆检后发现一侧制动片几乎见底，另一侧还剩一半厚度。', diagnostic: '制动钳活塞回缩不良，单侧长期承受大部分制动力' },
    { id: 'drum-adjuster', title: '后刹调节螺母快拧到底', symptom: '刹车行程越来越长，调节螺母已经接近末端，仍然不够紧。', diagnostic: '鼓式制动片磨损接近极限，继续调整无法恢复安全间隙' },
    { id: 'disc-groove', title: '盘面摸起来有深沟', symptom: '制动时有粗糙摩擦声，盘面能摸到两道明显环形凹槽。', diagnostic: '制动盘磨损超过维修限值，旧制动片已将盘面拉伤' },
    { id: 'brake-switch', title: '松开刹车车仍像被拽住', symptom: '仪表上的刹车图标有时不灭，松开刹把后电机仍不肯输出。', diagnostic: '刹车断电开关回弹不充分，控制信号持续报告制动状态' },
    { id: 'hydraulic-air', title: '刹车手感像捏海绵', symptom: '刹把可以一直压到底，连续捏几次后制动力才短暂恢复。', diagnostic: '液压管路混入空气，压力在油液与气泡之间被压缩' },
    { id: 'rear-bearing-brake', title: '刹车时后轮横向晃动', symptom: '空转没有声音，重刹时后轮会左右摆，车架也跟着晃一下。', diagnostic: '制动受力下轮毂间隙扩大，制动盘与制动钳发生偏移' },
    { id: 'pad-glass', title: '新片磨合一周仍打滑', symptom: '更换制动片已骑一周，制动力还是弱，摩擦面呈发亮的镜面。', diagnostic: '制动片表面玻璃化，实际接触面积无法建立有效摩擦' },
    { id: 'cable-housing', title: '转动车把刹车就变紧', symptom: '车把朝左打满时前刹明显变紧，回正后又恢复，线管外皮被压扁。', diagnostic: '制动线管走线受车把转角挤压，拉线在弯折处无法自由滑动' },
  ],
  CONTROLLER: [
    { id: 'bump-reset', title: '过减速带会断电', symptom: '路面平整时骑行正常，一经过减速带就断电，重启又恢复。', diagnostic: '控制器插接端子受震动后间歇断路，报码 E08' },
    { id: 'throttle-delay', title: '转把响应慢半拍', symptom: '拧动转把后车子隔一瞬才加速，放手时动力也不会马上收住。', diagnostic: '控制器输入信号延迟，转把回零电压超出校准区间' },
    { id: 'wet-start', title: '洗车后启动困难', symptom: '干燥时启动正常，洗车后仪表亮着但转把没有动力输出。', diagnostic: '控制器防水接头内有水汽，信号端绝缘阻值异常' },
    { id: 'speed-drop', title: '骑一会儿自动限速', symptom: '刚出门速度正常，骑十分钟后最高速度下降，冷却后暂时恢复。', diagnostic: '控制器温度保护触发，散热面温升超过工作范围' },
    { id: 'reverse-kick', title: '起步时车轮顿挫', symptom: '轻拧转把时后轮先抖一下，载重起步时顿挫更加明显。', diagnostic: '控制器相线输出不同步，电机换相过程出现异常' },
    { id: 'display-error', title: '仪表偶尔报码', symptom: '仪表会闪过 E08，停车重新开机后代码消失，故障仍偶发。', diagnostic: '控制器低压信号记录到间歇故障，重新上电只清除了显示' },
    { id: 'start-no-drive', title: '仪表正常但不走', symptom: '仪表和灯光都亮，转把也能回弹，后轮却完全没有驱动力。', diagnostic: '控制器功率输出级未响应，输入电源与仪表信号正常' },
    { id: 'cruise-cut', title: '巡航中突然失去动力', symptom: '匀速行驶时动力会短暂中断，收回转把再拧又能接上。', diagnostic: '控制器保护逻辑反复切断输出，温度记录并未超限' },
    { id: 'hill-pulse', title: '爬坡时动力一冲一停', symptom: '空车平路没问题，带货爬坡时动力像被人反复点刹。', diagnostic: '控制器大电流输出不稳定，负载上升时触发限流保护' },
    { id: 'connector-code', title: '插头看着牢却报错', symptom: '外部插头没有松脱，轻碰车架线束时仪表会跳出错误码。', diagnostic: '控制器内部焊点在振动下接触不稳，故障码可重复复现' },
    { id: 'hall-signal', title: '倒车时电机突然反转', symptom: '前进档起步正常，挂到倒车档时电机偶尔朝前冲一下。', diagnostic: '控制器读取到的霍尔相位组合错误，方向切换信号不同步' },
    { id: 'brake-cutoff', title: '刹车松开后仍断动力', symptom: '刹把已完全松开，仪表刹车灯也灭了，转把仍没有动力输出。', diagnostic: '控制器制动输入端保持低电平，内部状态没有退出断电模式' },
    { id: 'phase-wire', title: '低速时电机抖得厉害', symptom: '起步阶段车轮抖动并伴随嗡鸣，速度提起来后症状稍微减轻。', diagnostic: '控制器某相输出波形缺失，三相换相电流不平衡' },
    { id: 'throttle-deadzone', title: '转把开头一段没反应', symptom: '转把前半程几乎没有动力，继续拧过某个位置后突然窜出去。', diagnostic: '控制器转把输入标定漂移，起始电压被识别为无效区间' },
    { id: 'regen-cut', title: '松油门时后轮一顿', symptom: '收回转把后车速会突然被拖慢，轻捏刹车时反而比较平顺。', diagnostic: '控制器回馈制动参数异常，松油门时持续施加了制动力' },
    { id: 'low-voltage-code', title: '换新电池仍报欠压', symptom: '刚换上电量充足的电池，仪表仍提示欠压并限制最高速度。', diagnostic: '控制器电压采样基准偏移，读取值低于电池端实际电压' },
    { id: 'self-check-loop', title: '开机后一直自检', symptom: '仪表亮起后电机不响应，自检图标反复闪烁，重启也无法结束。', diagnostic: '控制器无法通过上电自检，内部温度传感器回报超出有效范围' },
    { id: 'cruise-brake', title: '定速巡航无法解除', symptom: '巡航中轻捏刹车时速度没有降下来，必须关闭电源才能停稳。', diagnostic: '控制器没有收到刹车解除巡航信号，输入端子逻辑状态异常' },
    { id: 'reverse-no-drive', title: '倒车按钮按下没反应', symptom: '前进功能正常，倒车按钮灯会亮，但电机始终保持静止。', diagnostic: '控制器倒车输入信号可见，但方向输出继电状态没有切换' },
    { id: 'thermal-sensor', title: '刚开机就显示过热', symptom: '车辆停了一整夜，开机十几秒后仍提示电机或控制器温度过高。', diagnostic: '控制器温度采样线路短路，冷机读数仍锁在过热区间' },
    { id: 'speed-sensor', title: '速度表归零后限速', symptom: '车实际能骑动，速度表却一直是零，几秒后系统开始限速。', diagnostic: '控制器速度脉冲输入丢失，保护逻辑按静止状态限制输出' },
    { id: 'phase-short', title: '接通电源后保险丝烧断', symptom: '更换保险丝后刚开机就再次烧断，控制器外壳没有明显损伤。', diagnostic: '控制器功率管输出端短路，上电瞬间即出现异常大电流' },
    { id: 'hall-start', title: '电机有力却无法起步', symptom: '空转架起后轮能旋转，落地载人时车轮只抖动不向前走。', diagnostic: '控制器启动换相角度错误，空载可转但负载下无法建立扭矩' },
    { id: 'light-noise', title: '开大灯时电机掉速', symptom: '关闭车灯动力正常，打开大灯后电机明显变慢，仪表偶尔重启。', diagnostic: '控制器低压供电线路调节失效，外设负载变化影响逻辑电源' },
    { id: 'throttle-return', title: '转把回位但动力不停', symptom: '转把已经弹回零位，车轮仍短暂保持驱动，捏刹车才能切断。', diagnostic: '控制器转把采样输入滞留在非零值，回零检测未生效' },
    { id: 'water-condensation', title: '清晨启动报码下午正常', symptom: '早晨露水重时报码无法骑，下午干燥后同一路段又能正常运行。', diagnostic: '控制器信号端冷凝受潮造成漏电，环境干燥后症状暂时消失' },
    { id: 'current-limit', title: '换大电池后反而无力', symptom: '电池容量升级后车能启动，但上坡动力比原来更弱。', diagnostic: '控制器电流限制参数与新电池配置不匹配，负载上升时过早限流' },
    { id: 'display-link', title: '仪表和控制器偶尔失联', symptom: '行驶中仪表突然黑屏后重亮，电机有时继续转，有时也会断电。', diagnostic: '控制器通讯总线间歇丢包，仪表与功率板状态无法同步' },
    { id: 'soft-start', title: '起步力度每天不一样', symptom: '同一档位有时起步平顺，有时一拧就猛冲，电池电量差不多。', diagnostic: '控制器加速曲线配置存储异常，上电读取到的参数不稳定' },
    { id: 'keyline-drop', title: '颠一下仪表重启但灯还亮', symptom: '过坑后仪表熄灭又重启，车灯一直亮着，电池主电源没有断。', diagnostic: '控制器钥匙电门输入端瞬间掉电，逻辑电源复位但主输出仍在' },
  ],
};

const customersForLegacy: readonly BikeRepairCase[] = [
  { id: 'repair-v1-0', title: '通勤车 · 电量异常', customerName: '老顾客', customerContext: '', symptom: '昨晚刚充满，今天只骑到街口就掉了一格；仪表仍正常亮起。', faultyPart: 'BATTERY', diagnostic: '电池组压差偏大，负载电压明显下坠' },
  { id: 'repair-v1-1', title: '配送车 · 后轮异响', customerName: '老顾客', customerContext: '', symptom: '捏刹车要到底才咬住，低速时后轮还会拖一下。', faultyPart: 'BRAKES', diagnostic: '刹车间隙超标，制动片磨损不均' },
  { id: 'repair-v1-2', title: '改装车 · 颠簸断电', customerName: '老顾客', customerContext: '', symptom: '经过减速带后动力突然中断，重新开机才能继续走。', faultyPart: 'CONTROLLER', diagnostic: '控制器报码 E08，供电输出间歇中断' },
  { id: 'repair-v1-3', title: '通勤车 · 续航骤降', customerName: '老顾客', customerContext: '', symptom: '充电器很快显示充满，但实际续航比昨天少了一半。', faultyPart: 'BATTERY', diagnostic: '电池组压差偏大，负载电压明显下坠' },
  { id: 'repair-v1-4', title: '配送车 · 下坡发热', symptom: '下坡时刹车有刺耳摩擦声，连续制动后手柄发软。', customerName: '老顾客', customerContext: '', faultyPart: 'BRAKES', diagnostic: '刹车间隙超标，制动片磨损不均' },
  { id: 'repair-v1-5', title: '改装车 · 转把失灵', symptom: '转把偶尔没有响应，仪表短暂闪过控制器错误码。', customerName: '老顾客', customerContext: '', faultyPart: 'CONTROLLER', diagnostic: '控制器报码 E08，供电输出间歇中断' },
];

function createScenarios(): BikeRepairCase[] {
  return (Object.entries(failures) as [BikeRepairPart, readonly FailurePattern[]][]).flatMap(([faultyPart, patterns]) =>
    patterns.map((failure, index) => {
      const customer = customers[(index + (faultyPart === 'BATTERY' ? 0 : faultyPart === 'BRAKES' ? 1 : 2)) % customers.length]!;
      return {
        id: `${faultyPart.toLowerCase()}-${failure.id}-${customer.id}`,
        title: failure.title,
        customerName: customer.name,
        customerContext: customer.context,
        symptom: failure.symptom,
        faultyPart,
        diagnostic: failure.diagnostic,
      };
    }),
  );
}

export const zhengBikeRepairScenarios = createScenarios();
export const zhengBikeRepairScenarioCount = zhengBikeRepairScenarios.length;

export function zhengBikeRepairCaseFor(day: number, step: BikeRepairStep, version: 1 | 2 | 3 | 4 | 5 = 1, seed = 4): BikeRepairCase {
  const safeDay = Math.max(1, Math.floor(day));
  if ((version === 3 || version === 4 || version === 5) && safeDay > 30) {
    const continuationDay = safeDay - 31;
    const contexts = version === 3 ? legacyContinuationContexts : continuationContexts;
    const order = seededShuffle(repairParts, seed, 0x2E67A11 ^ safeDay);
    const faultyPart = order[step]!;
    const partCases = zhengBikeRepairScenarios.filter((repairCase) => repairCase.faultyPart === faultyPart);
    const caseIndex = seededPermutationAt(Math.floor(continuationDay / contexts.length), partCases.length, seed, continuationPartSalt[faultyPart]);
    const contextIndex = seededPermutationAt(continuationDay % contexts.length, contexts.length, seed, continuationPartSalt[faultyPart] ^ 0xC0171);
    const baseCase = partCases[caseIndex]!;
    const context = contexts[contextIndex]!;
    const cadenceMonth = Math.floor(continuationDay / 30);
    const yearContext = version === 5 ? yearContexts[cadenceMonth % yearContexts.length]! : null;
    const cycleContext = version === 5 ? cycleContexts[Math.floor(cadenceMonth / yearContexts.length) % cycleContexts.length]! : null;
    const testLimit = Math.min(context.testLimit, yearContext?.testLimit ?? 2, cycleContext?.testLimit ?? 2);
    const warrantyProofRequired = context.warrantyProofRequired || (yearContext?.warrantyProofRequired ?? false) || (cycleContext?.warrantyProofRequired ?? false);
    const additionalContexts = [yearContext, cycleContext].filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const additionalTitle = additionalContexts.map((entry) => entry.title).join(' · ');
    const additionalDetail = additionalContexts.map((entry) => entry.detail).join(' ');
    return {
      ...baseCase,
      id: `${baseCase.id}-${context.id}${additionalContexts.length ? `-${additionalContexts.map((entry) => entry.id).join('-')}` : ''}`,
      title: `${baseCase.title} · ${context.title}${additionalTitle ? ` · ${additionalTitle}` : ''}`,
      customerContext: `${baseCase.customerContext} ${context.customerLine}${additionalDetail ? `。${additionalDetail}` : ''}。本单最多检测 ${testLimit} 项。${warrantyProofRequired ? '要拿质保质量奖，必须检测出真实故障部件并留下凭证。' : ''}`,
      workshopLine: additionalTitle ? `${context.workshopLine} ${additionalTitle}，按工单留好记录。` : context.workshopLine,
      testLimit,
      warrantyProofRequired,
    };
  }
  if (version === 1) return customersForLegacy[encounterIndex(safeDay, step, 3) % customersForLegacy.length]!;
  const deck = seededShuffle(zhengBikeRepairScenarios, seed, 0x2E67A11);
  return deck[encounterIndex(safeDay, step, 3) % deck.length]!;
}
