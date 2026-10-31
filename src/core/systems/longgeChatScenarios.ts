import { seededPermutationAt } from '../scenarioDeck';
import type { LonggeCaseType, LonggeChatActiveState, LonggeChatResultState } from '../types';

export const longgeScenarioVersion = 3 as const;
const legacyScenarioCount = 30;
const topicCount = 30;
const sourceFormatCount = 6;
const recordAngleCount = 6;
const tapeFocusCount = 4;
const groupMoodCount = 3;
const scenarioCount = topicCount * sourceFormatCount * recordAngleCount * tapeFocusCount * groupMoodCount;
const legacyScenarioSalt = 0x4C474348;
const scenarioSalt = 0x4C474349;

interface LonggeScenarioSeed {
  title: string;
  record: string;
  tape: string;
}

export interface LonggeScenario {
  index: number;
  title: string;
  record: string;
  tape: string;
  groupMessage: string;
  tapeMessage: string;
  noticeMessage: string;
  npcReply: string;
}

const scenarios: readonly LonggeScenarioSeed[] = [
  { title: '二号车间夜间扩产', record: '设备租赁合同的签署日期', tape: '公告前后的主动买卖方向' },
  { title: '大客户验收延期', record: '验收单上的补充条款', tape: '尾盘是否出现连续主动卖出' },
  { title: '仓库租约突然变更', record: '出租方与承租方的主体名称', tape: '传闻发出后成交量是否放大' },
  { title: '供应商切换传言', record: '供应商名单的正式披露时间', tape: '上涨区间的买卖盘是否失衡' },
  { title: '售后返修率下降', record: '质量报告对应的产品批次', tape: '消息前后买方成交是否持续' },
  { title: '新设备采购招标', record: '中标公告里的采购金额与日期', tape: '冲高时成交主动方的变化' },
  { title: '物流合同续约', record: '合同相对方和服务期限', tape: '群聊升温后卖盘是否增加' },
  { title: '研发样机提前交付', record: '研发进度公告的原始链接', tape: '消息发布前后的成交顺序' },
  { title: '区域代理拿下独家权', record: '授权范围和生效区域', tape: '上涨时主动买入能否延续' },
  { title: '安全检查要求停线', record: '监管通知的发布日期和适用厂区', tape: '传闻扩散时是否出现集中抛售' },
  { title: '原材料账期延长', record: '采购合同的付款周期', tape: '盘口变化是否早于群聊截图' },
  { title: '渠道库存被临时压货', record: '经销协议的退货与回款条款', tape: '成交放大时价格是否仍在拉升' },
  { title: '旧厂房改作测试线', record: '厂房用途变更的审批记录', tape: '测试线传闻出现后的主动成交' },
  { title: '季度订单突然加急', record: '订单交付批次和违约条款', tape: '加急消息后买盘是否接得住' },
  { title: '软件版本延期上线', record: '版本公告的发布时间与变更说明', tape: '延期传闻期间的卖单分布' },
  { title: '经销商大会签约', record: '签约方名单与合同金额口径', tape: '会场消息出现后的成交方向' },
  { title: '售后网点集中撤并', record: '服务网点调整的公开名单', tape: '价格反弹时主动卖出是否增多' },
  { title: '新认证进入复审', record: '认证机构发布的复审状态', tape: '复审消息发布前后的交易节奏' },
  { title: '子公司更换注册地址', record: '工商变更记录的生效日期', tape: '变更传闻附近的真实成交量' },
  { title: '海外代理要求追加保证金', record: '代理合同中的保证金责任', tape: '消息热度上升时买盘有没有跟进' },
  { title: '客户要求返工一批货', record: '返工单对应的数量和责任方', tape: '返工消息后主动卖单的持续时间' },
  { title: '展会现场展示新产品', record: '展品是否进入量产或仅为样机', tape: '展会照片传播后的成交变化' },
  { title: '股东调研行程被曝光', record: '调研公告的参与人员与日期', tape: '调研消息出现前后的盘口变化' },
  { title: '仓储消防整改完成', record: '整改验收单对应的仓库地址', tape: '整改传闻后主动成交的方向' },
  { title: '供应链账期被迫缩短', record: '采购付款节点和新增担保条款', tape: '资金压力传言后的卖盘变化' },
  { title: '临时产线通过抽检', record: '抽检报告的批次和合格范围', tape: '抽检消息后主动买入是否连续' },
  { title: '退换货政策被悄悄收紧', record: '新旧售后条款的生效日期', tape: '政策截图传播后的价格反应' },
  { title: '设备回购协议谈判', record: '回购对象与付款条件', tape: '谈判消息传出后的主动买卖' },
  { title: '园区临时增加排污检查', record: '检查通知的厂区和执行时间', tape: '检查传闻后的成交方向' },
  { title: '新产品小批量试产', record: '试产公告中的数量和后续验证条件', tape: '试产消息发布后的买方成交' },
];

