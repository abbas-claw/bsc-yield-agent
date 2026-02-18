import { ethers } from 'ethers';
import { BSC_RPC_URL, BSC_RPC_URLS, BSC_CHAIN_ID } from './config';

let providerInstance: ethers.JsonRpcProvider | null = null;
let currentRpcIndex = 0;

export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    const rpcUrl = process.env.BSC_RPC_URL || BSC_RPC_URL;
    providerInstance = new ethers.JsonRpcProvider(rpcUrl, BSC_CHAIN_ID);
  }
  return providerInstance;
}

export function getWallet(): ethers.Wallet | null {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) return null;
  return new ethers.Wallet(privateKey, getProvider());
}

export function hasWallet(): boolean {
  return !!process.env.PRIVATE_KEY;
}

// Rotate to next RPC if current fails
export function rotateProvider(): ethers.JsonRpcProvider {
  currentRpcIndex = (currentRpcIndex + 1) % BSC_RPC_URLS.length;
  providerInstance = new ethers.JsonRpcProvider(BSC_RPC_URLS[currentRpcIndex], BSC_CHAIN_ID);
  return providerInstance;
}

// Execute with retry and RPC rotation
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${i + 1} failed:`, (error as Error).message);
      if (i < maxRetries - 1) {
        rotateProvider();
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}
