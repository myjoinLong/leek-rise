import type { GameState } from '../../../core/types';
import { maxAffordableBuyShares } from '../../../core/systems/orderBook';
import { getBrokerTradingFeeRate } from '../../../core/systems/brokerNegotiation';
import type { StockCardVM, StockDetailVM, TradingVM } from './types';

function changePct(price: number, reference: number): number {
  return reference === 0 ? 0 : (price - reference) / reference * 100;
}

export function selectTradingVM(state: GameState, leverage = 1): TradingVM {
  const stocks: StockCardVM[] = Object.values(state.stocks).map((stock) => {
    const reference = stock.priceHistory[0] ?? stock.price;
    const holdingPnl = !stock.holding || stock.holding.avgCost === 0
      ? 0
      : (stock.price - stock.holding.avgCost) / stock.holding.avgCost * 100;
    return {
      id: stock.id,
      name: stock.name,
      symbol: stock.symbol,
      sector: stock.sector,
      price: stock.price,
      changePct: changePct(stock.price, reference),
      isHalted: false,
      ...(stock.holding && stock.holding.shares > 0
        ? { holding: { ...stock.holding, pnlPct: holdingPnl } }
        : {}),
      priceHistory: stock.priceHistory,
    };
  });
  const selected = state.stocks[state.selectedStockId] ?? Object.values(state.stocks)[0];
  const selectedReference = selected?.open ?? selected?.price ?? 0;
  const selectedDetail: StockDetailVM | null = selected ? {
    id: selected.id,
    name: selected.name,
    price: selected.price,
    changePct: changePct(selected.price, selectedReference),
    changeAmount: selected.price - selectedReference,
    priceHistory: selected.priceHistory,
    open: selectedReference,
    high: selected.high,
    low: selected.low,
    volume: selected.volume,
    markers: [],
    newsHint: state.marketIntel?.day === state.day && state.marketIntel.stockId === selected.id
      ? {
        npcName: state.marketIntel.npcName ?? '龙哥',
        time: state.marketIntel.confidence === 'HIGH' ? '较高可信' : state.marketIntel.confidence === 'LOW' ? '有限线索' : '待核实',
        text: state.marketIntel.message,
      }
      : { npcName: '龙哥', time: '07:45', text: `${selected.name}，我自己先干了。` },
  } : null;
  const maxShares = selected
    ? maxAffordableBuyShares(state.cash, selected, leverage, getBrokerTradingFeeRate(state.brokerContract, state.day))
    : 0;

  return {
    day: state.day,
    phase: state.phase,
    cash: state.cash,
    debt: state.debt,
    stocks,
    selectedStockId: selected?.id ?? null,
    selectedDetail,
    maxBuyShares: maxShares,
    maxSellShares: selected?.holding?.shares ?? 0,
    leverageAvailable: false,
    leverageOn: false,
    inputShares: state.inputShares,
    inputError: null,
    lastOrder: null,
  };
}
