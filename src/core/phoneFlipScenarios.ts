import { seededPermutationAt, seededShuffle } from './scenarioDeck';
import { phoneFlipCycleContexts, phoneFlipMarketContextAt, phoneFlipMarketContexts, phoneFlipYearContexts } from './phoneFlipContinuationScenarios';
import type { PhoneFlipReturnContext, PhoneFlipStep } from './phoneFlipTypes';

export type PhoneFlipProfile = 'CLEAN' | 'BATTERY' | 'CORROSION';

export interface PhoneFlipScenarioCopy {
  id: string;
  profile: PhoneFlipProfile;
  name: string;
  sellerName: string;
  sellerLine: string;
  clue: string;
  appraiserLine: string;
  pricingDelta?: { asking: number; bargain: number; repair: number };
}

interface SellerCard {
  sellerName: string;
  device: string;
  situation: string;
  quote: string;
}

const sellers: readonly SellerCard[] = [
  { sellerName: '林姐', device: '星河 S9', situation: '刚交完房租，今天想把闲置换成现金', quote: '我不是急卖，今天只是得把账结了。' },
  { sellerName: '小岳', device: '远山 Note', situation: '换了工作手机，旧机一直放在抽屉里', quote: '能开机就行，细节你自己验。' },
  { sellerName: '周师傅', device: '海潮 Pro', situation: '维修店月底盘货，愿意少赚一点腾位置', quote: '别光看牌子，周转速度也算成本。' },
  { sellerName: '阿宁', device: '青禾 12', situation: '准备搬家，只想少带一件行李', quote: '照片都导走了，机器你当面看。' },
  { sellerName: '陈叔', device: '曜石 Max', situation: '给家里换了新机，旧机还留着原盒', quote: '盒子在不在不重要，机器别压价太狠。' },
  { sellerName: '小唐', device: '云帆 Lite', situation: '临时要交培训费，来回问了几家回收铺', quote: '你给个痛快价，我还得赶车。' },
  { sellerName: '吴姨', device: '北斗 X', situation: '孩子换下来的手机，配件已经找不全了', quote: '我不懂型号，你把价和问题讲明白。' },
  { sellerName: '阿哲', device: '木棉 8 Plus', situation: '外地出差前清理行李，约在站口交机', quote: '时间有点赶，验机别省步骤。' },
  { sellerName: '许哥', device: '飞鸟 Ultra', situation: '店里新机到货，打算用旧机抵一部分款', quote: '旧机折价多少，账上写清楚就行。' },
  { sellerName: '小苏', device: '长街 11', situation: '刚结束夜班，想赶在早市前处理掉旧机', quote: '我困归困，你该查的地方还是查。' },
  { sellerName: '赵师傅', device: '银杏 Pro', situation: '给顾客换屏后留下的备用机，准备清掉库存', quote: '同行价我知道，别拿外行话糊弄我。' },
  { sellerName: '林阿姨', device: '晚风 Note', situation: '家里添了新成员，旧设备用不上了', quote: '价钱合适就卖，不合适我带回去。' },
  { sellerName: '小齐', device: '石桥 S', situation: '合租室友搬走，把寄放的手机取来处理', quote: '密码我能解，账号退出你也看着。' },
  { sellerName: '罗叔', device: '桔灯 10', situation: '摆摊收摊后顺路过来，想少跑一趟', quote: '当面验完，当面转账，咱们都省心。' },
  { sellerName: '阿敏', device: '江岸 Fold', situation: '屏幕尺寸不习惯，换回了旧款小手机', quote: '我不喜欢折叠屏，不代表它就没价值。' },
  { sellerName: '大勇', device: '晨星 13', situation: '跑长途前整理车厢，设备一直放在中控旁', quote: '灰多是灰多，别把使用痕迹算成故障。' },
  { sellerName: '何姐', device: '青石 Mini', situation: '店铺装修暂停营业，先把闲置变成周转钱', quote: '装修款一天天走，今天能定就今天定。' },
  { sellerName: '小邵', device: '白塔 Pro', situation: '刚领到年终奖，准备给自己换台新机', quote: '旧机卖多少都算添头，别让我白等。' },
  { sellerName: '秦师傅', device: '渡口 9', situation: '维修摊换了工具柜，清出一批旧设备', quote: '工具能修好，账可得算准。' },
  { sellerName: '阿兰', device: '雨巷 Air', situation: '赶着接孩子放学，提前把手机擦拭好', quote: '我把资料清过了，你再确认一遍。' },
  { sellerName: '老马', device: '红砖 X', situation: '同事送了新机，旧机想留给家人前先估价', quote: '熟人之间也先把规矩说在前头。' },
  { sellerName: '小叶', device: '云梯 12 Pro', situation: '搬工作室时翻出两年前的备用机', quote: '我记得它能用，记不清最后一次充电了。' },
  { sellerName: '郑姨', device: '月台 Max', situation: '赶集回来顺路问价，手里还拎着菜篮', quote: '你慢慢验，我就在门口等着。' },
  { sellerName: '阿凯', device: '夜航 7', situation: '临时接到外地活，想今天就换一笔路费', quote: '我赶时间，但不会催你跳过检查。' },
  { sellerName: '邱老板', device: '梧桐 S Pro', situation: '柜台展示机准备换代，配件盒单独收着', quote: '柜台货不等于新机，账面别混着算。' },
  { sellerName: '小满', device: '灯塔 Note 8', situation: '考试结束准备回家，想轻装坐夜车', quote: '这台陪我熬过考试，卖掉还是有点舍不得。' },
  { sellerName: '刘叔', device: '南站 5G', situation: '帮邻居代问回收价，卖不卖由对方决定', quote: '我只负责带话，问题得让机器自己说。' },
  { sellerName: '宋姐', device: '榆钱 11', situation: '家里清理旧物，想把闲置整理得明明白白', quote: '每一项扣价都告诉我理由。' },
  { sellerName: '阿昆', device: '小桥 SE', situation: '网店退货超过期限，决定接受线下估价', quote: '线上说法太多，这回我当面看结果。' },
  { sellerName: '冯师傅', device: '巷口 Ultra', situation: '刚收完夜摊，带着备用机来问最后一单', quote: '今天不一定卖，先听听你怎么验。' },
  { sellerName: '小程', device: '石榴 8', situation: '刚搬到新住处，整理出一台工作备用机', quote: '账号我可以当面退出，转账记录也留给你看。' },
  { sellerName: '蒋姨', device: '长堤 Plus', situation: '家里宽带换了套餐，旧手机一直没舍得处理', quote: '该有的配件都在，价格合适我就不带回去了。' },
  { sellerName: '阿浩同学', device: '青枫 SE', situation: '实习结束要退宿，行李里多出一台旧设备', quote: '电池我没测过，你验完再告诉我值多少。' },
  { sellerName: '赵师傅', device: '白杨 Note', situation: '维修店清点寄售柜，几台旧机要核对来源', quote: '单子和机器一一对上，别把寄售货混进来。' },
  { sellerName: '小陶', device: '雾港 Pro', situation: '准备换一部轻一点的手机，先来问旧机估价', quote: '我不赶时间，问题和扣价都讲清楚就行。' },
  { sellerName: '何叔', device: '石阶 Max', situation: '出差回来整理随身包，发现备用机还剩不少电', quote: '能开机只是第一步，其他你按规矩查。' },
  { sellerName: '林同学', device: '秋水 Lite', situation: '考试结束准备回老家，想把闲置换成路费', quote: '这是我自己用的，资料已经备份，咱们当面确认。' },
  { sellerName: '小邱', device: '桥东 Fold', situation: '折叠屏换回直板机后，旧机一直留在抽屉', quote: '折痕你仔细看，价差别只按外壳算。' },
  { sellerName: '周姐', device: '栖云 10', situation: '店铺换了收银设备，旧手机准备一起出掉', quote: '我把发票和维修记录放在盒子里了。' },
  { sellerName: '老贺', device: '河湾 X', situation: '夜班结束顺路过来，想先听听这台机的行情', quote: '不合适我就继续用，别为了成交漏讲问题。' },
  { sellerName: '阿真', device: '拾光 Mini', situation: '准备给父母换新机，旧设备要先清理账号', quote: '你看着我把账号退掉，隐私这块我比较在意。' },
];

