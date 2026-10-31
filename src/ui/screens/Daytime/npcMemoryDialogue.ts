import type { NpcActivityId, NpcActivityMemoryTrace, NpcId } from '../../../core/npcActivityMemoryTypes';

const activityForNpc: Record<NpcId, NpcActivityId> = {
  jiuge: 'JIUGE_NEGOTIATION', longge: 'LONGGE_CHAT', chen: 'CHEN_DOSSIER',
  bodhisattva: 'BODHISATTVA_CHART_LESSON', xiaolian: 'XIAOLIAN_STREAM', sujie: 'SUJIE_CAFE_SHIFT',
  zhou: 'ZHOU_BROKER_NEGOTIATION', wang: 'WANG_FACTORY', laoliang: 'LAOLIANG_MARKET_STALL',
  sweeper: 'SWEEPER_RISK_REPLAY', delivery: 'WANG_DELIVERY', zheng: 'ZHENG_BIKE_REPAIR', phoneflip: 'PHONE_FLIP',
};

const choiceLabels: Partial<Record<NpcActivityId, Record<string, string>>> = {
  JIUGE_NEGOTIATION: {
    ASK_JIUGE_HISTORY: '问九哥为何逐笔记账',
    SHOW_LEDGER: '摊开账本', BLUFF_CASHFLOW: '报出现金流', PROVE_INCOME: '拿收入记录', PROMISE_FULL: '承诺全额偿还',
    ASK_INTEREST_GRACE: '申请利息宽限', SIGN_RATE_RESTRUCTURE: '签降息方案', SIGN_INSTALLMENTS: '签分期方案', SIGN_STANDARD: '按标准条款',
  },
  LONGGE_CHAT: {
    VERIFY_ORIGIN: '核对原始来源', FOLLOW_REPOST: '追转发链', READ_TAPE: '看成交明细', WATCH_PRICE: '盯价格走势',
    CHECK_NOTICE: '核对公告', ASK_GROUP: '询问群友',
  },
  CHEN_DOSSIER: {
    VERIFY_FILING: '核查公告', SKIM_PITCH: '浏览宣传稿', CHECK_SUPPLIER: '核对供应商', ASK_SALES: '询问销售',
    MATCH_INVOICES: '比对发票', READ_FORECAST: '查看预测',
    CHEN_OPENING_APPEND_REVISION: '并列归档新旧结论', CHEN_OPENING_KEEP_SEPARATE: '让今天材料独立归档',
  },
  BODHISATTVA_CHART_LESSON: {
    RIDE_HIGHER_LOWS: '观察更高低点', CHASE_LAST_SPIKE: '追最后一根拉升', SELL_FIRST_PULLBACK: '首次回落就卖',
    WAIT_FOR_VOLUME: '等待量能确认', BUY_ANY_BREAKOUT: '看到突破就买', IGNORE_VOLUME: '忽略成交量',
    WAIT_FOR_RANGE_BREAK: '等区间有效突破', ASSUME_REVERSAL: '直接猜反转', DOUBLE_POSITION: '加倍仓位',
  },
  XIAOLIAN_STREAM: {
    HONEST_REVIEW: '如实测评', HYPE_CLAIM: '夸大宣传', ANSWER_QUESTIONS: '回答质疑', REPEAT_CTA: '重复催单',
    TRANSPARENT_DEAL: '说明合作关系', FAKE_SCARCITY: '制造稀缺感',
  },
  SUJIE_CAFE_SHIFT: {
    BLACK_COFFEE: '黑咖啡', OAT_LATTE: '燕麦拿铁', CAKE: '蛋糕', SUGAR_FREE_LATTE: '无糖拿铁',
    CARAMEL_MOCHA: '焦糖摩卡', SWEET_TEA: '甜茶', WARM_MILK: '温热牛奶', DOUBLE_ESPRESSO: '双份浓缩', ICED_TEA: '冰茶',
  },
  ZHOU_BROKER_NEGOTIATION: { PLAN_STANDARD: '保留标准费率', PLAN_LOW_COMMISSION: '选择优惠费率' },
  WANG_FACTORY: { REWORK: '返工复核', PASS: '放行', HOLD: '隔离待复核' },
  LAOLIANG_MARKET_STALL: {
    THERMOS_VALUE: '保温杯薄利', THERMOS_STANDARD: '保温杯常规价', THERMOS_PREMIUM: '保温杯高价',
    RAINCOAT_VALUE: '雨衣薄利', RAINCOAT_STANDARD: '雨衣常规价', RAINCOAT_PREMIUM: '雨衣高价',
    CABLE_VALUE: '数据线薄利', CABLE_STANDARD: '数据线常规价', CABLE_PREMIUM: '数据线高价',
  },
  WANG_DELIVERY: { ALLEY: '走小巷', MAIN: '走主路', RUSH: '赶时间', STEADY: '稳妥配送' },
  ZHENG_BIKE_REPAIR: {
    TEST_BATTERY_FAULT: '测出电池故障', TEST_BATTERY_CLEAR: '确认电池无故障',
    TEST_BRAKES_FAULT: '测出刹车故障', TEST_BRAKES_CLEAR: '确认刹车无故障',
    TEST_CONTROLLER_FAULT: '测出控制器故障', TEST_CONTROLLER_CLEAR: '确认控制器无故障',
  },
  PHONE_FLIP: {
    PASS: '放弃收购', ASK_QUICK: '按报价快修', ASK_REFURB: '按报价整备', BARGAIN_QUICK: '议价后快修', BARGAIN_REFURB: '议价后整备',
  },
};

