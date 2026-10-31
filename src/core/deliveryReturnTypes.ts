export interface DeliveryReturnContext {
  previousDay: number;
  kind: 'RELIABLE' | 'RUSH';
}
