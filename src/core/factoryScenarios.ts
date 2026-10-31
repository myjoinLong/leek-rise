import { seededShuffle } from './scenarioDeck';
import type { FactoryShiftChoice } from './factoryShiftTypes';

export interface FactoryScenario {
  id: string;
  caseId: string;
  title: string;
  clue: string;
  correctChoice: FactoryShiftChoice;
  managerLine: string;
}

export type FactoryCheckProfile = 'TRACE' | 'PACKING' | 'FUNCTION';
type CheckProfile = FactoryCheckProfile;
interface FactoryCaseCopy extends Omit<FactoryScenario, 'managerLine' | 'caseId'> {
  profile: CheckProfile;
}

const traceCases: readonly FactoryCaseCopy[] = [
  { id: 'trace-a17', profile: 'TRACE', title: '批次 A-17 · 标签追溯', clue: '工单要求青禾 12V 充电器，外箱条码却对应 9V 旧批次。', correctChoice: 'REWORK' },
  { id: 'trace-b04', profile: 'TRACE', title: '批次 B-04 · 料号复核', clue: '订单写明铜芯线束，来料标签标注铝芯替代料，变更单未签字。', correctChoice: 'REWORK' },
  { id: 'trace-c28', profile: 'TRACE', title: '订单 C-28 · 版本核验', clue: '客户确认使用固件 3.2，包装卡片仍印着未批准的 3.1 版本。', correctChoice: 'REWORK' },
  { id: 'trace-d11', profile: 'TRACE', title: '批次 D-11 · 电芯批号', clue: '装配记录要求同批电芯，抽到的第三只电芯批号与前两只不同。', correctChoice: 'REWORK' },
  { id: 'trace-e09', profile: 'TRACE', title: '订单 E-09 · 配件确认', clue: '工单要求短线电源适配器，箱内清单和实物都是长线版本。', correctChoice: 'REWORK' },
  { id: 'trace-f32', profile: 'TRACE', title: '批次 F-32 · 铭牌对照', clue: '铭牌额定电流为 2A，订单规格要求 3A，出库扫描已报警一次。', correctChoice: 'REWORK' },
  { id: 'trace-g15', profile: 'TRACE', title: '订单 G-15 · 客制标签', clue: '客户要求中性包装，封箱前发现箱面印有未授权的宣传语。', correctChoice: 'REWORK' },
  { id: 'trace-h06', profile: 'TRACE', title: '批次 H-06 · 颜色码核对', clue: '订单颜色码是石墨灰，机身标签却标成雾银，系统未记录换色。', correctChoice: 'REWORK' },
  { id: 'trace-j21', profile: 'TRACE', title: '订单 J-21 · 线圈规格', clue: '工艺卡要求 18 匝线圈，工位计数记录为 16 匝，尚未复检。', correctChoice: 'REWORK' },
  { id: 'trace-k03', profile: 'TRACE', title: '批次 K-03 · 外壳材质', clue: '采购单注明阻燃外壳，来料包装上没有对应的阻燃等级标记。', correctChoice: 'REWORK' },
  { id: 'trace-l18', profile: 'TRACE', title: '订单 L-18 · 插头制式', clue: '发往本地门店的订单要求国标插头，待装箱品是两脚欧规插头。', correctChoice: 'REWORK' },
  { id: 'trace-m25', profile: 'TRACE', title: '批次 M-25 · 轴承型号', clue: '装配清单指定静音轴承，物料员拿来的型号多了一位后缀且未备案。', correctChoice: 'REWORK' },
  { id: 'trace-n08', profile: 'TRACE', title: '订单 N-08 · 包装语言', clue: '订单要求简体中文说明书，抽检箱内混入一册英文出口版。', correctChoice: 'REWORK' },
  { id: 'trace-p13', profile: 'TRACE', title: '批次 P-13 · 卡扣版本', clue: '工程变更已改为双卡扣，当前样品仍是旧版单卡扣结构。', correctChoice: 'REWORK' },
  { id: 'trace-q30', profile: 'TRACE', title: '订单 Q-30 · 电源极性', clue: '工单图纸要求中心正极，线束标签显示中心负极，不能凭颜色放行。', correctChoice: 'REWORK' },
  { id: 'trace-r02', profile: 'TRACE', title: '批次 R-02 · 防尘塞清点', clue: '客户清单要求每件配两个防尘塞，包装记录只勾选了一个。', correctChoice: 'REWORK' },
  { id: 'trace-s19', profile: 'TRACE', title: '订单 S-19 · 螺丝长度', clue: '维修说明要求 8 毫米螺丝，当前工位盒内混有 12 毫米规格。', correctChoice: 'REWORK' },
  { id: 'trace-t07', profile: 'TRACE', title: '批次 T-07 · 固定支架', clue: '图纸要求左向支架，实物是右向件，仓库备注写着“外观相似”。', correctChoice: 'REWORK' },
  { id: 'trace-u24', profile: 'TRACE', title: '订单 U-24 · 质保卡版本', clue: '本单承诺两年质保，随箱卡片印的是已废止的一年质保条款。', correctChoice: 'REWORK' },
  { id: 'trace-v10', profile: 'TRACE', title: '批次 V-10 · 接口复核', clue: '工单指定 Type-C 接口，样机装配记录仍登记为 Micro-USB。', correctChoice: 'REWORK' },
  { id: 'trace-w27', profile: 'TRACE', title: '订单 W-27 · 序列号段', clue: '出货单序列号应以 6K 开头，扫码枪读到的是返修品的 6R 号段。', correctChoice: 'REWORK' },
  { id: 'trace-x05', profile: 'TRACE', title: '批次 X-05 · 防滑垫材质', clue: '订单要求硅胶防滑垫，物料标签写着普通橡胶，替换申请未获批。', correctChoice: 'REWORK' },
  { id: 'trace-y16', profile: 'TRACE', title: '订单 Y-16 · 说明页核对', clue: '客户要求附安装步骤页，当前包装样本只有安全警示页。', correctChoice: 'REWORK' },
  { id: 'trace-z12', profile: 'TRACE', title: '批次 Z-12 · 屏蔽层检查', clue: '屏蔽层工艺需覆盖接头全周，巡检照片显示仍留有约三分之一缺口。', correctChoice: 'REWORK' },
  { id: 'trace-aa3', profile: 'TRACE', title: '订单 AA-03 · 托盘标识', clue: '托盘卡写着 24 件，实际点数 20 件；交接双方都还没签字。', correctChoice: 'REWORK' },
  { id: 'trace-ab9', profile: 'TRACE', title: '批次 AB-09 · 胶水批次', clue: '工艺要求使用耐高温胶，领料单登记的是常温胶，仓库批次可追溯。', correctChoice: 'REWORK' },
  { id: 'trace-ac2', profile: 'TRACE', title: '订单 AC-02 · 旋钮方向', clue: '面板刻度规定顺时针增大，抽检样品旋转方向与标识相反。', correctChoice: 'REWORK' },
  { id: 'trace-ad6', profile: 'TRACE', title: '批次 AD-06 · 电池容量', clue: '订单最低容量为 5000mAh，随货检测单记录为 4500mAh。', correctChoice: 'REWORK' },
  { id: 'trace-ae4', profile: 'TRACE', title: '订单 AE-04 · 配色封签', clue: '客户要求蓝色封签便于门店区分，封箱台使用的却是黑色通用封签。', correctChoice: 'REWORK' },
  { id: 'trace-af8', profile: 'TRACE', title: '批次 AF-08 · 线径核查', clue: '负载说明要求 1.5 平方线径，剥线样本测得约 1.0 平方。', correctChoice: 'REWORK' },
];

