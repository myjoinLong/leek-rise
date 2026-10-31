import type { LonggeChatActiveState, LonggeClueChoice, LonggeConclusion, LonggeChatState } from '../../../core/types';
import { renderLonggeReaction, renderLonggeResultReaction } from './LonggeChatResponses';
import { longgeScenarioForRun } from '../../../core/systems/longgeChatScenarios';
import { longgeClueChoicesFor } from '../../../core/systems/longgeChat';

const clueText: Record<LonggeClueChoice, string> = {
  VERIFY_ORIGIN: '核对原始来源',
  FOLLOW_REPOST: '顺着转发继续看',
  READ_TAPE: '打开成交明细',
  WATCH_PRICE: '只看价格变化',
  CHECK_NOTICE: '核对公开公告',
  ASK_GROUP: '再问群里的人',
  CHECK_GROUP_REPLY: '查看群内更正后的回复',
  CHECK_PRIVATE_CHAIN: '追查私聊转发链',
};

function clueOptions(run: LonggeChatActiveState): string {
  const notes: Record<LonggeClueChoice, string> = {
    VERIFY_ORIGIN: '查看原帖时间、发布者和出处',
    FOLLOW_REPOST: '看看群友如何转述这条消息',
    READ_TAPE: '分辨主动买卖与成交量变化',
    WATCH_PRICE: '只凭价格上涨判断利好',
    CHECK_NOTICE: '查有没有正式公开信息',
    ASK_GROUP: '向群里追问消息来源',
    CHECK_GROUP_REPLY: '检查群友对更正的回应与补充来源',
    CHECK_PRIVATE_CHAIN: '沿私聊记录追到最初转发出处',
  };
  return longgeClueChoicesFor(run).map((choice) =>
    '<button class="lc-option" type="button" data-choice="' + choice + '"><strong>' + clueText[choice] +
    '</strong><span>' + notes[choice] + '</span></button>').join('');
}

export function renderLonggeStep(run: LonggeChatActiveState): string {
  const scenario = longgeScenarioForRun(run);
  const legacyPrompts = run.caseType === 'ACCUMULATION' ? [
    ['群聊留档 09:18', '有人说“低位有人收货，马上要动了”，但没有写明依据。'],
    ['成交回放 09:28', '买卖双方都有成交，短时间内暂时看不出明确的单边趋势。'],
    ['公告对照 09:30', '群里开始讨论后续空间，公开信息栏有没有新的正式公告？'],
  ] : run.caseType === 'DISTRIBUTION' ? [
    ['群聊留档 09:18', '“公告马上出，兄弟们先上车。”消息下面没有来源链接。'],
    ['成交回放 09:28', '价格冲高时，成交回放里出现一串主动卖出。'],
    ['公告对照 09:30', '群里说“已经确认”，但公开信息栏还没有正式公告。'],
  ] : [
    ['群聊留档 09:18', '龙哥转来一条公司公告链接，称“这次有正式出处，先核实再看盘”。'],
    ['成交回放 09:28', '公告发布后，成交回放里主动买入增加，价格随之抬高。'],
    ['公告对照 09:30', '群消息称公告已确认，公开信息栏里能否找到原文？'],
  ];
  const prompt = scenario
    ? [
      ['群聊留档 09:18', scenario.groupMessage],
      ['成交回放 09:28', scenario.tapeMessage],
      ['公告对照 09:30', scenario.noticeMessage],
    ][run.step]
    : legacyPrompts[run.step];
  const openingOptions = run.scenarioVersion === 3 && run.priorConclusion && !run.openingChoice && run.step === 0 && run.clues.length === 0
    ? '<button class="lc-option" type="button" data-opening-choice="POST_CORRECTION"><strong>把更正发回群里</strong><span>让群友看到上次判断已重新核对</span></button>' +
      '<button class="lc-option" type="button" data-opening-choice="KEEP_PRIVATE"><strong>先留在私聊里</strong><span>今天从新线索开始，不让旧结论带方向</span></button>'
    : null;
  const optionsTitle = openingOptions ? '上回那条消息怎么处理？' : '你要核查什么？';
  return '<section class="lc-panel"><p class="lc-progress">线索 ' + (run.step + 1) + ' / 3</p>' +
    (scenario ? '<div class="lc-scenario"><span>今日事件</span><strong>' + scenario.title + '</strong></div>' : '') +
    '<div class="lc-message"><strong>' + prompt?.[0] + '</strong><p>' + prompt?.[1] + '</p></div>' +
    renderLonggeReaction(run) + '<h2>' + optionsTitle + '</h2><div class="lc-options">' + (openingOptions ?? clueOptions(run)) + '</div>' +
    renderEvidence(run) +
    '<button class="lc-abandon" type="button" data-action="abandon">退出调查（放弃今天的情报）</button></section>';
}