const profiles: readonly PhoneFlipProfile[] = ['CLEAN', 'BATTERY', 'CORROSION'];
const profileSalt: Readonly<Record<PhoneFlipProfile, number>> = { CLEAN: 0xA11001, BATTERY: 0xA11002, CORROSION: 0xA11003 };
const legacySellers = sellers.slice(0, 30);
const legacyMarketContexts = phoneFlipMarketContexts.slice(0, 8);
const legacyContinuationCardsPerSeller = 8;
const continuationCardsPerSeller = phoneFlipMarketContexts.length;
const moneyChange = (value: number): string => value > 0 ? `+¥${value}` : value < 0 ? `−¥${Math.abs(value)}` : '不变';

function applyReturnContext(
  scenario: PhoneFlipScenarioCopy,
  step: PhoneFlipStep,
  returnContext: PhoneFlipReturnContext | null,
): PhoneFlipScenarioCopy {
  if (step !== 0 || !returnContext) return scenario;
  return {
    ...scenario,
    id: `${scenario.id}-memory-${returnContext.previousDay}`,
    appraiserLine: `阿浩翻开第 ${returnContext.previousDay} 天的账：“上次没验机就收下${returnContext.phoneName}，最后净亏 ¥${returnContext.loss}。我当时没把漏检的代价讲透。这一单先看清线索，怎么选还是你决定。”`,
  };
}

