// state.ts
const runningStatus: Map<number, boolean> = new Map();
const activeTransactions: Map<number, number> = new Map();
const currentMint: Map<number, string> = new Map();

export function setRunning(userId: number, value: boolean) {
  runningStatus.set(userId, value);
}

export function isRunning(userId: number): boolean {
  return runningStatus.get(userId) ?? false;
}

export function setActiveTransactions(userId: number, value: number) {
  activeTransactions.set(userId, value);
}

export function isActiveTransactions(userId: number): number {
  return activeTransactions.get(userId) ?? 0;
}


export function setcurrentMint(userId: number, value: string) {
  currentMint.set(userId, value);
}

export function iscurrentMint(userId: number): string {
  return currentMint.get(userId) ?? "";
}
