import type { GameAction } from '../../../core/reducer';
import type { GameState, LonggeChatActiveState, LonggeClueChoice, LonggeConclusion, LonggeChatState } from '../../../core/types';

const clueText: Record<LonggeClueChoice, string> = {
  VERIFY_ORIGIN: '核对原始来源',
  FOLLOW_REPOST: '顺着转发继续看',
  READ_TAPE: '打开成交明细',
  WATCH_PRICE: '只看价格变化',
  CHECK_NOTICE: '核对公开公告',
  ASK_GROUP: '再问群里的人',
};

function clueOptions(run: LonggeChatActiveState): string {
  const options: readonly (readonly { choice: LonggeClueChoice; note: string }[])[] = [
    [
      { choice: 'VERIFY_ORIGIN', note: '查看原帖时间、发布者和出处' },
      { choice: 'FOLLOW_REPOST', note: '看看群友如何转述这条消息' },
    ],
    [
      { choice: 'READ_TAPE', note: '分辨主动买卖与成交量变化' },
      { choice: 'WATCH_PRICE', note: '只凭价格上涨判断利好' },
    ],
    [
      { choice: 'CHECK_NOTICE', note: '查有没有正式公开信息' },
      { choice: 'ASK_GROUP', note: '向群里追问消息来源' },
    ],
  ];
  return (options[run.step] ?? []).map(({ choice, note }) =>
    '<button class="lc-option" type="button" data-choice="' + choice + '"><strong>' + clueText[choice] +
    '</strong><span>' + note + '</span></button>').join('');
}

function renderStep(run: LonggeChatActiveState): string {
  const prompts = run.caseType === 'ACCUMULATION' ? [
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
  const prompt = prompts[run.step];
  return '<section class="lc-panel"><p class="lc-progress">线索 ' + (run.step + 1) + ' / 3</p>' +
    '<div class="lc-message"><strong>' + prompt?.[0] + '</strong><p>' + prompt?.[1] + '</p></div>' +
    '<h2>你要核查什么？</h2><div class="lc-options">' + clueOptions(run) + '</div>' +
    renderEvidence(run) + '<button class="lc-abandon" type="button" data-action="abandon">退出调查（放弃今天的情报）</button></section>';
}

function renderEvidence(run: LonggeChatActiveState): string {
  return run.clues.length ? '<ul class="lc-evidence">' + run.clues.map((clue) =>
    '<li><strong>' + clueText[clue] + '：</strong>' + findingFor(clue, run.caseType) + '</li>').join('') + '</ul>' : '';
}

function findingFor(clue: LonggeClueChoice, caseType: LonggeChatActiveState['caseType']): string {
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
  };
  return findings[clue][caseType];
}

function renderConclusion(run: LonggeChatActiveState): string {
  return '<section class="lc-panel"><p class="lc-progress">线索核对完成 · ' + run.clues.length + ' / 3</p>' +
    '<div class="lc-message"><strong>把时间线拼起来</strong><p>消息来源、成交方向和公开公告能否互相印证？</p></div>' +
    '<h2>你的判断是？</h2><div class="lc-options">' +
    '<button class="lc-option" type="button" data-conclusion="DISTRIBUTION"><strong>有人借利好出货</strong><span>消息造势，成交痕迹偏向卖压</span></button>' +
    '<button class="lc-option" type="button" data-conclusion="REAL_CATALYST"><strong>确有真实利好</strong><span>认为上涨有公开信息支撑</span></button>' +
    '<button class="lc-option" type="button" data-conclusion="INSUFFICIENT"><strong>证据还不够</strong><span>暂不据此形成交易方向</span></button>' +
    '</div>' + renderEvidence(run) + '<button class="lc-abandon" type="button" data-action="abandon">退出调查（放弃今天的情报）</button></section>';
}