function renderEvidence(run: LonggeChatActiveState): string {
  const scenario = longgeScenarioForRun(run);
  return run.clues.length ? '<ul class="lc-evidence">' + run.clues.map((clue) =>
    '<li><strong>' + clueText[clue] + '：</strong>' + findingFor(clue, run.caseType, scenario) + '</li>').join('') + '</ul>' : '';
}

function findingFor(
  clue: LonggeClueChoice,
  caseType: LonggeChatActiveState['caseType'],
  scenario: ReturnType<typeof longgeScenarioForRun>,
): string {
  const findings: Record<LonggeClueChoice, Record<LonggeChatActiveState['caseType'], string>> = {
    VERIFY_ORIGIN: {
      ACCUMULATION: '原始消息没有可核验的正式来源。',
      DISTRIBUTION: '原始截图日期是上周，今天的消息只是重新转发。',
      CATALYST: '链接指向公司正式公告，发布时间早于群内转发。',
    },
    FOLLOW_REPOST: {
      ACCUMULATION: '几名群友重复同一条说法，仍没有提供出处。',
      DISTRIBUTION: '几名群友都转自同一张没有出处的截图。',
      CATALYST: '多名群友重复转发，但没有人继续核对公告原文。',
    },
    READ_TAPE: {
      ACCUMULATION: '成交买卖双方都有，短窗口不足以确认方向。',
      DISTRIBUTION: '成交回放里出现连续主动卖出，价格上涨不能说明买盘更强。',
      CATALYST: '公告发布后主动买入增多；成交方向与公告内容一致。',
    },
    WATCH_PRICE: {
      ACCUMULATION: '窄幅波动不能证明资金正在吸筹。',
      DISTRIBUTION: '价格短暂冲高，但单看涨幅无法确认利好真假。',
      CATALYST: '价格在公告后上涨，但价格反应本身不能替代来源核验。',
    },
    CHECK_NOTICE: {
      ACCUMULATION: '公开信息栏暂时没有能确认方向的正式公告。',
      DISTRIBUTION: '公开信息栏没有找到与群消息对应的正式公告。',
      CATALYST: '公开信息栏存在对应公告，发布时间为 09:12。',
    },
    ASK_GROUP: {
      ACCUMULATION: '群友仍在猜测，没有补充可核验的信息。',
      DISTRIBUTION: '群友只说“朋友透露”，仍然拿不出原始来源。',
      CATALYST: '群友提供了链接，但仍应以公开公告原文为准。',
    },
    CHECK_GROUP_REPLY: {
      ACCUMULATION: '群友在更正下面追问原出处，仍没人给出正式链接。',
      DISTRIBUTION: '有人指出截图日期不对；龙哥在群里承认误转，但公告栏仍无对应公告。',
      CATALYST: '群友补上官方公告链接，来源可以复核；后续走势仍不确定。',
    },
    CHECK_PRIVATE_CHAIN: {
      ACCUMULATION: '私聊转发链最后停在“朋友说”，没有原文。',
      DISTRIBUTION: '私聊记录能追到一张过期截图，转发链没有当天公告。',
      CATALYST: '私聊里的转发最终指向公司公告原文，来源可复核；结果未保证。',
    },
  };
  const finding = findings[clue][caseType];
  if (!scenario) return finding;
  const checkItem = clue === 'READ_TAPE' || clue === 'WATCH_PRICE' ? scenario.tape : scenario.record;
  return finding + ' 本案核对点：' + checkItem + '。';
}

