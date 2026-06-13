import "server-only";

import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";

import { computeMetrics, dealSuccess, dealToTrade, positionToOpenTrade } from "@/lib/metrics";
import { generateApiKey, hashApiKey, verifyApiKey } from "@/lib/sync-auth";
import type { Metrics, Trade } from "@/types/trading";

import { getAdminClient } from "./admin";
import { linkAccountToUser } from "./users";
import type {
  AccountDoc,
  DealDoc,
  PositionDoc,
  SyncDealPayload,
  SyncPayload,
  SyncPositionPayload,
} from "./types";
import { mapAccountRow, mapDealRow, mapPositionRow } from "./types";

function parseMT5Date(value: string): Date {
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

export async function createAccount(
  userId: string,
): Promise<{ accountId: string; apiKey: string }> {
  const admin = getAdminClient();
  const apiKey = generateApiKey();

  const { data, error } = await admin
    .from("accounts")
    .insert({
      user_id: userId,
      api_key_hash: hashApiKey(apiKey),
      mt5_login: null,
      balance: 0,
      equity: 0,
      margin: 0,
      free_margin: 0,
      last_sync_at: null,
    })
    .select("id")
    .single();

  if (error) throw error;

  await linkAccountToUser(userId, data.id);

  return { accountId: data.id, apiKey };
}

export async function regenerateApiKey(accountId: string): Promise<string> {
  const admin = getAdminClient();
  const apiKey = generateApiKey();

  const { error } = await admin
    .from("accounts")
    .update({ api_key_hash: hashApiKey(apiKey) })
    .eq("id", accountId);

  if (error) throw error;
  revalidateTag(`account-${accountId}`, { expire: 0 });

  return apiKey;
}

export async function getAccountByApiKey(apiKey: string): Promise<string | null> {
  const admin = getAdminClient();
  const hash = hashApiKey(apiKey);

  const { data, error } = await admin
    .from("accounts")
    .select("id")
    .eq("api_key_hash", hash)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function assertAccountOwner(
  accountId: string,
  userId: string,
): Promise<void> {
  const account = await getAccountDoc(accountId);
  if (!account || account.userId !== userId) {
    throw new Error("Account not found");
  }
}

export const getAccountDoc = cache(
  async (accountId: string): Promise<AccountDoc | null> => {
    return unstable_cache(
      async () => {
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("accounts")
          .select(
            "id, user_id, api_key_hash, mt5_login, balance, equity, margin, free_margin, last_sync_at, created_at",
          )
          .eq("id", accountId)
          .maybeSingle();

        if (error) throw error;
        return data ? mapAccountRow(data as never) : null;
      },
      [`account-doc-${accountId}`],
      { tags: [`account-${accountId}`], revalidate: 60 },
    )();
  },
);

function normalizeDeal(deal: SyncDealPayload): DealDoc | null {
  if (!deal.ticket || !deal.symbol) return null;

  const closeTime = deal.closeTime ?? deal.time;
  if (!closeTime) return null;

  const profit = Number(deal.profit) || 0;

  return {
    ticket: Number(deal.ticket),
    symbol: deal.symbol,
    profit,
    volume: Number(deal.volume) || 0,
    type: deal.type ?? "unknown",
    openTime: deal.openTime ?? closeTime,
    closeTime,
    openPrice: deal.openPrice,
    closePrice: deal.closePrice,
    success: dealSuccess(profit),
  };
}

function normalizePosition(position: SyncPositionPayload): PositionDoc | null {
  if (!position.ticket || !position.symbol) return null;

  return {
    ticket: Number(position.ticket),
    symbol: position.symbol,
    profit: Number(position.profit) || 0,
    volume: Number(position.volume) || 0,
    type: position.type ?? "unknown",
    openTime: position.openTime ?? new Date().toISOString(),
    openPrice: position.openPrice,
  };
}

export async function applySync(apiKey: string, payload: SyncPayload): Promise<void> {
  const accountId = await getAccountByApiKey(apiKey);
  if (!accountId) {
    throw new Error("Invalid API key");
  }

  const stored = await getAccountDoc(accountId);
  if (!stored) {
    throw new Error("Account not found");
  }

  if (!verifyApiKey(apiKey, stored.apiKeyHash)) {
    throw new Error("Invalid API key");
  }

  const deals = (payload.deals ?? [])
    .map(normalizeDeal)
    .filter((deal): deal is DealDoc => deal !== null);

  const positions = (payload.positions ?? [])
    .map(normalizePosition)
    .filter((pos): pos is PositionDoc => pos !== null);

  const admin = getAdminClient();
  const { error } = await admin.rpc("apply_sync", {
    p_account_id: accountId,
    p_mt5_login: String(payload.login),
    p_balance: Number(payload.balance) || 0,
    p_equity: Number(payload.equity) || 0,
    p_margin: Number(payload.margin) || 0,
    p_free_margin: Number(payload.freeMargin) || 0,
    p_deals: deals.map((deal) => ({
      ticket: deal.ticket,
      symbol: deal.symbol,
      profit: deal.profit,
      volume: deal.volume,
      type: deal.type,
      open_time: deal.openTime,
      close_time: deal.closeTime,
      open_price: deal.openPrice ?? null,
      close_price: deal.closePrice ?? null,
      success: deal.success,
    })),
    p_positions: positions.map((position) => ({
      ticket: position.ticket,
      symbol: position.symbol,
      profit: position.profit,
      volume: position.volume,
      type: position.type,
      open_time: position.openTime,
      open_price: position.openPrice ?? null,
    })),
  });

  if (error) throw error;
  revalidateTag(`account-${accountId}`, { expire: 0 });
}

export async function fetchMetricsForAccount(accountId: string): Promise<Metrics> {
  const account = await getAccountDoc(accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("deals")
    .select(
      "ticket, symbol, profit, volume, type, open_time, close_time, open_price, close_price, success",
    )
    .eq("account_id", accountId);

  if (error) throw error;

  const deals = (data ?? []).map((row) => mapDealRow(row as never));

  return computeMetrics(
    {
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      freeMargin: account.freeMargin,
    },
    deals,
  );
}

export async function fetchOpenTradesForAccount(accountId: string): Promise<Trade[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("positions")
    .select("ticket, symbol, profit, volume, type, open_time, open_price")
    .eq("account_id", accountId);

  if (error) throw error;

  return (data ?? []).map((row) =>
    positionToOpenTrade(accountId, mapPositionRow(row as never)),
  );
}

export async function fetchHistoricalTradesForAccount(
  accountId: string,
  start?: Date,
  end?: Date,
): Promise<Trade[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("deals")
    .select(
      "ticket, symbol, profit, volume, type, open_time, close_time, open_price, close_price, success",
    )
    .eq("account_id", accountId);

  if (error) throw error;

  let deals = (data ?? []).map((row) => mapDealRow(row as never));

  if (start && end) {
    const startMs = start.getTime();
    const endMs = end.getTime();
    deals = deals.filter((deal) => {
      const time = parseMT5Date(deal.closeTime).getTime();
      return time >= startMs && time <= endMs;
    });
  }

  deals.sort((a, b) => b.closeTime.localeCompare(a.closeTime));

  return deals.map((deal) => dealToTrade(accountId, deal));
}

export async function getAccountSummary(accountId: string): Promise<{
  mt5Login: string | null;
  lastSyncAt: string | null;
}> {
  const account = await getAccountDoc(accountId);
  if (!account) {
    return { mt5Login: null, lastSyncAt: null };
  }

  return { mt5Login: account.mt5Login, lastSyncAt: account.lastSyncAt };
}

export async function countDeals(accountId: string): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId);

  if (error) throw error;
  return count ?? 0;
}

export async function countPositions(accountId: string): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from("positions")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId);

  if (error) throw error;
  return count ?? 0;
}
