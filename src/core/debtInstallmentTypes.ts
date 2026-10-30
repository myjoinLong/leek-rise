export interface DebtInstallmentReceipt {
  day: number;
  due: number;
  paid: number;
  shortfall: number;
}

export interface DebtInstallmentPlan {
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'CANCELLED' | 'DEBT_CLEARED';
  remaining: number;
  weeklyPayment: number;
  lastReceipt: DebtInstallmentReceipt | null;
}

export type DebtInstallmentAction =
  | { type: 'RESUME_DEBT_INSTALLMENTS' }
  | { type: 'CANCEL_DEBT_INSTALLMENTS' };
