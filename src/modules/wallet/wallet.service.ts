import { walletAdapterReal } from './adapter.real';
import { applyCommissionToWallet, applyTopUpToWallet } from './applyCommission';

export async function debitCommission(fixerId: string, commission: number) {
  return applyCommissionToWallet(walletAdapterReal, fixerId, commission);
}

export async function topUp(fixerId: string, amount: number) {
  return applyTopUpToWallet(walletAdapterReal, fixerId, amount);
}
