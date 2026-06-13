import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { getErrorMessage } from "@/lib/api-error";
import { getAdminClient } from "./admin";
import { parseBotTradesFile, type ParsedBotTrade } from "@/lib/bot-import";
import { computeTradeStats } from "@/lib/trade-stats";
import type { Bot, BotPerformanceStats, BotStatus, BotTrade } from "@/types/bots";

const BOT_COLORS = [
  "#1A4ECC",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#BE185D",
  "#4F46E5",
];

type BotRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  start_balance: number | null;
  status: BotStatus | null;
};

type BotTradeRow = {
  id: string;
  bot_id: string;
  ticket: number | null;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  open_time: string;
  close_time: string;
  open_price: number | null;
  close_price: number | null;
  success: "won" | "lost" | "breakeven";
};

function mapBot(row: BotRow, tradeCount: number): Bot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    tradeCount,
    createdAt: row.created_at,
    startBalance: row.start_balance != null ? Number(row.start_balance) : null,
    status: row.status ?? null,
  };
}

function mapBotTrade(row: BotTradeRow): BotTrade {
  return {
    id: row.id,
    botId: row.bot_id,
    ticket: row.ticket,
    symbol: row.symbol,
    profit: Number(row.profit),
    volume: Number(row.volume),
    type: row.type,
    openTime: row.open_time,
    closeTime: row.close_time,
    openPrice: row.open_price ?? undefined,
    closePrice: row.close_price ?? undefined,
    success: row.success,
  };
}

// Inline ownership check — avoids the extra assertBotOwner SELECT round-trip.
async function requireBot(botId: string, userId: string): Promise<BotRow> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("bots")
    .select("id, user_id, name, description, color, created_at, start_balance, status")
    .eq("id", botId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(getErrorMessage(error));
  if (!data) throw new Error("Bot not found");
  return data as BotRow;
}

const TTL_BOTS   = 300; // 5 min
const TTL_TRADES = 300; // 5 min

export async function getBotById(botId: string, userId: string): Promise<Bot> {
  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const [botResult, countResult] = await Promise.all([
        admin
          .from("bots")
          .select("id, user_id, name, description, color, created_at, start_balance, status")
          .eq("id", botId)
          .eq("user_id", userId)
          .maybeSingle(),
        admin.from("bot_trades").select("id", { count: "exact", head: true }).eq("bot_id", botId),
      ]);
      if (botResult.error) throw new Error(getErrorMessage(botResult.error));
      if (!botResult.data) throw new Error("Bot not found");
      if (countResult.error) throw new Error(getErrorMessage(countResult.error));
      return mapBot(botResult.data as BotRow, countResult.count ?? 0);
    },
    [`bot-${botId}`],
    { tags: [`bot-${botId}`], revalidate: TTL_BOTS },
  )();
}

export async function listBots(userId: string): Promise<Bot[]> {
  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const { data, error } = await admin
        .from("bots")
        .select("id, user_id, name, description, color, created_at, start_balance, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(getErrorMessage(error));
      if (!data?.length) return [];

      const botIds = data.map((row) => row.id);
      const { data: tradeCounts, error: countError } = await admin
        .from("bot_trades")
        .select("bot_id")
        .in("bot_id", botIds);
      if (countError) throw new Error(getErrorMessage(countError));

      const countMap = new Map<string, number>();
      for (const row of tradeCounts ?? []) {
        countMap.set(row.bot_id, (countMap.get(row.bot_id) ?? 0) + 1);
      }
      return data.map((row) => mapBot(row as BotRow, countMap.get(row.id) ?? 0));
    },
    [`bots-list-${userId}`],
    { tags: [`bots-${userId}`], revalidate: TTL_BOTS },
  )();
}

export async function createBot(
  userId: string,
  input: { name: string; description?: string; color?: string },
): Promise<Bot> {
  const admin = getAdminClient();

  // Count existing bots with a lightweight head query (no need to fetch all rows).
  const { count: existingCount } = await admin
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const color =
    input.color ??
    BOT_COLORS[(existingCount ?? 0) % BOT_COLORS.length] ??
    BOT_COLORS[0]!;

  const { data, error } = await admin
    .from("bots")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color,
    })
    .select("id, user_id, name, description, color, created_at, start_balance, status")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("A bot with this name already exists.");
    throw new Error(getErrorMessage(error));
  }

  revalidateTag(`bots-${userId}`, { expire: 0 });
  return mapBot(data as BotRow, 0);
}

export async function deleteBot(botId: string, userId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("bots").delete().eq("id", botId).eq("user_id", userId);
  if (error) throw new Error(getErrorMessage(error));

  revalidateTag(`bots-${userId}`, { expire: 0 });
  revalidateTag(`bot-${botId}`, { expire: 0 });
}

export async function getBotTrades(botId: string, userId: string): Promise<BotTrade[]> {
  return unstable_cache(
    async () => {
      const admin = getAdminClient();
      const [ownerResult, tradesResult] = await Promise.all([
        admin.from("bots").select("id").eq("id", botId).eq("user_id", userId).maybeSingle(),
        admin
          .from("bot_trades")
          .select(
            "id, bot_id, ticket, symbol, profit, volume, type, open_time, close_time, open_price, close_price, success",
          )
          .eq("bot_id", botId)
          .order("close_time", { ascending: true }),
      ]);
      if (ownerResult.error) throw new Error(getErrorMessage(ownerResult.error));
      if (!ownerResult.data) throw new Error("Bot not found");
      if (tradesResult.error) throw new Error(getErrorMessage(tradesResult.error));
      return (tradesResult.data ?? []).map((row) => mapBotTrade(row as BotTradeRow));
    },
    [`bot-trades-${botId}`],
    { tags: [`bot-trades-${botId}`, `bot-${botId}`], revalidate: TTL_TRADES },
  )();
}