const packingCases: readonly FactoryCaseCopy[] = [
  { id: 'pack-b02', profile: 'PACKING', title: '批次 B-02 · 防拆封签', clue: '抽检 12 件封签完整；箱数、序列号和装箱单逐项一致。', correctChoice: 'PASS' },
  { id: 'pack-c14', profile: 'PACKING', title: '订单 C-14 · 随机点数', clue: '抽检 8 箱各 10 件，封口无二次开启痕迹，数量全部相符。', correctChoice: 'PASS' },
  { id: 'pack-d03', profile: 'PACKING', title: '批次 D-03 · 缓冲材料', clue: '运输跌落要求使用双层护角，样箱四角均已装好且尺寸符合工艺卡。', correctChoice: 'PASS' },
  { id: 'pack-e22', profile: 'PACKING', title: '订单 E-22 · 说明书抽检', clue: '随机抽取 10 盒，简体说明书、合格证和产品型号完全对应。', correctChoice: 'PASS' },
  { id: 'pack-f01', profile: 'PACKING', title: '批次 F-01 · 箱重比对', clue: '抽样净重 2.04 千克，工艺范围 2.00–2.10 千克，复秤差 0.01 千克。', correctChoice: 'PASS' },
  { id: 'pack-g26', profile: 'PACKING', title: '订单 G-26 · 贴纸位置', clue: '条码贴在规定的右上定位框内，扫码三次均回传同一订单号。', correctChoice: 'PASS' },
  { id: 'pack-h12', profile: 'PACKING', title: '批次 H-12 · 托盘绑带', clue: '四道绑带张力均在绿色区间，托盘无倾斜，边角没有被压裂。', correctChoice: 'PASS' },
  { id: 'pack-j05', profile: 'PACKING', title: '订单 J-05 · 易碎标记', clue: '玻璃配件使用独立隔仓，易碎标识朝外，箱内没有松动碰撞声。', correctChoice: 'PASS' },
  { id: 'pack-k17', profile: 'PACKING', title: '批次 K-17 · 防潮袋检查', clue: '干燥剂未变色，封口宽度达到 8 毫米，湿度卡读数低于上限。', correctChoice: 'PASS' },
  { id: 'pack-l29', profile: 'PACKING', title: '订单 L-29 · 交接数量', clue: '生产线交接 36 箱、库房签收 36 箱，双方扫码记录时间相差 2 分钟。', correctChoice: 'PASS' },
  { id: 'pack-m06', profile: 'PACKING', title: '批次 M-06 · 保护膜抽查', clue: '抽检表面 15 件均无气泡和翘边，保护膜没有遮挡接口。', correctChoice: 'PASS' },
  { id: 'pack-n20', profile: 'PACKING', title: '订单 N-20 · 泡棉厚度', clue: '卡尺测得泡棉 6.1 毫米，标准为 6.0±0.5 毫米，回弹后恢复正常。', correctChoice: 'PASS' },
  { id: 'pack-p08', profile: 'PACKING', title: '批次 P-08 · 外箱强度', clue: '三层瓦楞厚度达标，封箱胶带覆盖中缝两侧各 5 厘米。', correctChoice: 'PASS' },
  { id: 'pack-q23', profile: 'PACKING', title: '订单 Q-23 · 配件袋核验', clue: '每盒一袋螺丝、一张安装卡，抽检 20 盒未见漏装或混装。', correctChoice: 'PASS' },
  { id: 'pack-r16', profile: 'PACKING', title: '批次 R-16 · 批号喷码', clue: '喷码日期与工单一致，字迹通过酒精轻擦测试，没有模糊脱落。', correctChoice: 'PASS' },
  { id: 'pack-s04', profile: 'PACKING', title: '订单 S-04 · 周转箱清点', clue: '客户要求回收 6 个周转箱，装车清单和实际数量均为 6 个。', correctChoice: 'PASS' },
  { id: 'pack-t31', profile: 'PACKING', title: '批次 T-31 · 防尘塞抽检', clue: '抽检 18 件接口均有防尘塞，拔插后没有残胶或塑料碎屑。', correctChoice: 'PASS' },
  { id: 'pack-u07', profile: 'PACKING', title: '订单 U-07 · 叠箱高度', clue: '码垛高度 1.4 米，运输上限 1.5 米，顶部货物没有超出托盘。', correctChoice: 'PASS' },
  { id: 'pack-v24', profile: 'PACKING', title: '批次 V-24 · 印刷色样', clue: '包装主色与签字色样色差在允许范围内，客户签样编号可查。', correctChoice: 'PASS' },
  { id: 'pack-w13', profile: 'PACKING', title: '订单 W-13 · 净含量复核', clue: '随机称量 10 包平均 502 克，标注净含量 500 克，单包均不低于 495 克。', correctChoice: 'PASS' },
  { id: 'pack-x30', profile: 'PACKING', title: '批次 X-30 · 封箱温度', clue: '胶带压合温度 42°C，工艺范围 38–46°C，冷却后粘合完整。', correctChoice: 'PASS' },
  { id: 'pack-y09', profile: 'PACKING', title: '订单 Y-09 · 栈板标签', clue: '目的仓代码与发运单一致，标签朝外，叉车扫描可正常读取。', correctChoice: 'PASS' },
  { id: 'pack-z21', profile: 'PACKING', title: '批次 Z-21 · 玻璃隔片', clue: '每片玻璃之间都有纸隔片，抽检边缘无磕碰，箱内间隙小于 2 毫米。', correctChoice: 'PASS' },
  { id: 'pack-aa5', profile: 'PACKING', title: '订单 AA-05 · 防水袋封口', clue: '水压抽检 10 袋均无气泡，封口压线连续且宽度达到要求。', correctChoice: 'PASS' },
  { id: 'pack-ab1', profile: 'PACKING', title: '批次 AB-01 · 货位核对', clue: '待发货位、系统库存和纸面拣货单数量一致，没有隔离品混入。', correctChoice: 'PASS' },
  { id: 'pack-ac7', profile: 'PACKING', title: '订单 AC-07 · 标签耐磨', clue: '湿布擦拭 10 次后标签仍清楚，序列号没有露底或粘连。', correctChoice: 'PASS' },
  { id: 'pack-ad2', profile: 'PACKING', title: '批次 AD-02 · 扎带检查', clue: '线束扎带尾端已剪齐，拉力抽测未松脱，导线绝缘层无压痕。', correctChoice: 'PASS' },
  { id: 'pack-ae6', profile: 'PACKING', title: '订单 AE-06 · 缓冲间距', clue: '产品与箱壁间距 18 毫米，规范要求至少 15 毫米，摇箱没有撞击声。', correctChoice: 'PASS' },
  { id: 'pack-af3', profile: 'PACKING', title: '批次 AF-03 · 出货封条', clue: '封条编号连续、未重复，仓库扫码记录与出库单最后四位一致。', correctChoice: 'PASS' },
  { id: 'pack-ag8', profile: 'PACKING', title: '订单 AG-08 · 外观复核', clue: '抽检 16 件无划伤，检验灯下无明显色差，保护膜边缘平整。', correctChoice: 'PASS' },
];

