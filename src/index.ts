import WebSocket from "ws"; // Node.js websocket library
import { config } from "./config"; // Configuration parameters for our bot
import { validateEnv } from "./utils/env-validator";
import { WebSocketManager, ConnectionState } from "./utils/managers/websocketManager";
import { createSignatureHandler } from "./utils/handlers/signatureHandler";
import { createTokenCheckManager } from "./utils/handlers/tokenHandler";
import { buyToken } from "./utils/handlers/sniperooHandler";
import { getMcap, getRugCheckConfirmed } from "./utils/handlers/rugCheckHandler";
import { checkUsersUpdatedToday, handleCommands, toggleUserStatus, toggleUserStatusFalse } from './bot/handlers';
import { UserContext } from "./utils/handlers/UserContext";
import { TelegramManager } from "./utils/handlers/telegram";
import moment from 'moment-timezone';
import { getJakartaTime } from "./utils/handlers/helper";
import cron from 'node-cron';
import { wsManagers } from "./utils/handlers/state";

// Regional Variables
TelegramManager.init(config.telegram.token); // WAJIB dipanggil 1x saat startup
const MAX_CONCURRENT = config.concurrent_transactions;
const BUY_PROVIDER = config.token_buy.provider;
const SIM_MODE = config.checks.simulation_mode || false;
const PLAY_SOUND = config.token_buy.play_sound || false;
const bot = TelegramManager.getInstance().getBot();
type SubscriptionLP = {
  enabled: boolean;
  id: string;
  name: string;
  program: string;
  instruction: string;
};

moment.tz.setDefault('Asia/Jakarta');

// Sell Options

// current handled mint

// Function used to handle the transaction once a new pool creation is found
async function processTransaction(userCtx: UserContext, signature: string): Promise<void> {
  bot.sendMessage(userCtx.userID, `
🔎 [Process Transaction] New Liquidity Pool found`);

  /**
   * Extract the token CA from the transaction signature
   */
  const signatureHandler = createSignatureHandler(userCtx);
  const returnedMint = await signatureHandler.getMintFromSignature(signature);
  if (!returnedMint) {
    bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] No valid token CA could be extracted
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
    return;
  }
  /**
   * Check if the mint address is the same as the current one to prevent failed logs from spam buying
   */
  if (userCtx.iscurrentMint === returnedMint) {
    bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Skipping duplicate mint to prevent mint spamming
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
    return;
  }
  userCtx.iscurrentMint = returnedMint;

  /**
   * Perform checks based on selected level of rug check
   */
  const CHECK_MODE = userCtx.mode
  bot.sendMessage(userCtx.userID, `
🔍 [Process Transaction] Performing ${CHECK_MODE} check
👽 GMGN: https://gmgn.ai/sol/token/${returnedMint}`);
  if (CHECK_MODE === "snipe") {
    const tokenCheck = createTokenCheckManager(userCtx);
    const tokenAuthorityStatus = await tokenCheck.getTokenAuthorities(returnedMint);
    const mcap = await getMcap(userCtx, bot, returnedMint);
    if (!mcap) {
      bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token not swapped. Market Cap check failed.
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
      return;
    }
    if (!tokenAuthorityStatus.isSecure) {
      /**
       * Token is not secure, check if we should skip based on preferences
       */
      const allowMintAuthority = userCtx.mintAuthority || false;
      const allowFreezeAuthority = userCtx.freezeAuthority || false;
      if (!allowMintAuthority && tokenAuthorityStatus.hasMintAuthority) {
        bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token has mint authority, skipping...
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
        return;
      }
      if (!allowFreezeAuthority && tokenAuthorityStatus.hasFreezeAuthority) {
        bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token has freeze authority, skipping...
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
        return;
      }
    }
  } else if (CHECK_MODE === "full") {
    /**
     *  Perform full check
     */
    if (returnedMint.trim().toLowerCase().endsWith("pump") && config.checks.settings.ignore_ends_with_pump) {
      bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token ends with pump, skipping...
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
      return;
    }
    // Check rug check
    const isRugCheckPassed = await getRugCheckConfirmed(userCtx, bot, returnedMint);
    if (!isRugCheckPassed) {
      bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token not swapped. Rug check failed.
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
      return;
    }
  }

  /**
   * Perform Swap Transaction
   */

  const BUY_AMOUNT = userCtx.buyAmount;
  const SELL_ENABLED = userCtx.sellEnabled;
  const SELL_STOP_LOSS = userCtx.stopLoss;
  const SELL_TAKE_PROFIT = userCtx.takeProfit;

  if (BUY_PROVIDER === "sniperoo" && !SIM_MODE) {
    const result = await buyToken(userCtx, returnedMint, Number(BUY_AMOUNT), SELL_ENABLED, Number(SELL_TAKE_PROFIT), Number(SELL_STOP_LOSS));
    if (!result) {
      userCtx.iscurrentMint = ""; // Reset the current mint
      bot.sendMessage(userCtx.userID, `
❌ [Process Transaction] Token not swapped. Sniperoo failed.
🔎 [Process Transaction] Looking for new Liquidity Pools again`);
      return;
    }
    bot.sendMessage(userCtx.userID, `
<b>Token swapped successfully</b>

<b>Mint Address:</b> ${returnedMint}
<b>Token:</b> https://gmgn.ai/sol/token/${returnedMint}
<b>Token Amount:</b> ${BUY_AMOUNT} SOL
<b>Sell Enabled:</b> ${SELL_ENABLED}
<b>Stop Loss:</b> ${SELL_STOP_LOSS}
<b>Take Profit:</b> ${SELL_TAKE_PROFIT}`, {
      parse_mode: 'HTML',
    });
    bot.sendMessage(userCtx.userID, "✅ [Process Transaction] Token swapped successfully! ");
  }

  /**
   * Check if Simopulation Mode is enabled in order to output the warning
   */
  // if (SIM_MODE) {
  //   console.log("🧻 [Process Transaction] Token not swapped! Simulation Mode turned on.");
  //   if (PLAY_SOUND) playSound("Token found in simulation mode");
  // }

  /**
   * Output token mint address
   */
}