function renderResult(run: Extract<LonggeChatState, { status: 'RESULT' }>): string {
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
  const reviewClues: readonly LonggeClueChoice[] = ['VERIFY_ORIGIN', 'READ_TAPE', 'CHECK_NOTICE'];
  const reviewRows = reviewClues.map((clue) =>
    '<li><strong>' + clueText[clue] + '：</strong>' + findingFor(clue, run.caseType) + '</li>',
  ).join('');
  return '<section class="lc-panel lc-result"><p class="lc-progress">群聊鉴伪回执</p><h2>线索复盘</h2>' +
    '<p class="lc-verdict">你的判断：' + conclusionText(run.conclusion) + ' · ' + verdict + '</p>' +
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

function isConclusion(value: string | undefined): value is LonggeConclusion {
  return value === 'DISTRIBUTION' || value === 'REAL_CATALYST' || value === 'INSUFFICIENT';
}

export function createLonggeChatScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const screen = document.createElement('main');
  screen.className = 'lc-screen';
  screen.innerHTML = [
    '<style>',
    '.lc-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f8efd5;font-family:"Courier New",monospace;background:#1c2327}',
    '.lc-backdrop{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 76%;image-rendering:pixelated;opacity:.78}',
    '.lc-screen::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,21,25,.08),rgba(16,21,25,.32) 35%,rgba(16,21,25,.82));content:""}',
    '.lc-header{position:absolute;z-index:1;top:var(--safe-top);right:12px;left:12px;padding:12px;border:2px solid #c2a86b;background:rgba(26,31,34,.94);box-shadow:4px 4px #000}',
    '.lc-kicker{margin:0 0 5px;color:#f0bd63;font-size:10px;letter-spacing:1px}.lc-title{margin:0;color:#fff0c5;font-size:19px}.lc-stats{margin:7px 0 0;color:#d8d1bc;font-size:11px}',
    '.lc-content{position:absolute;z-index:2;right:12px;bottom:calc(var(--safe-bottom) + 12px);left:12px;max-height:calc(100% - var(--safe-top) - 120px);overflow-y:auto}.lc-panel{padding:12px;border:3px solid #d8bd78;background:rgba(30,34,36,.98);box-shadow:5px 5px #000}',
    '.lc-progress{margin:0 0 8px;color:#f2c86f;font-size:11px}.lc-message{padding:9px;border-left:3px solid #db9d53;background:#34383a;color:#f5e9c6;font-size:12px;line-height:1.5}.lc-message p{margin:4px 0 0;color:#ded8c9}',
    '.lc-panel h2{margin:11px 0 8px;font-size:14px;color:#fff1ca}.lc-options{display:flex;flex-direction:column;gap:7px}.lc-option{display:flex;min-height:54px;flex-direction:column;justify-content:center;gap:3px;padding:7px 9px;border:2px solid #9e8d62;border-radius:0;background:#41474a;box-shadow:2px 2px #000;color:#fff0c7;text-align:left;font:inherit;cursor:pointer}.lc-option span{color:#d5ceba;font-size:10px}.lc-option:active,.lc-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.lc-option:focus-visible,.lc-return:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}.lc-evidence{display:flex;flex-direction:column;gap:4px;margin:8px 0 0;padding:0;list-style:none;color:#d7d0be;font-size:10px;line-height:1.4}.lc-evidence li{padding:4px 6px;border-left:2px solid #97865f;background:#2a2f31}.lc-abandon{min-height:44px;margin-top:8px;padding:5px 8px;border:1px solid #756d58;background:transparent;color:#bdb8ab;font:10px "Courier New",monospace;cursor:pointer}',
    '.lc-result h2{font-size:18px}.lc-verdict{margin:7px 0;padding:7px;border:1px solid #a9955f;background:#292f30;color:#f2d68e;font-size:11px}.lc-receipt,.lc-intel{color:#eee4ce;font-size:11px;line-height:1.5}.lc-review-list{display:flex;flex-direction:column;gap:4px;margin:7px 0;padding:0;list-style:none;color:#d7d0be;font-size:10px;line-height:1.4}.lc-review-list li{padding:5px 6px;border-left:2px solid #97865f;background:#2a2f31}.lc-intel{padding:6px;border-left:2px solid #db9d53;background:#34383a}.lc-confidence{color:#e8c873;font-size:10px}.lc-return{width:100%;min-height:48px;margin-top:8px;border:2px solid #e3ca82;border-radius:0;background:#46514b;box-shadow:3px 3px #000;color:#fff4d2;font:bold 13px "Courier New",monospace;cursor:pointer}',
    '@media(max-height:700px){.lc-content{bottom:calc(var(--safe-bottom) + 6px)}.lc-panel{padding:8px}.lc-option{min-height:46px}}',
    '</style>',
    '<img class="lc-backdrop" src="/art/longge-bbq-pixel-v1.png" alt="" aria-hidden="true">',
    '<header class="lc-header"><p class="lc-kicker">龙哥的烧烤摊 · 支线副本</p><h1 class="lc-title">群聊鉴伪</h1>' +
    '<p class="lc-stats">第 ' + initialState.day + ' 天 · 先看来源，再看成交，最后核对公告</p></header>',
    '<section class="lc-content" aria-live="polite"></section>',
  ].join('');

  const content = screen.querySelector<HTMLElement>('.lc-content')!;
  const render = (current: GameState): void => {
    const run = current.activeActivity;
    if (!run || run.id !== 'LONGGE_CHAT') {
      content.innerHTML = '<section class="lc-panel"><h2>调查记录已结束</h2><button class="lc-return" data-action="return" type="button">回到街区</button></section>';
    } else if (run.status === 'RESULT') {
      content.innerHTML = renderResult(run);
    } else {
      content.innerHTML = run.step < 3 ? renderStep(run) : renderConclusion(run);
    }
    content.querySelector('.lc-panel')?.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 160, easing: 'steps(4, end)' },
    );
  };

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    const conclusion = target.closest<HTMLElement>('[data-conclusion]')?.dataset.conclusion;
    if (choice === 'VERIFY_ORIGIN' || choice === 'FOLLOW_REPOST' || choice === 'READ_TAPE' || choice === 'WATCH_PRICE' || choice === 'CHECK_NOTICE' || choice === 'ASK_GROUP') {
      dispatch({ type: 'CHOOSE_LONGGE_CLUE', choice });
    } else if (isConclusion(conclusion)) {
      dispatch({ type: 'CONCLUDE_LONGGE_CHAT', conclusion });
    } else if (target.closest('[data-action="abandon"]')) {
      dispatch({ type: 'ABANDON_LONGGE_CHAT' });
    } else if (target.closest('[data-action="return"]')) {
      dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    }
  });

  render(initialState);
  return screen;
}