const sourceFormats = [
  { name: '群聊截图', detail: '截图裁掉了顶部时间和发布者，转发配文比原图更肯定。' },
  { name: '语音转写', detail: '语音转写没有保留原音，转述者把推测说成了确定消息。' },
  { name: '群文件', detail: '群文件被重新命名，上传账号和最初出处还需要核对。' },
  { name: '多手转发', detail: '消息已经转过几手，最早发布者和完整上下文没有跟上。' },
  { name: '外链预览', detail: '外链预览只显示标题，点回来源页才能确认公司主体和正文。' },
  { name: '拼接记录', detail: '聊天记录经过拼图，引用前后的上下文没有放在同一张图里。' },
] as const;

const recordAngles = [
  { name: '主体与日期', detail: '先比对责任主体和登记日期' },
  { name: '原文与转述', detail: '把原文措辞与群内转述逐句对照' },
  { name: '金额口径', detail: '确认金额口径是否把计划值说成已落地' },
  { name: '适用范围', detail: '检查事项适用的厂区、产品或客户范围' },
  { name: '生效条件', detail: '留意合同或公告里尚未满足的生效条件' },
  { name: '时间顺序', detail: '按签署、披露和转发时间重新排顺序' },
] as const;

const tapeFoci = [
  { name: '逐笔方向', detail: '逐笔成交的主动方向与连续性' },
  { name: '量价同步', detail: '成交量放大时价格是否同步走强' },
  { name: '尾盘变化', detail: '尾盘主动买卖方向有没有突然切换' },
  { name: '大单前后', detail: '大单出现前后的成交方向和价格反应' },
] as const;

const groupMoods = [
  { name: '催促上车', detail: '群里几个人催着现在表态，消息刷得很快。', reply: '越催越该慢一点，先把来源和时间对上。' },
  { name: '冷场围观', detail: '群里大多只点了表情，暂时没人愿意为消息背书。', reply: '没人接话不代表消息就是真的，证据还是得自己找。' },
  { name: '追问出处', detail: '有群友追问原帖，也有人提醒大家先看公开信息。', reply: '有人肯追问出处是好事，别让转发次数替代证据。' },
] as const;

export function longgeScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), scenarioCount, seed, scenarioSalt);
}

export function longgeLegacyScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), legacyScenarioCount, seed, legacyScenarioSalt);
}

export function longgeScenarioAt(index: number, caseType: LonggeCaseType): LonggeScenario {
  const safeIndex = ((Math.floor(index) % legacyScenarioCount) + legacyScenarioCount) % legacyScenarioCount;
  const seed = scenarios[safeIndex]!;
  const groupMessage = caseType === 'ACCUMULATION'
    ? `群里有人说「${seed.title}」可能带来新机会，还说有人提前收货，但没有贴原始出处。`
    : caseType === 'DISTRIBUTION'
      ? `群里把「${seed.title}」说成已经确认的利好，截图没有日期，有人催着现在上车。`
      : `龙哥转来「${seed.title}」的公司公告链接，提醒先核对主体和发布时间。`;
  const tapeMessage = caseType === 'ACCUMULATION'
    ? `核对${seed.tape}，短窗口里买卖都有，暂时看不出持续的单边方向。`
    : caseType === 'DISTRIBUTION'
      ? `围绕${seed.tape}，价格冲高时连续出现主动卖出。`
      : `核对${seed.tape}，公告发布后主动买入增加，价格随之抬升。`;
  const noticeMessage = caseType === 'CATALYST'
    ? `公开信息栏能查到「${seed.title}」的正式公告，发布时间为 09:12。`
    : `公开信息栏没有与「${seed.title}」对应的正式公告。`;
  const npcReply = caseType === 'ACCUMULATION'
    ? `“${seed.title}我也没核实。群里一安静我就想接话，找不到原帖前别把猜测当内幕。”`
    : caseType === 'DISTRIBUTION'
      ? `“这张旧图是我转的，${seed.record}我刚才没看清。我先撤回，咱按原文来。”`
      : `“${seed.title}的公告是真的，后面的涨跌我不替市场打包票。”`;

  return {
    index: safeIndex,
    title: seed.title,
    record: seed.record,
    tape: seed.tape,
    groupMessage,
    tapeMessage,
    noticeMessage,
    npcReply,
  };
}

