import axios from "axios";
import dotenv from "dotenv";
import { config } from "../../config";
import { RugResponseExtended, NewTokenRecord } from "../../types";
import { insertNewToken, selectTokenByNameAndCreator } from "../../tracker/db";
import { UserContext } from "./UserContext";
import { TelegramManager } from "./telegram";
import TelegramBot from "node-telegram-bot-api";


// Load environment variables from the .env file
dotenv.config();

/**
 * Checks if a token passes all rug check criteria
 * @param tokenMint The token's mint address
 * @returns Promise<boolean> indicating if the token passes all checks
 */
export async function getRugCheckConfirmed(userCtx: UserContext, bot: TelegramBot, tokenMint: string): Promise<boolean> {
  try {
    const rugResponse = await axios.get<RugResponseExtended>(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`, {
      timeout: config.axios.get_timeout,
    });

    if (!rugResponse.data) return false;

    // For debugging purposes, log the full response data
    if (config.checks.verbose_logs) {
      console.log("📜 [Rug Check Handler] Rug check response data:", rugResponse.data);
    }

    // Extract information from the token report
    const tokenReport: RugResponseExtended = rugResponse.data;
    const tokenCreator = tokenReport.creator ? tokenReport.creator : tokenMint;
    const mintAuthority = tokenReport.token.mintAuthority;
    const freezeAuthority = tokenReport.token.freezeAuthority;
    const isInitialized = tokenReport.token.isInitialized;
    const tokenName = tokenReport.tokenMeta.name;
    const tokenSymbol = tokenReport.tokenMeta.symbol;
    const tokenMutable = tokenReport.tokenMeta.mutable;
    let topHolders = tokenReport.topHolders;
    const marketsLength = tokenReport.markets ? tokenReport.markets.length : 0;
    const totalLPProviders = tokenReport.totalLPProviders;
    const totalMarketLiquidity = tokenReport.totalMarketLiquidity;
    const isRugged = tokenReport.rugged;
    const rugScore = tokenReport.score;

    // Update topholders if liquidity pools are excluded
    if (config.checks.settings.exclude_lp_from_topholders) {
      // local types
      type Market = {
        liquidityA?: string;
        liquidityB?: string;
      };

      const markets: Market[] | undefined = tokenReport.markets;
      if (markets) {
        // Safely extract liquidity addresses from markets
        const liquidityAddresses: string[] = (markets ?? [])
          .flatMap((market) => [market.liquidityA, market.liquidityB])
          .filter((address): address is string => !!address);

        // Filter out topHolders that match any of the liquidity addresses
        topHolders = topHolders.filter((holder) => !liquidityAddresses.includes(holder.address));
      }
    }

    // Get config settings
    const rugCheckSettings = config.checks.settings;

    // Set conditions for token validation
    const conditions = [
      {
        check: !userCtx.mintAuthority && mintAuthority !== null,
        message: "🚫 Mint authority should be null",
      },
      {
        check: !rugCheckSettings.allow_not_initialized && !isInitialized,
        message: "🚫 Token is not initialized",
      },
      {
        check: !userCtx.freezeAuthority && freezeAuthority !== null,
        message: "🚫 Freeze authority should be null",
      },
      {
        check: !rugCheckSettings.allow_mutable && tokenMutable !== false,
        message: "🚫 Mutable should be false",
      },
      {
        check: !userCtx.allowInsiderTopHolders && topHolders.some((holder) => holder.insider),
        message: "🚫 Insider accounts should not be part of the top holders",
      },
      {
        check: topHolders.some((holder) => holder.pct > userCtx.percentageTopHolders),
        message: "🚫 An individual top holder cannot hold more than the allowed percentage of the total supply",
      },
      {
        check: totalLPProviders < userCtx.totalLpProviders,
        message: "🚫 Not enough LP Providers.",
      },
      {
        check: marketsLength < userCtx.totalMarkets,
        message: "🚫 Not enough Markets.",
      },
      {
        check: totalMarketLiquidity < userCtx.totalMarketLiquidity,
        message: "🚫 Not enough Market Liquidity.",
      },
      {
        check: !rugCheckSettings.allow_rugged && isRugged,
        message: "🚫 Token is rugged",
      },
      {
        check: rugCheckSettings.block_symbols.includes(tokenSymbol),
        message: "🚫 Symbol is blocked",
      },
      {
        check: rugCheckSettings.block_names.includes(tokenName),
        message: "🚫 Name is blocked",
      },
      {
        check: rugScore > userCtx.score && userCtx.score !== 0,
        message: "🚫 Rug score too high.",
      },
      {
        check: rugCheckSettings.ignore_ends_with_pump && tokenMint.toLowerCase().endsWith("pump"),
        message: "🚫 Token name ends with 'pump' which is blocked by configuration.",
      },
    ];

    // Check for duplicate tokens if tracking is enabled
    if (rugCheckSettings.block_returning_token_names || rugCheckSettings.block_returning_token_creators) {
      try {
        // Get duplicates based on token name and creator
        const duplicate = await selectTokenByNameAndCreator(userCtx.userID, tokenName, tokenCreator);

        // Verify if duplicate token or creator was returned
        if (duplicate.length !== 0) {
          if (rugCheckSettings.block_returning_token_names && duplicate.some((token) => token.name === tokenName)) {
            console.log("🚫 Token with this name was already created");
            return false;
          }
          if (rugCheckSettings.block_returning_token_creators && duplicate.some((token) => token.creator === tokenCreator)) {
            console.log("🚫 Token from this creator was already created");
            return false;
          }
        }
      } catch (error) {
        console.error("Error checking for duplicate tokens:", error);
        // Continue with other checks even if this one fails
      }
    }

    // Create new token record for tracking
    const newToken: NewTokenRecord = {
      time: Date.now(),
      mint: tokenMint,
      name: tokenName,
      creator: tokenCreator,
    };

    // try {
    //   await insertNewToken(userCtx.userID, newToken);
    // } catch (err) {
    //   if (rugCheckSettings.block_returning_token_names || rugCheckSettings.block_returning_token_creators) {
    //     console.error("⛔ Unable to store new token for tracking duplicate tokens:", err);
    //   }
    //   // Continue with other checks even if this one fails
    // }

    // Validate all conditions
    const failedConditions = conditions.filter((condition) => condition.check);
    if (failedConditions.length > 0) {
      bot.sendMessage(userCtx.userID, `🧪 [Rug Check Handler] Token https://rugcheck.xyz/tokens/${tokenMint}:
Rug Conditions: 
${failedConditions.map((condition) => `${condition.message}\n`).join('')}`, {
        parse_mode: "HTML",
      });
    }

    if (failedConditions.length > 0) {
      return false; // Token is not safe
    }

    return true;
  } catch (error) {
    console.error(`Error in rug check for token ${tokenMint}:`, error);
    return false; // Consider token unsafe if there's an error
  }
}


export async function getMcap(userCtx: UserContext, bot: TelegramBot, tokenMint: string): Promise<boolean> {
  try {
    const rugResponse = await axios.get<RugResponseExtended>(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`, {
      timeout: config.axios.get_timeout,
    });

    const priceResponse = await axios.get(`https://data.fluxbeam.xyz/tokens/${tokenMint}/price`, {
      timeout: config.axios.get_timeout,
    });


    if (!rugResponse.data || !priceResponse.data) return false;

    // Extract information from the token report
    const tokenReport: RugResponseExtended = rugResponse.data;
    const tokenMutable = tokenReport.tokenMeta.mutable;
    const supply = tokenReport.token.supply / Math.pow(10, tokenReport.token.decimals);
    const price = priceResponse.data;
    const mcap = supply * Number(price);
    if (mcap >= 100000) {
      bot.sendMessage(userCtx.userID, `Market Cap too high: ${formatMcap(mcap)}`);
      return false;
    }
    if (tokenMutable !== false) {
      bot.sendMessage(userCtx.userID, `⛔ Token metadata can be changed by the owner`);
      return false;
    }
    if (tokenReport.topHolders.some((holder) => holder.pct > userCtx.percentageTopHolders)) {
      bot.sendMessage(userCtx.userID, `⛔ An individual top holder cannot hold more than ${userCtx.percentageTopHolders}% of the total supply`);
      return false;
    }
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return false; // atau nilai default seperti 0
      } else {
        console.error(`Axios error for token ${tokenMint}:`, error.message);
      }
    } else {
      console.error(`Unexpected error for token ${tokenMint}:`, error);
    }
    return false; // Consider token unsafe if there's an error
  }
}


function formatMcap(mcap: number): string {
  if (mcap >= 1_000_000_000) return `${(mcap / 1_000_000_000).toFixed(1)}B`;
  if (mcap >= 1_000_000) return `${(mcap / 1_000_000).toFixed(1)}M`;
  if (mcap >= 1_000) return `${(mcap / 1_000).toFixed(1)}K`;
  return mcap.toFixed(2);
}