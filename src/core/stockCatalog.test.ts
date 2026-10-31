import { describe, expect, it } from 'vitest';
import { createInitialState, mergeStockPool } from './state';
import { stockCatalog } from './stockCatalog';

describe('simulated stock catalog', () => {
  it('creates a reproducible ten-stock market with independent opening scenarios', () => {
    const first = createInitialState(37);
    const repeated = createInitialState(37);
    const changedSeed = createInitialState(38);

    expect(Object.keys(first.stocks)).toEqual(stockCatalog.map((stock) => stock.id));
    expect(first.stocks).toEqual(repeated.stocks);
    expect(first.stocks.dragon?.priceHistory).not.toEqual(changedSeed.stocks.dragon?.priceHistory);
    expect(new Set(Object.values(first.stocks).map((stock) => stock.scriptPhase)).size).toBeGreaterThan(1);

    for (const definition of stockCatalog) {
      const stock = first.stocks[definition.id];
      expect(stock).toBeDefined();
      expect(stock?.priceHistory).toHaveLength(20);
      expect(stock?.open).toBe(stock?.priceHistory[0]);
      expect(stock?.high).toBe(Math.max(...(stock?.priceHistory ?? [])));
      expect(stock?.low).toBe(Math.min(...(stock?.priceHistory ?? [])));
      expect(stock?.symbol).toBe(definition.symbol);
      expect(stock?.sector).toBe(definition.sector);
      if (definition.id !== 'dragon') expect(stock?.holding).toBeUndefined();
    }

    expect(first.cash).toBe(3200);
    expect(first.stocks.dragon?.holding).toEqual({ shares: 800, avgCost: first.stocks.dragon?.price });
    expect(first.dayStartEquity).toBe(Number((3200 + (first.stocks.dragon?.price ?? 0) * 800 - first.debt).toFixed(2)));
  });

  it('fills a legacy stock map while preserving existing market and position data', () => {
    const initial = createInitialState(71);
    const dragon = initial.stocks.dragon;
    if (!dragon) throw new Error('Expected the original market listing.');
    const { symbol, sector, volatility, ...legacyDragon } = dragon;
    void symbol;
    void sector;
    void volatility;
    const liveDragon = { ...legacyDragon, price: 11.23, holding: { shares: 300, avgCost: 9.87 } };

    const expanded = mergeStockPool({ dragon: liveDragon }, 71);

    expect(Object.keys(expanded)).toHaveLength(10);
    expect(expanded.dragon).toMatchObject({
      ...liveDragon,
      symbol: 'PC001',
      sector: '科技制造',
      volatility: 1,
    });
    expect(expanded.harbor?.holding).toBeUndefined();
  });
});
