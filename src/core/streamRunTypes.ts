export interface StreamReturnContext {
  previousDay: number;
  previousProduct: string;
  kind: 'OVERCLAIM' | 'FAKE_SCARCITY';
}
