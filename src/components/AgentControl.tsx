'use client';

import { useState, useEffect } from 'react';
import { AgentStatus } from '@/lib/engine/monitor';

export function AgentControl() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/agent');
      const data = await res.json();
      if (data.success) setStatus(data.data);
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const controlAgent = async (action: string) => {
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Agent control error:', err);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status?.running ? 'bg-green-500 animate-pulse-slow' : 'bg-gray-600'}`} />
          <h3 className="font-semibold">AI Agent</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            status?.running ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'
          }`}>
            {status?.running ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex gap-2">
          {!status?.running ? (
            <button
              onClick={() => controlAgent('start')}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
            >
              Start Agent
            </button>
          ) : (
            <button
              onClick={() => controlAgent('stop')}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
            >
              Stop Agent
            </button>
          )}
          <button
            onClick={() => controlAgent('check')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Run Check
          </button>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Last Check</div>
            <div className="font-medium">
              {status.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Last Action</div>
            <div className="font-medium">
              {status.lastAction ? new Date(status.lastAction).toLocaleTimeString() : 'Never'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Health (Venus)</div>
            <div className={`font-medium ${
              status.healthFactor.venus > 2 ? 'text-green-400' :
              status.healthFactor.venus > 1.5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {status.healthFactor.venus > 100 ? '∞' : status.healthFactor.venus.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Health (Aave)</div>
            <div className={`font-medium ${
              status.healthFactor.aave > 2 ? 'text-green-400' :
              status.healthFactor.aave > 1.5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {status.healthFactor.aave > 100 ? '∞' : status.healthFactor.aave.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {status?.errors && status.errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-800">
          <div className="text-sm text-red-400 font-medium mb-1">Recent Errors</div>
          {status.errors.slice(-3).map((err, i) => (
            <div key={i} className="text-xs text-red-300/70">{err}</div>
          ))}
        </div>
      )}

      {/* Recommendations Count */}
      {status?.pendingRecommendations && status.pendingRecommendations.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-800">
          <div className="text-sm text-yellow-400">
            {status.pendingRecommendations.length} yield opportunities found
          </div>
        </div>
      )}
    </div>
  );
}
