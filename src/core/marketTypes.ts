export interface TradeRecord {
  id: string;
  price: number;
  shares: number;
  side: 'BUY' | 'SELL';
  isPlayer: boolean;
}

export interface OrderBookLevel {
  price: number;
  volume: number;
}