const appraiserLines = [
  '阿浩把计算器推到桌边：“先别谈人情，咱们把能确认的部分一项项写下来。”',
  '“机器不说谎，卖家也未必撒谎。你看证据，别替任何一边补故事。”',
  '他抬眼看了看你：“肯花时间验，通常比会背型号值钱。”',
  '“回收铺赚的是周转，不是赌运气。压在手里的每一天都要算成本。”',
  '阿浩把旧布叠好：“我以前嫌检查麻烦，后来才知道返修更费时间。”',
  '“能卖多少我给你算明白，卖不卖你自己定。我不替你按确认键。”',
  '他敲了敲桌面：“报价是报价，承诺是承诺，别把两件事混在一起。”',
  '“同一台机器，换个人看也该得到同一张账。规矩先立住。”',
  '阿浩看着门外的雨：“赶时间的人最容易漏看角落，咱们慢半分钟。”',
  '“我也怕压货，所以每次收机都先问自己：最坏会卡多少现金？”',
  '他把标签翻到背面：“写清楚它的来路，之后少一半扯皮。”',
  '“便宜不等于划算，贵也不等于稳。利润得从转售价里倒着算。”',
  '阿浩皱了皱眉：“我记得这类毛病，记忆只能提醒你，不能替你验机。”',
  '“钱紧的时候更要把整备费留出来，别买完才发现手里只剩一台故障机。”',
  '他把验机灯递给你：“这盏灯我用了好多年，照得出灰，也照不出人的难处。”',
  '“卖家有他的急事，咱们有自己的底线。价格可以谈，事实不能改。”',
  '阿浩看了一眼账本：“今天单子少没关系，现金别被一台机器困住。”',
  '“你开始问维修风险了。挺好，回收不是猜谁倒霉，是算自己扛不扛得住。”',
  '他没有马上报价：“先看完再说。我不想让你为了快，把没看见的当成没有。”',
  '“每台机都写上收价、整备和转售价。月底翻账时，才知道自己到底会不会做。”',
  '阿浩叹了口气：“我年轻时总觉得压低收价就不会亏，后来货架教我不是这么回事。”',
  '“如果一笔生意得靠隐瞒故障才能赚钱，那这笔钱我宁可不赚。”',
  '他指着门边的旧箱子：“留点周转金。铺子不是只靠今天这单活着。”',
  '“你看得比刚来时细了。可别因此觉得自己能看穿每一台机器。”',
  '阿浩把两份估价并排放好：“不同方案的差额都在这儿，选了就承担那一栏。”',
  '“我不喜欢压价，也不喜欢赔钱。夹在中间，才是这行每天要过的日子。”',
  '他顿了顿：“有些卖家以后还会回来。今天怎么算，决定人家还信不信这块招牌。”',
  '“这台我会记在本子上。不是为了下次少给，是为了知道上次判断准不准。”',
  '阿浩收起计算器：“咱们能控制检查和报价，控制不了别人什么时候买。”',
  '“做久了我还是不敢说看机从没走眼。能做的，就是把走眼的代价先算给你看。”',
] as const;

export function phoneFlipProfilesFor(day: number, seed: number): readonly PhoneFlipProfile[] {
  const safeDay = Math.max(1, Math.floor(day));
  return seededShuffle(profiles, seed, 0xA11000 ^ safeDay);
}

