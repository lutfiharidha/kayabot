import moment from 'moment-timezone';
moment.tz.setDefault('Asia/Jakarta');

export function getJakartaTime(): string {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

export function getStartOfDayJakarta(): string {
  return moment().tz('Asia/Jakarta').startOf('day').format('YYYY-MM-DD HH:mm:ss');
}

export function getJakartaTime1year(): string {
  return moment().tz('Asia/Jakarta').add(1, 'year').format('YYYY-MM-DD HH:mm:ss');
}

export function getJakartaTime1month(): string {
  return moment().tz('Asia/Jakarta').add(1, 'month').format('YYYY-MM-DD HH:mm:ss');
}

export function mapFieldName(key: string): string {
  const fieldMap: Record<string, string> = {
    // CSellData
    enabled: "Enabled",
    stop_loss: "Stop Loss",
    take_profit: "Take Profit",

    // CBuyData
    amount: "Amount",

    // CRugData
    mode: "Mode",
    mint_authority: "Mint Authority",
    freeze_authority: "Freeze Authority",
    allow_insider_topholders: "Allow Insider Top Holders",
    percentage_top_holders: "Percentage Top Holders",
    total_lp_providers: "Total LP Providers",
    total_market_liquidity: "Total Market Liquidity",
    total_markets: "Total Markets",
    score: "Score",

    // CServiceData
    rpc_url: "RPC URL",
    ws_url: "WebSocket URL",
    api_key: "API Key",
    wallet: "Wallet",
    pumpfun: "PumpFun",
    raydium: "Raydium",
  };

  return fieldMap[key] || key;
}
