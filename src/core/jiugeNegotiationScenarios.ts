import { seededPermutationAt } from './scenarioDeck';

export interface JiugeNegotiationScenario {
  context: string;
  openingLine: string;
}

const scenarios: readonly JiugeNegotiationScenario[] = [
  { context: '柜台上的旧账本摊开着，几处手写利息被红笔圈出。', openingLine: '“先别急着谈条件。本金、利息、费用，三笔账分开对。”' },
  { context: '一张刚打印的欠款清单压在算盘下，纸角还没裁齐。', openingLine: '“你今天带来的数字，要能和这张清单对上。”' },
  { context: '柜台边放着一叠空白回执，最上面那张写着今天的日期。', openingLine: '“谈完就落纸。口头说过，不算数。”' },
  { context: '算盘珠停在一串数上，九哥把账页推到你面前。', openingLine: '“先核账。哪一项不对，现在指出来。”' },
  { context: '墙上的还款日历翻到了当前这页，几个结算日被划了线。', openingLine: '“你要谈的是下一期怎么付，不是把日子往后说。”' },
  { context: '一盏台灯照着利息栏，旁边摆着没有签字的协议样本。', openingLine: '“协议先看清，再决定签不签。签字之后按纸面执行。”' },
  { context: '九哥把计算器归零，又把欠款明细摆正。', openingLine: '“我不替你猜现金流。账上有多少，就按多少谈。”' },
  { context: '收据夹里露出几张旧回执，日期与金额都写得很清楚。', openingLine: '“过去怎么付的可以核，未来能不能付得看凭据。”' },
  { context: '柜台上的钢笔压着一份未签协议，签字栏仍然空着。', openingLine: '“你可以拒绝。先把费用和期限看完再选。”' },
  { context: '九哥把本金、计息和周期费用分列在三行，不让数字挤在一起。', openingLine: '“别把总数混成一笔。每一项怎么算，我都写给你看。”' },
  { context: '门外的卷帘门只开了一半，柜台里仍亮着一盏工作灯。', openingLine: '“时间不多也得把账说清。你先拿材料。”' },
  { context: '一张现金流水单被夹在账页里，入账日期一笔笔排开。', openingLine: '“流水我只认已经到账的，预期收入不能拿来抵今天的账。”' },
  { context: '桌面上摆着两种不同颜色的协议封面，条款页都朝上。', openingLine: '“条件可以比，先看总成本，别只盯着每期少几个字。”' },
  { context: '算盘旁的便签写着“本金不变”，字迹被反复描过。', openingLine: '“宽限不是免债，降息也不是免本金。你先分清楚。”' },
  { context: '九哥把一张费用明细移到最上方，其他纸张收在一旁。', openingLine: '“先看这次要付什么，再谈之后的安排。”' },
  { context: '柜台上有一枚旧印章，旁边整齐放着待盖的回执。', openingLine: '“没谈成也没关系，没签字就不会多出一份新合同。”' },
  { context: '一张周结单被折成两半，利息和其他费用分别标了记号。', openingLine: '“你先核对周结单。少看一栏，后面就可能多算一笔。”' },
  { context: '九哥把笔递过来，却没有把协议推到你手边。', openingLine: '“先选你承担得起的方案。签不签，最后由你定。”' },
  { context: '桌角压着一份收入凭据，旁边留出了核验日期的位置。', openingLine: '“收入可以证明还款能力，但得是已经发生的。”' },
  { context: '账本按月份分了页，最新一页停在当前结算周期。', openingLine: '“我们只按现在生效的账单谈，不把旧条款混进来。”' },
  { context: '柜台上放着一张空白还款计划表，期数栏尚未填写。', openingLine: '“分期看每次怎么还，也要看八期之后还剩多少。”' },
  { context: '九哥把欠款总额盖住，只留下本金和费用两列。', openingLine: '“先看构成。总额吓不吓人，不影响每一项怎么计算。”' },
  { context: '一本旧账簿翻到中间，几笔已结清的费用被划去。', openingLine: '“已结的我不会再算。今天只谈还挂在账上的部分。”' },
  { context: '桌上的小票按日期排成一列，最晚的一张还没装订。', openingLine: '“拿得出凭据就摆出来。没有凭据，我只能按现账处理。”' },
  { context: '九哥在白纸上画了三栏：现金、欠款、下一期费用。', openingLine: '“先看这三栏。能动用的现金和欠款不是一回事。”' },
  { context: '协议样本旁放着一支笔和一张费用说明，签约费单独标出。', openingLine: '“要降息先看签约费。省下多少、付出多少，都算清。”' },
  { context: '账单被透明夹板压平，修改过的数字都留着原始记录。', openingLine: '“数字改过也得留痕。我们按能复核的记录来。”' },
  { context: '九哥把椅子往柜台前挪了半步，手指停在入账栏。', openingLine: '“你说能周转，就把已入账的部分给我看。”' },
  { context: '几份空回执叠在收款盒旁，最上面没有预填任何金额。', openingLine: '“金额不会替你填。每一笔写多少，先把理由讲明白。”' },
  { context: '柜台上没有摆协议，只放着一页当期账单和一张计算纸。', openingLine: '“今天先把账讲明白。继续按原条款也可以。”' },
];

const scenarioSalt = 0xA11CE;

export const jiugeNegotiationScenarioCount = scenarios.length;

export function getJiugeNegotiationScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), scenarios.length, seed, scenarioSalt);
}

export function getJiugeNegotiationScenario(index: number): JiugeNegotiationScenario | null {
  return Number.isInteger(index) && index >= 0 && index < scenarios.length ? scenarios[index] ?? null : null;
}
