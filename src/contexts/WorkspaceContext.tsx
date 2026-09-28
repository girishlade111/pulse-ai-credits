import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Credits {
  current_credits: number;
  total_earned_credits: number;
  total_spent_credits: number;
}

export interface Subscription {
  plan_type: string;
  name: string;
  can_topup: boolean;
  topup_discount: number;
}

export interface CreditTransaction {
  id: string;
  transaction_type: 'deduction' | 'topup' | 'credit';
  request_type?: string;
  credits_amount: number;
  description: string;
  created_at: string;
}

interface WorkspaceState {
  credits: Credits;
  subscription: Subscription;
  transactions: CreditTransaction[];
}

interface SpendInput {
  amount: number;
  request_type?: string;
  description: string;
}

interface WorkspaceContextType extends WorkspaceState {
  /**
   * Deducts credits and records the run. The updater re-checks the balance
   * against the latest state, so a rapid second call cannot overdraw.
   */
  spend: (input: SpendInput) => void;
  /** Adds credits and records the top-up. */
  topup: (amount: number, description: string) => void;
  setSubscription: (subscription: Subscription) => void;
  reset: () => void;
}

const STORAGE_KEY = 'pulseai-workspace';

/** Every visitor starts on the same ten credits the signup flow used to grant. */
const INITIAL_CREDITS = 10;
const MAX_TRANSACTIONS = 100;

const INITIAL_STATE: WorkspaceState = {
  credits: {
    current_credits: INITIAL_CREDITS,
    total_earned_credits: INITIAL_CREDITS,
    total_spent_credits: 0,
  },
  subscription: {
    plan_type: 'free',
    name: 'Free Plan',
    can_topup: false,
    topup_discount: 0,
  },
  transactions: [],
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const readState = (): WorkspaceState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return {
      credits: { ...INITIAL_STATE.credits, ...parsed.credits },
      subscription: { ...INITIAL_STATE.subscription, ...parsed.subscription },
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return INITIAL_STATE;
  }
};

const makeTransaction = (
  transaction: Omit<CreditTransaction, 'id' | 'created_at'>
): CreditTransaction => ({
  ...transaction,
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  created_at: new Date().toISOString(),
});

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<WorkspaceState>(readState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A full or blocked storage should never break a run.
    }
  }, [state]);

  const spend = useCallback(({ amount, request_type, description }: SpendInput) => {
    setState((prev) => {
      if (prev.credits.current_credits < amount) return prev;

      return {
        ...prev,
        credits: {
          ...prev.credits,
          current_credits: prev.credits.current_credits - amount,
          total_spent_credits: prev.credits.total_spent_credits + amount,
        },
        transactions: [
          makeTransaction({
            transaction_type: 'deduction',
            request_type,
            description,
            credits_amount: amount,
          }),
          ...prev.transactions,
        ].slice(0, MAX_TRANSACTIONS),
      };
    });
  }, []);

  const topup = useCallback((amount: number, description: string) => {
    setState((prev) => ({
      ...prev,
      credits: {
        ...prev.credits,
        current_credits: prev.credits.current_credits + amount,
        total_earned_credits: prev.credits.total_earned_credits + amount,
      },
      transactions: [
        makeTransaction({ transaction_type: 'topup', description, credits_amount: amount }),
        ...prev.transactions,
      ].slice(0, MAX_TRANSACTIONS),
    }));
  }, []);

  const setSubscription = useCallback((subscription: Subscription) => {
    setState((prev) => ({ ...prev, subscription }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const value = useMemo(
    () => ({ ...state, spend, topup, setSubscription, reset }),
    [state, spend, topup, setSubscription, reset]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
