import type { GameAction } from '../../../core/reducer';
import type { GameState, PhoneFlipChoice, PhoneFlipDecision, PhoneInspection } from '../../../core/types';
import { phoneFlipPolicy, phoneLotBriefFor, quotePhoneFlipOffer } from '../../../core/systems/phoneFlip';

const choiceLabels: Record<PhoneFlipChoice, string> = {
  PASS: '放弃这台',
  ASK_QUICK: '按标价收 · 直接转卖',
  ASK_REFURB: '按标价收 · 整备转卖',
  BARGAIN_QUICK: '砍价后收 · 直接转卖',
  BARGAIN_REFURB: '砍价后收 · 整备转卖',
};

function signedMoney(value: number): string {
  return (value > 0 ? '+' : value < 0 ? '−' : '') + '¥' + Math.abs(value).toLocaleString('zh-CN');
}

function decisionLine(decision: PhoneFlipDecision): string {
  const title = decision.bargainRejected ? '还价被拒' : decision.bought ? signedMoney(decision.profit) : '放弃';
  return '<li><span>' + decision.phoneName + ' · ' + decision.explanation + '</span><strong>' + title + '</strong></li>';
}

function renderInspection(inspection: PhoneInspection | null): string {
  if (!inspection) return '<p class="pf-muted">验机前只看到卖家描述和外观线索。</p>';
  return '<section class="pf-diagnosis" aria-live="polite"><strong>' + inspection.condition + '</strong><p>' + inspection.diagnosis + '</p>' +
    '<div class="pf-estimates"><span>直接转卖 ' + signedMoney(inspection.quickProfitAtAsk) + '</span><span>整备转卖 ' + signedMoney(inspection.refurbProfitAtAsk) + '</span></div>' +
    '</section>';
}

function formatCash(value: number): string {
  return '¥' + value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function renderActive(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'PHONE_FLIP' || run.status !== 'ACTIVE') return '';
  const lot = phoneLotBriefFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const offerButtons = (bargain: boolean, refurbish: boolean): string => {
    const choice: PhoneFlipChoice = bargain
      ? refurbish ? 'BARGAIN_REFURB' : 'BARGAIN_QUICK'
      : refurbish ? 'ASK_REFURB' : 'ASK_QUICK';
    const price = bargain ? lot.bargainPrice : lot.askingPrice;
    const preview = quotePhoneFlipOffer(state, run, choice);
    const disabled = price === null || !preview.affordable;
    const quote = run.inspection
      ? ' · 占用 ' + formatCash(preview.cashRequired) + ' · 若成交回款后约 ' + formatCash(preview.projectedCashAfterSale ?? state.cash) + '（' + signedMoney(preview.projectedProfit ?? 0) + '）'
      : refurbish ? ' · 需准备 ' + formatCash(preview.cashRequired) + '（含整备预留）'
        : ' · 需现金 ' + formatCash(preview.cashRequired) + ' · 机况未核实';
    return '<button class="pf-choice" type="button" data-choice="' + choice + '"' + (disabled ? ' disabled' : '') + '>' + choiceLabels[choice] +
      '<small>收购 ¥' + (price ?? lot.askingPrice) + quote + '</small></button>';
  };
  const bargainButtons = lot.bargainPrice === null
    ? '<button class="pf-choice" type="button" disabled>砍价 · 卖家不议价<small>先判断标价是否划算</small></button>'
    : offerButtons(true, false) + offerButtons(true, true);
  return '<section class="pf-card" aria-live="polite"><div class="pf-progress">回收单 ' + (run.step + 1) + ' / 3' +
    '<span>本班盈亏 ' + signedMoney(run.totalProfit) + '</span></div><div class="pf-listing"><div class="pf-phone" aria-hidden="true"><i></i></div>' +
    '<div><p class="pf-kicker">' + lot.sellerName + ' 挂牌 · ' + lot.name + '</p><h2>要不要接这台？</h2><p>' + lot.sellerLine + '</p><p>' + lot.clue + '</p>' +
    '<p class="pf-appraiser">' + lot.appraiserLine + '</p>' +
    '<strong class="pf-ask">要价 ¥' + lot.askingPrice + '</strong></div></div>' + renderInspection(run.inspection) +
    '<div class="pf-controls"><button class="pf-inspect" type="button" data-action="inspect"' +
      (run.inspection || state.energy < phoneFlipPolicy.inspectEnergy ? ' disabled' : '') + '>验机 · -' + phoneFlipPolicy.inspectEnergy + ' 精力</button>' +
    '<button class="pf-pass" type="button" data-choice="PASS">放弃这台</button></div>' +
    '<p class="pf-label">按标价收购</p><div class="pf-grid">' + offerButtons(false, false) + offerButtons(false, true) + '</div>' +
    '<p class="pf-label">尝试议价 · 卖家线索决定是否接受</p><div class="pf-grid">' + bargainButtons + '</div>' +
    '<ol class="pf-history" aria-label="已完成回收单">' + run.decisions.map(decisionLine).join('') + '</ol>' +
    '<p class="pf-energy">现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax +
    ' · 已用验机精力 ' + run.energySpent + '</p><button class="pf-quit" type="button" data-action="abandon">结束营业 · 已结算交易保留</button></section>';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'PHONE_FLIP' || run.status !== 'RESULT') return '';
  return '<section class="pf-card pf-result" aria-live="polite"><p class="pf-kicker">旧机回收班 · 第 ' + run.day + ' 天</p><h2>本班盈亏 ' +
    signedMoney(run.totalProfit) + '</h2><p>只计算已经成交的转售价差，现金与打工账本已同步更新。</p><ol class="pf-history">' +
    run.decisions.map(decisionLine).join('') + '</ol><p class="pf-energy">完成 3 张回收单 · 验机耗精力 ' + run.energySpent + '</p>' +
    '<button class="pf-return" type="button" data-action="return">回到盘城街区</button></section>';
}

