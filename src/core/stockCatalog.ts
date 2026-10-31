import type { ScriptPhase } from './types';

export interface StockDefinition {
  id: string;
  name: string;
  symbol: string;
  sector: string;
  referencePrice: number;
  initialVolume: number;
  volatility: number;
  scriptPhase: ScriptPhase;
  phaseProgress: number;
}

export const stockCatalog: readonly StockDefinition[] = [
  { id: 'dragon', name: '龙科科技', symbol: 'PC001', sector: '科技制造', referencePrice: 10, initialVolume: 20000, volatility: 1, scriptPhase: 'ACCUMULATE', phaseProgress: 0 },
  { id: 'harbor', name: '海桥物流', symbol: 'PC002', sector: '物流运输', referencePrice: 5.68, initialVolume: 12800, volatility: 0.65, scriptPhase: 'DISTRIBUTE', phaseProgress: 4 },
  { id: 'morning-food', name: '晨星食品', symbol: 'PC003', sector: '食品消费', referencePrice: 8.42, initialVolume: 24300, volatility: 0.7, scriptPhase: 'ACCUMULATE', phaseProgress: 6 },
  { id: 'spark-media', name: '星火传媒', symbol: 'PC004', sector: '文化传媒', referencePrice: 4.86, initialVolume: 31600, volatility: 1.45, scriptPhase: 'PUMP', phaseProgress: 3 },
  { id: 'sea-energy', name: '海风能源', symbol: 'PC005', sector: '新能源', referencePrice: 12.38, initialVolume: 45800, volatility: 1.3, scriptPhase: 'DUMP', phaseProgress: 2 },
  { id: 'anhe-medicine', name: '安禾医药', symbol: 'PC006', sector: '医药健康', referencePrice: 18.6, initialVolume: 18700, volatility: 1.15, scriptPhase: 'DISTRIBUTE', phaseProgress: 7 },
  { id: 'cloud-compute', name: '云巅算力', symbol: 'PC007', sector: '算力概念', referencePrice: 26.4, initialVolume: 67200, volatility: 1.7, scriptPhase: 'PUMP', phaseProgress: 0 },
  { id: 'street-retail', name: '街角零售', symbol: 'PC008', sector: '社区零售', referencePrice: 3.72, initialVolume: 15400, volatility: 0.9, scriptPhase: 'ACCUMULATE', phaseProgress: 2 },
  { id: 'far-sail-auto', name: '远帆汽车', symbol: 'PC009', sector: '汽车产业', referencePrice: 7.95, initialVolume: 38200, volatility: 1.25, scriptPhase: 'DUMP', phaseProgress: 5 },
  { id: 'green-bank', name: '青禾银行', symbol: 'PC010', sector: '金融服务', referencePrice: 6.3, initialVolume: 22100, volatility: 0.6, scriptPhase: 'DISTRIBUTE', phaseProgress: 1 },
];
