import { ethers } from 'ethers';
import { getProvider, getWallet, withRetry } from '../provider';
import { AAVE, TOKENS } from '../config';
import {
  AAVE_POOL_ABI,
  AAVE_DATA_PROVIDER_ABI,
  AAVE_ORACLE_ABI,
  AAVE_INCENTIVES_ABI,
  ERC20_ABI,
} from '../abis';
import { ProtocolRate, Position, Token, TransactionResult } from '../types';

const RAY = 1e27;
const SECONDS_PER_YEAR = 31536000;

export class AaveProtocol {
  private provider: ethers.JsonRpcProvider;
  private pool: ethers.Contract;
  private dataProvider: ethers.Contract;
  private oracle: ethers.Contract;
  private incentives: ethers.Contract;

  constructor() {
    this.provider = getProvider();
    this.pool = new ethers.Contract(AAVE.POOL, AAVE_POOL_ABI, this.provider);
    this.dataProvider = new ethers.Contract(AAVE.POOL_DATA_PROVIDER, AAVE_DATA_PROVIDER_ABI, this.provider);
    this.oracle = new ethers.Contract(AAVE.ORACLE, AAVE_ORACLE_ABI, this.provider);
    this.incentives = new ethers.Contract(AAVE.INCENTIVES_CONTROLLER, AAVE_INCENTIVES_ABI, this.provider);
  }

  async getRates(): Promise<ProtocolRate[]> {
    const rates: ProtocolRate[] = [];

    for (const [symbol, underlying] of Object.entries(AAVE.underlyings)) {
      const token = TOKENS[symbol];
      if (!token) continue;

      try {
        const rate = await withRetry(() => this.getMarketRate(symbol, underlying, token));
        if (rate) rates.push(rate);
      } catch (error) {
        console.error(`Aave: Failed to get rate for ${symbol}:`, (error as Error).message);
      }
    }

    return rates;
  }

