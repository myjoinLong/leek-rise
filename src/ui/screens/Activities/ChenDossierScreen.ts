import type { GameAction } from '../../../core/reducer';
import type { CompanyDossierChoice, CompanyDossierConclusion, CompanyDossierEvidence, CompanyDossierResultState, GameState } from '../../../core/types';

const choiceLabels: Record<CompanyDossierChoice, string> = {
  VERIFY_FILING: '调取合同备案原件',
  SKIM_PITCH: '快速浏览路演 PPT',
  CHECK_SUPPLIER: '核对供应商交付单',
  ASK_SALES: '听销售经理口头说明',
  MATCH_INVOICES: '交叉核对发票台账',
  READ_FORECAST: '查看下季度销售预测',
};

const findings: Record<CompanyDossierChoice, Record<CompanyDossierEvidence['finding'], string>> = {
  VERIFY_FILING: {
    CONTRACT: '备案编号与合同主体、金额能够对应。',
    HYPE: '路演稿引用的合同编号无法在备案系统中核实。',
    NO_CATALYST: '备案系统没有检索到能支持新增订单的合同。',
    UNVERIFIED: '只看了路演稿，未调取备案原件。',
  },
  SKIM_PITCH: {
    CONTRACT: '宣传材料能找到可进一步核验的合同编号。',
    HYPE: '宣传材料只给出订单说法，未提供可核验编号。',
    NO_CATALYST: '宣传材料声称有订单，但还没有独立凭证。',
    UNVERIFIED: '只浏览了路演 PPT，不能确认订单是否存在。',
  },
  CHECK_SUPPLIER: {
    CONTRACT: '供应商排期与合同交付节点相符。',
    HYPE: '供应商排期无法支持宣传中的交付规模。',
    NO_CATALYST: '供应商记录中没有对应的新订单排产。',
    UNVERIFIED: '没有取得供应商记录，交付情况未核实。',
  },
  ASK_SALES: {
    CONTRACT: '销售经理的说法与合同登记方向一致，仍需书面记录佐证。',
    HYPE: '销售经理无法说明宣传订单的具体交付依据。',
    NO_CATALYST: '销售经理的口头说明没有补上可核验的订单证据。',
    UNVERIFIED: '只听取了销售经理口头说明，无法独立核实。',
  },
  MATCH_INVOICES: {
    CONTRACT: '发票抬头、订单金额与回款记录相互吻合。',
    HYPE: '发票与回款台账无法对应宣传订单的金额。',
    NO_CATALYST: '没有查到对应订单的开票或回款凭证。',
    UNVERIFIED: '没有核验发票和回款，订单是否落地仍未知。',
  },
  READ_FORECAST: {
    CONTRACT: '销售预测包含该订单，但预测不等于已经回款。',
    HYPE: '销售预测中的数字不能佐证已签订单。',
    NO_CATALYST: '预测只表示预期，不能证明新增订单已经落地。',
    UNVERIFIED: '只查看了下季度预测，未核验已交付订单。',
  },
};

const stepDetails = [
  {
    title: '合同登记',
    prompt: '路演稿里写着“拿下大单”。你先确认它是否真的登记在案。',
    choices: [
      { id: 'VERIFY_FILING', label: choiceLabels.VERIFY_FILING, cost: 6, note: '高精度核验 · 精力 -6' },
      { id: 'SKIM_PITCH', label: choiceLabels.SKIM_PITCH, cost: 1, note: '快速浏览 · 精力 -1' },
    ],
  },
  {
    title: '供应链时间',
    prompt: '合同约定的交付日期，能否和供应商的出货记录对上？',
    choices: [
      { id: 'CHECK_SUPPLIER', label: choiceLabels.CHECK_SUPPLIER, cost: 6, note: '高精度核验 · 精力 -6' },
      { id: 'ASK_SALES', label: choiceLabels.ASK_SALES, cost: 1, note: '快速询问 · 精力 -1' },
    ],
  },
  {
    title: '回款凭证',
    prompt: '最后查账：已经交付的订单，是否留下真实发票和回款记录？',
    choices: [
      { id: 'MATCH_INVOICES', label: choiceLabels.MATCH_INVOICES, cost: 6, note: '高精度核验 · 精力 -6' },
      { id: 'READ_FORECAST', label: choiceLabels.READ_FORECAST, cost: 1, note: '快速浏览 · 精力 -1' },
    ],
  },
] as const;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function isChoice(value: string | undefined): value is CompanyDossierChoice {
  return value !== undefined && Object.hasOwn(choiceLabels, value);
}

