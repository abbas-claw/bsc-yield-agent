'use client';

import { useState } from 'react';
import { RateTable } from '@/components/RateTable';
import { Portfolio } from '@/components/Portfolio';
import { Strategies } from '@/components/Strategies';
import { AgentControl } from '@/components/AgentControl';
import { ActionLog } from '@/components/ActionLog';

type Tab = 'rates' | 'portfolio' | 'strategies' | 'agent';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('rates');
  const [address, setAddress] = useState('');

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-gray-800 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-600 flex items-center justify-center">
                <span className="text-black font-bold">ϴ</span>
              </div>
              <div>
                <h1 className="font-bold text-lg">BSC Yield Agent</h1>
                <p className="text-xs text-gray-500">Autonomous DeFi Yield Optimizer</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Enter wallet address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:border-yellow-600"
              />
              <a
                href="https://github.com/yourusername/bsc-yield-agent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {(['rates', 'portfolio', 'strategies', 'agent'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-yellow-600 text-yellow-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'rates' && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Live Rates</h2>
                  <p className="text-gray-400">Real-time APY rates from Venus Protocol and Aave V3 on BSC</p>
                </div>
                <RateTable />
              </>
            )}
            {activeTab === 'portfolio' && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Your Portfolio</h2>
                  <p className="text-gray-400">Track your positions across all protocols</p>
                </div>
                <Portfolio address={address} />
              </>
            )}
            {activeTab === 'strategies' && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Yield Strategies</h2>
                  <p className="text-gray-400">AI-generated recommendations based on current market conditions</p>
                </div>
                <Strategies address={address} />
              </>
            )}
            {activeTab === 'agent' && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Autonomous Agent</h2>
                  <p className="text-gray-400">Monitor and control your AI yield agent</p>
                </div>
                <AgentControl />
              </>
            )}
          </div>

          <div className="space-y-6">
            <ActionLog />

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <a
                  href="https://app.venus.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium">Venus Protocol →</div>
                  <div className="text-xs text-gray-500">Largest BSC lending protocol</div>
                </a>
                <a
                  href="https://app.aave.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium">Aave V3 →</div>
                  <div className="text-xs text-gray-500">Multi-chain lending protocol</div>
                </a>
                <a
                  href="https://bscscan.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium">BSC Explorer →</div>
                  <div className="text-xs text-gray-500">View transactions on-chain</div>
                </a>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-semibold mb-4">Supported Tokens</h3>
              <div className="flex flex-wrap gap-2">
                {['BNB', 'ETH', 'BTCB', 'USDT', 'USDC', 'FDUSD'].map((token) => (
                  <span key={token} className="px-2 py-1 bg-gray-800 rounded text-xs">
                    {token}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