// Main function to start the application
export async function continueProgram(userctx: UserContext): Promise<void> {
  // Load environment variables from the .env file
  const SUBSCRIBE_LP: SubscriptionLP[] = [];

  if (userctx.pumpfun) {
    SUBSCRIBE_LP.push({
      enabled: true,
      id: config.pumpfun.id,
      name: config.pumpfun.name,
      program: config.pumpfun.program,
      instruction: config.pumpfun.instruction,
    });
  }

  if (userctx.raydium) {
    SUBSCRIBE_LP.push({
      enabled: true,
      id: config.raydium.id,
      name: config.raydium.name,
      program: config.raydium.program,
      instruction: config.raydium.instruction,
    });
  }


  // Create WebSocket manager

  const wsManager = new WebSocketManager({
    url: userctx.wsUrl,
    initialBackoff: 1000,
    maxBackoff: 30000,
    maxRetries: Infinity,
    debug: true,
  });

  wsManagers.set(userctx.userID, wsManager);

  // Set up event handlers
  wsManager.on("open", () => {
    /**
     * Create a new subscription request for each program ID
     */
    SUBSCRIBE_LP.filter((pool) => pool.enabled).forEach((pool) => {
      const subscriptionMessage = {
        jsonrpc: "2.0",
        id: pool.id,
        method: "logsSubscribe",
        params: [
          {
            mentions: [pool.program],
          },
          {
            commitment: "processed", // Can use finalized to be more accurate.
          },
        ],
      };
      wsManager.send(JSON.stringify(subscriptionMessage));
    });
  });

  wsManager.on("message", async (data: WebSocket.Data) => {
    if (!userctx.isRunning) return;
    try {
      const jsonString = data.toString(); // Convert data to a string
      const parsedData = JSON.parse(jsonString); // Parse the JSON string

      // Handle subscription response
      if (parsedData.result !== undefined && !parsedData.error) {
        console.log("✅ Subscription confirmed");
        return;
      }

      // Only log RPC errors for debugging
      if (parsedData.error) {
        console.error("🚫 RPC Error:", parsedData.error);
        return;
      }

      // Safely access the nested structure
      const logs = parsedData?.params?.result?.value?.logs;
      const signature = parsedData?.params?.result?.value?.signature;

      // Validate `logs` is an array and if we have a signtature
      if (!Array.isArray(logs) || !signature) return;

      // Verify if this is a new pool creation
      const liquidityPoolInstructions = SUBSCRIBE_LP.filter((pool) => pool.enabled).map((pool) => pool.instruction);
      const containsCreate = logs.some((log: string) => typeof log === "string" && liquidityPoolInstructions.some((instruction) => log.includes(instruction)));

      if (!containsCreate || typeof signature !== "string") return;

      // Verify if we have reached the max concurrent transactions
      if (userctx.isActiveTransactions >= MAX_CONCURRENT) {
        console.log("⏳ Max concurrent transactions reached, skipping...");
        return;
      }

      // Add additional concurrent transaction
      userctx.isActiveTransactions++;

      // Process transaction asynchronously
      processTransaction(userctx, signature)
        .catch((error) => {
          console.error("Error processing transaction:", error);
        })
        .finally(() => {
          userctx.isActiveTransactions--;
        });
    } catch (error) {
      console.error("💥 Error processing message:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: getJakartaTime(),
      });
    }
  });

  wsManager.on("error", (error: Error) => {
    console.error("WebSocket error:", error.message);
  });

  wsManager.on("state_change", (state: ConnectionState) => {
    if (state === ConnectionState.RECONNECTING) {
      bot.sendMessage(userctx.userID, `📴 WebSocket connection lost, attempting to reconnect...`);
    } else if (state === ConnectionState.CONNECTED) {
      bot.sendMessage(userctx.userID, `🔄 WebSocket connected successfully.`);
    }
  });

  // Start the connection
  wsManager.connect();

  // Handle application shutdown
  process.on("SIGINT", () => {
    bot.sendMessage(732587267, `Bot stopped`);
    console.log("\n🛑 Shutting down...");
    for (const ws of wsManagers.values()) ws.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    bot.sendMessage(732587267, `Bot stopped`);
    console.log("\n🛑 Shutting down...");
    for (const ws of wsManagers.values()) ws.disconnect();
    process.exit(0);
  });
}

async function main(): Promise<void> {
  console.log("🚀 Starting Solana Token Sniper...");

  const env = validateEnv(); // misalnya pakai dotenv
  if (env.TELEGRAM_BOT) {
    handleCommands(bot); // <- ini yang menangani semua /cservice, /cbuy, dll
  }

  cron.schedule('39 16 * * *', async () => {
    console.log("Checking for expired users...");
    const users = await checkUsersUpdatedToday();
    if (users.length > 0) {
      users.forEach(async (user) => {
        await toggleUserStatusFalse(user.username);
        bot.sendMessage(user.user_id, `❌ Your subscription has expired. Please contact <a href="https://t.me/lutfiharidha"><b>DEVELOPER</b></a> for more information.`, {
          parse_mode: 'HTML',
        });
      });
      bot.sendMessage(732587267, `🔔 Reminder Expired User

${users.map((user) => `<b>@${user.username}</b>\n`).join('')}`,
        { parse_mode: 'HTML' });
    } else {
      console.log("No expired users found.");
    }
  });

}

// main().catch(console.error);


// Start the application
main().catch((err) => {
  bot.sendMessage(732587267, `Bot error: ${err}`);
  console.error("Fatal error:", err);
  process.exit(1);
});