export function phoneFlipScenarioFor(
  day: number,
  step: PhoneFlipStep,
  seed: number,
  version: 1 | 2 | 3 | 4 | 5 = 2,
  returnContext: PhoneFlipReturnContext | null = null,
): PhoneFlipScenarioCopy {
  const safeDay = Math.max(1, Math.floor(day));
  const profile = phoneFlipProfilesFor(safeDay, seed)[step]!;
  if ((version === 3 || version === 4 || version === 5) && safeDay > 30) {
    const position = safeDay - 31;
    const legacy = version === 3;
    const sellerPool = legacy ? legacySellers : sellers;
    const contextPool = legacy ? legacyMarketContexts : phoneFlipMarketContexts;
    const cardsPerSeller = legacy ? legacyContinuationCardsPerSeller : continuationCardsPerSeller;
    const sellerIndex = seededPermutationAt(Math.floor(position / cardsPerSeller), sellerPool.length, seed, profileSalt[profile]);
    const seller = sellerPool[sellerIndex]!;
    const market = phoneFlipMarketContextAt(position, seed, profileSalt[profile] ^ 0xA11111, contextPool);
    const context = market.context;
    const cadenceMonth = Math.floor(position / 30);
    const yearContext = version === 5 ? phoneFlipYearContexts[cadenceMonth % phoneFlipYearContexts.length]! : null;
    const cycleContext = version === 5
      ? phoneFlipCycleContexts[Math.floor(cadenceMonth / phoneFlipYearContexts.length) % phoneFlipCycleContexts.length]!
      : null;
    const askingDelta = context.askingDelta + (yearContext?.askingDelta ?? 0) + (cycleContext?.askingDelta ?? 0);
    const bargainDelta = context.bargainDelta + (yearContext?.bargainDelta ?? 0) + (cycleContext?.bargainDelta ?? 0);
    const repairDelta = context.repairDelta + (yearContext?.repairDelta ?? 0) + (cycleContext?.repairDelta ?? 0);
    const cycleTitles = [yearContext?.title, cycleContext?.title].filter((title): title is string => title !== undefined);
    const cycleSellerSituations = [yearContext?.sellerSituation, cycleContext?.sellerSituation].filter((line): line is string => line !== undefined);
    const cycleAppraiserLines = [yearContext?.appraiserLine, cycleContext?.appraiserLine].filter((line): line is string => line !== undefined);
    const profileName = profile === 'CLEAN' ? '轻薄旗舰机' : profile === 'BATTERY' ? '续航旧款机' : '低价大屏机';
    const evidence = profile === 'CLEAN' ? '外观只有轻微磨损，开机和触控现场正常。'
      : profile === 'BATTERY' ? '卖家常年插电使用，离电续航没有验证。'
      : '充电口附近有氧化痕迹，卖家称日常使用不受影响。';
    return applyReturnContext({
      id: `phone-v${version}-${profile}-${sellerIndex}-${context.id}${yearContext ? `-${yearContext.id}-${cycleContext?.id}` : ''}`,
      profile,
      name: `${profileName} · ${seller.device} · ${context.title}`,
      sellerName: seller.sellerName,
      sellerLine: `${context.sellerSituation}。${cycleSellerSituations.length ? `${cycleSellerSituations.join('。')}。` : ''}${seller.situation}。卖家说：“${seller.quote}”`,
      clue: `${evidence} 本场行情：${context.title}${cycleTitles.length ? ` · ${cycleTitles.join(' · ')}` : ''}。相对基础估价，挂牌价 ${moneyChange(askingDelta)}，议价价 ${moneyChange(askingDelta + bargainDelta)}，整备费 ${moneyChange(repairDelta)}。`,
      appraiserLine: cycleAppraiserLines.length ? `${context.appraiserLine} ${cycleAppraiserLines.join(' ')}` : context.appraiserLine,
      pricingDelta: { asking: askingDelta, bargain: bargainDelta, repair: repairDelta },
    }, step, returnContext);
  }
  const deck = seededShuffle(Array.from({ length: legacySellers.length }, (_, index) => index), seed, profileSalt[profile]);
  const variant = deck[(safeDay - 1) % deck.length]!;
  const seller = legacySellers[variant]!;
  const profileName = profile === 'CLEAN' ? '轻薄旗舰机' : profile === 'BATTERY' ? '续航旧款机' : '低价大屏机';
  const evidence = profile === 'CLEAN' ? '外观只有轻微磨损，开机和触控现场正常。'
    : profile === 'BATTERY' ? '卖家常年插电使用，离电续航没有验证。'
    : '充电口附近有氧化痕迹，卖家称日常使用不受影响。';
  return applyReturnContext({
    id: `phone-v2-${safeDay}-${step}-${profile}-${variant}`,
    profile,
    name: `${profileName} · ${seller.device}`,
    sellerName: seller.sellerName,
    sellerLine: `${seller.situation}。卖家说：“${seller.quote}”`,
    clue: `${evidence} ${seller.situation}。`,
    appraiserLine: appraiserLines[(safeDay - 1) % appraiserLines.length]!,
  }, step, returnContext);
}
