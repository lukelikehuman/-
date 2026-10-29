import React, { useState, useMemo, useEffect } from 'react';
import {
  ExpenseItem,
  ExpenseCategory,
  ExpenseStatus,
  DONG_CHI_CATEGORIES,
} from '../types/expense';
import { CATEGORY_COLORS } from '../data/mockExpenses';
import { ReceiptVisualizer } from './ReceiptVisualizer';
import {
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  Key,
  Settings,
  ShieldCheck,
  FileCode,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExecutiveDashboardProps {
  expenses: ExpenseItem[];
  onUpdateStatus: (id: string, newStatus: ExpenseStatus, comment?: string) => void;
  onDeleteExpense?: (id: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  expenses,
  onUpdateStatus,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingExpense, setInspectingExpense] = useState<ExpenseItem | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<'audit' | 'analytics' | 'sheets' | 'lineSetup'>('audit');
  const [copiedSheets, setCopiedSheets] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [envStatus, setEnvStatus] = useState<{
    hasLineToken: boolean;
    hasLineSecret: boolean;
    hasGeminiKey: boolean;
    loading: boolean;
  }>({
    hasLineToken: false,
    hasLineSecret: false,
    hasGeminiKey: false,
    loading: true,
  });

  const [botActivity, setBotActivity] = useState<{
    lastReceivedAt: string | null;
    eventCount: number;
    lastEventType: string | null;
    lastText: string | null;
    lastReplyStatus: string | null;
    botInfo?: { name: string; basicId: string };
  } | null>(null);

  const fetchEnvStatus = async () => {
    setEnvStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setEnvStatus({
          hasLineToken: !!data.hasLineToken,
          hasLineSecret: !!data.hasLineSecret,
          hasGeminiKey: !!data.hasGeminiKey,
          loading: false,
        });
      } else {
        setEnvStatus((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setEnvStatus((prev) => ({ ...prev, loading: false }));
    }

    try {
      const actRes = await fetch('/api/line-webhook/activity');
      if (actRes.ok) {
        const actData = await actRes.json();
        setBotActivity({
          ...actData.activity,
          botInfo: actData.botInfo,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchEnvStatus();
  }, [activeTab]);

  const [copiedPublicWebhook, setCopiedPublicWebhook] = useState(false);

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/line-webhook` : '/api/line-webhook';
  const publicWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/api/line-webhook`
    : 'https://ais-pre-vj7midritvgvsp4lm5x6oz-591358928533.asia-east1.run.app/api/line-webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleCopyPublicWebhook = () => {
    navigator.clipboard.writeText(publicWebhookUrl);
    setCopiedPublicWebhook(true);
    setTimeout(() => setCopiedPublicWebhook(false), 2500);
  };

  const handleTestWebhook = async () => {
    setWebhookTesting(true);
    setWebhookTestStatus(null);
    try {
      const res = await fetch('/api/line-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [] }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setWebhookTestStatus({
          success: true,
          message: 'Webhook 連線成功！伺服器已正常回傳 200 OK，LINE 後台按 Verify 測試即可通過。',
        });
      } else {
        setWebhookTestStatus({
          success: false,
          message: '伺服器未回傳 200 OK，請確認後端運行狀態。',
        });
      }
    } catch (err: any) {
      setWebhookTestStatus({
        success: false,
        message: `連線失敗: ${err.message || '無法連線至 Webhook 端點'}`,
      });
    } finally {
      setWebhookTesting(false);
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingList = expenses.filter((e) => e.status === 'pending');
    const pendingTotal = pendingList.reduce((acc, curr) => acc + curr.amount, 0);
    const approvedTotal = expenses
      .filter((e) => e.status === 'approved' || e.status === 'reimbursed')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const reimbursedTotal = expenses
      .filter((e) => e.status === 'reimbursed')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Group by category (all 11 company/expense items)
    const categoryTotals: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
    DONG_CHI_CATEGORIES.forEach((cat) => {
      categoryTotals[cat] = 0;
    });

    // Group by branch
    const branchTotals: Record<string, number> = {
      五甲店: 0,
      美麗島店: 0,
    };

    expenses.forEach((e) => {
      if (categoryTotals[e.category] !== undefined) {
        categoryTotals[e.category] += e.amount;
      }
      const br = e.branch || '五甲店';
      if (branchTotals[br] !== undefined) {
        branchTotals[br] += e.amount;
      }
    });

    return {
      total,
      pendingCount: pendingList.length,
      pendingTotal,
      approvedTotal,
      reimbursedTotal,
      categoryTotals,
      branchTotals,
    };
  }, [expenses]);

  // Filtered expense list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchBranch = selectedBranch === 'all' || (e.branch || '五甲店') === selectedBranch;
      const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || e.status === selectedStatus;
      const matchSearch =
        searchQuery === '' ||
        e.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.itemDetails.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.branch && e.branch.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.submitter.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchCat && matchStatus && matchSearch;
    });
  }, [expenses, selectedBranch, selectedCategory, selectedStatus, searchQuery]);

  // Handle Approve
  const handleApprove = (id: string) => {
    onUpdateStatus(id, 'approved', '主管已核准通過');
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.6 },
    });
  };

  // Handle Reject Submit
  const handleConfirmReject = () => {
    if (!rejectingId) return;
    onUpdateStatus(rejectingId, 'rejected', rejectReason || '單據模糊或品項與門市營業不符，請補件重提');
    setRejectingId(null);
    setRejectReason('');
  };

  // Handle Mark Reimbursed
  const handleMarkReimbursed = (id: string) => {
    onUpdateStatus(id, 'reimbursed', '零用金/公款已完成撥付');
  };

  // Export to CSV formatted for Google Sheets
  const handleExportCSV = () => {
    const headers = [
      '憑證單號',
      '門市分店',
      '開立日期',
      '開立廠商/統編',
      '支出分類',
      '含稅金額(TWD)',
      '品項內容明細',
      '經辦同仁',
      '付款方式',
      '核銷狀態',
      '核銷備註與存證',
    ];

    const rows = expenses.map((e) => [
      `"${e.receiptNumber}"`,
      `"${e.branch || '五甲店'}"`,
      `"${e.date}"`,
      `"${e.merchantName}"`,
      `"${e.category}"`,
      e.amount,
      `"${e.itemDetails.replace(/"/g, '""')}"`,
      `"${e.submitter}"`,
      `"${e.paymentMethod}"`,
      `"${e.status === 'pending' ? '待核銷' : e.status === 'approved' ? '已核准' : e.status === 'reimbursed' ? '已撥款' : '已退回'}"`,
      `"${(e.notes || '') + (e.auditComment ? ' | ' + e.auditComment : '')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `懂吃健康餐盒_門市支出核銷表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy TSV for direct copy-paste into Google Sheets
  const handleCopyForSheets = () => {
    const headers = [
      '憑證單號',
      '門市分店',
      '開立日期',
      '開立廠商',
      '支出分類',
      '金額',
      '品項明細',
      '經辦同仁',
      '付款方式',
      '核銷狀態',
    ];
    const rows = expenses.map((e) => [
      e.receiptNumber,
      e.branch || '五甲店',
      e.date,
      e.merchantName,
      e.category,
      e.amount,
      e.itemDetails,
      e.submitter,
      e.paymentMethod,
      e.status === 'pending' ? '待核銷' : e.status === 'approved' ? '已核准' : e.status === 'reimbursed' ? '已撥款' : '已退回',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedSheets(true);
    setTimeout(() => setCopiedSheets(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              懂吃健康餐盒 · 主管核銷與財務分析中心
            </h2>
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              即時連線
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            五甲店 / 美麗島店：拍照憑證審查、11 項食材廠商成本分析、Google Sheets 即時匯出
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 text-xs font-medium">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            單據審核隊列 ({stats.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            分類成本圖表
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'sheets'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Sheets 試算表
          </button>
          <button
            onClick={() => setActiveTab('lineSetup')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'lineSetup'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            LINE Bot 串接手冊
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-slate-200 bg-white shrink-0">
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-xs font-medium text-slate-500">本月門市總支出</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            NT$ {stats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>累計 {expenses.length} 筆門市記帳單</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
          <div className="text-xs font-medium text-amber-800">等待主管審核</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-900 mt-1">
            NT$ {stats.pendingTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-semibold">
            {stats.pendingCount} 筆待核銷憑證
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
          <div className="text-xs font-medium text-emerald-800">核准報銷金額</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900 mt-1">
            NT$ {stats.approvedTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            佔總支出 {stats.total ? Math.round((stats.approvedTotal / stats.total) * 100) : 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40">
          <div className="text-xs font-medium text-sky-800">已撥款出納完畢</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-sky-900 mt-1">
            NT$ {stats.reimbursedTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-sky-700 mt-1">
            零用金 / 公司轉帳完成
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: Audit Queue */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="搜尋廠商、品項明細、發票號碼或經辦人..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Branch Filter */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="text-xs bg-emerald-50 border border-emerald-300 font-semibold text-emerald-900 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">全部分店 ({expenses.length})</option>
                  <option value="五甲店">五甲店 ({expenses.filter((e) => (e.branch || '五甲店') === '五甲店').length})</option>
                  <option value="美麗島店">美麗島店 ({expenses.filter((e) => e.branch === '美麗島店').length})</option>
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer font-medium"
                >
                  <option value="all">所有類別 (全部 11 項)</option>
                  {DONG_CHI_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">所有核銷狀態</option>
                  <option value="pending">待審核 ({stats.pendingCount})</option>
                  <option value="approved">已核准</option>
                  <option value="reimbursed">已撥款</option>
                  <option value="rejected">已退回</option>
                </select>
              </div>
            </div>

            {/* Expenses Audit Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-3 px-4">門市分店 / 單號</th>
                      <th className="py-3 px-4">開立廠商與明細</th>
                      <th className="py-3 px-4">支出分類</th>
                      <th className="py-3 px-4 text-right">金額 (TWD)</th>
                      <th className="py-3 px-4">經辦同仁 / 付款</th>
                      <th className="py-3 px-4 text-center">核銷狀態</th>
                      <th className="py-3 px-4 text-right">主管核銷操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          沒有符合條件的支出紀錄。
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((expense) => {
                        const catStyle = CATEGORY_COLORS[expense.category] || {
                          bg: 'bg-slate-50 text-slate-700 border-slate-200',
                        };

                        return (
                          <tr
                            key={expense.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              expense.status === 'pending' ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {expense.branch || '五甲店'}
                                </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {expense.receiptNumber}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {expense.date}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-slate-900 truncate">
                                {expense.merchantName}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {expense.itemDetails}
                              </div>
                              {expense.auditComment && (
                                <div className="text-[10px] text-slate-400 mt-0.5 italic">
                                  批註: {expense.auditComment}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${catStyle.bg}`}
                              >
                                {expense.category}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm tabular-nums text-slate-900">
                              ${expense.amount.toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="text-slate-800 font-medium">{expense.submitter}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {expense.paymentMethod}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {expense.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  <Clock className="w-3 h-3" /> 待核銷
                                </span>
                              )}
                              {expense.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> 已核准
                                </span>
                              )}
                              {expense.status === 'reimbursed' && (
                                <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  <DollarSign className="w-3 h-3" /> 已撥款
                                </span>
                              )}
                              {expense.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                  <XCircle className="w-3 h-3" /> 退回補件
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setInspectingExpense(expense)}
                                  title="審查原單憑證"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {expense.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(expense.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-xs flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> 核准
                                    </button>
                                    <button
                                      onClick={() => setRejectingId(expense.id)}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium transition-colors"
                                    >
                                      退回
                                    </button>
                                  </>
                                )}

                                {expense.status === 'approved' && (
                                  <button
                                    onClick={() => handleMarkReimbursed(expense.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-medium transition-colors"
                                  >
                                    標記撥款
                                  </button>
                                )}

                                {expense.status === 'rejected' && (
                                  <button
                                    onClick={() => onUpdateStatus(expense.id, 'pending')}
                                    className="px-2 py-1 rounded text-[11px] text-slate-500 hover:text-slate-800 border border-slate-200"
                                  >
                                    重新審查
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Category Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Branch Comparison Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-bold text-sm text-slate-900">懂吃 五甲店 支出總計</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    佔比 {stats.total > 0 ? Math.round((stats.branchTotals['五甲店'] / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                  NT$ {stats.branchTotals['五甲店'].toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  累計 {expenses.filter((e) => (e.branch || '五甲店') === '五甲店').length} 筆門市單據
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    <span className="font-bold text-sm text-slate-900">懂吃 美麗島店 支出總計</span>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    佔比 {stats.total > 0 ? Math.round((stats.branchTotals['美麗島店'] / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
                  NT$ {stats.branchTotals['美麗島店'].toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  累計 {expenses.filter((e) => e.branch === '美麗島店').length} 筆門市單據
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Breakdown Table & Bar */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    懂吃健康餐盒 11 項公司與科目支出分佈
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Google Sheets 對照版
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  即時統計各項生鮮肉品、主食米行、食材通路與包材耗材支出佔比
                </p>

                <div className="space-y-3 pt-2">
                  {DONG_CHI_CATEGORIES.map((cat) => {
                    const amount = stats.categoryTotals[cat] || 0;
                    const percent = stats.total > 0 ? Math.round((amount / stats.total) * 100) : 0;
                    const catTheme = CATEGORY_COLORS[cat] || {
                      accent: '#10B981',
                      bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                      text: 'text-emerald-800',
                    };

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: catTheme.accent }}
                            />
                            {cat}
                          </span>
                          <span className="font-mono tabular-nums text-slate-900">
                            NT$ {amount.toLocaleString()}{' '}
                            <span className="text-slate-400 font-normal">({percent}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: catTheme.accent,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Healthy Bento Cost Analysis Insights */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">門市經營財務洞察</h3>
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                    AI 採購分析
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-600">
                  <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="font-bold text-emerald-900 mb-1">三大生鮮蛋白質 (雞肉/鮭魚/牛肉/蛋品)</div>
                    <div>
                      五甲店與美麗島店本期雞肉 (NT$ {(stats.categoryTotals['雞肉'] || 0).toLocaleString()})、牛肉 (NT$ {(stats.categoryTotals['牛肉'] || 0).toLocaleString()})、鮭魚 (NT$ {(stats.categoryTotals['鮭魚'] || 0).toLocaleString()}) 與蛋品 (NT$ {(stats.categoryTotals['蛋品'] || 0).toLocaleString()}) 為健康餐核心主料，佔比符合門市健康餐 30%~35% 毛利水位。
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-100">
                    <div className="font-bold text-sky-900 mb-1">特約通路商 (美食家 / 德品 / 988廚房)</div>
                    <div>
                      美食家通路累計 NT$ {(stats.categoryTotals['美食家食材通路有限公司'] || 0).toLocaleString()} (調味料、冷壓初榨油品)，德品包裝累計 NT$ {(stats.categoryTotals['德品'] || 0).toLocaleString()} (植纖環保雙格盒)，988廚房累計 NT$ {(stats.categoryTotals['988廚房'] || 0).toLocaleString()}。兩店聯合月結對帳可獲取大量採購折扣。
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                    <div className="font-bold text-amber-900 mb-1">主食米行與產地蔬果行 (米行 / 蔬果行)</div>
                    <div>
                      米行進貨累計 NT$ {(stats.categoryTotals['米行'] || 0).toLocaleString()} (富麗黑米、台南11號白米與優質十穀米)，蔬果行進貨累計 NT$ {(stats.categoryTotals['蔬果行'] || 0).toLocaleString()}。建議配合季節產量進行每日動態叫貨。
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-800 mb-1">門市雜項與公用設施 (雜項)</div>
                    <div>
                      雜項支出累計 NT$ {(stats.categoryTotals['雜項'] || 0).toLocaleString()}，包含五甲店與美麗島店商用電力、低溫冰櫃與營業用水雜支，水電費用均在預期常態營運預算內。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Google Sheets Integration */}
        {activeTab === 'sheets' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Google Sheets 雲端試算表即時連動
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  每當同仁在 LINE 拍照記帳且主管核銷完成，資料將依據標準欄位格式即時歸檔
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyForSheets}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {copiedSheets ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      已複製表格格式
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      複製為試算表資料
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  匯出 Google 試算表 (.CSV)
                </button>
              </div>
            </div>

            {/* Simulated Live Google Sheet Grid */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs font-mono text-xs">
              <div className="bg-emerald-800 text-white px-4 py-2 flex items-center justify-between text-[11px] font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span>懂吃健康餐盒_全分店營運支出總表_2026.xlsx (線上預覽)</span>
                </div>
                <span className="opacity-80">唯讀檢視模式 · 自動儲存</span>
              </div>

              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-200 text-center w-10">#</th>
                      <th className="p-2 border-r border-slate-200">A: 憑證號碼</th>
                      <th className="p-2 border-r border-slate-200">B: 門市分店</th>
                      <th className="p-2 border-r border-slate-200">C: 交易日期</th>
                      <th className="p-2 border-r border-slate-200">D: 開立廠商</th>
                      <th className="p-2 border-r border-slate-200">E: 支出分類</th>
                      <th className="p-2 border-r border-slate-200 text-right">F: 金額(NT$)</th>
                      <th className="p-2 border-r border-slate-200">G: 品項明細說明</th>
                      <th className="p-2 border-r border-slate-200">H: 經辦同仁</th>
                      <th className="p-2 border-r border-slate-200">I: 付款方式</th>
                      <th className="p-2">J: 核銷狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e, idx) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-emerald-50/30">
                        <td className="p-2 border-r border-slate-200 text-center text-slate-400 bg-slate-50">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-800 font-semibold">
                          {e.receiptNumber}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-emerald-800 font-sans font-bold">
                          {e.branch || '五甲店'}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600">{e.date}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-800 font-sans font-medium">
                          {e.merchantName}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-sans">{e.category}</td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold tabular-nums text-slate-900">
                          {e.amount.toLocaleString()}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600 font-sans max-w-xs truncate">
                          {e.itemDetails}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-sans">
                          {e.submitter}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-slate-600 font-sans">
                          {e.paymentMethod}
                        </td>
                        <td className="p-2 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              e.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : e.status === 'reimbursed'
                                ? 'bg-sky-100 text-sky-800'
                                : e.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {e.status === 'approved'
                              ? '已核准'
                              : e.status === 'reimbursed'
                              ? '已撥款'
                              : e.status === 'pending'
                              ? '待核銷'
                              : '已退回'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Real LINE Bot & Google Sheets Setup Guide */}
        {activeTab === 'lineSetup' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 text-xs text-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#06C755]" />
                <h3 className="font-bold text-base text-slate-900">
                  LINE 官方帳號 (LINE Bot) 與 Google Sheets 串接指南
                </h3>
              </div>
              <p className="text-slate-500 mt-1">
                除了左側的手機模擬器，您只需將本系統的 Webhook 填入 LINE Developers，門市同仁即可用真實手機加入 LINE 官方帳號拍照記帳！
              </p>
            </div>

            {/* Environment Variables Location & Status Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">系統環境變數設定位置 (Environment Variables)</h4>
                    <p className="text-slate-500 text-[11px]">查看與配置系統所需的 LINE Messaging API 金鑰</p>
                  </div>
                </div>
                <button
                  onClick={fetchEnvStatus}
                  className="self-start sm:self-auto px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <RefreshCw className={`w-3 h-3 ${envStatus.loading ? 'animate-spin text-emerald-600' : ''}`} />
                  重新整理狀態
                </button>
              </div>

              {/* Status pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">GEMINI_API_KEY</div>
                    <div className="text-xs font-semibold text-slate-800">Gemini OCR 引擎</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    envStatus.hasGeminiKey
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {envStatus.hasGeminiKey ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                    {envStatus.hasGeminiKey ? '已就緒' : '未偵測'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">LINE_CHANNEL_ACCESS_TOKEN</div>
                    <div className="text-xs font-semibold text-slate-800">LINE 長期權杖</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    envStatus.hasLineToken
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {envStatus.hasLineToken ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                    {envStatus.hasLineToken ? '已配置啟用' : '尚未填寫'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-mono">LINE_CHANNEL_SECRET</div>
                    <div className="text-xs font-semibold text-slate-800">Channel 密鑰</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    envStatus.hasLineSecret
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {envStatus.hasLineSecret ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                    {envStatus.hasLineSecret ? '已配置' : '選填'}
                  </span>
                </div>
              </div>

              {/* Where to configure explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <FileCode className="w-4 h-4 text-emerald-600" />
                    <span>方式 1：編輯專案根目錄的 <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">/.env</code> 檔案（最快）</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    我們已在您的專案檔案清單最外層建立了 <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">.env</code> 檔案，點開該檔案，將您的 Token 貼在引號內儲存即可立即生效：
                  </p>
                  <pre className="bg-slate-900 text-slate-200 p-2 rounded text-[10px] font-mono select-all">
LINE_CHANNEL_ACCESS_TOKEN="您的_Token"
LINE_CHANNEL_SECRET="您的_Secret"
                  </pre>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>方式 2：使用 AI Studio 介面 Secrets 面板</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    在 Google AI Studio 介面右上角點擊 <strong>⚙️ Settings（設定）</strong> 或 <strong>Secrets</strong> 面板，點擊「Add Secret」並填入：
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5 pl-1">
                    <li>名稱：<code className="font-mono bg-slate-100 text-slate-800 px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code></li>
                    <li>數值：貼入 LINE Developers 發行的長期權杖</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Live Webhook Card */}
            <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#06C755] text-white text-[11px] font-semibold">
                    LINE Webhook
                  </span>
                  <span>您的專屬 Webhook 接收端點</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestWebhook}
                    disabled={webhookTesting}
                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors shadow-2xs"
                  >
                    {webhookTesting ? '測試中...' : '測試內部伺服器'}
                  </button>
                  <button
                    onClick={handleCopyPublicWebhook}
                    className="px-3 py-1 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    {copiedPublicWebhook ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> 已複製公開網址
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> 複製公開 Webhook URL (推薦)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Public URL for LINE Developers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-950 flex items-center gap-1">
                    🌐 公開 Webhook 網址（貼至 LINE Developers，免除 302 錯誤）：
                  </span>
                  <span className="text-emerald-700 font-mono text-[10px]">推薦填入此網址</span>
                </div>
                <div className="bg-slate-950 text-emerald-400 p-2.5 rounded-lg font-mono text-xs break-all select-all border border-slate-800 flex items-center justify-between">
                  <span>{publicWebhookUrl}</span>
                </div>
              </div>

              {/* 302 Error Explainer Banner */}
              <div className="bg-amber-50 border border-amber-300/80 rounded-lg p-3 text-amber-950 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>為什麼 LINE 會出現「HTTP 狀態碼不是 200（302 Found）」？</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90 pl-5">
                  <strong>原因：</strong>目前系統處於開發者私有環境（<code>ais-dev-...</code>），Google 伺服器會強制要求登入 Cookie，導致 LINE 外部伺服器連線時被自動導向（回傳 302 重導向）。
                </p>
                <div className="pl-5 pt-1 text-[11px] text-amber-950 space-y-1">
                  <strong>解法兩步驟：</strong>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-900">
                    <li>
                      點擊 AI Studio 頂部右上角的 <strong>「Deploy」（部署）</strong> 或 <strong>「Share」（分享）</strong> 發布應用。
                    </li>
                    <li>
                      將 LINE Developers 的 Webhook URL 改為上方的 <strong>公開網址（<code>ais-pre-...</code>）</strong>，按 Verify 即可順利取得 <strong>200 OK</strong>！
                    </li>
                  </ol>
                </div>
              </div>

              {/* Bot Connection & Real-time Diagnostic Box */}
              <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-slate-900">
                      已綁定官方帳號：{botActivity?.botInfo?.name || '懂吃財務秘書'} ({botActivity?.botInfo?.basicId || '@222pwytv'})
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                    Token 驗證通過
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">最後一次收到 LINE 訊息：</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {botActivity?.lastReceivedAt ? `本日 ${botActivity.lastReceivedAt}` : '尚未收到 LINE 事件 (等待初次觸發)'}
                    </span>
                  </div>
                  {botActivity?.lastText && (
                    <div className="flex items-start justify-between gap-2 pt-0.5 border-t border-slate-200/60">
                      <span className="text-slate-500">最近收到內容：</span>
                      <span className="font-mono text-emerald-700 font-medium truncate max-w-xs">{botActivity.lastText}</span>
                    </div>
                  )}
                  {botActivity?.lastReplyStatus && (
                    <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60">
                      <span className="text-slate-500">回傳狀態：</span>
                      <span className="font-semibold text-emerald-700">{botActivity.lastReplyStatus}</span>
                    </div>
                  )}
                </div>

                {/* Why did it not reply guide */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                    <BadgeAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>若手機傳訊給機器人「沒有收到回覆」，請立即檢查以下 3 個開關：</span>
                  </div>
                  <div className="text-[11px] space-y-1.5 pl-5 text-amber-900/90 leading-relaxed">
                    <div>
                      <strong className="text-amber-950">1. 最常見（80%原因）：前往 LINE 官方帳號管理後台開啟 Webhook</strong>
                      <p className="text-amber-800/90">
                        開啟 <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-700">manager.line.biz</a> ➔ 點入「懂吃財務秘書」➔ 右上角「設定」➔ 左側「回應設定」：
                        <br />• <strong>回應模式</strong>：請選「<strong>聊天機器人</strong>」（若選「聊天」，LINE 伺服器會阻擋轉發給 Webhook）
                        <br />• <strong>Webhook</strong>：請勾選「<strong>啟用</strong>」
                        <br />• <strong>自動回應訊息</strong>：建議「<strong>停用</strong>」
                      </p>
                    </div>
                    <div>
                      <strong className="text-amber-950">2. LINE Developers 的「Use Webhook」開關必須打開</strong>
                      <p className="text-amber-800/90">
                        在 LINE Developers Console ➔ Messaging API 標籤頁 ➔ Webhook settings 中，確認 <strong>Use Webhook</strong> 開關是切換為 <strong>開啟 (ON)</strong>。
                      </p>
                    </div>
                    <div>
                      <strong className="text-amber-950">3. 確認手機聊天室的機器人 ID</strong>
                      <p className="text-amber-800/90">
                        請確認您手機加入對話的是 <strong>懂吃財務秘書</strong>（ID: <code>@222pwytv</code>）。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Step Detailed Visual Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  前往 LINE Developers 建立專案
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>
                    登入{' '}
                    <a
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-medium"
                    >
                      LINE Developers Console
                    </a>
                  </li>
                  <li>建立一個 Provider（例如：<strong>懂吃餐飲</strong>）</li>
                  <li>點選「Create a new channel」並選擇 <strong>Messaging API</strong></li>
                  <li>填寫 Channel 名稱（如：<strong>懂吃健康餐盒 記帳機器人</strong>）與電子郵件</li>
                </ol>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  填入 Webhook URL 並開啟啟用
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>進入剛建立的 Channel，切換至 <strong>Messaging API</strong> 標籤頁</li>
                  <li>向下滾動找到 <strong>Webhook settings</strong></li>
                  <li>
                    點擊「Edit」，貼上上方的 Webhook URL：
                    <span className="font-mono text-emerald-700 block bg-emerald-50 px-1 py-0.5 rounded mt-0.5">
                      /api/line-webhook
                    </span>
                  </li>
                  <li>
                    點擊 <strong>Update</strong>，並將 <strong>Use Webhook</strong> 開關切換為{' '}
                    <span className="font-bold text-emerald-700">開啟 (ON)</span>
                  </li>
                  <li>點擊 <strong>Verify</strong> 按鈕，顯示 Success 即代表連線成功！</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  關閉 LINE 預設自動回應 (關鍵步驟)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  避免 LINE 內建罐頭訊息與 AI 辨識回覆衝突：
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>
                    前往{' '}
                    <a
                      href="https://manager.line.biz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 underline font-medium"
                    >
                      LINE Official Account Manager
                    </a>
                  </li>
                  <li>右上角「設定」&gt; 左側「回應設定」</li>
                  <li>回應模式選擇：<strong>聊天機器人</strong></li>
                  <li>進階設定中，將「自動回應訊息」切換為 <strong>停用 (關閉)</strong></li>
                  <li>「Webhook」切換為 <strong>啟用</strong></li>
                </ol>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs">
                    4
                  </span>
                  發行 Channel Access Token
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>回到 LINE Developers Console &gt; Messaging API 標籤頁</li>
                  <li>滾動至最底部 <strong>Channel access token (long-lived)</strong></li>
                  <li>點選 <strong>Issue</strong> 產生長期 Access Token</li>
                  <li>
                    將 Token 加入系統環境變數：
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded block mt-0.5">
                      LINE_CHANNEL_ACCESS_TOKEN
                    </span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Google Sheets Script Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">
                  5
                </span>
                門市 Google Sheets 試算表自動同步腳本 (Google Apps Script)
              </div>
              <p className="leading-relaxed text-slate-600">
                開啟您的門市 Google Sheets 試算表 &gt; 點擊「擴充功能」&gt;「Apps Script」，貼上下方程式碼並部署為網頁應用程式，即可與 11 大科目自動連線：
              </p>

              <pre className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[10px] overflow-x-auto max-h-36">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  // 自動對齊 懂吃健康餐盒 11 項科目 (蛋品、鮭魚、牛肉、雞肉、米行、蔬果行、美食家、988廚房、德品、豬肉、雜項)
  sheet.appendRow([
    data.receiptNumber,  // A: 憑證號碼
    data.branch,         // B: 五甲店 / 美麗島店
    data.date,           // C: 交易日期
    data.merchantName,   // D: 開立廠商
    data.category,       // E: 支出科目 (11 項之一)
    data.amount,         // F: 金額
    data.itemDetails,    // G: 品項明細
    data.submitter,      // H: 經辦同仁
    data.paymentMethod,  // I: 付款方式
    data.status,         // J: 核銷狀態
    new Date()           // K: 寫入時間戳記
  ]);
  return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base text-rose-800 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" /> 退回支出核銷申請
              </h4>
              <button
                onClick={() => setRejectingId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              請填寫退回原因，這段備註將即時同步至同仁的記帳紀錄與 LINE 狀態中：
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例：發票照片模糊無法核對統編、購買品項未附明細、請改以零用金支出登記..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                確認退回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Inspecting Modal */}
      {inspectingExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-sm text-slate-900">
                  發票收據存證檢視 (審查編號：{inspectingExpense.receiptNumber})
                </span>
              </div>
              <button
                onClick={() => setInspectingExpense(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <ReceiptVisualizer expense={inspectingExpense} />
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                經辦：{inspectingExpense.submitter} · {inspectingExpense.date}
              </span>
              <button
                onClick={() => setInspectingExpense(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900"
              >
                關閉檢視
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