function tradeRows(botId: string, trades: ParsedBotTrade[]) {
  return trades.map((trade) => ({
    bot_id: botId,
    ticket: trade.ticket,
    symbol: trade.symbol,
    profit: trade.profit,
    volume: trade.volume,
    type: trade.type,
    open_time: trade.openTime,
    close_time: trade.closeTime,
    open_price: trade.openPrice ?? null,
    close_price: trade.closePrice ?? null,
    success: trade.success,
  }));
}

export async function importBotTradesFromFile(
  botId: string,
  userId: string,
  buffer: ArrayBuffer,
  filename: string,
  replaceExisting: boolean,
  mimeType?: string,
): Promise<{ imported: number; skipped: number; total: number }> {
  await requireBot(botId, userId);
  const { trades, errors } = parseBotTradesFile(buffer, filename, mimeType);

  if (trades.length === 0) {
    throw new Error(errors[0] ?? "No valid trades found in file.");
  }

  const admin = getAdminClient();

  if (replaceExisting) {
    const { error: deleteError } = await admin
      .from("bot_trades")
      .delete()
      .eq("bot_id", botId);
    if (deleteError) throw new Error(getErrorMessage(deleteError));
  }

  const batchSize = 500;
  for (let i = 0; i < trades.length; i += batchSize) {
    const chunk = trades.slice(i, i + batchSize);
    const { error } = await admin.from("bot_trades").insert(tradeRows(botId, chunk));
    if (error) throw new Error(getErrorMessage(error));
  }

  revalidateTag(`bot-trades-${botId}`, { expire: 0 });
  revalidateTag(`bot-${botId}`, { expire: 0 }); // trade count changed
  return { imported: trades.length, skipped: errors.length, total: trades.length };
}

// Fixed N+1: was 1 + N ownership checks + N trade fetches = 2N+1 queries.
// Now: 1 bots query + 1 trades query (batched with IN) = 2 queries total.
export async function compareBots(
  userId: string,
  botIds: string[],
): Promise<BotPerformanceStats[]> {
  if (botIds.length === 0) return [];

  const admin = getAdminClient();
  const [botsResult, tradesResult] = await Promise.all([
    admin
      .from("bots")
      .select("id, user_id, name, color, start_balance")
      .in("id", botIds)
      .eq("user_id", userId),
    admin
      .from("bot_trades")
      .select(
        "id, bot_id, ticket, symbol, profit, volume, type, open_time, close_time, open_price, close_price, success",
      )
      .in("bot_id", botIds)
      .order("close_time", { ascending: true }),
  ]);

  if (botsResult.error) throw new Error(getErrorMessage(botsResult.error));
  if (tradesResult.error) throw new Error(getErrorMessage(tradesResult.error));

  const bots = botsResult.data ?? [];
  if (!bots.length) return [];

  // Group trades by bot_id in memory.
  const tradesByBot = new Map<string, BotTrade[]>();
  for (const row of tradesResult.data ?? []) {
    const list = tradesByBot.get(row.bot_id) ?? [];
    list.push(mapBotTrade(row as BotTradeRow));
    tradesByBot.set(row.bot_id, list);
  }

  return bots
    .map((bot) => {
      const trades = tradesByBot.get(bot.id) ?? [];
      const stats = computeTradeStats(trades);
      const startBalance = bot.start_balance != null ? Number(bot.start_balance) : null;
      const totalProfit = stats?.totalProfit ?? 0;

      return {
        botId: bot.id,
        name: bot.name,
        color: bot.color,
        tradeCount: stats?.tradeCount ?? 0,
        totalProfit,
        winRate: stats?.winRate ?? 0,
        profitFactor: stats?.profitFactor ?? 0,
        avgWin: stats?.avgWin ?? null,
        avgLoss: stats?.avgLoss ?? null,
        bestTrade: stats?.bestTrade ?? null,
        worstTrade: stats?.worstTrade ?? null,
        wins: stats?.wins ?? 0,
        losses: stats?.losses ?? 0,
        startBalance,
        endBalance: startBalance != null ? startBalance + totalProfit : null,
      } satisfies BotPerformanceStats;
    })
    .sort((a, b) => b.totalProfit - a.totalProfit);
}

// Inline ownership in UPDATE — no separate SELECT round-trip.
export async function updateBotStatus(
  botId: string,
  userId: string,
  status: BotStatus | null,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from("bots").update({ status }).eq("id", botId).eq("user_id", userId);
  if (error) throw new Error(getErrorMessage(error));

  revalidateTag(`bot-${botId}`, { expire: 0 });
  revalidateTag(`bots-${userId}`, { expire: 0 });
}

export async function updateBotStartBalance(
  botId: string,
  userId: string,
  startBalance: number | null,
): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from("bots")
    .update({ start_balance: startBalance })
    .eq("id", botId)
    .eq("user_id", userId);
  if (error) throw new Error(getErrorMessage(error));

  revalidateTag(`bot-${botId}`, { expire: 0 });
  revalidateTag(`bots-${userId}`, { expire: 0 });
}
