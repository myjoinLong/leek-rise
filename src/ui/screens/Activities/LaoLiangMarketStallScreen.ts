import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import type { StallPriceTier, StallProduct } from '../../../core/marketStallTypes';
import { quoteStallSale, stallCustomerForRun, stallPolicy, stallProducts } from '../../../core/systems/laoLiangMarketStall';

const tiers: StallPriceTier[] = ['VALUE', 'STANDARD', 'PREMIUM'];
const tierNames: Record<StallPriceTier, string> = { VALUE: '薄利快销', STANDARD: '街坊价', PREMIUM: '试探高价' };
const products = Object.keys(stallProducts) as StallProduct[];

function renderResults(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'RESULT') return '';
  const rows = run.decisions.map((decision) => {
    const customer = stallCustomerForRun(run.day, decision.step, run.scenarioVersion, run.scenarioSeed, run.returnContext ?? null);
    return `<li><span>${customer.name} · ${'title' in customer ? customer.title + ' · ' : ''}${stallProducts[decision.product].name} 售价 ¥${decision.unitPrice}/件<br><small>${decision.unitsSold > 0 ? `售出 ${decision.unitsSold} 件` : '未成交，寄售品已退回'}</small></span><strong>+¥${decision.commission}</strong></li>`;
  }).join('');
  return `<section class="ll-card"><p class="ll-kicker">今日摊位结算</p><h2>到账 ¥${run.income}</h2>
    <p>底薪 ¥${stallPolicy.baseWage} + 成交分成 ¥${run.income - stallPolicy.baseWage}</p>
    <ol class="ll-history">${rows}</ol><p>现金 ¥${state.cash.toLocaleString()} · 精力 ${state.energy}/${state.energyMax}</p>
    <p>今日工作名额：已使用</p>
    <button class="ll-primary" type="button" data-action="return">回到盘城街区</button></section>`;
}

function renderActive(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'LAOLIANG_MARKET_STALL' || run.status !== 'ACTIVE') return '';
  const customer = stallCustomerForRun(run.day, run.step, run.scenarioVersion, run.scenarioSeed, run.returnContext ?? null);
  const productChoices = products.map((product) => {
    const item = stallProducts[product];
    const selected = run.selectedProduct === product;
    return `<button class="ll-product${selected ? ' is-selected' : ''}" type="button" data-product="${product}" aria-pressed="${selected}">
      <strong>${item.name}</strong><span>供货成本 ¥${item.cost}</span><small>标价 ¥${item.prices.VALUE} / ${item.prices.STANDARD} / ${item.prices.PREMIUM}</small></button>`;
  }).join('');
  const prices = run.selectedProduct ? `<div class="ll-prices" aria-label="选择售价">${tiers.map((tier) => {
    const quote = quoteStallSale(run.step, run.selectedProduct!, tier, run.day, run.scenarioSeed ?? 4, run.scenarioVersion ?? 1, run.returnContext ?? null);
    const accepted = quote.unitPrice <= customer.budget;
    return `<button class="ll-price" type="button" data-tier="${tier}"><strong>${tierNames[tier]}</strong><span>¥${quote.unitPrice} / 件</span><small>${accepted ? `预计售出 ${quote.unitsSold} 件` : `高于预算 ¥${customer.budget}`}</small></button>`;
  }).join('')}</div>` : '<p class="ll-hint">先选一件寄售商品，再决定标价。</p>';
  return `<section class="ll-card" aria-live="polite"><div class="ll-progress">摊位时段 ${run.step + 1}/3 <span>底薪 ¥${stallPolicy.baseWage} · 精力 ${run.energySpent}/15</span></div>
    <p class="ll-kicker">${customer.name} · ${'title' in customer ? customer.title : '客群线索'}</p><h2>${customer.clue}</h2>
    ${'ownerLine' in customer ? `<p class="ll-note">老梁：“${customer.ownerLine}”</p>` : ''}
    <p class="ll-note">货品成本由老梁承担，你无需垫资；成交后按毛利五五分成，未售出的货品退回。定价越高，预计销量越低。</p>
    <div class="ll-products">${productChoices}</div>${prices}
    <button class="ll-exit" type="button" data-action="abandon">提前收摊（保留已耗精力；无收入；今日工作名额不退）</button></section>`;
}

