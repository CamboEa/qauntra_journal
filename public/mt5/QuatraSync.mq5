//+------------------------------------------------------------------+
//| QuatraSync.mq5 - Quatra Journal MT5 sync Expert Advisor          |
//| Attach to any chart. Does NOT place trades — read-only sync.     |
//+------------------------------------------------------------------+
#property copyright "Quatra Journal"
#property link      "https://quatra-journal.vercel.app"
#property version   "1.00"

input string ApiUrl      = "https://quatra-journal.vercel.app/api/sync";
input string ApiKey      = "";
input int    SyncSeconds = 15;
input int    HistoryDays = 90;

datetime g_lastDealTime = 0;
bool     g_firstSync    = true;

int OnInit()
{
   if(StringLen(ApiKey) < 16)
   {
      Print("QuatraSync ERROR: ApiKey is missing or too short. Paste the key from Dashboard → Setup.");
      return(INIT_FAILED);
   }

   EventSetTimer(1);  // fire first sync in 1s, then OnTimer resets to SyncSeconds
   Print("QuatraSync started — syncing every ", SyncSeconds, "s to ", ApiUrl);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventSetTimer(0);
}

void OnTimer()
{
   if(g_firstSync)
   {
      g_firstSync = false;
      EventSetTimer(SyncSeconds);  // reset to regular interval after first tick
   }
   SyncAccount();
}

void OnTick() {}

string DealTypeName(long dealType)
{
   if(dealType == DEAL_TYPE_BUY) return "buy";
   if(dealType == DEAL_TYPE_SELL) return "sell";
   return "unknown";
}

string PositionTypeName(long posType)
{
   if(posType == POSITION_TYPE_BUY) return "buy";
   if(posType == POSITION_TYPE_SELL) return "sell";
   return "unknown";
}

string JsonEscape(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   return value;
}

void SyncAccount()
{
   if(AccountInfoInteger(ACCOUNT_LOGIN) == 0)
   {
      Print("QuatraSync: no account connected yet, skipping sync.");
      return;
   }

   string payload = BuildPayload();

   char data[];
   char result[];
   string resultHeaders;
   string reqHeaders = "Content-Type: application/json\r\nX-Api-Key: " + ApiKey + "\r\n";

   StringToCharArray(payload, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1);  // trim null terminator, not StringLen (char vs byte safe)

   ResetLastError();
   int status = WebRequest(
      "POST",
      ApiUrl,
      reqHeaders,
      10000,
      data,
      result,
      resultHeaders
   );

   if(status == -1)
   {
      int err = GetLastError();
      Print("QuatraSync WebRequest failed (err=", err, "). In MT5: Tools → Options → Expert Advisors → add this URL: ", ApiUrl);
      return;
   }

   if(status >= 200 && status < 300)
      Print("QuatraSync OK (HTTP ", status, ")");
   else
      Print("QuatraSync HTTP ", status, ": ", CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
}

string BuildPayload()
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin  = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   long login = AccountInfoInteger(ACCOUNT_LOGIN);

   datetime from = (g_lastDealTime > 0)
      ? g_lastDealTime
      : TimeCurrent() - (HistoryDays * 86400);

   HistorySelect(from, TimeCurrent());

   string deals = "[";
   int total = HistoryDealsTotal();
   datetime newest = g_lastDealTime;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) continue;

      datetime closeTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(closeTime <= g_lastDealTime) continue;

      if(StringLen(deals) > 1) deals += ",";

      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price  = HistoryDealGetDouble(ticket, DEAL_PRICE);
      string closeStr = TimeToString(closeTime, TIME_DATE|TIME_SECONDS);

      deals += "{";
      deals += "\"ticket\":" + (string)ticket + ",";
      deals += "\"symbol\":\"" + JsonEscape(symbol) + "\",";
      deals += "\"profit\":" + DoubleToString(profit, 2) + ",";
      deals += "\"volume\":" + DoubleToString(volume, 2) + ",";
      deals += "\"type\":\"" + DealTypeName(dealType) + "\",";
      deals += "\"closeTime\":\"" + closeStr + "\",";
      deals += "\"closePrice\":" + DoubleToString(price, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
      deals += "}";

      if(closeTime > newest) newest = closeTime;
   }
   deals += "]";

   if(newest > g_lastDealTime) g_lastDealTime = newest;

   string positions = "[";
   for(int p = PositionsTotal() - 1; p >= 0; p--)
   {
      ulong posTicket = PositionGetTicket(p);
      if(posTicket == 0 || !PositionSelectByTicket(posTicket)) continue;

      if(StringLen(positions) > 1) positions += ",";

      string posSymbol = PositionGetString(POSITION_SYMBOL);
      long posType = PositionGetInteger(POSITION_TYPE);
      datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);

      positions += "{";
      positions += "\"ticket\":" + (string)posTicket + ",";
      positions += "\"symbol\":\"" + JsonEscape(posSymbol) + "\",";
      positions += "\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT), 2) + ",";
      positions += "\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) + ",";
      positions += "\"type\":\"" + PositionTypeName(posType) + "\",";
      positions += "\"openTime\":\"" + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\",";
      positions += "\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), (int)SymbolInfoInteger(posSymbol, SYMBOL_DIGITS));
      positions += "}";
   }
   positions += "]";

   return "{"
      + "\"login\":" + (string)login + ","
      + "\"balance\":" + DoubleToString(balance, 2) + ","
      + "\"equity\":" + DoubleToString(equity, 2) + ","
      + "\"margin\":" + DoubleToString(margin, 2) + ","
      + "\"freeMargin\":" + DoubleToString(freeMargin, 2) + ","
      + "\"deals\":" + deals + ","
      + "\"positions\":" + positions
      + "}";
}