export function renderLonggeConclusion(run: LonggeChatActiveState): string {
  const scenario = longgeScenarioForRun(run);
  return '<section class="lc-panel"><p class="lc-progress">线索核对完成 · ' + run.clues.length + ' / 3</p>' +
    (scenario ? '<div class="lc-scenario"><span>今日事件</span><strong>' + scenario.title + '</strong></div>' : '') +
    '<div class="lc-message"><strong>把时间线拼起来</strong><p>「' + (scenario?.title ?? '群聊消息') + '」的来源、成交方向和公开公告能否互相印证？</p></div>' +
    '<h2>你的判断是？</h2><div class="lc-options">' +
    '<button class="lc-option" type="button" data-conclusion="DISTRIBUTION"><strong>有人借利好出货</strong><span>消息造势，成交痕迹偏向卖压</span></button>' +
    '<button class="lc-option" type="button" data-conclusion="REAL_CATALYST"><strong>确有真实利好</strong><span>认为上涨有公开信息支撑</span></button>' +
    '<button class="lc-option" type="button" data-conclusion="INSUFFICIENT"><strong>证据还不够</strong><span>暂不据此形成交易方向</span></button>' +
    '</div>' + renderEvidence(run) + '<button class="lc-abandon" type="button" data-action="abandon">退出调查（放弃今天的情报）</button></section>';
}

export function renderLonggeResult(run: Extract<LonggeChatState, { status: 'RESULT' }>): string {
  const scenario = longgeScenarioForRun(run);
  const verdict = run.correct ? '符合当前线索' : '与线索不符';
  const confidence = run.intel.confidence === 'HIGH' ? '较高' : run.intel.confidence === 'LOW' ? '有限' : '未形成方向';
  const review = run.caseType === 'ACCUMULATION'
    ? run.conclusion === 'INSUFFICIENT'
      ? '消息没有可核验来源，成交方向也不明确；暂时没有足够依据把群聊传闻当成交易信号。'
      : '你选择“' + conclusionText(run.conclusion) + '”，但来源没有核验通过、成交方向不明确，公告栏也没有对应内容，因此现有线索不支持这个判断。'
    : run.conclusion === 'INSUFFICIENT'
      ? run.correct
        ? '你手上的可靠证据不够完整，选择先不形成方向判断，是对信息质量的谨慎处理。'
        : '这次检查已经找到足够的方向性证据；继续选择“证据不足”会错过已经能核验的信息。'
      : run.correct
        ? run.intel.confidence === 'HIGH'
          ? '你的判断与来源、成交和公告相互印证；这条情报仍不保证后续行情。'
          : '你的判断与案例方向一致，但可靠证据还不充分，情报可信度有限。'
        : run.caseType === 'DISTRIBUTION'
          ? '复盘线索指向旧消息和主动卖出，公开信息也没有对应公告；这些证据不支持真实利好判断。'
          : '公开公告存在，且发布后的主动买入有所增加；这些证据支持真实消息，但仍不保证行情延续。';
  const reviewRows = run.clues.map((clue) =>
    '<li><strong>' + clueText[clue] + '：</strong>' + findingFor(clue, run.caseType, scenario) + '</li>',
  ).join('');
  return '<section class="lc-panel lc-result"><p class="lc-progress">群聊鉴伪回执</p>' +
    (scenario ? '<div class="lc-scenario"><span>今日事件</span><strong>' + scenario.title + '</strong></div>' : '') + '<h2>线索复盘</h2>' +
    '<p class="lc-verdict">你的判断：' + conclusionText(run.conclusion) + ' · ' + verdict + '</p>' +
    renderLonggeResultReaction(run) +
    '<p class="lc-receipt">' + review + '</p><ul class="lc-review-list">' + reviewRows + '</ul>' +
    '<p class="lc-intel">带回交易屏：' + run.intel.message + '</p>' +
    '<p class="lc-confidence">情报可信度：' + confidence + '。情报只供参考，不会自动下单。</p>' +
    '<button class="lc-return" type="button" data-action="return">带着线索回街区</button></section>';
}

function conclusionText(conclusion: LonggeConclusion): string {
  if (conclusion === 'DISTRIBUTION') return '有人借利好出货';
  if (conclusion === 'REAL_CATALYST') return '确有真实利好';
  return '证据还不够';
}

export function isLonggeConclusion(value: string | undefined): value is LonggeConclusion {
  return value === 'DISTRIBUTION' || value === 'REAL_CATALYST' || value === 'INSUFFICIENT';
}
