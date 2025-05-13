export const config = {
  telegram: {
    enabled: true, // If set to true, the bot will send messages to telegram
    token: "7248739631:AAHpDkY8-4GHp0fiz9kuivgh7kqdK5fND8Y", // Telegram bot token
  },
  pumpfun: {
    id: "pump1",
    name: "pumpswap",
    program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    instruction: "Program log: Instruction: CreatePool",
  },
  raydium: {
    id: "rad1",
    name: "Raydium",
    program: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    instruction: "Program log: initialize2: InitializeInstruction2",
  },
  concurrent_transactions: 2, // Number of simultaneous transactions
  wsol_pc_mint: "So11111111111111111111111111111111111111112",
  db: {
    pathname: "src/db/sniper.db", // Sqlite Database location
  },
  token_buy: {
    provider: "sniperoo",
    sol_amount: 0.005, // Amount of SOL to spend
    play_sound: true, // Works only on windows
    play_sound_text: "Order Filled!",
  },
  token_sell: {
    enabled: true, // If set to true, the bot will sell the token via Sniperoo API
    stop_loss_percent: 15,
    take_profit_percent: 50,
  },
  checks: {
    simulation_mode: false,
    mode: "snipe", // snipe=Minimal Checks, full=Full Checks based on Rug Check, none=No Checks
    verbose_logs: false,
    settings: {
      // Dangerous (Checked in snipe mode)
      allow_mint_authority: false, // The mint authority is the address that has permission to mint (create) new tokens. Strongly Advised to set to false.
      allow_freeze_authority: false, // The freeze authority is the address that can freeze token transfers, effectively locking up funds. Strongly Advised to set to false
      // Critical
      max_alowed_pct_topholders: 20, // Max allowed percentage an individual topholder might hold
      exclude_lp_from_topholders: true, // If true, Liquidity Pools will not be seen as top holders
      block_returning_token_names: true,
      block_returning_token_creators: true,
      allow_insider_topholders: false, // Allow inseder accounts to be part of the topholders
      allow_not_initialized: false, // This indicates whether the token account is properly set up on the blockchain. Strongly Advised to set to false
      allow_rugged: false,
      allow_mutable: false,
      block_symbols: ["XXX"],
      block_names: ["XXX"],
      // Warning
      min_total_lp_providers: 1,
      min_total_markets: 1,
      min_total_market_Liquidity: 10000,
      // Misc
      ignore_ends_with_pump: false,
      max_score: 0, // Set to 0 to ignore
    },
  },
  axios: {
    get_timeout: 10000, // Timeout for API requests
  },
};
