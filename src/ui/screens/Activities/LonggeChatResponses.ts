import type { LonggeChatActiveState, LonggeChatResultState, LonggeClueChoice } from '../../../core/types';
import { longgeScenarioForRun } from '../../../core/systems/longgeChatScenarios';

const longgeReactions: Record<LonggeChatActiveState['caseType'], Record<LonggeClueChoice, string>> = {
  ACCUMULATION: {
    VERIFY_ORIGIN: '“问得细是好事。群里这条我也没找到原出处，别把猜测当内幕。”',
    FOLLOW_REPOST: '“转的人是多，可一群人复读也不等于多了一份证据。”',
    READ_TAPE: '“买卖都有，暂时看不出谁占上风。先别替我把话说满。”',
    WATCH_PRICE: '“一根线红了不算什么，烧烤火候都得看一会儿。”',
    CHECK_NOTICE: '“没有公告就先记着没有。等真有东西，再聊下一步。”',
    ASK_GROUP: '“他们要是说有朋友知道，就让朋友把原文拿出来。”',
    CHECK_GROUP_REPLY: '“群里有人肯追问来源是好事，别把回复热闹当成证据。”',
    CHECK_PRIVATE_CHAIN: '“转发链查到底还是要看原文，朋友转来的不算出处。”',
  },
  DISTRIBUTION: {
    VERIFY_ORIGIN: '“这张截图是旧的……我转得急，没看清日期。你先按原文来。”',
    FOLLOW_REPOST: '“看吧，传了好几手，还是没人说清最早是谁发的。”',
    READ_TAPE: '“价格冲上去，卖单倒不少。这个我不替群里圆。”',
    WATCH_PRICE: '“涨得快也可能是给人下车的机会，别光盯着那一截红线。”',
    CHECK_NOTICE: '“没有正式公告，我知道。刚才那句‘确认了’说早了。”',
    ASK_GROUP: '“又是‘朋友说的’。这几个字我也听腻了。”',
    CHECK_GROUP_REPLY: '“有人指出日期不对，我把更正留在群里，免得大家照着旧图上车。”',
    CHECK_PRIVATE_CHAIN: '“这条私聊最后还是绕回旧截图。没公告，我不该说确认了。”',
  },
  CATALYST: {
    VERIFY_ORIGIN: '“原文在这儿。公告是真的，后面怎么走我可不敢替市场打包票。”',
    FOLLOW_REPOST: '“群里转得挺热闹，不过还是点回公告原文看一遍。”',
    READ_TAPE: '“公告后主动买入多了些，至少这次盘面能对上消息。”',
    WATCH_PRICE: '“价格涨了，但别把涨幅当成第二份公告。”',
    CHECK_NOTICE: '“原文找到了。你看，核实比听我说一句靠谱。”',
    ASK_GROUP: '“有人给了链接？好，还是以公告原文为准，别只看群截图。”',
    CHECK_GROUP_REPLY: '“群里补出的公告链接能点回原文；真实归真实，涨跌我不替市场担保。”',
    CHECK_PRIVATE_CHAIN: '“私聊转发最后能回到公告原文。至少来源核过了，后面仍得看盘。”',
  },
};

function renderAside(action: string, reaction: string): string {
  return '<aside class="lc-npc-reaction"><span class="lc-npc-mark" aria-hidden="true">龙</span>' +
    '<p><strong>' + action + '</strong><br>' + reaction + '</p></aside>';
}

