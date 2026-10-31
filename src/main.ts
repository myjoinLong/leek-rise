import './ui/screens/Trading/styles/global.css';
import './ui/screens/Trading/styles/tokens.css';
import { createInitialState } from './core/state';
import { gameReducer } from './core/reducer';
import type { GameAction } from './core/reducer';
import type { GamePhase, GameState } from './core/types';
import { activityContracts, type ActivityId } from './core/activityContracts';
import { loadSavedGame, saveGame } from './save/storage';

const root = document.getElementById('app');
if (!root) throw new Error('App container #app was not found.');

const saveNotice = document.createElement('p');
saveNotice.className = 'save-warning';
saveNotice.setAttribute('role', 'status');

const artPreviewMode = new URLSearchParams(window.location.search).get('artPreview') === '1';
const previewParams = new URLSearchParams(window.location.search);
let state: GameState = createInitialState();
const createCampaignSeed = (): number => {
  const seed = new Uint32Array(1);
  if (window.crypto?.getRandomValues) return window.crypto.getRandomValues(seed)[0] ?? 4;
  return Date.now() >>> 0;
};
const previewScenario = artPreviewMode ? new URLSearchParams(window.location.search).get('scenario') : null;
const requestedActivityPreview = artPreviewMode ? previewParams.get('activity') : null;
const isActivityId = (value: string | null): value is ActivityId => value !== null && Object.hasOwn(activityContracts, value);
const previewActivityId = isActivityId(requestedActivityPreview) ? requestedActivityPreview : null;
const activityPreviewListMode = requestedActivityPreview === 'list';
const invalidActivityPreview = requestedActivityPreview !== null && !activityPreviewListMode && !previewActivityId;
if (previewScenario === 'chapter-deadline' || previewScenario === 'debt-crisis-night') {
  const isCrisis = previewScenario === 'debt-crisis-night';
  const playerState = gameReducer(state, { type: 'SELECT_CHARACTER', gender: 'MALE' });
  const cash = isCrisis ? 1200 : 500;
  const debt = 5000;
  const portfolioValue = Object.values(playerState.stocks).reduce(
    (total, stock) => total + (stock.holding?.shares ?? 0) * stock.price,
    0,
  );
  state = {
    ...playerState,
    day: isCrisis ? 31 : 30,
    phase: 'NIGHT',
    cash,
    debt,
    debtCrisisStarted: isCrisis,
    npcMessage: isCrisis ? '九哥发来催款通知：账单已进入危机协商。' : playerState.npcMessage,
    dayStartEquity: Number((cash + portfolioValue - debt).toFixed(2)),
  };
}
if (previewActivityId) {
  const gender = previewParams.get('gender') === 'FEMALE' ? 'FEMALE' : 'MALE';
  const selected = gameReducer(createInitialState(4), { type: 'SELECT_CHARACTER', gender });
  const previewState: GameState = {
    ...selected,
    day: previewActivityId === 'JIUGE_NEGOTIATION' ? 30 : 4,
    phase: 'DAYTIME',
    energy: selected.energyMax,
    debtCrisisStarted: previewActivityId === 'JIUGE_NEGOTIATION' || selected.debtCrisisStarted,
  };
  const started = gameReducer(previewState, activityContracts[previewActivityId].startAction);
  if (!started.activeActivity || started.activeActivity.id !== previewActivityId) {
    throw new Error(`Could not start activity preview: ${previewActivityId}`);
  }
  state = started;
}
let saveQueue: Promise<void> = Promise.resolve();
let saveWarning: string | null = null;
let resumableSave: GameState | null = null;
let showStartMenu = false;
let renderSequence = 0;

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

const previewLabels: Record<ActivityId, string> = {
  LONGGE_CHAT: '龙哥 · 群聊鉴伪',
  WANG_DELIVERY: '王师傅 · 跑单',
  XIAOLIAN_STREAM: '小镰刀 · 直播带货',
  CHEN_DOSSIER: '陈总 · 档案调查',
  JIUGE_NEGOTIATION: '九哥 · 借贷协商',
  WANG_FACTORY: '王老板 · 工厂质检',
  BODHISATTVA_CHART_LESSON: 'K线菩萨 · 图表课',
  SUJIE_CAFE_SHIFT: '苏姐 · 咖啡店班',
  SWEEPER_RISK_REPLAY: '扫地僧 · 风险复盘',
  LAOLIANG_MARKET_STALL: '老梁 · 市集寄售',
  ZHOU_BROKER_NEGOTIATION: '周经理 · 券商协商',
  ZHENG_BIKE_REPAIR: '郑师傅 · 电驴维修',
  PHONE_FLIP: '阿浩 · 手机回收',
};