const outcomeLabels: Record<string, string> = {
  DISTRIBUTION: '有人借利好出货', REAL_CATALYST: '存在真实催化', INSUFFICIENT: '证据不足',
  BUY: '倾向买入', AVOID: '选择回避', WAIT: '选择等待',
  INTEREST_GRACE: '申请利息宽限', RATE_RESTRUCTURE: '办理降息', INSTALLMENTS: '办理分期', STANDARD_TERMS: '沿用标准条款',
  STANDARD: '标准费率', LOW_COMMISSION: '优惠费率',
};

function money(value: number): string {
  return `¥${Math.abs(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
}

function signedMoney(value: number): string {
  return `${value >= 0 ? '+' : '-'}${money(value)}`;
}

function choicesFor(trace: NpcActivityMemoryTrace): string[] {
  const labels = choiceLabels[trace.activityId];
  return trace.choiceKeys.slice(0, 3).map((choice) => {
    const label = labels?.[choice];
    if (label) return label;
    if (choice.startsWith('ALLOCATION_')) return `仓位 ${choice.slice('ALLOCATION_'.length)}%`;
    if (choice.startsWith('REPAIR_')) {
      const [, part, verification, accuracy] = choice.split('_');
      const partName = part === 'BATTERY' ? '电池' : part === 'BRAKES' ? '刹车' : part === 'CONTROLLER' ? '控制器' : part;
      return `${verification === 'VERIFIED' ? '检测后' : '未检测'}修${partName}${accuracy === 'CORRECT' ? '（匹配）' : '（未匹配）'}`;
    }
    return choice;
  });
}

function voiceFor(npcId: NpcId, trace: NpcActivityMemoryTrace): string | null {
  if (trace.activityId !== activityForNpc[npcId]) return null;
  const choices = choicesFor(trace);
  const choiceSummary = choices.join('、');
  const outcome = trace.outcomeCode ? outcomeLabels[trace.outcomeCode] ?? trace.outcomeCode : null;
  const amount = trace.cashDelta === null ? null : money(trace.cashDelta);

  switch (npcId) {
    case 'jiuge': {
      if (!outcome) return null;
      return trace.choiceKeys.includes('ASK_JIUGE_HISTORY')
        ? `九哥把上回的账页压平：“你问过我为什么每笔都分开记。那张只写总数的糊涂账，我到现在还记得。现在每一栏都得能对回凭据。”你选的是${outcome}，我照签字的条件记。`
        : `九哥把上回的条款翻出来：“你选的是${outcome}，我照签下的条件记；本金和利息都不会凭空消失。”`;
    }
    case 'longge': return `龙哥瞄了眼群聊记录：“上回你查了${choiceSummary || '几条线索'}。转发不算原始证据，今天这条还得重新验。”`;
    case 'chen': {
      const evidenceSummary = choicesFor({
        ...trace,
        choiceKeys: trace.choiceKeys.filter((choice) => !choice.startsWith('CHEN_OPENING_')),
      }).join('、');
      const archiveChoice = trace.choiceKeys.includes('CHEN_OPENING_APPEND_REVISION')
        ? '你上次要求并列归档新旧结论，我把修正和依据都留在案卷里。'
        : trace.choiceKeys.includes('CHEN_OPENING_KEEP_SEPARATE')
          ? '你上次要求新案卷独立记录，我没有拿旧结论替今天的材料作证。'
          : null;
      return `陈总把上次的资料夹推过来：“你核过${evidenceSummary || '几份材料'}，最后${outcome ?? '没有记录结论'}；缺的凭证，我不会替它补成事实。${archiveChoice ?? ''}”`;
    }
    case 'bodhisattva': return `K线菩萨在旧讲义上画了个圈：“上回三张图你答对 ${trace.score ?? 0}/3。记住做对题不等于预测对了市场。”`;
    case 'xiaolian': return `小镰刀看了眼上场回放：“你选了${choiceSummary || '自己的讲法'}，那场进账${amount ?? '¥0'}，流量变化 ${trace.score ?? 0}。这两笔我分开记。”`;
    case 'sujie': return `苏姐把上次的单子夹进本子：“三位客人里你听准了 ${trace.score ?? 0} 杯，收入${amount ?? '¥0'}。${choiceSummary ? `你选过${choiceSummary}。` : ''}今天的客人还得重新听需求。”`;
    case 'zhou': {
      const review = trace.brokerContractReview;
      if (!outcome) return null;
      if (!review) return `周经理指着上次的方案：“你选了${outcome}，当时实际支出${amount ?? '¥0'}。后面值不值，要拿真实成交记录算。”`;
      const savings = review.netSavingsVsStandard;
      const result = savings >= 0 ? `比标准费率少支出${money(savings)}` : `比标准费率多支出${money(savings)}`;
      return `周经理把上期账单摊开：“你选了${outcome}。预估成交额${money(review.projectedTurnover ?? 0)}，实际${money(review.actualTurnover)}；含服务费后${result}。这次得重新估，不能拿上次的数字糊弄你。”`;
    }
    case 'wang': {
      const passed = trace.choiceKeys.filter((choice) => choice === 'PASS').length;
      const reworked = trace.choiceKeys.filter((choice) => choice === 'REWORK').length;
      const held = trace.choiceKeys.filter((choice) => choice === 'HOLD').length;
      return `王老板翻出上次的工单：“你放行 ${passed} 项、返工 ${reworked} 项、隔离 ${held} 项，结算${amount ?? '¥0'}。这次还是按证据走。”`;
    }
    case 'laoliang': return `老梁指着旧价签：“上回你试过${choiceSummary || '几种定价'}，到手${amount ?? '¥0'}。客群换了，旧价格不一定还合适。”`;
    case 'sweeper': return `扫地僧看了眼复盘本：“上次三段仓位是${choiceSummary || '没有加仓'}，有 ${trace.score ?? 0} 段守住压力预算。数字记住就好，别把它当下次答案。”`;
    case 'delivery': return `调度员点开上回路线：“你选过${choiceSummary || '不同路线'}，结算${amount ?? '¥0'}。今天的路况和时限要重新看。”`;
    case 'zheng': {
      const repairs = trace.choiceKeys.filter((choice) => choice.startsWith('REPAIR_'));
      return `郑师傅翻到上次维修记录：“你做了 ${repairs.length} 次处理，质量奖${trace.score ? money(trace.score) : '¥0'}，合计收入${amount ?? '¥0'}。每台车还得先测再修。”`;
    }
    case 'phoneflip': return `阿浩掀开上次的收购账：“你当时${choiceSummary || '逐台看过报价'}，这单盈亏${trace.cashDelta === null ? '未记录' : signedMoney(trace.cashDelta)}。今天的机况不能照搬上次判断。”`;
  }
}

function continuityVoice(
  npcId: NpcId,
  previous: NpcActivityMemoryTrace,
  latest: NpcActivityMemoryTrace,
): string | null {
  if (previous.activityId !== latest.activityId || latest.activityId !== activityForNpc[npcId]) return null;
  const previousVisit = previous.day === undefined ? '上回' : `第 ${previous.day} 天`;
  const latestVisit = latest.day === undefined ? '这回' : `第 ${latest.day} 天`;
  const previousOutcome = previous.outcomeCode ? outcomeLabels[previous.outcomeCode] ?? previous.outcomeCode : '未记录结论';
  const latestOutcome = latest.outcomeCode ? outcomeLabels[latest.outcomeCode] ?? latest.outcomeCode : '未记录结论';
  const previousAmount = previous.cashDelta === null ? null : signedMoney(previous.cashDelta);
  const latestAmount = latest.cashDelta === null ? null : signedMoney(latest.cashDelta);

  switch (npcId) {
    case 'jiuge':
      return previous.outcomeCode && latest.outcomeCode
        ? `九哥翻着两次协商记录：“${previousVisit}是${previousOutcome}，${latestVisit}是${latestOutcome}。协议各自生效，旧账不会自动改写。”`
        : null;
    case 'longge':
      return previous.outcomeCode && latest.outcomeCode
        ? `龙哥对着两条群记录：“你${previousVisit}判断${previousOutcome}，${latestVisit}判断${latestOutcome}。结论可以变，今天的来源和成交还得重新核。”`
        : null;
    case 'chen':
      return previous.score !== null && latest.score !== null
        ? `陈总把两份调查并排：“${previousVisit}找到 ${previous.score} 条可靠证据，${latestVisit}找到 ${latest.score} 条。没核实的部分，我仍不会写成事实。”${latest.choiceKeys.includes('CHEN_OPENING_APPEND_REVISION') ? ' 他把修订依据也夹进了案卷。' : latest.choiceKeys.includes('CHEN_OPENING_KEEP_SEPARATE') ? ' 他把今天的材料留在独立案卷里。' : ''}`
        : null;
    case 'bodhisattva':
      return previous.score !== null && latest.score !== null
        ? `K线菩萨在讲义边上记下两次成绩：“${previousVisit} ${previous.score}/3，${latestVisit} ${latest.score}/3。练习分数说明观察过程，不替下一段走势作答。”`
        : null;
    case 'xiaolian':
      return previousAmount !== null && latestAmount !== null
        ? `小镰刀调出两场回放：“${previousVisit}进账${previousAmount}、流量变化 ${previous.score ?? 0}；${latestVisit}进账${latestAmount}、流量变化 ${latest.score ?? 0}。到账和热度分开看。”`
        : null;
    case 'sujie':
      return previous.score !== null && latest.score !== null
        ? `苏姐把两张点单夹在一起：“${previousVisit}听准 ${previous.score} 杯，${latestVisit}听准 ${latest.score} 杯。熟客也要重新问需求，不能照着旧菜单猜。”`
        : null;
    case 'zhou':
      return previous.outcomeCode && latest.outcomeCode
        ? `周经理把两期合同摊开：“${previousVisit}${previousOutcome}，实际${previousAmount ?? '费用未记录'}；${latestVisit}${latestOutcome}，实际${latestAmount ?? '费用未记录'}。还是按真实成交核算。”`
        : null;
    case 'wang':
      return previousAmount !== null && latestAmount !== null
        ? `王老板把两张工单并排：“${previousVisit}质量奖${money(previous.score ?? 0)}、收入${previousAmount}；${latestVisit}质量奖${money(latest.score ?? 0)}、收入${latestAmount}。每批货都得按新证据检查。”`
        : null;
    case 'laoliang':
      return previousAmount !== null && latestAmount !== null
        ? `老梁拿出两张结算单：“${previousVisit}到手${previousAmount}，${latestVisit}到手${latestAmount}。客群和行情换了，老价格不能直接照搬。”`
        : null;
    case 'sweeper':
      return previous.score !== null && latest.score !== null
        ? `扫地僧翻过两页复盘：“${previousVisit}有 ${previous.score} 段守住压力预算，${latestVisit}有 ${latest.score} 段。守住预算不等于预测正确，先记下仓位。”`
        : null;
    case 'delivery':
      return previousAmount !== null && latestAmount !== null
        ? `调度员对着两张排班单：“${previousVisit}路线${choicesFor(previous).join('、')}，结算${previousAmount}；${latestVisit}路线${choicesFor(latest).join('、')}，结算${latestAmount}。时限和路况每次都要重看。”`
        : null;
    case 'zheng':
      return previousAmount !== null && latestAmount !== null
        ? `郑师傅把两张维修单压平：“${previousVisit}质量奖${money(previous.score ?? 0)}、收入${previousAmount}；${latestVisit}质量奖${money(latest.score ?? 0)}、收入${latestAmount}。旧故障不能替新车作证。”`
        : null;
    case 'phoneflip':
      return previousAmount !== null && latestAmount !== null
        ? `阿浩在收购账上圈出两笔：“${previousVisit}盈亏${previousAmount}，${latestVisit}盈亏${latestAmount}。机况和行情都变了，今天这台得重新验。”`
        : null;
  }
}

export function memoryDialogueFor(npcId: NpcId, traces: readonly NpcActivityMemoryTrace[]): string | null {
  const latest = traces.at(-1);
  if (!latest) return null;
  const previous = traces.at(-2);
  return previous ? continuityVoice(npcId, previous, latest) : voiceFor(npcId, latest);
}
