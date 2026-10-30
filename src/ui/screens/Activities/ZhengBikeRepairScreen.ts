import { bikeRepairCanTest, bikeRepairCaseFor, bikeRepairTestResult, zhengRepairBasePay, zhengRepairEnergyPerJob, zhengRepairJobs, zhengRepairQualityBonus, zhengRepairTestEnergy } from '../../../core/systems/zhengBikeRepair';
import type { BikeRepairPart, BikeRepairStep } from '../../../core/zhengBikeRepairTypes';
import type { GameAction } from '../../../core/reducer';
import type { GameState, ZhengBikeRepairActiveState } from '../../../core/types';

const parts: readonly { id: BikeRepairPart; label: string }[] = [
  { id: 'BATTERY', label: '电池组' },
  { id: 'BRAKES', label: '刹车系统' },
  { id: 'CONTROLLER', label: '控制器' },
];

function partLabel(part: BikeRepairPart): string {
  return parts.find((item) => item.id === part)?.label ?? '未知部件';
}

function renderActive(state: GameState, run: ZhengBikeRepairActiveState): string {
  const currentCase = bikeRepairCaseFor(run.day, run.step);
  const requiredEnergy = zhengRepairEnergyPerJob * (zhengRepairJobs - run.step);
  const currentTests = run.tests.filter((test) => test.step === run.step);
  const testButtons = parts.map((part) => {
    const test = currentTests.find((item) => item.part === part.id);
    const disabled = !test && !bikeRepairCanTest(state, run, part.id);
    return '<button class="zb-test" type="button" data-test="' + part.id + '"' + (disabled ? ' disabled' : '') + '>' +
      '<strong>' + part.label + '</strong><span>' + (test ? bikeRepairTestResult(part.id, test.foundFault) : '检测 · -' + zhengRepairTestEnergy + ' 精力') + '</span></button>';
  }).join('');
  const completed = run.decisions.map((decision, index) => '<li>工单 ' + (index + 1) + ' · 修了' + partLabel(decision.repairedPart) + ' · ' + (decision.correct ? '判断正确' : '判断错误') + '<b>+' +
    (zhengRepairBasePay + decision.qualityBonus) + ' 元</b></li>').join('');
  return '<section class="zb-card" aria-live="polite"><div class="zb-progress">工单 ' + (run.step + 1) + ' / ' + zhengRepairJobs +
    '<span>已到账 ¥' + run.income + ' · 质量奖 ¥' + run.qualityBonus + '</span></div><p class="zb-kicker">故障症状</p><h2>' + currentCase.title +
    '</h2><p class="zb-symptom">' + currentCase.symptom + '</p><p class="zb-label">可选检测 · 每个部件每单一次</p><div class="zb-tests">' + testButtons +
    '</div><p class="zb-label">选择要更换/调整的部件 · 完成后到账底薪 ¥' + zhengRepairBasePay + '，修对另得 ¥' + zhengRepairQualityBonus + '</p><div class="zb-repairs">' +
    parts.map((part) => '<button class="zb-repair" type="button" data-repair="' + part.id + '"><span>维修</span><strong>' + part.label + '</strong><small>精力 -' + zhengRepairEnergyPerJob + '</small></button>').join('') +
    '</div><p class="zb-energy">精力 ' + state.energy + '/' + state.energyMax + ' · 剩余维修最低消耗 ' + requiredEnergy + ' · 可选检测余量 ' + Math.max(0, state.energy - requiredEnergy) +
    '</p><ol class="zb-history" aria-label="已完成工单">' + completed + '</ol><button class="zb-quit" type="button" data-action="abandon">结束班次（已完成工单工资保留，未完成工单无工资）</button></section>';
}

function renderResult(state: GameState): string {
  const run = state.activeActivity;
  if (!run || run.id !== 'ZHENG_BIKE_REPAIR' || run.status !== 'RESULT') return '';
  const rows = run.decisions.map((decision, index) => '<li>工单 ' + (index + 1) + ' · 实际故障：' + partLabel(bikeRepairCaseFor(run.day, index as BikeRepairStep).faultyPart) + ' · 你选：' + partLabel(decision.repairedPart) + ' · ' + (decision.correct ? '维修成功' : '判断失误，仅失去质量奖') +
    '<b>底薪 ¥' + zhengRepairBasePay + (decision.qualityBonus ? ' + 质量奖 ¥' + decision.qualityBonus : '') + '</b></li>').join('');
  return '<section class="zb-card zb-result" aria-live="polite"><p class="zb-kicker">班次结算 · 第 ' + run.day + ' 天</p><h2>本班累计收入 ¥' + run.income +
    '</h2><p class="zb-symptom">底薪 ¥' + (zhengRepairBasePay * zhengRepairJobs) + ' + 质量奖 ¥' + run.qualityBonus + '。判断错误不会扣现金或欠款。</p><p class="zb-energy">完成 ' +
    zhengRepairJobs + ' 单 · 精力 -' + run.energySpent + ' · 剩余 ' + state.energy + '</p><ol class="zb-history">' + rows +
    '</ol><button class="zb-return" type="button" data-action="return">回到盘城街区</button></section>';
}

