import React, { useState } from 'react';
import Header from './components/Header';
import OverviewDashboard from './components/OverviewDashboard';
import AccuracyDashboard from './components/AccuracyDashboard';
import DayAheadView from './components/DayAheadView';
import type { TabId } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Fixed date range for January 2026 UK day-ahead delivery
  const dateFrom = '2026-01-01';
  const dateTo = '2026-01-31';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewDashboard dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeTab === 'accuracy' && (
          <AccuracyDashboard dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeTab === 'day-ahead' && (
          <DayAheadView />
        )}
      </main>

      {/* Enterprise Cockpit Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm mt-auto py-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
            <span className="font-medium text-slate-400">GridBricks Cockpit</span>
            <span className="text-slate-600">·</span>
            <span>Energy Trading Cockpit</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>Feed: Elexon BMRS Live (FUELHH / WINDFOR)</span>
            <span className="text-slate-700">|</span>
            <span>Target: UK National Wind · Jan 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
