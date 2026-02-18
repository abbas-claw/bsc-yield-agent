import { ethers } from 'ethers';
import { getProvider, getWallet, withRetry } from '../provider';
import { VENUS, TOKENS } from '../config';
import {
  VENUS_COMPTROLLER_ABI,
  VENUS_VTOKEN_ABI,
  VENUS_ORACLE_ABI,
  ERC20_ABI,
} from '../abis';
import { ProtocolRate, Position, Token, TransactionResult } from '../types';

const BLOCKS_PER_YEAR = 10_512_000; // ~3s per block on BSC
const MANTISSA = ethers.parseUnits('1', 18);

export class VenusProtocol {
  private provider: ethers.JsonRpcProvider;
  private comptroller: ethers.Contract;
  private oracle: ethers.Contract;

  constructor() {
    this.provider = getProvider();
    this.comptroller = new ethers.Contract(VENUS.COMPTROLLER, VENUS_COMPTROLLER_ABI, this.provider);
    this.oracle = new ethers.Contract(VENUS.ORACLE, VENUS_ORACLE_ABI, this.provider);
  }

  async getRates(): Promise<ProtocolRate[]> {
    const rates: ProtocolRate[] = [];

    for (const [symbol, vTokenAddr] of Object.entries(VENUS.vTokens)) {
      const token = TOKENS[symbol];
      if (!token) continue;

      try {
        const rate = await withRetry(() => this.getMarketRate(symbol, vTokenAddr, token));
        if (rate) rates.push(rate);
      } catch (error) {
        console.error(`Venus: Failed to get rate for ${symbol}:`, (error as Error).message);
      }
    }

    return rates;
  }

  private async getMarketRate(symbol: string, vTokenAddr: string, token: Token): Promise<ProtocolRate | null> {
    const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, this.provider);

    const [
      supplyRatePerBlock,
      borrowRatePerBlock,
      totalSupply,
      totalBorrows,
      cash,
      exchangeRate,
      reserveFactor,
      marketInfo,
    ] = await Promise.all([
      vToken.supplyRatePerBlock(),
      vToken.borrowRatePerBlock(),
      vToken.totalSupply(),
      vToken.totalBorrows(),
      vToken.getCash(),
      vToken.exchangeRateStored(),
      vToken.reserveFactorMantissa(),
      this.comptroller.markets(vTokenAddr),
    ]);

    // Calculate APY from per-block rate
    const supplyAPR = Number(supplyRatePerBlock) * BLOCKS_PER_YEAR / 1e18 * 100;
    const borrowAPR = Number(borrowRatePerBlock) * BLOCKS_PER_YEAR / 1e18 * 100;

    // Compound APY = (1 + rate_per_block)^blocks_per_year - 1
    const supplyAPY = (Math.pow(1 + Number(supplyRatePerBlock) / 1e18, BLOCKS_PER_YEAR) - 1) * 100;
    const borrowAPY = (Math.pow(1 + Number(borrowRatePerBlock) / 1e18, BLOCKS_PER_YEAR) - 1) * 100;

    // Get reward APY (XVS distribution)
    let rewardAPY = 0;
    try {
      const [supplySpeed, borrowSpeed] = await Promise.all([
        this.comptroller.venusSupplySpeeds(vTokenAddr),
        this.comptroller.venusBorrowSpeeds(vTokenAddr),
      ]);

      // Get XVS price from oracle
      const xvsVToken = VENUS.vTokens['XVS'];
      if (xvsVToken) {
        // Simplified reward calculation - actual would need XVS price
        const xvsPerYear = Number(supplySpeed) * BLOCKS_PER_YEAR / 1e18;
        // Rough estimate - real implementation would use oracle price
        rewardAPY = xvsPerYear > 0 ? 0.5 : 0; // Placeholder
      }
    } catch {
      // Rewards might not be available for all markets
    }

    // Calculate utilization
    const totalCash = Number(cash);
    const totalBorrowsNum = Number(totalBorrows);
    const utilization = totalBorrowsNum > 0 || totalCash > 0
      ? (totalBorrowsNum / (totalCash + totalBorrowsNum)) * 100
      : 0;

    // Convert total supply from vTokens to underlying
    const exchangeRateNum = Number(exchangeRate) / 1e18;
    const totalSupplyUnderlying = Number(totalSupply) * exchangeRateNum / (10 ** token.decimals);
    const totalBorrowsFormatted = Number(totalBorrows) / (10 ** token.decimals);
    const liquidityFormatted = Number(cash) / (10 ** token.decimals);

    const collateralFactor = Number(marketInfo.collateralFactorMantissa) / 1e18;