export function longgeScenarioAtV3(index: number, caseType: LonggeCaseType): LonggeScenario {
  const safeIndex = ((Math.floor(index) % scenarioCount) + scenarioCount) % scenarioCount;
  const topicIndex = safeIndex % topicCount;
  const sourceIndex = Math.floor(safeIndex / topicCount) % sourceFormatCount;
  const recordIndex = Math.floor(safeIndex / (topicCount * sourceFormatCount)) % recordAngleCount;
  const tapeIndex = Math.floor(safeIndex / (topicCount * sourceFormatCount * recordAngleCount)) % tapeFocusCount;
  const moodIndex = Math.floor(safeIndex / (topicCount * sourceFormatCount * recordAngleCount * tapeFocusCount)) % groupMoodCount;
  const topic = scenarios[topicIndex]!;
  const source = sourceFormats[sourceIndex]!;
  const recordAngle = recordAngles[recordIndex]!;
  const tapeFocus = tapeFoci[tapeIndex]!;
  const groupMood = groupMoods[moodIndex]!;
  const groupLead = caseType === 'ACCUMULATION'
    ? `群里有人把「${topic.title}」说成可能的新机会，眼下还缺少能确认方向的出处。`
    : caseType === 'DISTRIBUTION'
      ? `群里把「${topic.title}」说成已经确认的利好，但目前还没拿出对应的公开依据。`
      : `龙哥转来「${topic.title}」的正式公告线索，提醒先核对主体和发布时间。`;
  const tapeObservation = caseType === 'ACCUMULATION'
    ? '买卖都有，短窗口暂时看不出持续的单边方向。'
    : caseType === 'DISTRIBUTION'
      ? '价格冲高时连续出现主动卖出。'
      : '公告发布后主动买入增加，价格随后抬升。';
  const noticeMessage = caseType === 'CATALYST'
    ? `公开信息栏能查到「${topic.title}」的正式公告；核对${recordAngle.name}后，发布时间为 09:12。`
    : `公开信息栏没有与「${topic.title}」对应的正式公告；可按${recordAngle.name}排查传闻出处。`;
  const npcReply = caseType === 'ACCUMULATION'
    ? `“${topic.title}我也没核实。${groupMood.reply}”`
    : caseType === 'DISTRIBUTION'
      ? `“${topic.title}的群聊说法和公开信息对不上，我刚才把话说满了。${groupMood.reply}”`
      : `“${topic.title}的公告原文能核验，后面的涨跌我不替市场打包票。${groupMood.reply}”`;

  return {
    index: safeIndex,
    title: topic.title,
    record: `${topic.record}；${recordAngle.detail}`,
    tape: `${topic.tape}；重点观察${tapeFocus.detail}`,
    groupMessage: `${groupLead} 群内载体：${source.name}，${source.detail} ${groupMood.detail}`,
    tapeMessage: `重点核对${tapeFocus.detail}；${tapeObservation}`,
    noticeMessage,
    npcReply,
  };
}

export function longgeScenarioForRun(
  run: Pick<LonggeChatActiveState | LonggeChatResultState, 'scenarioVersion' | 'scenarioIndex' | 'caseType' | 'priorConclusion' | 'priorOpeningChoice'>,
): LonggeScenario | null {
  if (run.scenarioIndex === undefined) return null;
  if (run.scenarioVersion === 2) return longgeScenarioAt(run.scenarioIndex, run.caseType);
  if (run.scenarioVersion === longgeScenarioVersion) {
    const scenario = longgeScenarioAtV3(run.scenarioIndex, run.caseType);
    if (!run.priorConclusion) return scenario;
    const priorDecision = run.priorConclusion === 'DISTRIBUTION'
      ? '有人借利好出货'
      : run.priorConclusion === 'REAL_CATALYST' ? '公告是真实催化' : '证据暂时不足';
    const priorApproach = run.priorOpeningChoice === 'POST_CORRECTION'
      ? '上回你把更正发回了群里'
      : run.priorOpeningChoice === 'KEEP_PRIVATE' ? '上回你先把核查留在了私聊里' : '';
    return {
      ...scenario,
      npcReply: `“你上回判断「${priorDecision}」，我记下了。${priorApproach ? `${priorApproach}，今天咱们沿着那条线索接着核。` : ''}今天说的是「${scenario.title}」，证据要重新核，不能拿旧结论套新消息。”`,
    };
  }
  return null;
}
