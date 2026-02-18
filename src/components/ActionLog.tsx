'use client';

import { useState, useEffect } from 'react';
import { TransactionResult } from '@/lib/types';

export function ActionLog() {
  const [logs, setLogs] = useState<TransactionResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/execute');
      const data = await res.json();
      if (data.success && data.data) {
        // Flatten action logs into transaction results
        const allLogs: TransactionResult[] = [];
        data.data.forEach((action: { results: TransactionResult[] }) => {
          allLogs.push(...action.results);
        });
        setLogs(allLogs.reverse().slice(0, 20)); // Last 20 transactions
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && logs.length === 0) return null;
  if (logs.length === 0) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓';
      case 'pending': return '⏳';
      case 'failed': return '✗';
      default: return '?';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold">Transaction History</h3>
        <button onClick={fetchLogs} className="text-xs text-gray-500 hover:text-gray-300">Refresh</button>
      </div>
      <div className="divide-y divide-gray-800/50 max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="p-4 hover:bg-gray-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs ${statusColor(log.status)}`}>
                  {statusIcon(log.status)}
                </span>
                <div>
                  <div className="font-medium">
                    {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {log.token}
                  </div>
                  <div className="text-xs text-gray-500">
                    {log.protocol === 'venus' ? 'Venus' : 'Aave V3'} • {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{parseFloat(log.amount || '0') > 0 ? log.amount : ''} {log.token}</div>
                {log.hash && (
                  <a
                    href={`https://bscscan.com/tx/${log.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-yellow-500 hover:text-yellow-400"
                  >
                    View →
                  </a>
                )}
              </div>
            </div>
            {log.error && (
              <div className="mt-2 text-xs text-red-400">{log.error}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
