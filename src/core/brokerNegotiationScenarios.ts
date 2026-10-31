import { seededPermutationAt } from './scenarioDeck';
import type { GameState, StockState } from './types';
import type { BrokerMarketSnapshot } from './brokerNegotiationTypes';

export interface BrokerNegotiationScenario {
  deskContext: string;
  focusTitle: string;
  focusPrompt: string;
}

const deskContexts = [
  '一位刚开始做短线的客户拿着委托记录来问七天费率。',
  '客户上周只做过几笔交易，想先看实际费用再签约。',
  '柜台正在回访一份到期合同，旧账要和真实成交逐笔核对。',
  '有人把股价涨跌当成交易量，周经理把成交记录摊开。',
  '新客要求先算清最坏支出，再决定要不要换账户。',
] as const;

const marketFocuses = [
  {
    title: '把成交额和股价分开看',
    prompt: '近笔成交额只反映已发生的成交；股价涨跌本身不能代替七天成交额估算。',
  },
  {
    title: '检查买卖方向是否集中',
    prompt: '成交方向不代表下周走势；只把它作为活跃程度的一个观察项。',
  },
  {
    title: '留意买卖一档价差',
    prompt: '价差描述当前盘口报价，不等于未来成交量，也不保证委托能成交。',
  },
  {
    title: '对照今开与现价',
    prompt: '价格变化和成交额是两种不同信息；估算时别把涨跌幅当作交易金额。',
  },
  {
    title: '先看成交样本有多少',
    prompt: '近笔记录只是有限样本；样本少时，不要把短时活跃当成稳定周均值。',
  },
  {
    title: '确认当日成交量的单位',
    prompt: '当日成交量以股计，不是金额；这里展示的是当前行情记录，不是未来承诺。',
  },
] as const;

const scenarioSalt = 0xB20B;

export const brokerNegotiationScenarioCount = deskContexts.length * marketFocuses.length;

export function getBrokerNegotiationScenarioIndex(day: number, seed: number): number {
  return seededPermutationAt(Math.max(0, Math.floor(day) - 1), brokerNegotiationScenarioCount, seed, scenarioSalt);
}

export function getBrokerNegotiationScenario(index: number): BrokerNegotiationScenario | null {
  if (!Number.isInteger(index) || index < 0 || index >= brokerNegotiationScenarioCount) return null;
  const context = deskContexts[Math.floor(index / marketFocuses.length)];
  const focus = marketFocuses[index % marketFocuses.length];
  if (!context || !focus) return null;
  return { deskContext: context, focusTitle: focus.title, focusPrompt: focus.prompt };
}

export function createBrokerMarketSnapshot(state: GameState): BrokerMarketSnapshot | null {
  const stock = state.stocks[state.selectedStockId] ?? Object.values(state.stocks)[0];
  return stock ? snapshotStock(stock) : null;
}

function snapshotStock(stock: StockState): BrokerMarketSnapshot {
  const recentBuyShares = stock.recentTrades.reduce((total, trade) => total + (trade.side === 'BUY' ? trade.shares : 0), 0);
  const recentSellShares = stock.recentTrades.reduce((total, trade) => total + (trade.side === 'SELL' ? trade.shares : 0), 0);
  const recentTurnover = stock.recentTrades.reduce((total, trade) => total + trade.price * trade.shares, 0);
  const bid = stock.bids[0]?.price;
  const ask = stock.asks[0]?.price;

  return {
    stockId: stock.id,
    stockName: stock.name,
    currentPrice: stock.price,
    openPrice: stock.open,
    dayVolume: stock.volume,
    recentTradeCount: stock.recentTrades.length,
    recentTurnover: Number(recentTurnover.toFixed(2)),
    recentBuyShares,
    recentSellShares,
    bestSpread: bid !== undefined && ask !== undefined ? Number((ask - bid).toFixed(2)) : null,
  };
}
