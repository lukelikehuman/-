import React from 'react';
import { ExpenseItem } from '../types/expense';
import { Store, FileText, CheckCircle2, QrCode } from 'lucide-react';

interface ReceiptVisualizerProps {
  expense: ExpenseItem;
  className?: string;
}

export const ReceiptVisualizer: React.FC<ReceiptVisualizerProps> = ({ expense, className = '' }) => {
  // If user provided a real base64 / image URL
  if (expense.receiptImageUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group ${className}`}>
        <img
          src={expense.receiptImageUrl}
          alt={`發票收據 - ${expense.merchantName}`}
          className="w-full h-auto max-h-[460px] object-contain mx-auto"
        />
        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs flex items-center justify-between">
          <span className="font-mono">{expense.receiptNumber || '拍照存證單據'}</span>
          <span>{expense.date}</span>
        </div>
      </div>
    );
  }

  // Realistic rendered Taiwanese Electronic Invoice / Store Receipt voucher
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-slate-800 font-sans relative overflow-hidden select-none ${className}`}
      style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 0)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Top jagged cut effect */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

      {/* Header */}
      <div className="text-center pb-4 border-b border-dashed border-slate-300">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 mb-2">
          <Store className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-base text-slate-900 tracking-tight">{expense.merchantName}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          懂吃健康餐盒【{expense.branch || '五甲店'}】採購支出憑證
        </p>
        <div className="mt-2 text-xs font-mono tracking-wider font-semibold text-slate-800 bg-slate-100 py-1 px-3 rounded inline-block">
          {expense.receiptNumber}
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-dashed border-slate-300 font-mono">
        <div>
          <span className="text-slate-400">開立日期：</span>
          <span className="font-medium text-slate-700">{expense.date}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400">核銷類別：</span>
          <span className="font-semibold text-emerald-700">{expense.category}</span>
        </div>
        <div>
          <span className="text-slate-400">經辦同仁：</span>
          <span className="text-slate-700">{expense.submitter}</span>
        </div>
        <div className="text-right">
          <span className="text-slate-400">付款方式：</span>
          <span className="text-slate-700">{expense.paymentMethod}</span>
        </div>
      </div>

      {/* Item details */}
      <div className="py-4 border-b border-dashed border-slate-300">
        <div className="text-xs text-slate-400 mb-2 font-medium">採購品項明細</div>
        <div className="bg-slate-50 rounded-lg p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
          {expense.itemDetails}
        </div>
        {expense.notes && (
          <div className="mt-2 text-[11px] text-slate-500 italic">
            備註：{expense.notes}
          </div>
        )}
      </div>

      {/* Total Amount */}
      <div className="py-4 border-b border-slate-200">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">含稅總計 (TWD)</span>
          <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            ${expense.amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stamp & Barcode Footer */}
      <div className="pt-4 flex items-center justify-between text-slate-400 text-xs">
        <div className="flex items-center gap-1.5">
          <QrCode className="w-8 h-8 text-slate-700" />
          <div className="text-[10px] leading-tight font-mono">
            <div>門市驗收合格</div>
            <div className="text-emerald-700 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> 電子存證已登錄
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block border-2 border-emerald-600/60 rounded px-2 py-0.5 text-[11px] font-bold text-emerald-700 rotate-[-4deg]">
            懂吃健康餐盒 門市財務聯
          </div>
        </div>
      </div>
    </div>
  );
};
