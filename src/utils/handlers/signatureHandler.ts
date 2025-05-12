import { Connection } from "@solana/web3.js";
import { config } from "../../config";
import { UserContext } from "./UserContext";

// Constants
const WSOL_MINT = config.wsol_pc_mint;

/**
 * SignatureHandler class optimized for speed
 */
export class SignatureHandler {
  private connection: Connection;
  private userCtx: UserContext;

  constructor(userCtx: UserContext) {
    this.userCtx = userCtx;
    this.connection = new Connection(userCtx.rpcUrl, "confirmed");
  }

  /**
   * Get the mint address from a transaction signature - optimized for speed
   * @param signature Transaction signature
   * @returns Promise resolving to mint address or null
   */
  public async getMintFromSignature(signature: string): Promise<string | null> {
    if (!signature || typeof signature !== "string" || signature.trim() === "") {
      return null;
    }

    try {
      // Fetch transaction with minimal options
      let tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (!tx?.meta) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        tx = await this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });

        if (!tx?.meta) return null;
      }

      const tokenBalances = tx.meta.postTokenBalances || tx.meta.preTokenBalances;
      if (!tokenBalances?.length) return null;

      if (tokenBalances.length === 2) {
        const mint1 = tokenBalances[0].mint;
        const mint2 = tokenBalances[1].mint;

        if (mint1 === WSOL_MINT) return mint2 === WSOL_MINT ? null : mint2;
        if (mint2 === WSOL_MINT) return mint1;

        return mint1;
      }

      for (const balance of tokenBalances) {
        if (balance.mint !== WSOL_MINT) return balance.mint;
      }

      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Factory function to create SignatureHandler per user
 */
export function createSignatureHandler(userCtx: UserContext): SignatureHandler {
  return new SignatureHandler(userCtx);
}