const functionCases: readonly FactoryCaseCopy[] = [
  { id: 'func-b11', profile: 'FUNCTION', title: '工位 B-11 · 指示灯复测', clue: '通电后状态灯不亮；工艺卡要求常亮，换线复测仍无响应。', correctChoice: 'REWORK' },
  { id: 'func-c07', profile: 'FUNCTION', title: '工位 C-07 · 温升记录', clue: '运行 20 分钟后温度 43°C，规格上限 50°C，散热风扇工作正常。', correctChoice: 'PASS' },
  { id: 'func-d19', profile: 'FUNCTION', title: '工位 D-19 · 绝缘测试', clue: '绝缘电阻读数 0.8MΩ，安全标准要求不低于 2MΩ。', correctChoice: 'REWORK' },
  { id: 'func-e02', profile: 'FUNCTION', title: '工位 E-02 · 电压稳定', clue: '负载变化时输出波动 ±1.1%，规格允许范围为 ±2.0%。', correctChoice: 'PASS' },
  { id: 'func-f15', profile: 'FUNCTION', title: '工位 F-15 · 按键寿命', clue: '按键连续测试 500 次后有 3 次卡住，标准不允许出现卡键。', correctChoice: 'REWORK' },
  { id: 'func-g23', profile: 'FUNCTION', title: '工位 G-23 · 风扇噪声', clue: '一米处噪声 38dB，工艺上限 42dB，转速没有周期性抖动。', correctChoice: 'PASS' },
  { id: 'func-h04', profile: 'FUNCTION', title: '工位 H-04 · 漏电复核', clue: '保护地电流 0.9mA，安全上限 0.5mA，复测结果仍偏高。', correctChoice: 'REWORK' },
  { id: 'func-j28', profile: 'FUNCTION', title: '工位 J-28 · 充放电循环', clue: '电池按标准完成 5 次循环，容量保持率 98%，记录曲线无突降。', correctChoice: 'PASS' },
  { id: 'func-k12', profile: 'FUNCTION', title: '工位 K-12 · 接口拉力', clue: '接口拉力 16N，规范最低 20N，轻晃时数据线会瞬断。', correctChoice: 'REWORK' },
  { id: 'func-l06', profile: 'FUNCTION', title: '工位 L-06 · 按压回弹', clue: '外壳按压后 0.4 秒复位，标准为 1 秒内且无异响。', correctChoice: 'PASS' },
  { id: 'func-m27', profile: 'FUNCTION', title: '工位 M-27 · 防水抽测', clue: '规定水雾 3 分钟后内部湿度标记变色，样机未达到防护要求。', correctChoice: 'REWORK' },
  { id: 'func-n03', profile: 'FUNCTION', title: '工位 N-03 · 读卡识别', clue: '连续读写 100 次成功 100 次，传输速度达到工单下限。', correctChoice: 'PASS' },
  { id: 'func-p18', profile: 'FUNCTION', title: '工位 P-18 · 接地连续性', clue: '接地电阻 0.14Ω，规格上限 0.20Ω，三次读数稳定。', correctChoice: 'PASS' },
  { id: 'func-q09', profile: 'FUNCTION', title: '工位 Q-09 · 电机电流', clue: '空载电流 1.8A，高于工艺上限 1.5A，轴承处伴有摩擦声。', correctChoice: 'REWORK' },
  { id: 'func-r25', profile: 'FUNCTION', title: '工位 R-25 · 显示均匀度', clue: '九点亮度差最大 4%，标准允许 8%，无坏点或闪烁。', correctChoice: 'PASS' },
  { id: 'func-s13', profile: 'FUNCTION', title: '工位 S-13 · 过载保护', clue: '超过额定负载后保护器没有断开，测试台已自动停止供电。', correctChoice: 'REWORK' },
  { id: 'func-t30', profile: 'FUNCTION', title: '工位 T-30 · 无线配对', clue: '三种系统各配对 10 次均成功，断连后可在 2 秒内自动恢复。', correctChoice: 'PASS' },
  { id: 'func-u08', profile: 'FUNCTION', title: '工位 U-08 · 按键回馈', clue: '音量键按下后无回弹声，拆检窗口发现弹片没有压到触点。', correctChoice: 'REWORK' },
  { id: 'func-v21', profile: 'FUNCTION', title: '工位 V-21 · 运行噪音', clue: '高档运行噪音 41dB，规范上限 45dB，低档没有异常共振。', correctChoice: 'PASS' },
  { id: 'func-w05', profile: 'FUNCTION', title: '工位 W-05 · 焊点温度', clue: '温度曲线峰值 278°C，焊接规范上限 260°C，绝缘套管已有轻微变形。', correctChoice: 'REWORK' },
  { id: 'func-x16', profile: 'FUNCTION', title: '工位 X-16 · 休眠功耗', clue: '待机功耗 0.18W，标准不高于 0.25W，连续 8 小时没有重启。', correctChoice: 'PASS' },
  { id: 'func-y02', profile: 'FUNCTION', title: '工位 Y-02 · 过流保护', clue: '1.2 倍额定电流时保险丝未熔断，规格要求 1.1 倍内动作。', correctChoice: 'REWORK' },
  { id: 'func-z29', profile: 'FUNCTION', title: '工位 Z-29 · 屏幕触控', clue: '四角和边缘 40 点触控全部识别，没有漂移或重复触发。', correctChoice: 'PASS' },
  { id: 'func-aa7', profile: 'FUNCTION', title: '工位 AA-07 · 漏气测试', clue: '气密压降 3.4kPa，工艺上限 2.0kPa，阀门处能听到细微漏气。', correctChoice: 'REWORK' },
  { id: 'func-ab4', profile: 'FUNCTION', title: '工位 AB-04 · 充电效率', clue: '输入 10W 时稳定输出 8.4W，规格要求至少 8.0W，外壳温升正常。', correctChoice: 'PASS' },
  { id: 'func-ac9', profile: 'FUNCTION', title: '工位 AC-09 · 摄像头对焦', clue: '近景和远景切换 20 次有 4 次无法合焦，日志显示马达电流偏低。', correctChoice: 'REWORK' },
  { id: 'func-ad1', profile: 'FUNCTION', title: '工位 AD-01 · 音频失真', clue: '额定音量失真率 0.8%，规格上限 1.0%，左右声道相位一致。', correctChoice: 'PASS' },
  { id: 'func-ae5', profile: 'FUNCTION', title: '工位 AE-05 · 过温保护', clue: '传感器达到 82°C 时没有降功率，保护阈值设定应为 75°C。', correctChoice: 'REWORK' },
  { id: 'func-af2', profile: 'FUNCTION', title: '工位 AF-02 · 震动复测', clue: '标准振动台运行 15 分钟，螺丝无松动，复测值低于警戒线。', correctChoice: 'PASS' },
  { id: 'func-ag6', profile: 'FUNCTION', title: '工位 AG-06 · 按键响应延迟', clue: '按下到响应平均 0.6 秒，规格上限 0.8 秒，连续 30 次没有漏响应。', correctChoice: 'PASS' },
];