export function createLaoLiangMarketStallScreen(initialState: GameState, dispatch: (action: GameAction) => GameState): HTMLElement {
  let state = initialState;
  const screen = document.createElement('main');
  screen.className = 'll-screen';
  screen.innerHTML = `<style>
    .ll-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;background:#806d50;color:#fff2d0;font:12px "Courier New",monospace}
    .ll-screen::before{position:absolute;inset:0;background:url('/art/laoliang-community-stall-v1.webp') center center/cover no-repeat;image-rendering:pixelated;content:""}.ll-screen::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,24,22,.22),rgba(22,24,21,.08) 34%,rgba(20,22,20,.7));content:"";pointer-events:none}
    .ll-owner{position:absolute;z-index:2;top:calc(var(--safe-top) + 22%);right:14%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:3px;border:1px solid rgba(230,207,145,.8);background:rgba(39,45,43,.8);box-shadow:3px 3px #000;color:#fff2d0;font-size:9px}.ll-owner-sprite{display:block;width:60px;height:68px;background-image:url('/art/laoliang-market-character-v1.webp');background-position:center;background-size:contain;background-repeat:no-repeat;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #171512)}
    .ll-header{position:absolute;z-index:2;top:var(--safe-top);right:9px;left:9px;padding:8px 10px;border:2px solid #e6cf91;background:#272d2b;box-shadow:4px 4px #000}.ll-header h1{margin:0;color:#ffe18a;font-size:15px}.ll-stats{margin:5px 0 0;color:#e2ddcd;font-size:10px}
    .ll-content{position:absolute;z-index:3;right:8px;bottom:calc(var(--safe-bottom) + 8px);left:8px;max-height:56%;overflow:auto}.ll-card{padding:10px;border:3px solid #e2ca8a;background:rgba(34,37,36,.98);box-shadow:5px 5px #000}
    .ll-progress{display:flex;justify-content:space-between;gap:8px;color:#ffe28a;font-weight:bold}.ll-progress span{color:#ddd5be;font-size:9px}.ll-kicker{margin:8px 0 3px;color:#f1c474;font-size:10px}.ll-card h2{margin:0 0 7px;color:#fff0bd;font-size:13px;line-height:1.5}.ll-note,.ll-hint{margin:6px 0;color:#d9d3c2;font-size:9px;line-height:1.45}
    .ll-products,.ll-prices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}.ll-product,.ll-price{display:flex;min-width:0;min-height:68px;flex-direction:column;justify-content:center;gap:4px;padding:6px 4px;border:2px solid #9c906c;background:#414844;color:#fff2d0;font:inherit;text-align:center;cursor:pointer}.ll-product strong,.ll-price strong{font-size:10px}.ll-product span,.ll-price span,.ll-product small,.ll-price small{font-size:8px;color:#d6d0bd}.ll-product.is-selected{border-color:#ffdf71;background:#615437}.ll-product:active,.ll-price:active,.ll-primary:active,.ll-exit:active{transform:translate(2px,2px)}
    .ll-history{display:grid;gap:6px;margin:8px 0;padding:0;list-style:none}.ll-history li{display:flex;justify-content:space-between;gap:8px;padding:6px;border-bottom:1px solid #66604d;color:#e3ddca}.ll-history small{color:#cfc8b7}.ll-history strong{color:#a9ef8b;white-space:nowrap}
    .ll-primary,.ll-exit{width:100%;min-height:44px;margin-top:8px;border:2px solid #e4ca83;background:#4c5b4d;color:#fff2d0;font:bold 11px "Courier New",monospace;cursor:pointer}.ll-exit{border-color:#777263;background:#343a38;color:#d4cebd;font-weight:normal}
    @media(max-height:700px){.ll-owner{top:calc(var(--safe-top) + 20%)}.ll-owner-sprite{width:48px;height:56px}.ll-content{max-height:62%}.ll-card{padding:7px}.ll-products,.ll-prices{gap:4px}.ll-product,.ll-price{min-height:58px}}
  </style><span class="ll-owner" aria-hidden="true"><span class="ll-owner-sprite"></span><b>老梁</b></span>
  <header class="ll-header"><h1>老梁的社区寄售摊</h1><p class="ll-stats">第 ${state.day} 天 · 现金 ¥${state.cash.toLocaleString()} · 精力 ${state.energy}/${state.energyMax}</p></header><section class="ll-content"></section>`;
  const content = screen.querySelector<HTMLElement>('.ll-content')!;
  const render = (): void => {
    content.innerHTML = state.activeActivity?.id === 'LAOLIANG_MARKET_STALL' && state.activeActivity.status === 'RESULT'
      ? renderResults(state)
      : renderActive(state);
  };
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const product = target.closest<HTMLElement>('[data-product]')?.dataset.product;
    if (product === 'THERMOS' || product === 'RAINCOAT' || product === 'CABLE') state = dispatch({ type: 'SELECT_STALL_PRODUCT', product });
    const tier = target.closest<HTMLElement>('[data-tier]')?.dataset.tier;
    if (tier === 'VALUE' || tier === 'STANDARD' || tier === 'PREMIUM') state = dispatch({ type: 'SELL_STALL_GOODS', priceTier: tier });
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'abandon') state = dispatch({ type: 'ABANDON_LAOLIANG_STALL' });
    if (action === 'return') state = dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    render();
  });
  render();
  return screen;
}
