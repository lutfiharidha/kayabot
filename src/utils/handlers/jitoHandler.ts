import axios from "axios";
import { UserContext } from "./UserContext";
import TelegramBot from "node-telegram-bot-api";

interface Result {
  tier: string;
  feePerTx: number;
  totalFee: number;
  netProfit: number;
  isProfitable: boolean;
}

export async function getFeeRecommendation(userCtx: UserContext): Promise<Result[]> {
  try {
    const jitoTip = await axios.get(`https://bundles.jito.wtf/api/v1/bundles/tip_floor`, {
      timeout: 10000,
    });

    const jitoFees = {
      "25": jitoTip.data[0].landed_tips_25th_percentile,
      "50": jitoTip.data[0].landed_tips_50th_percentile,
      "75": jitoTip.data[0].landed_tips_75th_percentile,
      "95": jitoTip.data[0].landed_tips_95th_percentile,
      "99": jitoTip.data[0].landed_tips_99th_percentile,
    };

    const targetSell = userCtx.buyAmount * (1 + userCtx.takeProfit / 100);
    const grossProfit = targetSell - userCtx.buyAmount;

    const results: Result[] = Object.entries(jitoFees).map(([tier, fee]) => {
      const totalFee = fee * 2; // beli + jual
      const netProfit = grossProfit - totalFee;
      return {
        tier,
        feePerTx: fee,
        totalFee,
        netProfit,
        isProfitable: netProfit > 0,
      };
    });
    return results;
  } catch (error) {
    console.error("Error fetching Jito fees:", error);
    return [];
  }
}