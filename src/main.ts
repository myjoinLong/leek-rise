import './ui/screens/Trading/styles/global.css';
import './ui/screens/Trading/styles/tokens.css';
import { createInitialState } from './core/state';
import { gameReducer } from './core/reducer';
import type { GameAction } from './core/reducer';
import type { GamePhase, GameState } from './core/types';
import { createDaytimeScreen } from './ui/screens/Daytime/DaytimeScreen';
import { createNightScreen } from './ui/screens/Night/NightScreen';
import { createPreMarketScreen } from './ui/screens/PreMarket/PreMarketScreen';
import { createStartScreen } from './ui/screens/Start/StartScreen';
import { createActivityScreen } from './ui/screens/Activities/ActivityScreenRegistry';
import { createTradingScreen } from './ui/screens/Trading';
import { loadSavedGame, saveGame } from './save/storage';

const root = document.getElementById('app');
if (!root) throw new Error('App container #app was not found.');

const saveNotice = document.createElement('p');
saveNotice.className = 'save-warning';
saveNotice.setAttribute('role', 'status');

const artPreviewMode = new URLSearchParams(window.location.search).get('artPreview') === '1';
let state: GameState = createInitialState();
let saveQueue: Promise<void> = Promise.resolve();
let saveWarning: string | null = null;

const syncSaveNotice = (): void => {
  if (!saveWarning) {
    saveNotice.remove();
    return;
  }
  saveNotice.textContent = saveWarning;
  if (!saveNotice.isConnected) root.append(saveNotice);
};

const persistState = (snapshot: GameState): void => {
  if (artPreviewMode) return;
  const write = (): Promise<void> => saveGame(snapshot);
  saveQueue = saveQueue.then(write, write).then(
    () => {
      saveWarning = null;
      syncSaveNotice();
    },
    () => {
      saveWarning = '本地存档写入失败，刷新页面可能会丢失最近进度。';
      syncSaveNotice();
    },
  );
};

const syncPnlMood = (currentState: GameState): void => {
  const assets = Object.values(currentState.stocks).reduce(
    (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
    currentState.cash - currentState.debt,
  );
  const dailyChange = assets - currentState.dayStartEquity;
  document.body.dataset.pnlMood = dailyChange > 0 ? 'profit' : dailyChange < 0 ? 'loss' : 'neutral';
};

const render = (currentState: GameState): void => {
  syncPnlMood(currentState);
  let screen: HTMLElement;
  if (!currentState.gender) {
    screen = createStartScreen(dispatch);
  } else {
    const activityScreen = createActivityScreen(currentState, dispatch);
    if (activityScreen) {
      screen = activityScreen;
    } else {
      switch (currentState.phase) {
        case 'PRE_MARKET':
          screen = createPreMarketScreen(currentState, dispatch);
          break;
        case 'DAYTIME':
          screen = createDaytimeScreen(currentState, dispatch);
          break;
        case 'TRADING':
          screen = createTradingScreen(currentState, dispatch);
          break;
        case 'NIGHT':
          screen = createNightScreen(currentState, dispatch);
          break;
      }
    }
  }
  root.replaceChildren(screen);
  syncSaveNotice();
};

const dispatch = (action: GameAction): GameState => {
  const previousState = state;
  const previousPhase: GamePhase = state.phase;
  const previousGender = state.gender;
  const previousActivity = state.activeActivity;
  state = gameReducer(state, action);
  syncPnlMood(state);
  if (state !== previousState) persistState(state);
  if (state.phase !== previousPhase || state.gender !== previousGender || state.activeActivity !== previousActivity) render(state);
  return state;
};

const boot = async (): Promise<void> => {
  if (!artPreviewMode) {
    try {
      const savedState = await loadSavedGame();
      if (savedState) state = savedState;
    } catch {
      saveWarning = '本地存档无法读取；开始新进度后可能会替换旧存档。';
    }
  }
  render(state);
};

void boot();
