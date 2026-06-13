import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { getErrorMessage } from "@/lib/api-error";
import { getAdminClient } from "./admin";
import type { PnlAccount, PnlEntry, TradeDirection, TradeOutcome } from "@/types/pnl";

const ACCOUNT_FIELDS =
  "id, user_id, name, balance, target_profit, created_at" as const;
const ENTRY_FIELDS =
  "id, account_id, date, profit, note, direction, outcome, trade_count, tp_count, be_count, sl_count, created_at" as const;

/** Cache TTLs */
const TTL_ACCOUNTS = 300; // 5 min — account list / details rarely change
const TTL_ENTRIES  = 120; // 2 min — entries change when user logs trades

type PnlAccountRow = {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  target_profit: number;
  created_at: string;
};

type PnlEntryRow = {
  id: string;
  account_id: string;
  date: string;
  profit: number;
  note: string | null;
  direction: TradeDirection | null;
  outcome: TradeOutcome | null;
  trade_count: number;
  tp_count: number;
  be_count: number;
  sl_count: number;
  created_at: string;
};

function mapAccount(row: PnlAccountRow): PnlAccount {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    targetProfit: Number(row.target_profit),
    createdAt: row.created_at,
  };
}

function mapEntry(row: PnlEntryRow): PnlEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    date: row.date,
    profit: Number(row.profit),
    note: row.note,
    direction: row.direction ?? null,
    outcome: row.outcome ?? null,
    tradeCount: Number(row.trade_count ?? 0),
    tpCount: Number(row.tp_count ?? 0),
    beCount: Number(row.be_count ?? 0),
    slCount: Number(row.sl_count ?? 0),
  };
}

async function requireAccount(accountId: string, userId: string): Promise<PnlAccountRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pnl_accounts")
    .select(ACCOUNT_FIELDS)
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(getErrorMessage(error));
  if (!data) throw new Error("PNL account not found");
  return data as PnlAccountRow;
}

// ─── Reads (cached) ──────────────────────────────────────────────────────────

export async function listPnlAccounts(userId: string): Promise<PnlAccount[]> {
  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const { data, error } = await admin
        .from("pnl_accounts")
        .select(ACCOUNT_FIELDS)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(getErrorMessage(error));
      return (data ?? []).map((row) => mapAccount(row as PnlAccountRow));
    },
    [`pnl-accounts-${userId}`],
    { tags: [`pnl-accounts-${userId}`], revalidate: TTL_ACCOUNTS },
  )();
}

export async function getPnlAccount(accountId: string, userId: string): Promise<PnlAccount> {
  return unstable_cache(
    async () => mapAccount(await requireAccount(accountId, userId)),
    [`pnl-account-${accountId}`],
    { tags: [`pnl-account-${accountId}`], revalidate: TTL_ACCOUNTS },
  )();
}

export async function listPnlEntries(
  accountId: string,
  userId: string,
  month: string,
): Promise<PnlEntry[]> {
  const [year, mon] = month.split("-").map(Number);
  const firstDay = `${month}-01`;
  const lastDayNum = new Date(year!, mon!, 0).getDate();
  const lastDay = `${month}-${String(lastDayNum).padStart(2, "0")}`;

  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const [, entriesResult] = await Promise.all([
        requireAccount(accountId, userId),
        admin
          .from("pnl_entries")
          .select(ENTRY_FIELDS)
          .eq("account_id", accountId)
          .gte("date", firstDay)
          .lte("date", lastDay)
          .order("date", { ascending: true }),
      ]);
      if (entriesResult.error) throw new Error(getErrorMessage(entriesResult.error));
      return (entriesResult.data ?? []).map((row) => mapEntry(row as PnlEntryRow));
    },
    [`pnl-entries-${accountId}-${month}`],
    { tags: [`pnl-entries-${accountId}`], revalidate: TTL_ENTRIES },
  )();
}

export async function listPnlEntriesForYear(
  accountId: string,
  userId: string,
  year: number,
): Promise<PnlEntry[]> {
  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const [, entriesResult] = await Promise.all([
        requireAccount(accountId, userId),
        admin
          .from("pnl_entries")
          .select(ENTRY_FIELDS)
          .eq("account_id", accountId)
          .gte("date", `${year}-01-01`)
          .lte("date", `${year}-12-31`)
          .order("date", { ascending: true }),
      ]);
      if (entriesResult.error) throw new Error(getErrorMessage(entriesResult.error));
      return (entriesResult.data ?? []).map((row) => mapEntry(row as PnlEntryRow));
    },
    [`pnl-entries-${accountId}-year-${year}`],
    { tags: [`pnl-entries-${accountId}`], revalidate: TTL_ENTRIES },
  )();
}

// ─── Writes (invalidate cache after mutation) ─────────────────────────────────

export async function createPnlAccount(
  userId: string,
  input: { name: string; balance: number; targetProfit: number },
): Promise<PnlAccount> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pnl_accounts")
    .insert({ user_id: userId, name: input.name.trim(), balance: input.balance, target_profit: input.targetProfit })
    .select(ACCOUNT_FIELDS)
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A PNL account with this name already exists.");
    throw new Error(getErrorMessage(error));
  }

  revalidateTag(`pnl-accounts-${userId}`, { expire: 0 });
  return mapAccount(data as PnlAccountRow);
}

export async function updatePnlAccount(
  accountId: string,
  userId: string,
  input: { name: string; balance: number; targetProfit: number },
): Promise<PnlAccount> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pnl_accounts")
    .update({ name: input.name.trim(), balance: input.balance, target_profit: input.targetProfit })
    .eq("id", accountId)
    .eq("user_id", userId)
    .select(ACCOUNT_FIELDS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") throw new Error("A PNL account with this name already exists.");
    throw new Error(getErrorMessage(error));
  }
  if (!data) throw new Error("PNL account not found");

  revalidateTag(`pnl-accounts-${userId}`, { expire: 0 });
  revalidateTag(`pnl-account-${accountId}`, { expire: 0 });
  return mapAccount(data as PnlAccountRow);
}

export async function deletePnlAccount(accountId: string, userId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("pnl_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId);
  if (error) throw new Error(getErrorMessage(error));

  revalidateTag(`pnl-accounts-${userId}`, { expire: 0 });
  revalidateTag(`pnl-account-${accountId}`, { expire: 0 });
  revalidateTag(`pnl-entries-${accountId}`, { expire: 0 });
}

export async function upsertPnlEntry(
  accountId: string,
  userId: string,
  date: string,
  profit: number,
  note: string | null,
  direction: TradeDirection | null,
  outcome: TradeOutcome | null,
  tradeCount: number,
  tpCount: number,
  beCount: number,
  slCount: number,
): Promise<PnlEntry> {
  await requireAccount(accountId, userId);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("pnl_entries")
    .upsert(
      { account_id: accountId, date, profit, note, direction, outcome,
        trade_count: tradeCount, tp_count: tpCount, be_count: beCount, sl_count: slCount },
      { onConflict: "account_id,date" },
    )
    .select(ENTRY_FIELDS)
    .single();

  if (error) throw new Error(getErrorMessage(error));

  // Bust both the specific month cache and the year cache.
  revalidateTag(`pnl-entries-${accountId}`, { expire: 0 });
  return mapEntry(data as PnlEntryRow);
}
