'use client';

import { useState, useEffect } from 'react';
import { PortfolioSummary } from '@/lib/types';

interface PortfolioProps {
  address?: string;
}

export function Portfolio({ address }: PortfolioProps) {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/positions?address=${address}`);
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) fetchPortfolio();
  }, [address]);

  if (!address) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
        <p className="text-gray-400 text-sm">Enter your BSC wallet address or configure a private key to view your portfolio</p>
      </div>
    );
  }

  if (loading && !portfolio) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading portfolio...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl border border-red-800 p-6">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!portfolio) return null;

  const healthColor = portfolio.healthFactor > 2 ? 'text-green-400' :
    portfolio.healthFactor > 1.5 ? 'text-yellow-400' : 'text-red-400';

  const healthBg = portfolio.healthFactor > 2 ? 'glow-success' :
    portfolio.healthFactor > 1.5 ? '' : 'glow-danger';

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="text-gray-400 text-sm mb-1">Net Worth</div>
          <div className="text-2xl font-bold">${portfolio.netWorthUSD.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="text-gray-400 text-sm mb-1">Total Supplied</div>
          <div className="text-2xl font-bold text-green-400">${portfolio.totalSuppliedUSD.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">APY: {portfolio.weightedSupplyAPY.toFixed(2)}%</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="text-gray-400 text-sm mb-1">Total Borrowed</div>
          <div className="text-2xl font-bold text-red-400">${portfolio.totalBorrowedUSD.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">APY: {portfolio.weightedBorrowAPY.toFixed(2)}%</div>
        </div>
        <div className={`bg-gray-900 rounded-xl border border-gray-800 p-5 ${healthBg}`}>
          <div className="text-gray-400 text-sm mb-1">Health Factor</div>
          <div className={`text-2xl font-bold ${healthColor}`}>
            {portfolio.healthFactor > 100 ? '∞' : portfolio.healthFactor.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Net APY: {portfolio.netAPY.toFixed(2)}%</div>
        </div>
      </div>

      {/* Positions */}
      {portfolio.positions.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold">Active Positions</h3>
          </div>
          <div className="divide-y divide-gray-800/50">
            {portfolio.positions.map((pos, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-800/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    pos.type === 'supply' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {pos.type === 'supply' ? '↑' : '↓'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {pos.type === 'supply' ? 'Supplied' : 'Borrowed'} {pos.token.symbol}
                    </div>
                    <div className="text-xs text-gray-500">
                      on {pos.protocol === 'venus' ? 'Venus' : 'Aave V3'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{parseFloat(pos.amount).toFixed(4)} {pos.token.symbol}</div>
                  <div className={`text-xs ${pos.type === 'supply' ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.apy.toFixed(2)}% APY
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
