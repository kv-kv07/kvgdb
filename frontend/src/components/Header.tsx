import React from 'react';
import { Wind, Zap } from 'lucide-react';
import type { TabId } from '../types';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Forecast Overview' },
  { id: 'accuracy', label: 'Accuracy Analysis' },
  { id: 'day-ahead', label: 'Day-Ahead View' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                GridBricks
              </h1>
              <p className="text-[10px] text-gray-500 -mt-0.5 tracking-widest uppercase">
                Wind Power Analytics
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'tab-active'
                    : 'tab-inactive'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Context Info */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Wind className="w-4 h-4 text-energy-wind" />
            <span>January 2026 · UK National Wind</span>
          </div>
        </div>
      </div>
    </header>
  );
}
