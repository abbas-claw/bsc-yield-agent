import { StrategyEngine, StrategyRecommendation } from './strategy';
import { Executor } from './executor';
import { DEFAULT_STRATEGY_CONFIG } from '../config';
import { getWallet } from '../provider';

export interface AgentStatus {
  running: boolean;
  lastCheck: number | null;
  lastAction: number | null;
  healthFactor: { venus: number; aave: number };
  totalValueUSD: number;
  activeStrategies: string[];
  pendingRecommendations: StrategyRecommendation[];
  errors: string[];
}

// Singleton agent state
let agentState: AgentStatus = {
  running: false,
  lastCheck: null,
  lastAction: null,
  healthFactor: { venus: 999, aave: 999 },
  totalValueUSD: 0,
  activeStrategies: ['best-yield', 'stable-yield'],
  pendingRecommendations: [],
  errors: [],
};

let intervalId: NodeJS.Timeout | null = null;

export class AgentMonitor {
  private engine: StrategyEngine;
  private executor: Executor;
  private autoExecute: boolean;

  constructor(autoExecute = false) {
    this.engine = new StrategyEngine();
    this.executor = new Executor();
    this.autoExecute = autoExecute;
  }

  getStatus(): AgentStatus {
    return { ...agentState };
  }

  async runCheck(): Promise<AgentStatus> {
    const wallet = getWallet();
    if (!wallet) {
      agentState.errors.push('No wallet configured');
      return agentState;
    }

    try {
      // Get portfolio
      const portfolio = await this.engine.getPortfolio(wallet.address);
      agentState.totalValueUSD = portfolio.netWorthUSD;

      // Get health factors
      const { VenusProtocol } = await import('../protocols/venus');
      const { AaveProtocol } = await import('../protocols/aave');
      const venus = new VenusProtocol();
      const aave = new AaveProtocol();

      agentState.healthFactor.venus = await venus.getHealthFactor(wallet.address);
      agentState.healthFactor.aave = await aave.getHealthFactor(wallet.address);

      // Check for emergency
      const minHF = Math.min(agentState.healthFactor.venus, agentState.healthFactor.aave);
      if (minHF > 0 && minHF < DEFAULT_STRATEGY_CONFIG.emergencyWithdrawThreshold) {
        agentState.errors.push(`EMERGENCY: Health factor critically low (${minHF.toFixed(2)})`);
        // Auto-repay logic would go here
      }

      // Get recommendations
      const recommendations = await this.engine.generateRecommendations(wallet.address);
      agentState.pendingRecommendations = recommendations;

      // Auto-execute if enabled and recommendations exist
      if (this.autoExecute && recommendations.length > 0) {
        const topRec = recommendations[0];
        if (topRec.risk !== 'high') { // Don't auto-execute high risk
          const validActions = topRec.actions.filter(a => parseFloat(a.amount) > 0);
          if (validActions.length > 0) {
            await this.executor.executeBatch(validActions, topRec.strategy, topRec.reasoning);
            agentState.lastAction = Date.now();
          }
        }
      }

      agentState.lastCheck = Date.now();
      agentState.errors = agentState.errors.slice(-10); // Keep last 10 errors
    } catch (error) {
      agentState.errors.push((error as Error).message);
    }

    return agentState;
  }

  start(intervalMs?: number): void {
    if (agentState.running) return;

    const interval = intervalMs || DEFAULT_STRATEGY_CONFIG.intervalMs;
    agentState.running = true;

    // Initial check
    this.runCheck().catch(console.error);

    // Periodic checks
    intervalId = setInterval(() => {
      this.runCheck().catch(console.error);
    }, interval);

    console.log(`Agent monitor started. Checking every ${interval / 1000}s`);
  }

  stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    agentState.running = false;
    console.log('Agent monitor stopped');
  }
}