function isConclusion(value: string | undefined): value is CompanyDossierConclusion {
  return value === 'BUY' || value === 'AVOID' || value === 'WAIT';
}

function renderEvidence(evidence: CompanyDossierEvidence[]): string {
  return evidence.length === 0 ? '' : '<ol class="cd-evidence">' + evidence.map((record) =>
    '<li><strong>' + choiceLabels[record.choice] + '</strong><span>' + findings[record.choice][record.finding] + '</span></li>',
  ).join('') + '</ol>';
}

function renderActive(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'CHEN_DOSSIER') return '';
  if (run.step < 3) {
    const detail = run.step === 0 ? stepDetails[0] : run.step === 1 ? stepDetails[1] : stepDetails[2];
    return '<section class="cd-card"><p class="cd-step">资料核验 ' + (run.step + 1) + ' / 3 · ' + detail.title + '</p>' +
      '<p class="cd-prompt">' + detail.prompt + '</p><div class="cd-choices">' + detail.choices.map((option) =>
        '<button class="cd-choice" type="button" data-choice="' + option.id + '"' + (state.energy < option.cost ? ' disabled' : '') + '>' +
        '<strong>' + option.label + '</strong><span>' + option.note + '</span></button>',
      ).join('') + '</div>' + renderEvidence(run.evidence) +
      '<button class="cd-exit" type="button" data-action="abandon">结束调查并离开</button></section>';
  }
  return '<section class="cd-card"><p class="cd-step">材料已整理 · ' + run.evidence.length + ' / 3</p>' +
    '<h2>你准备怎么处理这份材料？</h2><div class="cd-choices">' +
    '<button class="cd-choice" type="button" data-conclusion="BUY"><strong>按合同落地的方向继续观察</strong><span>只代表你的判断，不会自动下单。</span></button>' +
    '<button class="cd-choice" type="button" data-conclusion="AVOID"><strong>按订单夸大的方向谨慎处理</strong><span>只代表你的判断，不会自动卖出。</span></button>' +
    '<button class="cd-choice" type="button" data-conclusion="WAIT"><strong>证据不够，暂时不行动</strong><span>保留现金和仓位，等待更多信息。</span></button>' +
    '</div>' + renderEvidence(run.evidence) + '<button class="cd-exit" type="button" data-action="abandon">结束调查并离开</button></section>';
}

function getConfidenceLabel(run: CompanyDossierResultState): string {
  if (run.intel.confidence === 'HIGH') return '多项原始材料结论一致';
  if (run.intel.confidence === 'UNCERTAIN') return '没有可核验的原始材料';
  const hasConflict = run.evidence.some((item) => item.finding === 'CONTRACT') &&
    run.evidence.some((item) => item.finding === 'HYPE');
  if (hasConflict) return '可核验材料之间存在冲突';
  return run.reliableCount === 1 ? '只有一项可核验材料' : '可核验材料不足以形成一致方向';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'CHEN_DOSSIER' || run.status !== 'RESULT') return '';
  const decision = run.conclusion === 'BUY' ? '继续观察合同机会' : run.conclusion === 'AVOID' ? '回避订单风险' : '暂缓行动';
  const confidence = getConfidenceLabel(run);
  const heading = run.conclusion === 'WAIT'
    ? '你选择了稳妥观望'
    : run.correct && run.intel.confidence === 'HIGH'
      ? '判断与核验记录一致'
      : run.correct ? '判断方向与多数材料相符' : '判断和核验记录不一致';
  return '<section class="cd-card cd-result"><p class="cd-step">陈总的材料调查回执</p><h2>' +
    heading +
    '</h2><p>你的处理：' + decision + ' · ' + confidence + '</p><p class="cd-receipt">' + escapeHtml(run.intel.message) + '</p>' +
    renderEvidence(run.evidence) + '<button class="cd-return" type="button" data-action="return">带着材料结论回街区</button></section>';
}