const checkProfiles: readonly CheckProfile[] = ['TRACE', 'PACKING', 'FUNCTION'];
const profileOffset: Readonly<Record<CheckProfile, number>> = { TRACE: 0, PACKING: 10, FUNCTION: 20 };
const casesByProfile: Readonly<Record<CheckProfile, readonly FactoryCaseCopy[]>> = {
  TRACE: traceCases, PACKING: packingCases, FUNCTION: functionCases,
};
export const factoryCaseCountPerProfile = traceCases.length;

const managerLines = [
  '王老板接完催货电话：“单子不能拖，错料也不能让你们背锅，先按记录查。”',
  '“上游把交期往前挪了两天。工位照规矩走，罚款我去谈。”',
  '他压低声音：“这批是老客户返单，别因为赶时间把信任磨没了。”',
  '“我催得急，是因为账期也急；但没签字的替代料不能当成签过。”',
  '王老板把水杯放下：“昨天有人说返工浪费，今天客户退货谁去解释？”',
  '“客户只看准时交货，我还得看你们别把手伤了，工位安全不能省。”',
  '他揉揉眉心：“供应商说下批补齐，这一批有没有问题得先说实话。”',
  '“出货数字写得再漂亮，进了返修区也是白忙。拿证据说话。”',
  '王老板看了一眼工资表：“质量奖按结果发，不会因为我今天心情好就改。”',
  '“单量不够时我怕你们没活，单量太多时又怕有人替我扛错。”',
  '他把检验表递过来：“不确定就停一下。停线的原因我来记，不算你磨洋工。”',
  '“客户要提前验货，我答应了。你发现问题就报，不用先猜我会不会生气。”',
  '王老板叹气：“上回我说过头了。返工是工艺问题，不是哪个人故意拖单。”',
  '“我也想一次过检，但机器和人都不是表格里的百分之百。”',
  '他指指旧设备：“这台我申请换了三次。今天先把能确认的风险挑出来。”',
  '“料款还没结清，供应商又来催。我知道你们夹在中间，所以账要写清。”',
  '王老板翻着退货单：“客户写了具体问题，就按具体问题复测，别靠印象放行。”',
  '“这一单多花半小时返工，比让客户整批退回来划算。”',
  '他把工单分成两份：“人手紧也要轮着休息，不是谁嗓门大谁就多干。”',
  '“我不敢保证每张单都准点，但能保证有争议时把检测记录拿出来。”',
  '王老板看着传送带：“以前我只问产量。现在返修率高，产量也只是纸面数字。”',
  '“供应商送错料，我会去追；工位发现不对，停下来就是在帮厂里省钱。”',
  '他把旧账本合上：“上个月少算的加班费我补了。规则不该只在出事时才讲。”',
  '“今天返工多，我不高兴归不高兴，质量奖还是按记录算。”',
  '王老板低声说：“这批货关系到下月工钱。我不会让你们拿没看见当没发生。”',
  '“订单压得紧，才更要留出复核的人。出了事再找一个人顶上，没用。”',
  '他把签字笔递给你：“你写下判断，我签生产责任。责任别只落在一边。”',
  '“客户愿意继续合作，是因为问题能追到哪里发生，不是因为我们从不犯错。”',
  '王老板关掉催单群：“先把手里的三张单做好，剩下的我去和客户解释。”',
  '“我以前怕停线丢订单，现在更怕出了问题还让工人替所有人沉默。”',
] as const;

