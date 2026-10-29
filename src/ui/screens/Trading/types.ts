export type Phase = 'PRE_MARKET' | 'DAYTIME' | 'TRADING' | 'NIGHT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderResult = 'FILLED' | 'PARTIAL' | 'REJECTED';

export interface StockCardVM {
  id: string;
  name: string;
  price: number;
  changePct: number;
  isHalted: boolean;
  holding?: { shares: number; avgCost: number; pnlPct: number };
  priceHistory: number[];
}

export interface StockDetailVM {
  id: string;
  name: string;
  price: number;
  changePct: number;
  changeAmount: number;
  priceHistory: number[];
  open: number;
  high: number;
  low: number;
  volume: number;
  markers: { index: number; side: OrderSide }[];
  newsHint?: { npcName: string; time: string; text: string };
}

export interface OrderFeedback {
  id: string;
  stockName: string;
  side: OrderSide;
  requestedShares: number;
  filledShares: number;
  requestedPrice: number;
  filledPrice: number;
  slippagePct: number;
  fee: number;
  latencyMs: number;
  result: OrderResult;
  rejectReason?: string;
  cashAfter: number;
}

export interface TradingVM {
  day: number;
  phase: Phase;
  cash: number;
  debt: number;
  stocks: StockCardVM[];
  selectedStockId: string | null;
  selectedDetail: StockDetailVM | null;
  maxBuyShares: number;
  maxSellShares: number;
  leverageAvailable: boolean;
  leverageOn: boolean;
  inputShares: number;
  inputError: string | null;
  lastOrder: OrderFeedback | null;
}

export interface TradingHandlers {
  onSelectStock(id: string): void;
  onInputShares(n: number): void;
  onQuickAmount(ratio: 0.5 | 1): void;
  onToggleLeverage(): void;
  onSubmit(side: OrderSide): void;
  onSkipDay(): void;
  onDismissFeedback(): void;
}