import "server-only";

import { getAppConfig } from "./env";
import {
  fetchHistoricalTradesForAccount,
  fetchMetricsForAccount,
  fetchOpenTradesForAccount,
} from "./firebase/accounts";
import type { Metrics, OpenTrade, Trade } from "@/types/trading";

export async function fetchMetrics(): Promise<Metrics> {
  const { accountId } = await getAppConfig();
  return fetchMetricsForAccount(accountId);
}

export async function fetchOpenTrades(): Promise<OpenTrade[]> {
  const { accountId } = await getAppConfig();
  return fetchOpenTradesForAccount(accountId);
}

export async function fetchHistoricalTrades(options?: {
  start?: Date;
  end?: Date;
}): Promise<Trade[]> {
  const { accountId } = await getAppConfig();
  return fetchHistoricalTradesForAccount(accountId, options?.start, options?.end);
}
