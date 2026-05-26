import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { computeMetrics, dealSuccess, dealToTrade, positionToOpenTrade } from "@/lib/metrics";
import { generateApiKey, hashApiKey, verifyApiKey } from "@/lib/sync-auth";
import type { Metrics, Trade } from "@/types/trading";

import { getDb } from "./admin";
import { linkAccountToUser } from "./users";
import type {
  AccountDoc,
  DealDoc,
  PositionDoc,
  SyncDealPayload,
  SyncPayload,
  SyncPositionPayload,
} from "./types";

const ACCOUNTS = "accounts";

// MT5 uses "YYYY.MM.DD HH:MM:SS" — convert to ISO before parsing
function parseMT5Date(value: string): Date {
  return new Date(value.replace(/\./g, "-").replace(" ", "T"));
}

export async function createAccount(
  userId: string,
): Promise<{ accountId: string; apiKey: string }> {
  const db = getDb();
  const apiKey = generateApiKey();
  const accountRef = db.collection(ACCOUNTS).doc();

  await accountRef.set({
    userId,
    apiKeyHash: hashApiKey(apiKey),
    mt5Login: null,
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    lastSyncAt: null,
    createdAt: FieldValue.serverTimestamp(),
  } satisfies Omit<AccountDoc, "createdAt" | "lastSyncAt"> & {
    createdAt: FieldValue;
    lastSyncAt: null;
  });

  await linkAccountToUser(userId, accountRef.id);

  return { accountId: accountRef.id, apiKey };
}

export async function regenerateApiKey(accountId: string): Promise<string> {
  const apiKey = generateApiKey();
  await getDb().collection(ACCOUNTS).doc(accountId).update({
    apiKeyHash: hashApiKey(apiKey),
  });
  return apiKey;
}

export async function getAccountByApiKey(apiKey: string): Promise<string | null> {
  const db = getDb();
  const hash = hashApiKey(apiKey);
  const snap = await db.collection(ACCOUNTS).where("apiKeyHash", "==", hash).limit(1).get();

  if (snap.empty) return null;
  return snap.docs[0].id;
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

export async function getAccountDoc(accountId: string): Promise<AccountDoc | null> {
  const snap = await getDb().collection(ACCOUNTS).doc(accountId).get();
  if (!snap.exists) return null;
  return snap.data() as AccountDoc;
}

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

  const accountRef = getDb().collection(ACCOUNTS).doc(accountId);
  const accountSnap = await accountRef.get();
  if (!accountSnap.exists) {
    throw new Error("Account not found");
  }

  const stored = accountSnap.data() as AccountDoc;
  if (!verifyApiKey(apiKey, stored.apiKeyHash)) {
    throw new Error("Invalid API key");
  }

  const batch = getDb().batch();

  batch.update(accountRef, {
    mt5Login: String(payload.login),
    balance: Number(payload.balance) || 0,
    equity: Number(payload.equity) || 0,
    margin: Number(payload.margin) || 0,
    freeMargin: Number(payload.freeMargin) || 0,
    lastSyncAt: FieldValue.serverTimestamp(),
  });

  const deals = (payload.deals ?? [])
    .map(normalizeDeal)
    .filter((deal): deal is DealDoc => deal !== null);

  for (const deal of deals) {
    const dealRef = accountRef.collection("deals").doc(String(deal.ticket));
    batch.set(dealRef, deal, { merge: true });
  }

  const positionsCol = accountRef.collection("positions");
  const existingPositions = await positionsCol.get();
  for (const doc of existingPositions.docs) {
    batch.delete(doc.ref);
  }

  const positions = (payload.positions ?? [])
    .map(normalizePosition)
    .filter((pos): pos is PositionDoc => pos !== null);

  for (const position of positions) {
    const posRef = positionsCol.doc(String(position.ticket));
    batch.set(posRef, position);
  }

  await batch.commit();
}

export async function fetchMetricsForAccount(accountId: string): Promise<Metrics> {
  const account = await getAccountDoc(accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const dealsSnap = await getDb()
    .collection(ACCOUNTS)
    .doc(accountId)
    .collection("deals")
    .get();

  const deals = dealsSnap.docs.map((doc) => doc.data() as DealDoc);

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
  const snap = await getDb()
    .collection(ACCOUNTS)
    .doc(accountId)
    .collection("positions")
    .get();

  return snap.docs.map((doc) =>
    positionToOpenTrade(accountId, doc.data() as PositionDoc),
  );
}

export async function fetchHistoricalTradesForAccount(
  accountId: string,
  start?: Date,
  end?: Date,
): Promise<Trade[]> {
  const snap = await getDb()
    .collection(ACCOUNTS)
    .doc(accountId)
    .collection("deals")
    .get();

  let deals = snap.docs.map((doc) => doc.data() as DealDoc);

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

  const lastSyncAt =
    account.lastSyncAt instanceof Timestamp
      ? account.lastSyncAt.toDate().toISOString()
      : null;

  return { mt5Login: account.mt5Login, lastSyncAt };
}