const createActivityPreviewList = (): HTMLElement => {
  const screen = document.createElement('main');
  screen.className = 'activity-preview-list';
  screen.innerHTML = `<style>
    .activity-preview-list{box-sizing:border-box;width:100%;height:100dvh;max-width:480px;margin:0 auto;padding:calc(var(--safe-top) + 20px) 16px calc(var(--safe-bottom) + 16px);overflow:auto;background:var(--bg-base);color:var(--text-primary);font-family:"Courier New",monospace}
    .activity-preview-list h1{font-size:var(--fs-title)}.activity-preview-list p{color:var(--text-secondary);font-size:var(--fs-caption);line-height:1.5}
    .activity-preview-list nav{display:grid;gap:8px}.activity-preview-list a{display:flex;min-height:48px;align-items:center;padding:8px 12px;border:2px solid var(--border-strong);background:var(--bg-surface);box-shadow:3px 3px #000;color:var(--text-primary);text-decoration:none;font-size:var(--fs-body)}
  </style><h1>NPC 副本预览</h1><p>开发预览，不读取或写入存档。点击后从固定初始状态进入副本，刷新页面即可重置。</p>
  <nav aria-label="可预览的 NPC 副本">${(Object.keys(previewLabels) as ActivityId[]).map((id) =>
    `<a href="?artPreview=1&amp;activity=${id}">${previewLabels[id]}</a>`,
  ).join('')}</nav>`;
  return screen;
};

const createActivityPreviewError = (): HTMLElement => {
  const screen = document.createElement('main');
  screen.className = 'activity-preview-error';
  screen.textContent = `未知副本预览：${requestedActivityPreview ?? ''}。请打开 ?artPreview=1&activity=list 查看可用副本。`;
  return screen;
};

const render = async (currentState: GameState): Promise<void> => {
  const request = ++renderSequence;
  syncPnlMood(currentState);
  root.setAttribute('aria-busy', 'true');
  root.inert = true;
  if (root.childElementCount === 0) root.textContent = '正在载入盘城…';

  try {
    let screen: HTMLElement;
    if (activityPreviewListMode) {
      screen = createActivityPreviewList();
    } else if (invalidActivityPreview) {
      screen = createActivityPreviewError();
    } else if (showStartMenu || !currentState.gender) {
      const { createStartScreen } = await import('./ui/screens/Start/StartScreen');
      screen = createStartScreen(dispatch, {
        save: showStartMenu && resumableSave
          ? { day: resumableSave.day, cash: resumableSave.cash, debt: resumableSave.debt, codename: resumableSave.codename }
          : null,
        onContinue: () => {
          if (!resumableSave) return;
          state = resumableSave;
          showStartMenu = false;
          void render(state);
        },
        onStartNewGame: (gender, codename) => {
          state = createInitialState(createCampaignSeed());
          resumableSave = null;
          showStartMenu = false;
          dispatch({ type: 'SELECT_CHARACTER', gender, codename });
        },
      });
    } else {
      const activityScreen = currentState.activeActivity
        ? await (await import('./ui/screens/Activities/ActivityScreenRegistry')).createActivityScreen(currentState, dispatch)
        : null;
      if (activityScreen) {
        screen = activityScreen;
      } else {
        switch (currentState.phase) {
          case 'PRE_MARKET': {
            const { createPreMarketScreen } = await import('./ui/screens/PreMarket/PreMarketScreen');
            screen = createPreMarketScreen(currentState, dispatch);
            break;
          }
          case 'DAYTIME': {
            const { createDaytimeScreen } = await import('./ui/screens/Daytime/DaytimeScreen');
            screen = createDaytimeScreen(currentState, dispatch);
            break;
          }
          case 'TRADING': {
            const { createTradingScreen } = await import('./ui/screens/Trading');
            screen = createTradingScreen(currentState, dispatch);
            break;
          }
          case 'NIGHT': {
            const { createNightScreen } = await import('./ui/screens/Night/NightScreen');
            screen = createNightScreen(currentState, dispatch);
            break;
          }
        }
      }
    }

    if (request !== renderSequence || currentState !== state) return;
    root.replaceChildren(screen);
    root.inert = false;
    root.removeAttribute('aria-busy');
    syncSaveNotice();
  } catch {
    if (request !== renderSequence) return;
    root.textContent = '页面加载失败，请刷新后重试。';
    root.inert = false;
    root.removeAttribute('aria-busy');
    syncSaveNotice();
  }
};

const dispatch = (action: GameAction): GameState => {
  const previousState = state;
  const previousPhase: GamePhase = state.phase;
  const previousGender = state.gender;
  const previousActivity = state.activeActivity;
  state = gameReducer(state, action);
  syncPnlMood(state);
  if (state !== previousState) persistState(state);
  if (state.phase !== previousPhase || state.gender !== previousGender || state.activeActivity !== previousActivity) void render(state);
  return state;
};

const boot = async (): Promise<void> => {
  if (!artPreviewMode) {
    try {
      const savedState = await loadSavedGame();
      if (savedState) {
        state = savedState;
        resumableSave = savedState;
        showStartMenu = true;
      }
    } catch {
      saveWarning = '本地存档无法读取；开始新进度后可能会替换旧存档。';
    }
  }
  await render(state);
};

void boot();
