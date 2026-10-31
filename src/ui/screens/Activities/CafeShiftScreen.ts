import type { GameAction } from '../../../core/reducer';
import type { CafeShiftChoice, CafeShiftState } from '../../../core/cafeShiftTypes';
import { cafeChoicesForScenario, cafeScenarioFor, cafeShiftBasePay, cafeShiftEnergyPerOrder, cafeShiftOrders, cafeShiftTipPerCorrectOrder } from '../../../core/systems/cafeShift';
import type { GameState } from '../../../core/types';

const choices: Record<CafeShiftChoice, string> = {
  BLACK_COFFEE: '美式黑咖啡', OAT_LATTE: '燕麦拿铁', CAKE: '当日小蛋糕',
  SUGAR_FREE_LATTE: '无糖拿铁', CARAMEL_MOCHA: '焦糖摩卡', SWEET_TEA: '蜜桃甜茶',
  WARM_MILK: '温热牛奶', DOUBLE_ESPRESSO: '双份浓缩', ICED_TEA: '冰柠茶',
};

function historyMarkup(run: CafeShiftState): string {
  return run.decisions.map((decision, index) => {
    const scenario = cafeScenarioFor(run.day, decision.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
    return '<li><div><span>' + (index + 1) + '. ' + scenario.name + ' · ' + choices[decision.choice] + '</span><p class="cf-reason">' +
      (decision.correct ? '匹配需求：' : '未匹配需求：') + scenario.need + '；本班推荐' + choices[scenario.correctChoice] + '。</p></div><strong class="' + (decision.correct ? 'cf-good' : 'cf-missed') + '">' +
      (decision.correct ? '小费 +¥' + cafeShiftTipPerCorrectOrder : '未拿到小费') + '</strong></li>';
  }).join('');
}

function activeMarkup(run: Extract<CafeShiftState, { status: 'ACTIVE' }>): string {
  const customer = cafeScenarioFor(run.day, run.step, run.scenarioVersion ?? 1, run.scenarioSeed ?? 4, run.returnContext ?? null);
  const history = historyMarkup(run);
  const options = cafeChoicesForScenario(customer).map((choice) => '<button class="cf-choice" type="button" data-choice="' + choice + '"><span class="cf-cup" aria-hidden="true">▣</span><strong>' + choices[choice] + '</strong><small>服务后精力 -' + cafeShiftEnergyPerOrder + '</small></button>').join('');
  return '<section class="cf-card"><p class="cf-progress">午间班次 · 第 ' + (run.step + 1) + ' / ' + cafeShiftOrders + ' 杯 <span>基础工资 ¥' + cafeShiftBasePay + ' · 小费上限 ¥' + (cafeShiftOrders * cafeShiftTipPerCorrectOrder) + '</span></p>' +
    (customer.scene ? '<p class="cf-scene">' + customer.scene + '</p>' : '') +
    '<div class="cf-customer"><span class="cf-avatar" aria-hidden="true">' + customer.avatar + '</span><div><p class="cf-kicker">下一位顾客</p><h2>' + customer.name + '</h2><p class="cf-request">“' + customer.request + '”</p></div></div>' +
    (customer.availability ? '<p class="cf-availability">柜台库存 · ' + customer.availability + '</p>' : '') +
    (customer.sujieLine ? '<p class="cf-sujie">苏姐：“' + customer.sujieLine + '”</p>' : '') +
    '<p class="cf-question">听清需求，选一份合适的饮品</p><div class="cf-options">' + options + '</div>' +
    (history ? '<ol class="cf-history" aria-label="已服务顾客">' + history + '</ol>' : '') +
    '<p class="cf-note">选错只会少拿这位顾客的小费，不扣现金；完成三杯后统一发放底薪和小费。中途离开不发工资或小费，已耗精力不返还；精力足够可重新接班或换工作。</p><button class="cf-quit" type="button" data-action="abandon">离开班次（不领薪，保留精力支出）</button></section>';
}

function resultMarkup(run: Extract<CafeShiftState, { status: 'RESULT' }>): string {
  const rows = historyMarkup(run);
  return '<section class="cf-card cf-result"><p class="cf-kicker">咖啡短班结算</p><h2>今天到账 ¥' + run.income + '</h2><p class="cf-summary">底薪 ¥' + run.basePay + ' + 小费 ¥' + run.tips + ' · 精力 -' + run.energySpent + '</p>' +
    '<ol class="cf-history">' + rows + '</ol><p class="cf-note">本次收入已计入今日打工账目。每次服务判断正确可获小费；判断失误不会倒扣现金。</p><button class="cf-return" type="button" data-action="return">带着工资回街区</button></section>';
}

export function createCafeShiftScreen(state: GameState, dispatch: (action: GameAction) => GameState): HTMLElement {
  const run = state.activeActivity;
  if (!run || run.id !== 'SUJIE_CAFE_SHIFT') throw new Error('Cafe shift screen requires an active shift.');
  const screen = document.createElement('main');
  screen.className = 'cf-screen';
  screen.innerHTML = '<style>' +
    '.cf-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#fff0d2;font:12px "Courier New",monospace;background:#35423d}' +
    '.cf-screen::before{position:absolute;inset:0;background:url(/art/sujie-cafe-interior-v1.webp) center/cover no-repeat;image-rendering:pixelated;content:""}.cf-screen::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(21,25,24,.08),rgba(20,25,24,.2) 42%,rgba(20,25,24,.64));content:""}' +
    '.cf-header,.cf-content{position:relative;z-index:2}.cf-header{margin:var(--safe-top) 10px 0;padding:10px;border:2px solid #ddc77f;background:rgba(27,33,31,.95);box-shadow:4px 4px #000}.cf-header h1{margin:0;color:#ffe28a;font-size:16px}.cf-stats{margin:5px 0 0;color:#e1dbc9;font-size:10px}' +
    '.cf-host{position:absolute;z-index:1;top:calc(var(--safe-top) + 76px);right:14px;display:flex;align-items:center;gap:7px;padding:4px 8px;border:1px solid rgba(221,199,127,.75);background:rgba(27,33,31,.84);box-shadow:3px 3px #000;color:#fff0d2;font-size:10px}.cf-host-sprite{display:block;width:52px;height:52px;border:1px solid #d4bd78;background-image:url(/art/sujie-character-v3.png);background-repeat:no-repeat;background-size:contain;background-position:center;image-rendering:pixelated;filter:drop-shadow(2px 2px 0 #151515)}' +
    '.cf-content{position:absolute;right:10px;bottom:calc(var(--safe-bottom) + 10px);left:10px;height:58%;overflow:auto}.cf-card{box-sizing:border-box;min-height:100%;padding:11px;border:3px solid #dfc67a;background:rgba(32,36,34,.97);box-shadow:5px 5px #000}' +
    '.cf-progress{display:flex;justify-content:space-between;gap:5px;color:#ffe28a;font-weight:bold}.cf-progress span{color:#d8d0bd;font-size:9px}.cf-customer{display:flex;align-items:center;gap:10px;margin:10px 0;padding:9px;border:1px solid #796e50;background:#343b37}.cf-avatar{display:grid;width:48px;height:48px;flex:none;place-items:center;border:2px solid #d4bd78;background:#755c47;color:#fff0c8;font-size:20px}.cf-kicker{margin:0;color:#e7c46e;font-size:10px}.cf-customer h2{margin:3px 0;color:#fff0c8;font-size:15px}.cf-request{margin:0;color:#ddd7c8;line-height:1.45}.cf-question{margin:8px 0;color:#ffe28a}' +
    '.cf-options{display:grid;grid-template-columns:1fr;gap:6px}.cf-choice{display:grid;grid-template-columns:32px 1fr;align-items:center;min-height:50px;gap:2px 8px;padding:6px;border:2px solid #b7a773;background:#414a43;box-shadow:2px 2px #000;color:#fff0d2;font:inherit;text-align:left;cursor:pointer}.cf-cup{grid-row:1/3;color:#f2d67d;font-size:18px}.cf-choice strong{font-size:12px}.cf-choice small{color:#d3cbb8;font-size:9px}.cf-choice:active,.cf-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.cf-choice:focus-visible,.cf-return:focus-visible,.cf-quit:focus-visible{outline:2px solid #ffe28a;outline-offset:2px}' +
    '.cf-history{display:grid;gap:5px;margin:9px 0;padding:0;list-style:none}.cf-history li{display:flex;justify-content:space-between;gap:8px;color:#ddd7c8;font-size:9px}.cf-good{color:#a8e891}.cf-missed{color:#ffc47c}.cf-note,.cf-summary{color:#d8d0bd;font-size:10px;line-height:1.5}.cf-quit{min-height:44px;padding:5px 8px;border:1px solid #8e8878;background:#292f2c;color:#ddd5c1;font:10px "Courier New",monospace;cursor:pointer}.cf-result h2{margin:8px 0;color:#ffe28a;font-size:24px}.cf-return{width:100%;min-height:48px;border:2px solid #eed587;background:#4d594b;box-shadow:3px 3px #000;color:#fff2d2;font:bold 12px "Courier New",monospace;cursor:pointer}' +
    '.cf-scene,.cf-availability,.cf-sujie{margin:6px 0;padding:6px 8px;border-left:2px solid #a99b73;background:#292f2c;color:#ded5bd;font-size:10px;line-height:1.45}.cf-availability{border-color:#d5ae58;color:#f1d69b}.cf-sujie{color:#d2c7a7}' +
    '.cf-reason{margin:var(--sp-1) 0 0;line-height:1.5}.cf-history li>div{min-width:0}.cf-history strong{flex:none}' +
    '@media(max-height:700px){.cf-host{top:calc(var(--safe-top) + 70px)}.cf-host-sprite{width:44px;height:44px}.cf-content{height:64%}.cf-card{padding:8px}.cf-customer{margin:6px 0;padding:6px}.cf-choice{min-height:44px}}' +
    '</style><span class="cf-host" aria-hidden="true"><span class="cf-host-sprite"></span><b>苏姐</b></span><header class="cf-header"><h1>苏姐的街角咖啡 · 午间短班</h1><p class="cf-stats">第 ' + state.day + ' 天 · 现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax + '</p></header><section class="cf-content" aria-live="polite">' +
    (run.status === 'RESULT' ? resultMarkup(run) : activeMarkup(run)) + '</section>';
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const rawChoice = target.closest<HTMLElement>('[data-choice]')?.dataset.choice;
    if (rawChoice && Object.hasOwn(choices, rawChoice)) {
      dispatch({ type: 'SERVE_CAFE_ORDER', choice: rawChoice as CafeShiftChoice });
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'abandon') dispatch({ type: 'ABANDON_CAFE_SHIFT' });
    if (action === 'return') dispatch({ type: 'RETURN_FROM_ACTIVITY' });
  });
  return screen;
}
