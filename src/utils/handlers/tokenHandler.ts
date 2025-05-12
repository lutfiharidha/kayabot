import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { UserContext } from "./UserContext";

/**
 * Interface for token authority check results
 */
export interface TokenAuthorityStatus {
  mintAddress: string;
  hasMintAuthority: boolean;
  hasFreezeAuthority: boolean;
  mintAuthorityAddress: string | null;
  freezeAuthorityAddress: string | null;
  isSecure: boolean;
  details: {
    supply: string;
    decimals: number;
  };
}

/**
 * TokenCheckManager class for verifying token security properties
 */
export class TokenCheckManager {
  private connection: Connection;
  private userCtx: UserContext;

  constructor(userCtx: UserContext) {
    this.userCtx = userCtx;
    this.connection = new Connection(userCtx.rpcUrl, "confirmed");
  }

  /**
   * Check if a token's mint and freeze authorities are still enabled
   * @param mintAddress The token's mint address (contract address)
   * @returns Object containing authority status and details
   */
  public async getTokenAuthorities(mintAddress: string): Promise<TokenAuthorityStatus> {
    try {
      // Validate mint address
      if (!mintAddress || typeof mintAddress !== "string" || mintAddress.trim() === "") {
        throw new Error("Invalid mint address");
      }

      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mintPublicKey);

      const hasMintAuthority = mintInfo.mintAuthority !== null;
      const hasFreezeAuthority = mintInfo.freezeAuthority !== null;

      return {
        mintAddress: mintAddress,
        hasMintAuthority,
        hasFreezeAuthority,
        mintAuthorityAddress: mintInfo.mintAuthority?.toBase58() ?? null,
        freezeAuthorityAddress: mintInfo.freezeAuthority?.toBase58() ?? null,
        isSecure: !hasMintAuthority && !hasFreezeAuthority,
        details: {
          supply: mintInfo.supply.toString(),
          decimals: mintInfo.decimals,
        },
      };
    } catch (error) {
      console.error(`Error checking token authorities for ${mintAddress}:`, error);
      throw error;
    }
  }

  /**
   * Simplified check that returns only whether the token passes security checks
   * based on the configuration settings
   * @param mintAddress The token's mint address
   * @returns Boolean indicating if the token passes security checks
   */
  public async isTokenSecure(mintAddress: string): Promise<boolean> {
    try {
      const authorityStatus = await this.getTokenAuthorities(mintAddress);

      const allowMintAuthority = this.userCtx.mintAuthority;
      const allowFreezeAuthority = this.userCtx.freezeAuthority;

      return (
        (!authorityStatus.hasMintAuthority || allowMintAuthority) &&
        (!authorityStatus.hasFreezeAuthority || allowFreezeAuthority)
      );
    } catch (error) {
      console.error(`Error checking if token is secure: ${mintAddress}`, error);
      return false; // Consider token insecure if there's an error
    }
  }
}

/**
 * Factory function to create a TokenCheckManager instance
 * @param userCtx UserContext object for the current user
 */
export function createTokenCheckManager(userCtx: UserContext): TokenCheckManager {
  return new TokenCheckManager(userCtx);
}