function isPhoneFlipChoice(value: string | undefined): value is PhoneFlipChoice {
  return value === 'PASS' || value === 'ASK_QUICK' || value === 'ASK_REFURB' || value === 'BARGAIN_QUICK' || value === 'BARGAIN_REFURB';
}

export function createPhoneFlipScreen(initialState: GameState, dispatch: (action: GameAction) => GameState): HTMLElement {
  let state = initialState;
  const screen = document.createElement('main');
  screen.className = 'pf-screen';
  screen.innerHTML = [
    '<style>',
    '.pf-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f7efd9;font:12px "Courier New",monospace;background:#323a42}',
    '.pf-room{position:absolute;z-index:0;inset:0;overflow:hidden;background:url("/art/ahao-phone-repair-shop-v1.webp") center center/cover no-repeat}.pf-room::after{position:absolute;z-index:0;inset:0;background:linear-gradient(180deg,rgba(18,24,29,.18),rgba(18,24,29,.08) 35%,rgba(16,21,25,.72));content:""}.pf-sign{position:absolute;z-index:1;top:15%;left:50%;padding:8px 15px;transform:translateX(-50%);border:4px solid #252729;background:#68a0a7;box-shadow:4px 4px #000;color:#101b20;font-weight:bold;white-space:nowrap}',
    '.pf-owner{position:absolute;z-index:2;top:calc(var(--safe-top) + 22%);right:14%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;border:1px solid #c6ad75;background:rgba(26,31,35,.86);box-shadow:3px 3px #000;color:#f7efd9;font-size:9px}.pf-owner-sprite{display:block;width:56px;height:64px;background-image:url("/art/ahao-character-v1.webp");background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}',
    '.pf-header{position:absolute;z-index:2;top:var(--safe-top);right:10px;left:10px;padding:9px;border:2px solid #c6ad75;background:rgba(26,31,35,.96);box-shadow:4px 4px #000}.pf-header h1{margin:0;color:#f4d78b;font-size:16px}.pf-header p{margin:5px 0 0;color:#ded5c0;font-size:10px}',
    '.pf-content{position:absolute;z-index:3;right:10px;bottom:calc(var(--safe-bottom) + 8px);left:10px;max-height:56%;overflow:auto}.pf-card{padding:10px;border:3px solid #d3c287;background:rgba(27,32,35,.98);box-shadow:5px 5px #000}.pf-progress{display:flex;justify-content:space-between;gap:8px;color:#f4d78b;font-weight:bold}.pf-progress span{color:#c8ef9b}',
    '.pf-listing{display:grid;grid-template-columns:62px 1fr;gap:10px;align-items:center;margin-top:8px;padding:8px;border:2px solid #596a6c;background:#303b3d}.pf-phone{position:relative;width:45px;height:76px;margin:auto;border:4px solid #171b1d;border-radius:2px;background:#7196a1;box-shadow:3px 3px #000}.pf-phone:before{position:absolute;top:4px;left:50%;width:17px;height:3px;transform:translateX(-50%);background:#1a2426;content:""}.pf-phone i{position:absolute;right:5px;bottom:5px;left:5px;height:2px;background:#273337}.pf-kicker{margin:0 0 4px;color:#e6c474;font-size:10px}.pf-listing h2,.pf-card h2{margin:0 0 5px;color:#fff0c3;font-size:16px}.pf-listing p:not(.pf-kicker){margin:4px 0;color:#dfdacb;line-height:1.4}.pf-listing .pf-appraiser{padding-top:5px;border-top:1px dashed #6a6b61;color:#f1d895;font-style:italic}.pf-ask{display:block;margin-top:6px;color:#ffda7b;font-size:16px}',
    '.pf-diagnosis{margin-top:7px;padding:7px;border-left:3px solid #83bb91;background:#35413d;color:#e8edd9}.pf-diagnosis p{margin:4px 0}.pf-estimates{display:flex;flex-wrap:wrap;gap:6px;color:#b8e89a;font-weight:bold}.pf-muted,.pf-energy{margin:6px 0;color:#bcb9ad;font-size:10px}.pf-controls{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.pf-inspect,.pf-pass,.pf-choice,.pf-quit,.pf-return{min-width:0;min-height:44px;padding:6px;border:2px solid #9b906f;background:#40494a;box-shadow:2px 2px #000;color:#fff0ce;font:inherit;font-weight:bold;cursor:pointer}.pf-inspect{border-color:#d3b75d;background:#665838}.pf-pass{border-color:#a0a0a0;background:#33383a}.pf-label{margin:8px 0 4px;color:#dbc889;font-size:10px}.pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pf-choice{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;text-align:left}.pf-choice small{color:#c3c2b8;font-size:10px;font-weight:normal;line-height:1.25}.pf-choice:disabled,.pf-inspect:disabled{opacity:.45;cursor:not-allowed}.pf-choice:active,.pf-inspect:active,.pf-pass:active,.pf-quit:active,.pf-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}',
    '.pf-history{display:flex;flex-direction:column;gap:4px;margin:7px 0;padding:0;list-style:none}.pf-history li{display:flex;justify-content:space-between;gap:8px;padding:5px;background:#303638;color:#ddd8cb;font-size:10px;line-height:1.35}.pf-history li strong{flex:none;color:#c5ee9b}.pf-quit,.pf-return{width:100%;margin-top:6px}.pf-quit{border-color:#898575;background:#343a3b;color:#d5d0c4}.pf-return{border-color:#e4cf80;background:#676044;color:#fff1be;font-size:13px}.pf-result h2{font-size:20px}.pf-result>p:not(.pf-kicker){color:#ddd8cb;line-height:1.45}',
    '@media(max-height:700px){.pf-content{max-height:64%;bottom:calc(var(--safe-bottom) + 8px)}.pf-card{padding:7px}.pf-sign{top:13%}.pf-owner{top:calc(var(--safe-top) + 19%)}.pf-owner-sprite{width:48px;height:56px}}',
    '@media(max-height:420px){.pf-sign{display:none}}',
    '</style>',
    '<div class="pf-room" aria-hidden="true"><div class="pf-sign">阿浩 · 旧机回收铺</div></div><span class="pf-owner" aria-hidden="true"><span class="pf-owner-sprite"></span><b>阿浩</b></span>',
    '<header class="pf-header"><h1>验机 · 议价 · 转卖</h1><p class="pf-stats"></p></header><section class="pf-content"></section>',
  ].join('');
  const stats = screen.querySelector<HTMLElement>('.pf-stats')!;
  const content = screen.querySelector<HTMLElement>('.pf-content')!;
  const render = (): void => {
    stats.textContent = '第 ' + state.day + ' 天 · 现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax;
    content.innerHTML = state.activeActivity?.id === 'PHONE_FLIP' && state.activeActivity.status === 'RESULT'
      ? renderResult(state) : renderActive(state);
  };
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'inspect') state = dispatch({ type: 'INSPECT_PHONE_LOT' });
    else if (action === 'abandon') state = dispatch({ type: 'ABANDON_PHONE_FLIP' });
    else if (action === 'return') state = dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    else {
      const choice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
      if (!isPhoneFlipChoice(choice)) return;
      state = dispatch({ type: 'RESOLVE_PHONE_LOT', choice });
    }
    render();
  });
  render();
  return screen;
}
