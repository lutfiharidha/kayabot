import axios from "axios";
import { validateEnv } from "../env-validator";
import { UserContext } from "./UserContext";
import { TelegramManager } from "./telegram";
/**
 * Buys a token using the Sniperoo API
 * @param tokenAddress The token's mint address
 * @param inputAmount Amount of SOL to spend
 * @returns Boolean indicating if the purchase was successful
 */
export async function buyToken(userCtx: UserContext, tokenAddress: string, inputAmount: number, sell: boolean, tp: number, sl: number): Promise<boolean> {
  try {
    // Validate inputs
    if (!tokenAddress || typeof tokenAddress !== "string" || tokenAddress.trim() === "") {
      return false;
    }

    if (inputAmount <= 0) {
      return false;
    }

    if (!tp || !sl) {
      sell = false;
    }

    // Prepare request body
    const requestBody = {
      walletAddresses: [userCtx.wallet],
      tokenAddress: tokenAddress,
      inputAmount: inputAmount,
      autoSell: {
        enabled: sell,
        strategy: {
          strategyName: "simple",
          profitPercentage: tp,
          stopLossPercentage: sl,
        },
      },
    };

    // Make API request using axios
    const response = await axios.post("https://api.sniperoo.app/trading/buy-token?toastFrontendId=0", requestBody, {
      headers: {
        Authorization: `Bearer ${userCtx.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // Axios automatically throws an error for non-2xx responses,
    // so if we get here, the request was successful
    return true;
  } catch (error) {
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      await TelegramManager.getInstance().sendMessage(userCtx.userID, `Error buying token: ${error.response?.data.message || "Unknown error"}`,);
    } else {
      await TelegramManager.getInstance().sendMessage(userCtx.userID, `Error buying token:", ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return false;
  }
}