  private async getMarketRate(symbol: string, underlying: string, token: Token): Promise<ProtocolRate | null> {
    const [reserveData, configData] = await Promise.all([
      this.dataProvider.getReserveData(underlying),
      this.dataProvider.getReserveConfigurationData(underlying),
    ]);

    // Aave rates are in RAY (1e27)
    const liquidityRate = Number(reserveData.liquidityRate) / RAY;
    const variableBorrowRate = Number(reserveData.variableBorrowRate) / RAY;

    // APR (simple interest)
    const supplyAPR = liquidityRate * 100;
    const borrowAPR = variableBorrowRate * 100;

    // APY (compound - Aave compounds per second)
    const supplyAPY = (Math.pow(1 + liquidityRate / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100;
    const borrowAPY = (Math.pow(1 + variableBorrowRate / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100;

    // Total supply and borrow
    const totalAToken = Number(reserveData.totalAToken) / (10 ** token.decimals);
    const totalVariableDebt = Number(reserveData.totalVariableDebt) / (10 ** token.decimals);
    const totalStableDebt = Number(reserveData.totalStableDebt) / (10 ** token.decimals);
    const totalBorrow = totalVariableDebt + totalStableDebt;
    const liquidity = totalAToken - totalBorrow;

    // Utilization
    const utilization = totalAToken > 0 ? (totalBorrow / totalAToken) * 100 : 0;

    // LTV and liquidation threshold from config
    const ltv = Number(configData.ltv) / 10000;
    const liquidationThreshold = Number(configData.liquidationThreshold) / 10000;

    return {
      protocol: 'aave',
      token,
      supplyAPY,
      borrowAPY,
      supplyAPR,
      borrowAPR,
      rewardAPY: 0, // Aave V3 on BSC may have incentives - would need to check
      netSupplyAPY: supplyAPY,
      netBorrowAPY: borrowAPY,
      totalSupply: totalAToken.toFixed(4),
      totalBorrow: totalBorrow.toFixed(4),
      utilization,
      liquidity: liquidity.toFixed(4),
      collateralFactor: ltv,
      liquidationThreshold,
      timestamp: Date.now(),
    };
  }

  async getPositions(userAddress: string): Promise<Position[]> {
    const positions: Position[] = [];

    for (const [symbol, underlying] of Object.entries(AAVE.underlyings)) {
      const token = TOKENS[symbol];
      if (!token) continue;

      try {
        const userData = await this.dataProvider.getUserReserveData(underlying, userAddress);

        const currentATokenBalance = Number(userData.currentATokenBalance) / (10 ** token.decimals);
        const currentVariableDebt = Number(userData.currentVariableDebt) / (10 ** token.decimals);

        if (currentATokenBalance > 0.0001) {
          const rate = await this.getMarketRate(symbol, underlying, token);
          positions.push({
            protocol: 'aave',
            token,
            type: 'supply',
            amount: currentATokenBalance.toFixed(6),
            amountUSD: 0,
            apy: rate?.supplyAPY || 0,
            earnedRewards: '0',
          });
        }

        if (currentVariableDebt > 0.0001) {
          const rate = await this.getMarketRate(symbol, underlying, token);
          positions.push({
            protocol: 'aave',
            token,
            type: 'borrow',
            amount: currentVariableDebt.toFixed(6),
            amountUSD: 0,
            apy: rate?.borrowAPY || 0,
            earnedRewards: '0',
          });
        }
      } catch (error) {
        console.error(`Aave: Failed to get position for ${symbol}:`, (error as Error).message);
      }
    }

    return positions;
  }

  async getHealthFactor(userAddress: string): Promise<number> {
    try {
      const accountData = await this.pool.getUserAccountData(userAddress);
      const healthFactor = Number(accountData.healthFactor) / 1e18;
      // Aave returns max uint256 if no debt
      return healthFactor > 1e10 ? 999 : healthFactor;
    } catch {
      return 0;
    }
  }

  async getAccountSummary(userAddress: string) {
    try {
      const accountData = await this.pool.getUserAccountData(userAddress);
      return {
        totalCollateralUSD: Number(accountData.totalCollateralBase) / 1e8, // Aave uses 8 decimal USD
        totalDebtUSD: Number(accountData.totalDebtBase) / 1e8,
        availableBorrowUSD: Number(accountData.availableBorrowsBase) / 1e8,
        ltv: Number(accountData.ltv) / 10000,
        liquidationThreshold: Number(accountData.currentLiquidationThreshold) / 10000,
        healthFactor: Number(accountData.healthFactor) / 1e18,
      };
    } catch {
      return null;
    }
  }

  async supply(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const underlying = AAVE.underlyings[symbol];
    if (!underlying) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      // Approve the pool to spend tokens
      const tokenContract = new ethers.Contract(underlying, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, AAVE.POOL);

      if (allowance < amountWei) {
        const approveTx = await tokenContract.approve(AAVE.POOL, ethers.MaxUint256);
        await approveTx.wait();
      }

      // Supply to Aave
      const poolWithSigner = this.pool.connect(wallet);
      const supplyTx = await (poolWithSigner as ethers.Contract)['supply'](underlying, amountWei, wallet.address, 0);
      const receipt = await supplyTx.wait();

      // Enable as collateral
      await (poolWithSigner as ethers.Contract)['setUserUseReserveAsCollateral'](underlying, true);

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'supply',
        token: symbol,
        amount,
        protocol: 'aave',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'supply',
        token: symbol,
        amount,
        protocol: 'aave',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async withdraw(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const underlying = AAVE.underlyings[symbol];
    if (!underlying) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      const poolWithSigner = this.pool.connect(wallet);
      const withdrawTx = await (poolWithSigner as ethers.Contract)['withdraw'](underlying, amountWei, wallet.address);
      const receipt = await withdrawTx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'withdraw',
        token: symbol,
        amount,
        protocol: 'aave',
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
        protocol: 'aave',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async borrow(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const underlying = AAVE.underlyings[symbol];
    if (!underlying) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      const poolWithSigner = this.pool.connect(wallet);
      // interestRateMode: 2 = variable
      const borrowTx = await (poolWithSigner as ethers.Contract)['borrow'](underlying, amountWei, 2, 0, wallet.address);
      const receipt = await borrowTx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'borrow',
        token: symbol,
        amount,
        protocol: 'aave',
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
        protocol: 'aave',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async repay(symbol: string, amount: string): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    const underlying = AAVE.underlyings[symbol];
    if (!underlying) throw new Error(`Unsupported token: ${symbol}`);

    const token = TOKENS[symbol];
    const amountWei = ethers.parseUnits(amount, token.decimals);

    try {
      const tokenContract = new ethers.Contract(underlying, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, AAVE.POOL);
      if (allowance < amountWei) {
        const approveTx = await tokenContract.approve(AAVE.POOL, ethers.MaxUint256);
        await approveTx.wait();
      }

      const poolWithSigner = this.pool.connect(wallet);
      // interestRateMode: 2 = variable
      const repayTx = await (poolWithSigner as ethers.Contract)['repay'](underlying, amountWei, 2, wallet.address);
      const receipt = await repayTx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'repay',
        token: symbol,
        amount,
        protocol: 'aave',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'repay',
        token: symbol,
        amount,
        protocol: 'aave',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async claimRewards(): Promise<TransactionResult> {
    const wallet = getWallet();
    if (!wallet) throw new Error('No wallet configured');

    try {
      // Collect all aToken and vToken addresses
      const assets: string[] = [
        ...Object.values(AAVE.aTokens),
        ...Object.values(AAVE.vTokens),
      ];

      const incentivesWithSigner = this.incentives.connect(wallet);
      const claimTx = await (incentivesWithSigner as ethers.Contract)['claimAllRewardsToSelf'](assets);
      const receipt = await claimTx.wait();

      return {
        hash: receipt.hash,
        status: 'confirmed',
        action: 'claim',
        token: 'AAVE_REWARDS',
        amount: '0',
        protocol: 'aave',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        hash: '',
        status: 'failed',
        action: 'claim',
        token: 'AAVE_REWARDS',
        amount: '0',
        protocol: 'aave',
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  async getTokenPriceUSD(symbol: string): Promise<number> {
    const underlying = AAVE.underlyings[symbol];
    if (!underlying) return 0;

    try {
      const price = await this.oracle.getAssetPrice(underlying);
      // Aave oracle returns price in USD with 8 decimals
      return Number(price) / 1e8;
    } catch {
      return 0;
    }
  }
}