export function createChenDossierScreen(
  state: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  const run = state.activeActivity;
  if (!run || run.id !== 'CHEN_DOSSIER') throw new Error('Chen dossier screen requires an active dossier.');

  const screen = document.createElement('main');
  screen.className = 'cd-screen';
  screen.innerHTML = `<style>
    .cd-screen{box-sizing:border-box;position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;background:#17202a;color:#fff0ce;font-family:"Courier New",monospace}
    .cd-backdrop{position:absolute;inset:0;background:url('/art/pancheng-scenes.png') 50% 0%/auto 200%;image-rendering:pixelated;opacity:.68}
    .cd-screen:after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,18,25,.34),rgba(15,20,27,.44) 32%,rgba(15,20,27,.93));content:"";pointer-events:none}
    .cd-header,.cd-content{position:absolute;z-index:1;right:12px;left:12px}.cd-header{top:var(--safe-top);padding:11px;border:2px solid #c2a86b;background:rgba(25,30,37,.96);box-shadow:4px 4px #000}
    .cd-kicker{margin:0 0 5px;color:#efbd69;font-size:10px;letter-spacing:1px}.cd-title{margin:0;color:#fff0c5;font-size:19px}.cd-stats{margin:7px 0 0;color:#d8d1bc;font-size:11px}
    .cd-content{bottom:calc(var(--safe-bottom) + 12px);max-height:calc(100% - var(--safe-top) - 120px);overflow-y:auto}.cd-card{padding:13px;border:3px solid #d8bd78;background:rgba(29,34,39,.98);box-shadow:5px 5px #000}
    .cd-step{margin:0 0 8px;color:#f2c86f;font-size:11px}.cd-prompt,.cd-card h2{margin:0 0 10px;color:#f5e9c6;font-size:13px;line-height:1.5}.cd-card h2{font-size:16px}
    .cd-choices{display:flex;flex-direction:column;gap:7px}.cd-choice{display:flex;min-height:54px;flex-direction:column;justify-content:center;gap:4px;padding:8px 10px;border:2px solid #9e8d62;background:#41474a;box-shadow:2px 2px #000;color:#fff0c7;text-align:left;font:inherit;cursor:pointer}
    .cd-choice span{color:#d5ceba;font-size:10px}.cd-choice:disabled{opacity:.48;cursor:not-allowed}.cd-choice:active:not(:disabled),.cd-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}
    .cd-evidence{display:flex;flex-direction:column;gap:5px;margin:10px 0 0;padding:0;list-style:none}.cd-evidence li{display:flex;flex-direction:column;gap:3px;padding:6px;border-left:2px solid #c5a65e;background:#292f34;color:#ded6c2;font-size:10px}.cd-evidence li span{color:#c9c0aa}
    .cd-exit{min-height:44px;margin-top:9px;padding:5px 8px;border:1px solid #756d58;background:transparent;color:#c4bdac;font:10px "Courier New",monospace;cursor:pointer}
    .cd-result h2{font-size:19px}.cd-result p{color:#ded6c2;font-size:11px;line-height:1.55}.cd-receipt{padding:8px;border-left:3px solid #dda95b;background:#34383a}.cd-return{width:100%;min-height:48px;margin-top:8px;border:2px solid #e3ca82;background:#46514b;box-shadow:3px 3px #000;color:#fff4d2;font:bold 12px "Courier New",monospace;cursor:pointer}
    .cd-choice:focus-visible,.cd-return:focus-visible,.cd-exit:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}@media(max-height:700px){.cd-content{bottom:calc(var(--safe-bottom) + 6px)}.cd-card{padding:9px}.cd-choice{min-height:46px}}
  </style><div class="cd-backdrop" aria-hidden="true"></div>
  <header class="cd-header"><p class="cd-kicker">写字楼 · 支线副本</p><h1 class="cd-title">公司材料调查</h1>
  <p class="cd-stats">第 ${state.day} 天 · 现金 ¥${state.cash.toLocaleString()} · 精力 ${state.energy} · 标的 ${escapeHtml(state.stocks[run.stockId]?.name ?? '未知')}</p></header>
  <section class="cd-content" aria-live="polite">${run.status === 'RESULT' ? renderResult(state) : renderActive(state)}</section>`;

  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    const conclusion = target.closest<HTMLElement>('[data-conclusion]')?.dataset.conclusion;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (isChoice(choice)) dispatch({ type: 'CHOOSE_CHEN_EVIDENCE', choice });
    else if (isConclusion(conclusion)) dispatch({ type: 'CONCLUDE_CHEN_DOSSIER', conclusion });
    else if (action === 'abandon') dispatch({ type: 'ABANDON_CHEN_DOSSIER' });
    else if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
  });
  screen.querySelector('.cd-card')?.animate(
    [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
    { duration: 180, easing: 'steps(5, end)' },
  );
  return screen;
}
