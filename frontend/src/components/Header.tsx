import React from 'react';
import { Zap, Activity } from 'lucide-react';
import type { TabId } from '../types';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Forecast Overview' },
  { id: 'accuracy', label: 'Accuracy Analytics' },
  { id: 'day-ahead', label: 'Day-Ahead Cockpit' },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Zap className="w-4 h-4 fill-emerald-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-100 tracking-tight">
                  GridBricks
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Trading Cockpit
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase">
                UK Day-Ahead Energy Desk
              </p>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <nav className="flex items-center p-1 bg-slate-950/80 border border-slate-800/90 rounded-xl shadow-inner gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[#0F7A3E] text-white shadow-emerald font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Context & Market Status Badge */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Jan 2026</span>
            <span className="text-slate-600">·</span>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">National Grid ESO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
