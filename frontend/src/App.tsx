import React, { useState } from 'react';
import Header from './components/Header';
import OverviewDashboard from './components/OverviewDashboard';
import AccuracyDashboard from './components/AccuracyDashboard';
import DayAheadView from './components/DayAheadView';
import type { TabId } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Fixed date range for January 2026
  const dateFrom = '2026-01-01';
  const dateTo = '2026-01-31';

  return (
    <div className="min-h-screen bg-gray-950">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="max-w-[1600px] mx-auto px-6 py-6">
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

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-12 py-6">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between text-xs text-gray-600">
          <span>GridBricks © 2026 · Wind Power Forecast Accuracy Dashboard</span>
          <span>Data: Elexon BMRS · January 2026</span>
        </div>
      </footer>
    </div>
  );
}
