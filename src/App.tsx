import React, { useState, useEffect } from 'react';
import { ExpenseItem, ExpenseStatus } from './types/expense';
import { INITIAL_EXPENSES } from './data/mockExpenses';
import { LineBotSimulator } from './components/LineBotSimulator';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import {
  Smartphone,
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  Salad,
  Store,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'HEALTHY_BENTO_EXPENSES_V1';

export default function App() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_EXPENSES;
  });

  const [mobileView, setMobileView] = useState<'line' | 'dashboard'>('dashboard');

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error(e);
    }
  }, [expenses]);

  // Add new expense from LINE bot
  const handleAddExpense = (newExpense: ExpenseItem) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // Update status (approve, reject, reimburse)
  const handleUpdateStatus = (id: string, newStatus: ExpenseStatus, comment?: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: newStatus,
              auditComment: comment || e.auditComment,
            }
          : e
      )
    );
  };

  // Delete expense
  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTotal = expenses
    .filter((e) => e.date === todayStr)
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Bar following 3-Zone Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
            <Salad className="w-5 h-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            懂吃健康餐盒 · LINE 記帳與核銷系統
          </span>
        </div>

        {/* Zone 2: 4–5 clean single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            onClick={() => setMobileView('dashboard')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>門市總覽</span>
          </button>
          <button
            onClick={() => setMobileView('line')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>LINE 記帳機器人</span>
            <span className="bg-[#06C755]/15 text-[#06C755] text-[10px] px-1.5 py-0.2 rounded font-semibold">
              Live
            </span>
          </button>
          <button
            onClick={() => setMobileView('dashboard')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <span>待核銷清單</span>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileView('dashboard')}
            className="hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0"
          >
            Google Sheets 試算表
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile view switcher toggle */}
          <div className="flex lg:hidden bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setMobileView('line')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors ${
                mobileView === 'line' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>LINE 手機端</span>
            </button>
            <button
              onClick={() => setMobileView('dashboard')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors ${
                mobileView === 'dashboard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>主管後台</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-semibold text-slate-800">懂吃分店：</span>
            <span className="text-emerald-700 font-bold">五甲店</span>
            <span className="text-slate-300">·</span>
            <span className="text-teal-700 font-bold">美麗島店</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: LINE Bot Phone Simulator (5 cols on lg) */}
          <div
            className={`lg:col-span-5 ${
              mobileView === 'line' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#06C755]" />
                <h3 className="font-bold text-sm text-slate-800">
                  同仁 LINE 記帳互動模擬器
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                支援拍照存證 · Gemini 3.8 Flash OCR
              </span>
            </div>

            <LineBotSimulator
              onAddExpense={handleAddExpense}
              pendingCount={pendingCount}
              todayTotal={todayTotal}
            />
          </div>

          {/* Right Column: Executive Review Center (7 cols on lg) */}
          <div
            className={`lg:col-span-7 ${
              mobileView === 'dashboard' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                <h3 className="font-bold text-sm text-slate-800">
                  主管核銷與分類報表中心
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                5 大類別自動歸檔 · Google Sheets 即時同步
              </span>
            </div>

            <ExecutiveDashboard
              expenses={expenses}
              onUpdateStatus={handleUpdateStatus}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
