import { userState, UserState } from "../../bot/handlers";
import { isRunning, setRunning, isActiveTransactions, setActiveTransactions, setcurrentMint, iscurrentMint } from "./state";

export class UserContext {
  public readonly userId: number;
  public readonly user: UserState;

  constructor(userId: number) {
    const user = userState.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    this.userId = userId;
    this.user = user;
  }

  // Shortcut
  get userID(): number {
    return this.userId;
  }
  get rpcUrl(): string {
    return this.user.CServiceData.rpc_url;
  }

  get wsUrl(): string {
    return this.user.CServiceData.ws_url;
  }

  get apiKey(): string {
    return this.user.CServiceData.api_key;
  }

  get wallet(): string {
    return this.user.CServiceData.wallet;
  }

  get pumpfun(): boolean {
    if (!this.user.CServiceData.pumpfun) return false;
    return true;
  }

  get raydium(): boolean {
    if (!this.user.CServiceData.raydium) return false;
    return true;
  }

  get buyAmount(): number {
    return Number(this.user.CBuyData.amount);
  }

  get sellEnabled(): boolean {
    if (!this.user.CSellData.enabled) return false;
    return true;
  }

  get stopLoss(): number {
    return Number(this.user.CSellData.stop_loss);
  }


  get takeProfit(): number {
    return Number(this.user.CSellData.take_profit);
  }

  get mode(): string {
    return this.user.CRugData.mode;
  }


  get mintAuthority(): boolean {
    if (!this.user.CRugData.mint_authority) return false;
    return true;
  }

  get freezeAuthority(): boolean {
    if (!this.user.CRugData.freeze_authority) return false;
    return true;
  }

  get allowInsiderTopHolders(): boolean {
    if (!this.user.CRugData.allow_insider_topholders) return false;
    return true;
  }

  get percentageTopHolders(): number {
    return Number(this.user.CRugData.percentage_top_holders);
  }

  get totalLpProviders(): number {
    return Number(this.user.CRugData.total_lp_providers);
  }

  get totalMarketLiquidity(): number {
    return Number(this.user.CRugData.total_market_liquidity);
  }

  get totalMarkets(): number {
    return Number(this.user.CRugData.total_markets);
  }

  get score(): number {
    return Number(this.user.CRugData.score);
  }

  get isRunning(): boolean {
    return isRunning(this.userId);
  }

  set isRunning(value: boolean) {
    setRunning(this.userId, value);
  }

  get isActiveTransactions(): number {
    return isActiveTransactions(this.userId);
  }

  set isActiveTransactions(value: number) {
    setActiveTransactions(this.userId, value);
  }

  get iscurrentMint(): string {
    return iscurrentMint(this.userId);
  }

  set iscurrentMint(value: string) {
    setcurrentMint(this.userId, value);
  }

}
