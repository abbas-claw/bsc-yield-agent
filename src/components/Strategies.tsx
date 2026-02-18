'use client';

import { useState, useEffect } from 'react';
import { StrategyRecommendation } from '@/lib/engine/strategy';

interface StrategiesProps {
  address?: string;
  onExecute?: (rec: StrategyRecommendation) => void;
}

export function Strategies({ address, onExecute }: StrategiesProps) {
  const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const url = address ? `/api/strategy?address=${address}` : '/api/strategy';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 60000);
    return () => clearInterval(interval);
  }, [address]);

  const handleExecute = async (rec: StrategyRecommendation) => {
    if (!confirm(`Execute ${rec.strategy} strategy?\n\n${rec.reasoning}`)) return;

    setExecuting(rec.strategy);
    try {
      for (const action of rec.actions) {
        if (parseFloat(action.amount) === 0) {
          // Prompt user for amount
          const amount = prompt(`Enter amount for ${action.action} ${action.token} on ${action.protocol}:`);
          if (!amount) { setExecuting(null); return; }
          action.amount = amount;
        }

        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        const data = await res.json();
        if (!data.success) {
          alert(`Action failed: ${data.error}`);
          break;
        }
      }
      alert('Strategy executed successfully!');
      fetchRecommendations();
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setExecuting(null);
    }
  };

  const riskBadge = (risk: string) => {
    const styles = {
      low: 'bg-green-900/50 text-green-400 border-green-700',
      medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      high: 'bg-red-900/50 text-red-400 border-red-700',
    };
    return styles[risk as keyof typeof styles] || styles.medium;
  };

  const strategyIcon = (strategy: string) => {
    const icons: Record<string, string> = {
      'best-yield': '🎯',
      'stable-yield': '🛡️',
      'rate-arbitrage': '⚡',
      'rebalance': '🔄',
      'auto-compound': '🔁',
    };
    return icons[strategy] || '📊';
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Analyzing yield strategies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No Recommendations</h3>
          <p className="text-gray-400 text-sm">Rates are being analyzed. Check back in a moment.</p>
        </div>
      ) : (
        recommendations.map((rec, i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-all animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{strategyIcon(rec.strategy)}</span>
                <div>
                  <div className="font-semibold capitalize">{rec.strategy.replace('-', ' ')}</div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${riskBadge(rec.risk)}`}>
                    {rec.risk} risk
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-400">
                  {rec.expectedAPY.toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500">Expected APY</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">{rec.reasoning}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {rec.actions.map((action, j) => (
                  <span key={j} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                    {action.action} {action.token} on {action.protocol}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleExecute(rec)}
                disabled={!!executing}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium text-black transition-colors disabled:opacity-50"
              >
                {executing === rec.strategy ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