    return {
      protocol: 'venus',
      token,
      supplyAPY,
      borrowAPY,
      supplyAPR,
      borrowAPR,
      rewardAPY,
      netSupplyAPY: supplyAPY + rewardAPY,
      netBorrowAPY: borrowAPY - rewardAPY,
      totalSupply: totalSupplyUnderlying.toFixed(4),
      totalBorrow: totalBorrowsFormatted.toFixed(4),
      utilization,
      liquidity: liquidityFormatted.toFixed(4),
      collateralFactor,
      liquidationThreshold: collateralFactor, // Venus uses same for both
      timestamp: Date.now(),
    };
  }

  async getPositions(userAddress: string): Promise<Position[]> {
    const positions: Position[] = [];

    for (const [symbol, vTokenAddr] of Object.entries(VENUS.vTokens)) {
      const token = TOKENS[symbol];
      if (!token) continue;

      try {
        const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, this.provider);

        // getAccountSnapshot returns (error, vTokenBalance, borrowBalance, exchangeRate)
        const [error, vTokenBalance, borrowBalance, exchangeRate] = await vToken.getAccountSnapshot(userAddress);

        if (Number(error) !== 0) continue;

        const vTokenBalanceNum = Number(vTokenBalance);
        const borrowBalanceNum = Number(borrowBalance);
        const exchangeRateNum = Number(exchangeRate);

        // Supply position
        if (vTokenBalanceNum > 0) {
          const supplyAmount = (vTokenBalanceNum * exchangeRateNum) / (1e18 * 10 ** token.decimals);
          const rate = await this.getMarketRate(symbol, vTokenAddr, token);

          positions.push({
            protocol: 'venus',
            token,
            type: 'supply',
            amount: supplyAmount.toFixed(6),
            amountUSD: 0, // Will be calculated with price
            apy: rate?.supplyAPY || 0,
            earnedRewards: '0',
          });
        }

        // Borrow position
        if (borrowBalanceNum > 0) {
          const borrowAmount = borrowBalanceNum / (10 ** token.decimals);
          const rate = await this.getMarketRate(symbol, vTokenAddr, token);

          positions.push({
            protocol: 'venus',
            token,
            type: 'borrow',
            amount: borrowAmount.toFixed(6),
            amountUSD: 0,
            apy: rate?.borrowAPY || 0,
            earnedRewards: '0',
          });
        }
      } catch (error) {
        console.error(`Venus: Failed to get position for ${symbol}:`, (error as Error).message);
      }
    }

    return positions;
  }

  async getHealthFactor(userAddress: string): Promise<number> {
    try {
      const [error, liquidity, shortfall] = await this.comptroller.getAccountLiquidity(userAddress);
      if (Number(error) !== 0) return 0;

      const liquidityNum = Number(liquidity) / 1e18;
      const shortfallNum = Number(shortfall) / 1e18;

      if (shortfallNum > 0) return liquidityNum / shortfallNum;
      if (liquidityNum > 0) return 999; // Very healthy
      return 0;
    } catch {
      return 0;
    }
  }

  async supply(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const vTokenAddr = VENUS.vTokens[symbol];
    if (!vTokenAddr) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      // Enter market first (enable as collateral)
      const comptrollerWithSigner = this.comptroller.connect(wallet);
      await (comptrollerWithSigner as ethers.Contract)['enterMarkets']([vTokenAddr]);

      if (symbol === 'BNB') {
        // Native BNB - use mint() payable
        const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
        const tx = await vToken['mint()']({ value: amountWei });
        const receipt = await tx.wait();

        return {
          hash: receipt.hash,
          status: 'confirmed',
          action: 'supply',
          token: symbol,
          amount,
          protocol: 'venus',
          gasUsed: receipt.gasUsed.toString(),
          timestamp: Date.now(),
        };
      } else {
        // ERC20 token - approve then mint
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        const allowance = await tokenContract.allowance(wallet.address, vTokenAddr);

        if (allowance < amountWei) {
          const approveTx = await tokenContract.approve(vTokenAddr, ethers.MaxUint256);
          await approveTx.wait();
        }

        const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
        const tx = await vToken['mint(uint256)'](amountWei);
        const receipt = await tx.wait();

        return {
          hash: receipt.hash,
          status: 'confirmed',
          action: 'supply',
          token: symbol,
          amount,
          protocol: 'venus',
          gasUsed: receipt.gasUsed.toString(),
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'supply',
        token: symbol,
        amount,
        protocol: 'venus',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async withdraw(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const vTokenAddr = VENUS.vTokens[symbol];
    if (!vTokenAddr) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
      const tx = await vToken.redeemUnderlying(amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'withdraw',
        token: symbol,
        amount,
        protocol: 'venus',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'withdraw',
        token: symbol,
        amount,
        protocol: 'venus',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async borrow(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const vTokenAddr = VENUS.vTokens[symbol];
    if (!vTokenAddr) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
      const tx = await vToken.borrow(amountWei);
      const receipt = await tx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'borrow',
        token: symbol,
        amount,
        protocol: 'venus',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'borrow',
        token: symbol,
        amount,
        protocol: 'venus',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async repay(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const vTokenAddr = VENUS.vTokens[symbol];
    if (!vTokenAddr) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      if (symbol === 'BNB') {
        const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
        const tx = await vToken['repayBorrow()']({ value: amountWei });
        const receipt = await tx.wait();

        return {
          hash: receipt.hash,
          status: 'confirmed',
          action: 'repay',
          token: symbol,
          amount,
          protocol: 'venus',
          gasUsed: receipt.gasUsed.toString(),
          timestamp: Date.now(),
        };
      } else {
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        const allowance = await tokenContract.allowance(wallet.address, vTokenAddr);
        if (allowance < amountWei) {
          const approveTx = await tokenContract.approve(vTokenAddr, ethers.MaxUint256);
          await approveTx.wait();
        }

        const vToken = new ethers.Contract(vTokenAddr, VENUS_VTOKEN_ABI, wallet);
        const tx = await vToken['repayBorrow(uint256)'](amountWei);
        const receipt = await tx.wait();

        return {
          hash: receipt.hash,
          status: 'confirmed',
          action: 'repay',
          token: symbol,
          amount,
          protocol: 'venus',
          gasUsed: receipt.gasUsed.toString(),
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'repay',
        token: symbol,
        amount,
        protocol: 'venus',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async claimRewards(): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    try {
      const comptrollerWithSigner = this.comptroller.connect(wallet);
      const claimTx = await (comptrollerWithSigner as ethers.Contract)['claimVenus(address)'](wallet.address);
      const receipt = await claimTx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'claim',
        token: 'XVS',
        amount: '0', // Would need to check balance diff
        protocol: 'venus',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'claim',
        token: 'XVS',
        amount: '0',
        protocol: 'venus',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }
}