function scenarioReaction(
  run: Pick<LonggeChatActiveState, 'caseType' | 'scenarioVersion' | 'scenarioIndex' | 'priorConclusion' | 'priorOpeningChoice'>,
  clue: LonggeClueChoice,
): string {
  const scenario = longgeScenarioForRun(run);
  if (!scenario) return longgeReactions[run.caseType][clue];
  const { title, record, tape } = scenario;
  const isRumor = run.caseType === 'ACCUMULATION';
  const isOldRumor = run.caseType === 'DISTRIBUTION';
  if (clue === 'CHECK_GROUP_REPLY') {
    if (isRumor) return `“群友在「${title}」的更正下追问出处，还是没人能贴原文。”`;
    if (isOldRumor) return `“有人指出「${title}」的${record}对不上，我在群里认了误转，但这不等于事情有公告。”`;
    return `“群友补出的「${title}」公告链接能回到原文，来源可以核；后面走势我不担保。”`;
  }
  if (clue === 'CHECK_PRIVATE_CHAIN') {
    if (isRumor) return `“「${title}」这条私聊链最后还是‘朋友说’，没有原文。”`;
    if (isOldRumor) return `“「${title}」的${record}能追到旧截图，转发链里没有当天公告。”`;
    return `“「${title}」的私聊转发最终指向公告原文，来源能核，但不是涨跌保证。”`;
  }
  if (clue === 'VERIFY_ORIGIN') {
    if (isRumor) return `“「${title}」的原始出处我还没找到，${record}不能靠群里补。”`;
    if (isOldRumor) return `“「${title}」这张图的${record}对不上，是我转急了，我撤回。”`;
    return `“「${title}」的原文和${record}能核对上，这回确有出处，但后面走势我不担保。”`;
  }
  if (clue === 'FOLLOW_REPOST') {
    if (isRumor) return `“转了几手还是没人给「${title}」的原帖，复读再多也不是新证据。”`;
    if (isOldRumor) return `“「${title}」绕了几手还没原帖，我这次先不催大家上车。”`;
    return `“转发的人不少，最后还是得回到「${title}」的原文。”`;
  }
  if (clue === 'READ_TAPE') {
    if (isRumor) return `“你查的${tape}没有单边证据，我先不把猜测说满。”`;
    if (isOldRumor) return `“${tape}里卖盘连续，这个我不替群里圆。”`;
    return `“${tape}和公告后成交方向能对上，但不保证接着涨。”`;
  }
  if (clue === 'WATCH_PRICE') {
    if (isRumor) return `“「${title}」涨跌是一回事，不能拿价格替消息盖章。”`;
    if (isOldRumor) return '“冲高那段红线好看，卖单也是真的，不能只看一边。”';
    return '“价格涨了也不是第二份公告，别把涨幅当成证据。”';
  }
  if (clue === 'CHECK_NOTICE') {
    if (isRumor) return `“公告栏没找到「${title}」，这条先放在传闻里。”`;
    if (isOldRumor) return '“公开栏没公告，我刚才说‘确认了’说早了。”';
    return `“「${title}」的公告能查到，后面涨跌我不替市场打包票。”`;
  }
  if (isRumor) return '“可以问，但别只听‘我朋友说’，要原文链接。”';
  if (isOldRumor) return '“我来问原帖。再来一句朋友透露，我就把这条撤了。”';
  return '“有人补了链接，咱点回官方原文再确认。”';
}

export function renderLonggeReaction(run: LonggeChatActiveState): string {
  const clue = run.clues[run.clues.length - 1];
  const scenario = longgeScenarioForRun(run);
  if (!clue) {
    if (!run.priorConclusion || !scenario?.npcReply || run.step !== 0) return '';
    if (run.openingChoice === 'POST_CORRECTION') {
      return renderAside('龙哥把撤回记录翻了出来', '“行，我把上回那条更正发回群里，今天的线索还是重新核。”');
    }
    if (run.openingChoice === 'KEEP_PRIVATE') {
      return renderAside('龙哥把手机转回你这边', '“好，旧判断先留在咱俩这儿。群里今天只聊能核验的新线索。”');
    }
    return renderAside('龙哥抬头看了你一眼', scenario.npcReply);
  }
  const reaction = run.scenarioVersion === 3
    ? scenarioReaction(run, clue)
    : scenario?.npcReply ?? longgeReactions[run.caseType][clue];
  return renderAside('龙哥把手机往桌上一搁', reaction);
}

export function renderLonggeResultReaction(run: LonggeChatResultState): string {
  const scenario = longgeScenarioForRun(run);
  const clue = run.clues[run.clues.length - 1];
  if (!clue) return '';
  const reaction = scenario && run.scenarioVersion === 3
    ? scenarioReaction(run, clue)
    : longgeReactions[run.caseType][clue];
  const closing = run.correct
    ? '“这回你按证据说话，我服。情报能参考，别把我当成保票。”'
    : '“判断没对上也别硬撑。把哪条线索看漏了记住，下回重新核验。”';
  return renderAside('龙哥收起手机', reaction + '<br>' + closing);
}
