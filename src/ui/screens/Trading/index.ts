import './styles/trading.css';
import type { GameAction } from '../../../core/reducer';
import type { GameState } from '../../../core/types';
import { marketTickIntervalMs, marketTicksPerDay } from '../../../core/timeRules';
import { estimateOrderSettlement } from '../../../core/systems/orderBook';
import { getBrokerTradingFeeRate } from '../../../core/systems/brokerNegotiation';
import { OrderFeedbackCard } from './components/OrderFeedbackCard';
import { OrderPanel } from './components/OrderPanel';
import { PhaseNav } from './components/PhaseNav';
import { NewsHint } from './components/NewsHint';
import { QuoteGrid } from './components/QuoteGrid';
import { StockDetailHeader } from './components/StockDetailHeader';
import { TopBar } from './components/TopBar';
import { TapePanel } from './components/TapePanel';
import { Watchlist } from './components/Watchlist';
import type { PriceChart as PriceChartInstance } from '../../render/PriceChart';
import { selectTradingVM } from './selectors';
import type { OrderSide, TradingHandlers, TradingVM } from './types';

export function createTradingScreen(
  initialState: GameState,
  sendAction: (action: GameAction) => GameState,
): HTMLElement {
  let gameState = initialState;
  let leverageOn = false;
  let inputError: string | null = null;
  let feedbackCard: OrderFeedbackCard | null = null;
  let displayedFeedbackId: string | null = null;
  let chart: PriceChartInstance | null = null;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let screenActive = true;

  const screen = document.createElement('div');
  screen.className = 'trading-screen scene-screen';
  const topBar = new TopBar();
  const phaseNav = new PhaseNav();
  const marketClock = document.createElement('div');
  marketClock.className = 'trading-clock';
  marketClock.setAttribute('role', 'progressbar');
  marketClock.setAttribute('aria-label', '本日交易进度');
  marketClock.setAttribute('aria-valuemin', '0');
  marketClock.setAttribute('aria-valuemax', String(marketTicksPerDay));
  const marketClockLabel = document.createElement('span');
  marketClockLabel.className = 'trading-clock__label';
  const marketClockTrack = document.createElement('span');
  marketClockTrack.className = 'trading-clock__track';
  const marketClockFill = document.createElement('span');
  marketClockFill.className = 'trading-clock__fill';
  marketClockTrack.append(marketClockFill);
  marketClock.append(marketClockLabel, marketClockTrack);
  const scrollArea = document.createElement('div');
  scrollArea.className = 'trading-scroll-area';
  const watchlist = new Watchlist();
  const stockDetailHeader = new StockDetailHeader();
  const chartWrapper = document.createElement('div');
  chartWrapper.className = 'chart-wrapper';
  const tapePanel = new TapePanel();
  const quoteGrid = new QuoteGrid();
  const newsHint = new NewsHint();
  const orderPanel = new OrderPanel();
  scrollArea.append(watchlist.el, stockDetailHeader.el, chartWrapper, tapePanel.el, quoteGrid.el, newsHint.el);
  screen.append(topBar.el, phaseNav.el, marketClock, scrollArea, orderPanel.el);

  const stopTicker = (): void => {
    if (ticker === undefined) return;
    clearInterval(ticker);
    ticker = undefined;
  };

  const syncTicker = (): void => {
    if (!screenActive || gameState.phase !== 'TRADING' || document.visibilityState === 'hidden') {
      stopTicker();
      return;
    }
    if (ticker !== undefined) return;
    ticker = setInterval(() => {
      if (!screenActive || gameState.phase !== 'TRADING') {
        stopTicker();
        return;
      }
      dispatch({ type: 'ADVANCE_TICK' });
    }, marketTickIntervalMs);
  };

  const handleVisibilityChange = (): void => syncTicker();

  const render = (): void => {
    if (!screenActive) return;
    const selected = selectTradingVM(gameState, leverageOn ? 2 : 1);
    const tickCount = gameState.marketTicksThisDay;
    marketClock.setAttribute('aria-valuenow', String(tickCount));
    marketClock.setAttribute('aria-valuetext', `${tickCount} / ${marketTicksPerDay} 个 Tick，达到上限后自动收盘`);
    marketClockLabel.textContent = `行情 ${tickCount}/${marketTicksPerDay} Tick`;
    marketClockFill.style.transform = `scaleX(${tickCount / marketTicksPerDay})`;
    const selectedStock = gameState.stocks[gameState.selectedStockId];
    const validLot = Number.isInteger(gameState.inputShares)
      && gameState.inputShares >= 100
      && gameState.inputShares % 100 === 0;
    inputError = validLot ? null : '数量必须是100股的正整数倍';
    const orderEstimates = selectedStock ? {
      buy: estimateOrderSettlement(selectedStock, 'BUY', gameState.inputShares, leverageOn ? 2 : 1, false, getBrokerTradingFeeRate(gameState.brokerContract, gameState.day)),
      sell: estimateOrderSettlement(selectedStock, 'SELL', gameState.inputShares, leverageOn ? 2 : 1, false, getBrokerTradingFeeRate(gameState.brokerContract, gameState.day)),
    } : undefined;
    const viewState: TradingVM = {
      ...selected,
      leverageOn,
      inputError,
      lastOrder: gameState.lastOrderFeedback,
    };
    topBar.update(viewState);
    phaseNav.update(viewState);
    watchlist.update(viewState);
    stockDetailHeader.update(viewState);
    quoteGrid.update(viewState);
    newsHint.update(viewState);
    tapePanel.update({
      bids: selectedStock?.bids ?? [],
      asks: selectedStock?.asks ?? [],
      recentTrades: selectedStock?.recentTrades ?? [],
    });
    orderPanel.update(viewState, orderEstimates, getBrokerTradingFeeRate(gameState.brokerContract, gameState.day));
    chart?.update(viewState.selectedDetail?.priceHistory ?? []);

    const feedback = gameState.lastOrderFeedback;
    if (feedback && feedback.id !== displayedFeedbackId) {
      displayedFeedbackId = feedback.id;
      feedbackCard?.dismiss();
      const card = new OrderFeedbackCard(feedback, () => {
        if (gameState.lastOrderFeedback?.id === feedback.id) {
          dispatch({ type: 'CLEAR_ORDER_FEEDBACK' });
        }
        if (feedbackCard === card) feedbackCard = null;
      });
      feedbackCard = card;
      card.mount(document.body);
    }
    syncTicker();
  };

  const mountChart = async (): Promise<void> => {
    try {
      const { PriceChart } = await import('../../render/PriceChart');
      if (!screenActive) return;
      const chartWidth = chartWrapper.clientWidth || Math.max(1, Math.min(window.innerWidth || 480, 480) - 32);
      chart = new PriceChart(chartWrapper, chartWidth, 180);
      render();
    } catch {
      if (screenActive) {
        chartWrapper.textContent = 'K线暂时无法加载';
        chartWrapper.setAttribute('role', 'status');
      }
    }
  };

  const dispatch = (action: GameAction): void => {
    const previousPhase = gameState.phase;
    gameState = sendAction(action);
    if (previousPhase === 'TRADING' && gameState.phase !== 'TRADING') deactivate();
    render();
  };

  const deactivate = (): void => {
    if (!screenActive) return;
    screenActive = false;
    stopTicker();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    feedbackCard?.dismiss();
    chart?.destroy();
    chart = null;
  };

  const handlers: TradingHandlers = {
    onSelectStock: (id: string): void => {
      if (!gameState.stocks[id]) return;
      gameState = sendAction({ type: 'SELECT_STOCK', stockId: id });
      render();
    },
    onInputShares: (shares: number): void => {
      gameState = sendAction({ type: 'SET_INPUT_SHARES', shares });
      render();
    },
    onQuickAmount: (ratio: 0.5 | 1): void => {
      const vm = selectTradingVM(gameState, leverageOn ? 2 : 1);
      gameState = sendAction({
        type: 'SET_INPUT_SHARES',
        shares: Math.floor(vm.maxBuyShares * ratio / 100) * 100,
      });
      inputError = null;
      render();
    },
    onToggleLeverage: (): void => {
      if (!selectTradingVM(gameState).leverageAvailable) return;
      leverageOn = !leverageOn;
      render();
    },
    onSubmit: (side: OrderSide): void => {
      dispatch({
        type: 'PLACE_ORDER',
        side,
        shares: gameState.inputShares,
        leverage: leverageOn ? 2 : 1,
      });
    },
    onSkipDay: (): void => {
      deactivate();
      gameState = sendAction({ type: 'ADVANCE_PHASE' });
    },
    onDismissFeedback: (): void => {
      dispatch({ type: 'CLEAR_ORDER_FEEDBACK' });
    },
  };

  orderPanel.bind(handlers);
  watchlist.onSelect = handlers.onSelectStock;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  render();
  void mountChart();
  return screen;
}