export function createZhengBikeRepairScreen(
  initialState: GameState,
  dispatch: (action: GameAction) => GameState,
): HTMLElement {
  let state = initialState;
  const screen = document.createElement('main');
  screen.className = 'zb-screen';
  screen.innerHTML = [
    '<style>',
    '.zb-screen{position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;color:#f2ead1;font:12px "Courier New",monospace;background:linear-gradient(#364348 0 42%,#9a835a 42% 44%,#49504a 44%)}',
    '.zb-room{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 47px,rgba(235,220,170,.08) 48px 50px),linear-gradient(0deg,transparent 0 58%,rgba(28,35,35,.18) 58%)}',
    '.zb-sign{position:absolute;top:18%;left:50%;padding:7px 14px;transform:translateX(-50%);border:4px solid #352b22;background:#d4b66a;box-shadow:4px 4px #151515;color:#30271e;font-weight:bold;white-space:nowrap}',
    '.zb-bike{position:absolute;top:37%;left:50%;width:190px;height:100px;transform:translateX(-50%);opacity:.78}.zb-bike:before,.zb-bike:after{position:absolute;bottom:0;width:48px;height:48px;border:6px solid #222;background:#788078;content:""}.zb-bike:before{left:8px}.zb-bike:after{right:8px}.zb-frame{position:absolute;top:25px;left:45px;width:100px;height:55px;border:5px solid #bd7650;transform:skew(-25deg)}.zb-tool{position:absolute;right:12%;bottom:43%;width:46px;height:10px;transform:rotate(-28deg);background:#cfb878;box-shadow:0 8px #46413a}',
    '.zb-header{position:absolute;z-index:2;top:var(--safe-top);right:10px;left:10px;padding:9px;border:2px solid #d7c17b;background:rgba(27,32,33,.95);box-shadow:4px 4px #000}.zb-title{margin:0;color:#ffe08b;font-size:16px}.zb-stats{margin:5px 0 0;color:#ddd4bd;font-size:10px}',
    '.zb-content{position:absolute;z-index:2;right:10px;bottom:calc(var(--safe-bottom) + 8px);left:10px;max-height:67%;overflow:auto}.zb-card{padding:10px;border:3px solid #dec985;background:rgba(28,33,34,.97);box-shadow:5px 5px #000}.zb-progress{display:flex;justify-content:space-between;gap:8px;color:#ffe28b;font-weight:bold}.zb-progress span{color:#d7d0bd;font-size:9px}.zb-kicker,.zb-label{margin:8px 0 4px;color:#e9be72;font-size:10px}.zb-card h2{margin:0 0 6px;color:#fff0bf;font-size:15px}.zb-symptom{margin:0;color:#e6dfcc;line-height:1.45}.zb-tests,.zb-repairs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.zb-test,.zb-repair{display:flex;min-width:0;min-height:48px;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;padding:5px;border:2px solid #948762;background:#394444;box-shadow:2px 2px #000;color:#fff0cb;font:inherit;text-align:left;cursor:pointer}.zb-test strong,.zb-repair strong{font-size:10px}.zb-test span,.zb-repair small,.zb-repair span{font-size:8px;color:#d7d0bd;line-height:1.2}.zb-test:disabled{opacity:.45;cursor:not-allowed}.zb-repair{border-color:#cb9d5f;background:#604735}.zb-repair:active,.zb-return:active{transform:translate(2px,2px);box-shadow:1px 1px #000}.zb-energy{margin:7px 0;color:#f0d18a;font-size:9px}.zb-history{display:flex;flex-direction:column;gap:4px;margin:6px 0;padding:0;list-style:none}.zb-history li{display:flex;justify-content:space-between;gap:6px;color:#ddd4bd;font-size:9px}.zb-history b{color:#a9ef8b;white-space:nowrap}.zb-quit,.zb-return{width:100%;min-height:44px;margin-top:7px;padding:6px;border:2px solid #9d9271;background:#30383a;color:#e5dcc3;font:bold 10px "Courier New",monospace;cursor:pointer}.zb-return{border-color:#efdc8d;background:#6b6546;color:#fff1c9;font-size:12px}.zb-result h2{font-size:20px}',
    '@media(max-height:700px){.zb-content{max-height:62%;bottom:calc(var(--safe-bottom) + 4px)}.zb-card{padding:7px}.zb-sign{top:16%}.zb-bike{top:32%}}',
    '</style>',
    '<div class="zb-room" aria-hidden="true"><div class="zb-sign">郑师傅 · 电驴快修铺</div><div class="zb-bike"><span class="zb-frame"></span></div><span class="zb-tool"></span></div>',
    '<header class="zb-header"><h1 class="zb-title">电驴快修班</h1><p class="zb-stats"></p></header><section class="zb-content"></section>',
  ].join('');
  const stats = screen.querySelector<HTMLElement>('.zb-stats')!;
  const content = screen.querySelector<HTMLElement>('.zb-content')!;
  const render = (): void => {
    stats.textContent = '第 ' + state.day + ' 天 · 现金 ¥' + state.cash.toLocaleString() + ' · 精力 ' + state.energy + '/' + state.energyMax + ' · 三张工单';
    const run = state.activeActivity;
    content.innerHTML = run?.id === 'ZHENG_BIKE_REPAIR' && run.status === 'RESULT' ? renderResult(state)
      : run?.id === 'ZHENG_BIKE_REPAIR' ? renderActive(state, run) : '';
  };
  screen.addEventListener('click', (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const testPart = target.closest<HTMLElement>('[data-test]')?.dataset.test;
    const repairPart = target.closest<HTMLElement>('[data-repair]')?.dataset.repair;
    if (testPart === 'BATTERY' || testPart === 'BRAKES' || testPart === 'CONTROLLER') state = dispatch({ type: 'TEST_BIKE_PART', part: testPart });
    else if (repairPart === 'BATTERY' || repairPart === 'BRAKES' || repairPart === 'CONTROLLER') state = dispatch({ type: 'REPAIR_BIKE_FAULT', part: repairPart });
    else if (target.closest('[data-action="abandon"]')) state = dispatch({ type: 'ABANDON_ZHENG_BIKE_REPAIR' });
    else if (target.closest('[data-action="return"]')) state = dispatch({ type: 'RETURN_FROM_ACTIVITY' });
    else return;
    render();
  });
  render();
  return screen;
}
