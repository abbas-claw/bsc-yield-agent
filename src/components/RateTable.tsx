'use client';

import { useState, useEffect } from 'react';
import { ProtocolRate } from '@/lib/types';

export function RateTable() {
  const [rates, setRates] = useState<ProtocolRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'stablecoins' | 'major'>('all');
  const [sortBy, setSortBy] = useState<'supplyAPY' | 'borrowAPY' | 'utilization'>('supplyAPY');

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (data.success) {
        setRates(data.data);
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
    fetchRates();
    const interval = setInterval(fetchRates, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const filteredRates = rates.filter(r => {
    if (filter === 'stablecoins') return r.token.isStablecoin;
    if (filter === 'major') return !r.token.isStablecoin;
    return true;
  });

  const sortedRates = [...filteredRates].sort((a, b) => {
    if (sortBy === 'supplyAPY') return b.netSupplyAPY - a.netSupplyAPY;
    if (sortBy === 'borrowAPY') return a.netBorrowAPY - b.netBorrowAPY;
    return b.utilization - a.utilization;
  });

  const protocolBadge = (protocol: string) => {
    const colors = {
      venus: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
      aave: 'bg-purple-900/50 text-purple-400 border-purple-700',
    };
    return colors[protocol as keyof typeof colors] || 'bg-gray-800 text-gray-400';
  };

  if (loading && rates.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Fetching live rates from BSC...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl border border-red-800 p-6">
        <p className="text-red-400">Error: {error}</p>
        <button onClick={fetchRates} className="mt-3 px-4 py-2 bg-red-800 rounded-lg text-sm hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'stablecoins', 'major'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All Tokens' : f === 'stablecoins' ? 'Stablecoins' : 'Major Coins'}
            </button>
          ))}
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-400 hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Rate Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-4 text-gray-400 font-medium">Token</th>
                <th className="text-left p-4 text-gray-400 font-medium">Protocol</th>
                <th
                  className="text-right p-4 text-gray-400 font-medium cursor-pointer hover:text-yellow-400"
                  onClick={() => setSortBy('supplyAPY')}
                >
                  Supply APY {sortBy === 'supplyAPY' && '↓'}
                </th>
                <th
                  className="text-right p-4 text-gray-400 font-medium cursor-pointer hover:text-yellow-400"
                  onClick={() => setSortBy('borrowAPY')}
                >
                  Borrow APY {sortBy === 'borrowAPY' && '↑'}
                </th>
                <th className="text-right p-4 text-gray-400 font-medium">Rewards</th>
                <th
                  className="text-right p-4 text-gray-400 font-medium cursor-pointer hover:text-yellow-400"
                  onClick={() => setSortBy('utilization')}
                >
                  Utilization {sortBy === 'utilization' && '↓'}
                </th>
                <th className="text-right p-4 text-gray-400 font-medium">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {sortedRates.map((rate, i) => (
                <tr
                  key={`${rate.protocol}-${rate.token.symbol}`}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold">
                        {rate.token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold">{rate.token.symbol}</div>
                        <div className="text-xs text-gray-500">{rate.token.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${protocolBadge(rate.protocol)}`}>
                      {rate.protocol === 'venus' ? 'Venus' : 'Aave V3'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-green-400 font-semibold">
                      {rate.netSupplyAPY.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-red-400 font-semibold">
                      {rate.borrowAPY.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {rate.rewardAPY > 0 ? (
                      <span className="text-yellow-400">+{rate.rewardAPY.toFixed(2)}%</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate.utilization > 90 ? 'bg-red-500' :
                            rate.utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(rate.utilization, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-xs w-12 text-right">
                        {rate.utilization.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-gray-400">
                    {formatLargeNumber(parseFloat(rate.liquidity))} {rate.token.symbol}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatLargeNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}
