import type { Timestamp } from "firebase-admin/firestore";

export type AccountDoc = {
  userId: string;
  apiKeyHash: string;
  mt5Login: string | null;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  lastSyncAt: Timestamp | null;
  createdAt: Timestamp;
};

export type DealDoc = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  openTime: string;
  closeTime: string;
  openPrice?: number;
  closePrice?: number;
  success: "won" | "lost" | "breakeven";
};

export type PositionDoc = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type: string;
  openTime: string;
  openPrice?: number;
};

export type SyncPayload = {
  login: number | string;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin?: number;
  deals?: SyncDealPayload[];
  positions?: SyncPositionPayload[];
};

export type SyncDealPayload = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type?: string;
  openTime?: string;
  closeTime?: string;
  openPrice?: number;
  closePrice?: number;
  time?: string;
};

export type SyncPositionPayload = {
  ticket: number;
  symbol: string;
  profit: number;
  volume: number;
  type?: string;
  openTime?: string;
  openPrice?: number;
};