function profileFor(step: number, day: number, seed: number): CheckProfile {
  const order = seededShuffle(checkProfiles, seed, 0xFAC700 ^ Math.max(1, Math.floor(day)));
  return order[Math.max(0, Math.min(2, Math.floor(step)))]!;
}

export function factoryScenarioForDay(day: number, step: number, seed: number): FactoryScenario {
  const safeDay = Math.max(1, Math.floor(day));
  const profile = profileFor(step, safeDay, seed);
  const contextDeck = seededShuffle(Array.from({ length: 30 }, (_, index) => index), seed, 0xFAC800);
  const contextIndex = (safeDay - 1 + profileOffset[profile]) % contextDeck.length;
  const scenario = casesByProfile[profile][contextDeck[contextIndex]!]!;
  const id = `factory-v2-${safeDay}-${step}-${scenario.id}`;
  return {
    ...scenario,
    id,
    caseId: scenario.id,
    managerLine: managerLines[(safeDay - 1 + profileOffset[profile]) % managerLines.length]!,
  };
}

export function factoryContinuationBaseCase(profile: FactoryCheckProfile, caseIndex: number): FactoryScenario {
  const cases = casesByProfile[profile];
  const safeIndex = ((Math.floor(caseIndex) % cases.length) + cases.length) % cases.length;
  const scenario = cases[safeIndex]!;
  return { ...scenario, id: scenario.id, caseId: scenario.id, managerLine: managerLines[0]! };
}

export function factoryContinuationProfileOrder(day: number, seed: number): readonly FactoryCheckProfile[] {
  return seededShuffle(checkProfiles, seed, 0xFAC900 ^ Math.max(31, Math.floor(day)));
}
