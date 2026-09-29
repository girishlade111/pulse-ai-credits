/**
 * Credit balances — retained, but no longer part of the app.
 *
 * The workspace no longer charges for a run: there is no balance, no ledger, no
 * gate on the composer. This module is kept only because the Dashboard and
 * Plans screens still exist on disk, and deleting their data layer would leave
 * two files that cannot compile. Nothing here is mounted, routed or linked from
 * the running app — see `App.tsx`.
 *
 * If credits are ever brought back, this is the module to re-wire; if they are
 * not, both this file and the two pages can go together.
 */

import { useCallback, useEffect, useState } from "react";

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
  transaction_type: "deduction" | "topup" | "credit";
  request_type?: string;
  credits_amount: number;
  description: string;
  created_at: string;
}

interface CreditState {
  credits: Credits;
  subscription: Subscription;
  transactions: CreditTransaction[];
}

export interface SpendInput {
  amount: number;
  request_type?: string;
  description: string;
}

const STORAGE_KEY = "pulseai-workspace-archive";
const INITIAL_CREDITS = 10;
const MAX_TRANSACTIONS = 100;

const INITIAL_STATE: CreditState = {
  credits: {
    current_credits: INITIAL_CREDITS,
    total_earned_credits: INITIAL_CREDITS,
    total_spent_credits: 0,
  },
  subscription: {
    plan_type: "free",
    name: "Free Plan",
    can_topup: false,
    topup_discount: 0,
  },
  transactions: [],
};

const readState = (): CreditState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<CreditState>;
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
  transaction: Omit<CreditTransaction, "id" | "created_at">
): CreditTransaction => ({
  ...transaction,
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  created_at: new Date().toISOString(),
});

/** The archived credit API. Unused by the running app. */
export const useCredits = () => {
  const [state, setState] = useState<CreditState>(readState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A blocked storage should never break a page render.
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
            transaction_type: "deduction",
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
        makeTransaction({ transaction_type: "topup", description, credits_amount: amount }),
        ...prev.transactions,
      ].slice(0, MAX_TRANSACTIONS),
    }));
  }, []);

  const setSubscription = useCallback((subscription: Subscription) => {
    setState((prev) => ({ ...prev, subscription }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, spend, topup, setSubscription, reset };
};
