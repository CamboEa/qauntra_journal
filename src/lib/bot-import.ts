import * as XLSX from "xlsx";

import { dealSuccess } from "@/lib/metrics";

export type ParsedBotTrade = {
  ticket: number | null;
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

const COLUMN_ALIASES: Record<string, string[]> = {
  ticket: ["ticket", "deal", "order", "id", "position"],
  symbol: ["symbol", "pair", "instrument", "market"],
  profit: ["profit", "pnl", "p/l", "pl", "net profit", "result"],
  volume: ["volume", "lots", "size", "qty", "quantity"],
  type: ["type", "side", "action"],
  openTime: ["open time", "opentime", "open_time", "entry time", "entrytime", "time open"],
  closeTime: ["close time", "closetime", "close_time", "exit time", "exittime", "time close"],
  openPrice: ["open price", "openprice", "open_price", "entry price", "entryprice"],
  closePrice: ["close price", "closeprice", "close_price", "exit price", "exitprice", "price"],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function findColumnIndex(headers: string[], field: keyof typeof COLUMN_ALIASES): number {
  const aliases = COLUMN_ALIASES[field];
  return headers.findIndex((header) => aliases.includes(header));
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return value.toISOString().replace("T", " ").slice(0, 19);
  }
  return String(value).trim();
}

function parseNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseVolume(value: string | undefined): number {
  if (!value?.trim()) return 0;
  const primary = value.split("/")[0]?.trim() ?? value;
  return parseNumber(primary) ?? 0;
}

function cell(row: string[], index: number): string {
  return index >= 0 ? (row[index]?.trim() ?? "") : "";
}

function isMt5DealsHeader(headers: string[]): boolean {
  return (
    headers.includes("time") &&
    headers.includes("deal") &&
    headers.includes("symbol") &&
    headers.includes("profit") &&
    headers.includes("direction")
  );
}

function isGenericTradeHeader(headers: string[]): boolean {
  const symbolIdx = findColumnIndex(headers, "symbol");
  const profitIdx = findColumnIndex(headers, "profit");
  const closeTimeIdx = findColumnIndex(headers, "closeTime");
  const openTimeIdx = findColumnIndex(headers, "openTime");
  const timeIdx = headers.indexOf("time");

  return (
    symbolIdx >= 0 &&
    profitIdx >= 0 &&
    (closeTimeIdx >= 0 || openTimeIdx >= 0 || timeIdx >= 0)
  );
}

function findTradeTable(
  rows: string[][],
): { headerIndex: number; format: "mt5-deals" | "generic" } | null {
  let genericCandidate: number | null = null;

  for (let i = 0; i < rows.length; i += 1) {
    const headers = rows[i].map(normalizeHeader);
    if (isMt5DealsHeader(headers)) {
      return { headerIndex: i, format: "mt5-deals" };
    }
    if (genericCandidate === null && isGenericTradeHeader(headers)) {
      genericCandidate = i;
    }
  }

  if (genericCandidate !== null) {
    return { headerIndex: genericCandidate, format: "generic" };
  }

  return null;
}

function csvToRows(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function isZipSpreadsheet(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function isOleSpreadsheet(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function detectFileKind(
  buffer: ArrayBuffer,
  filename: string,
  mimeType?: string,
): "csv" | "xlsx" | null {
  const lower = filename.toLowerCase();

  if (isZipSpreadsheet(buffer) || isOleSpreadsheet(buffer)) {
    return "xlsx";
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return "xlsx";
  }

  if (lower.endsWith(".csv")) {
    return "csv";
  }

  const mime = mimeType?.toLowerCase() ?? "";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "application/vnd.ms-excel" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }

  if (mime.includes("csv") || mime === "text/plain") {
    return "csv";
  }

  // Heuristic: mostly printable text → CSV
  const sample = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 512)));
  let nonPrintable = 0;
  for (const byte of sample) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 32 || byte > 126) nonPrintable += 1;
  }
  if (sample.length > 0 && nonPrintable / sample.length < 0.1) {
    return "csv";
  }

  return null;
}

function xlsxToRows(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  return rawRows
    .map((row) => row.map(normalizeCell))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function parseMt5DealsSection(rows: string[][], headerIndex: number): {
  trades: ParsedBotTrade[];
  errors: string[];
} {
  const headers = rows[headerIndex].map(normalizeHeader);
  const timeIdx = headers.indexOf("time");
  const dealIdx = headers.indexOf("deal");
  const symbolIdx = headers.indexOf("symbol");
  const typeIdx = headers.indexOf("type");
  const directionIdx = headers.indexOf("direction");
  const volumeIdx = headers.indexOf("volume");
  const priceIdx = headers.indexOf("price");
  const profitIdx = headers.indexOf("profit");

  const trades: ParsedBotTrade[] = [];
  const errors: string[] = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.some((value) => value.trim())) continue;

    const symbol = cell(row, symbolIdx);
    const dealType = cell(row, typeIdx).toLowerCase();
    const direction = cell(row, directionIdx).toLowerCase();
    const closeTime = cell(row, timeIdx);
    const profit = parseNumber(cell(row, profitIdx));

    if (dealType === "balance" || !symbol) continue;
    if (direction !== "out") continue;
    if (!closeTime || profit == null) {
      errors.push(`Row ${i + 1}: skipped (missing time or profit).`);
      continue;
    }

    trades.push({
      ticket: parseNumber(cell(row, dealIdx)),
      symbol,
      profit,
      volume: parseVolume(cell(row, volumeIdx)),
      type: cell(row, typeIdx) || "unknown",
      openTime: closeTime,
      closeTime,
      closePrice: parseNumber(cell(row, priceIdx)) ?? undefined,
      success: dealSuccess(profit),
    });
  }

  if (trades.length === 0) {
    errors.push(
      "No closing deals found. MT5 Strategy Tester reports must include the Deals table with Direction = out.",
    );
  }

  return { trades, errors };
}

