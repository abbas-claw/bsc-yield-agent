import { TransactionRequest, TransactionResult, AgentAction } from '../types';
import { VenusProtocol } from '../protocols/venus';
import { AaveProtocol } from '../protocols/aave';
import { DEFAULT_STRATEGY_CONFIG } from '../config';
import { getProvider, getWallet } from '../provider';
import { ethers } from 'ethers';

// In-memory action log (persisted to localStorage in browser)
let actionLog: AgentAction[] = [];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export class Executor {
  private venus: VenusProtocol;
  private aave: AaveProtocol;

  constructor() {
    this.venus = new VenusProtocol();
    this.aave = new AaveProtocol();
  }

  async executeAction(request: TransactionRequest): Promise<TransactionResult> {
    // Check gas price before executing
    const provider = getProvider();
    const feeData = await provider.getFeeData();
    const gasPriceGwei = Number(feeData.gasPrice || 0) / 1e9;

    if (gasPriceGwei > parseFloat(DEFAULT_STRATEGY_CONFIG.maxGasPrice)) {
      return {
        hash: '',
        status: 'failed',
        action: request.action,
        token: request.token,
        amount: request.amount,
        protocol: request.protocol,
        timestamp: Date.now(),
        error: `Gas price too high: ${gasPriceGwei.toFixed(2)} gwei (max: ${DEFAULT_STRATEGY_CONFIG.maxGasPrice})`,
      };
    }

    // Route to correct protocol
    switch (request.protocol) {
      case 'venus':
        return this.executeVenus(request);
      case 'aave':
        return this.executeAave(request);
      default:
        return {
          hash: '',
          status: 'failed',
          action: request.action,
          token: request.token,
          amount: request.amount,
          protocol: request.protocol,
          timestamp: Date.now(),
          error: `Unknown protocol: ${request.protocol}`,
        };
    }
  }

  private async executeVenus(request: TransactionRequest): Promise<TransactionResult> {
    switch (request.action) {
      case 'supply':
        return this.venus.supply(request.token, request.amount);
      case 'withdraw':
        return this.venus.withdraw(request.token, request.amount);
      case 'borrow':
        return this.venus.borrow(request.token, request.amount);
      case 'repay':
        return this.venus.repay(request.token, request.amount);
      case 'claim':
        return this.venus.claimRewards();
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  private async executeAave(request: TransactionRequest): Promise<TransactionResult> {
    switch (request.action) {
      case 'supply':
        return this.aave.supply(request.token, request.amount);
      case 'withdraw':
        return this.aave.withdraw(request.token, request.amount);
      case 'borrow':
        return this.aave.borrow(request.token, request.amount);
      case 'repay':
        return this.aave.repay(request.token, request.amount);
      case 'claim':
        return this.aave.claimRewards();
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  // Execute a batch of actions (strategy execution)
  async executeBatch(
    actions: TransactionRequest[],
    strategyName: string,
    reasoning: string
  ): Promise<AgentAction> {
    const agentAction: AgentAction = {
      id: generateId(),
      timestamp: Date.now(),
      strategy: strategyName,
      actions,
      results: [],
      reasoning,
    };

    for (const action of actions) {
      try {
        const result = await this.executeAction(action);
        agentAction.results.push(result);

        // If a step fails, stop the batch
        if (result.status === 'failed') {
          console.error(`Batch step failed: ${result.error}`);
          break;
        }

        // Small delay between transactions
        await new Promise(r => setTimeout(r, 2000));
      } catch (error) {
        agentAction.results.push({
          hash: '',
          status: 'failed',
          action: action.action,
          token: action.token,
          amount: action.amount,
          protocol: action.protocol,
          timestamp: Date.now(),
          error: (error as Error).message,
        });
        break;
      }
    }

    actionLog.push(agentAction);
    return agentAction;
  }

  getActionLog(): AgentAction[] {
    return actionLog;
  }

  clearActionLog(): void {
    actionLog = [];
  }
}