function parseGenericSection(rows: string[][], headerIndex: number): {
  trades: ParsedBotTrade[];
  errors: string[];
} {
  const headers = rows[headerIndex].map(normalizeHeader);
  const symbolIdx = findColumnIndex(headers, "symbol");
  const profitIdx = findColumnIndex(headers, "profit");
  const closeTimeIdx = findColumnIndex(headers, "closeTime");
  const openTimeIdx = findColumnIndex(headers, "openTime");
  const timeIdx = headers.indexOf("time");

  const errors: string[] = [];
  if (symbolIdx < 0) errors.push('Missing "symbol" column.');
  if (profitIdx < 0) errors.push('Missing "profit" column.');
  if (closeTimeIdx < 0 && openTimeIdx < 0 && timeIdx < 0) {
    errors.push('Missing "close_time", "open_time", or "time" column.');
  }
  if (errors.length > 0) return { trades: [], errors };

  const ticketIdx = findColumnIndex(headers, "ticket");
  const volumeIdx = findColumnIndex(headers, "volume");
  const typeIdx = findColumnIndex(headers, "type");
  const openPriceIdx = findColumnIndex(headers, "openPrice");
  const closePriceIdx = findColumnIndex(headers, "closePrice");
  const resolvedCloseIdx =
    closeTimeIdx >= 0 ? closeTimeIdx : timeIdx >= 0 ? timeIdx : openTimeIdx;
  const resolvedOpenIdx =
    openTimeIdx >= 0 ? openTimeIdx : timeIdx >= 0 ? timeIdx : closeTimeIdx;

  const trades: ParsedBotTrade[] = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.some((value) => value.trim())) continue;

    const symbol = cell(row, symbolIdx);
    const profit = parseNumber(cell(row, profitIdx));
    const closeTime = cell(row, resolvedCloseIdx);
    const openTime = cell(row, resolvedOpenIdx);

    if (!symbol || profit == null || !closeTime) {
      errors.push(`Row ${i + 1}: skipped (needs symbol, profit, and close/open time).`);
      continue;
    }

    trades.push({
      ticket: parseNumber(cell(row, ticketIdx)),
      symbol,
      profit,
      volume: parseVolume(cell(row, volumeIdx)),
      type: cell(row, typeIdx) || "unknown",
      openTime: openTime || closeTime,
      closeTime,
      openPrice: parseNumber(cell(row, openPriceIdx)) ?? undefined,
      closePrice: parseNumber(cell(row, closePriceIdx)) ?? undefined,
      success: dealSuccess(profit),
    });
  }

  return { trades, errors };
}

export function parseBotTradesRows(rows: string[][]): {
  trades: ParsedBotTrade[];
  errors: string[];
} {
  if (rows.length < 2) {
    return {
      trades: [],
      errors: [
        "Could not read trade rows from this file. For MT5 Strategy Tester reports, upload the original .xlsx export (not a screenshot or PDF).",
      ],
    };
  }

  const table = findTradeTable(rows);
  if (!table) {
    return {
      trades: [],
      errors: [
        "Could not find a trades table. Use a simple CSV/XLSX or an MT5 Strategy Tester report (Deals section).",
      ],
    };
  }

  if (table.format === "mt5-deals") {
    return parseMt5DealsSection(rows, table.headerIndex);
  }

  return parseGenericSection(rows, table.headerIndex);
}

export function parseBotTradesCsv(csvText: string): {
  trades: ParsedBotTrade[];
  errors: string[];
} {
  return parseBotTradesRows(csvToRows(csvText));
}

export function parseBotTradesXlsx(buffer: ArrayBuffer): {
  trades: ParsedBotTrade[];
  errors: string[];
} {
  return parseBotTradesRows(xlsxToRows(buffer));
}

export function parseBotTradesFile(
  buffer: ArrayBuffer,
  filename: string,
  mimeType?: string,
): { trades: ParsedBotTrade[]; errors: string[] } {
  if (buffer.byteLength === 0) {
    return {
      trades: [],
      errors: ["The uploaded file is empty."],
    };
  }

  const kind = detectFileKind(buffer, filename, mimeType);

  if (kind === "csv") {
    const text = new TextDecoder().decode(buffer);
    const csvResult = parseBotTradesCsv(text);
    if (csvResult.trades.length > 0) return csvResult;

    // Wrong extension — retry as spreadsheet (common with MT5 HTML/Excel exports)
    if (isZipSpreadsheet(buffer) || isOleSpreadsheet(buffer)) {
      return parseBotTradesXlsx(buffer);
    }

    return csvResult;
  }

  if (kind === "xlsx") {
    return parseBotTradesXlsx(buffer);
  }

  throw new Error(
    "Unsupported file type. Upload a .csv or .xlsx file (MT5 Strategy Tester report).",
  );
}
