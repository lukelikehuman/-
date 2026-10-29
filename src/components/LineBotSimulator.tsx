import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Send,
  Sparkles,
  CheckCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  PlusCircle,
  Edit2,
  X,
  UploadCloud,
} from 'lucide-react';
import { ExpenseItem, ExpenseCategory, Branch, DONG_CHI_CATEGORIES } from '../types/expense';
import confetti from 'canvas-confetti';

interface LineBotSimulatorProps {
  onAddExpense: (expense: ExpenseItem) => void;
  pendingCount: number;
  todayTotal: number;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text?: string;
  image?: string;
  flexCard?: {
    merchantName: string;
    branch: Branch;
    receiptNumber: string;
    date: string;
    amount: number;
    category: ExpenseCategory;
    itemDetails: string;
    submitter: string;
    paymentMethod: '現金零用金' | '主管信用卡' | '公務轉帳' | '員工代墊款';
    notes?: string;
  };
  status?: 'pending_confirm' | 'confirmed';
}

const SAMPLE_RECEIPTS: Array<{
  title: string;
  merchant: string;
  branch: Branch;
  number: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  details: string;
  notes: string;
}> = [
  {
    title: '雞肉 (五甲店·大成生鮮雞胸)',
    merchant: '大成禽產生鮮批發行',
    branch: '五甲店',
    number: 'AB-99214012',
    date: new Date().toISOString().split('T')[0],
    amount: 5400,
    category: '雞肉',
    details: '懂吃冷藏去皮雞胸肉 35kg ($4,200)、嫩雞腿排 10kg ($1,200)',
    notes: '肉品清晨直送五甲門市，附發票章',
  },
  {
    title: '德品 (美麗島店·植纖便當盒)',
    merchant: '德品包裝實業有限公司',
    branch: '美麗島店',
    number: 'DP-102941',
    date: new Date().toISOString().split('T')[0],
    amount: 6200,
    category: '德品',
    details: '甘蔗植纖雙格環保餐盒 1200組、木質環保叉匙 1000組',
    notes: '美麗島外帶包材定期補充',
  },
  {
    title: '美食家 (五甲店·冷壓橄欖油)',
    merchant: '美食家食材通路股份有限公司',
    branch: '五甲店',
    date: new Date().toISOString().split('T')[0],
    number: 'FS-883012',
    amount: 5800,
    category: '美食家食材通路有限公司',
    details: '特級初榨冷壓橄欖油 4大桶、日式香濃胡麻醬 6瓶、海鹽香料調味粉',
    notes: '門市常態醬料油品進貨',
  },
  {
    title: '蔬果行 (美麗島店·生鮮生菜花椰菜)',
    merchant: '陳記蔬果批發行',
    branch: '美麗島店',
    date: new Date().toISOString().split('T')[0],
    number: 'VG-552910',
    amount: 4200,
    category: '蔬果行',
    details: '有機水耕生菜 10斤、綠花椰菜 30斤、黃金甜地瓜 50斤',
    notes: '產地直送農產收據',
  },
  {
    title: '蛋品 (五甲店·日日鮮洗選紅蛋)',
    merchant: '勤億日日鮮蛋品行',
    branch: '五甲店',
    date: new Date().toISOString().split('T')[0],
    number: 'EG-339102',
    amount: 2850,
    category: '蛋品',
    details: '洗選新鮮紅蛋 15箱 (溏心蛋專用)',
    notes: '門市常備蛋品叫貨',
  },
];

export const LineBotSimulator: React.FC<LineBotSimulatorProps> = ({
  onAddExpense,
  pendingCount,
  todayTotal,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      timestamp: '09:00',
      text: '您好！我是「懂吃健康餐盒 記帳機器人」🌱\n隨時在此傳送發票、菜市場進貨收據或水電帳單，Gemini AI 會自動辨識金額、明細並分類，即時送呈主管核銷！',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch>('五甲店');
  const [currentStaff, setCurrentStaff] = useState('小陳 (五甲外場)');
  const [showRichMenu, setShowRichMenu] = useState(true);
  const [editingCard, setEditingCard] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Process image with OCR
  const processImageOCR = async (imageBase64: string) => {
    setIsAnalyzing(true);
    const userMsgId = 'msg-' + Date.now();

    // Add user message with uploaded image
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: imageBase64,
      },
    ]);
    scrollToBottom();

    try {
      const response = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '辨識失敗');
      }

      const data = result.data;

      // Add bot reply with LINE Flex card
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `✨ Gemini 3.8 Flash 辨識完成！\n已為您自動識別為「${data.category}」，請核對明細並點擊送出核銷：`,
          flexCard: {
            merchantName: data.merchantName || '廠商名稱未明',
            branch: currentBranch,
            receiptNumber: data.receiptNumber || '無發票號碼',
            date: data.date || new Date().toISOString().split('T')[0],
            amount: Number(data.amount) || 0,
            category: data.category as ExpenseCategory,
            itemDetails: data.itemDetails || '懂吃健康餐盒門市採購',
            submitter: currentStaff,
            paymentMethod: '現金零用金',
            notes: data.notes || '',
          },
          status: 'pending_confirm',
        },
      ]);
    } catch (err: any) {
      console.error(err);
      // Helpful fallback with editable flex card so employee is never stuck
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ 雲端 AI 暫時忙線（${err.message || '請確認清晰度'}）。已為您建立【記帳草稿單】，您可以直接點擊下方「編輯」填寫金額與科目完成送出：`,
          flexCard: {
            merchantName: '門市供應商/發票廠商',
            branch: currentBranch,
            receiptNumber: 'INV-' + Math.floor(10000000 + Math.random() * 90000000),
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            category: '雞肉',
            itemDetails: '懂吃健康餐盒採購品項',
            submitter: currentStaff,
            paymentMethod: '現金零用金',
            notes: '手動補登 (照片已存證)',
          },
          status: 'pending_confirm',
        },
      ]);
    } finally {
      setIsAnalyzing(false);
      scrollToBottom();
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      processImageOCR(base64);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Simulate picking a sample receipt
  const handleSampleReceipt = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    // Generate clean canvas placeholder receipt image
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(sample.merchant, 30, 45);
      ctx.font = '14px monospace';
      ctx.fillText(`門市: 懂吃健康餐盒 (${sample.branch})`, 30, 75);
      ctx.fillText(`發票字軌: ${sample.number}`, 30, 105);
      ctx.fillText(`日期: ${sample.date}`, 30, 135);
      ctx.font = '14px sans-serif';
      ctx.fillText(`品項: ${sample.details.slice(0, 24)}...`, 30, 175);
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`NT$ ${sample.amount.toLocaleString()}`, 30, 230);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(`懂吃健康餐盒【${sample.branch}】專用存證聯`, 30, 275);
    }
    const sampleDataUrl = canvas.toDataURL('image/jpeg');

    // Add directly to chat as simulated OCR
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now(),
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: sampleDataUrl,
      },
      {
        id: 'bot-' + (Date.now() + 1),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✨ Gemini 3.8 Flash 已辨識「${sample.title}」！\n門市分店：【${sample.branch}】，自動歸類為【${sample.category}】，請確認後送出核銷：`,
        flexCard: {
          merchantName: sample.merchant,
          branch: sample.branch,
          receiptNumber: sample.number,
          date: sample.date,
          amount: sample.amount,
          category: sample.category,
          itemDetails: sample.details,
          submitter: currentStaff,
          paymentMethod: sample.category === '雜項' || sample.category === '美食家食材通路有限公司' ? '公務轉帳' : '現金零用金',
          notes: sample.notes,
        },
        status: 'pending_confirm',
      },
    ]);
    scrollToBottom();
  };

  // Confirm flex card
  const handleConfirmFlexCard = (msgId: string, card: NonNullable<Message['flexCard']>) => {
    const newExpense: ExpenseItem = {
      id: 'exp-' + Date.now(),
      receiptNumber: card.receiptNumber,
      merchantName: card.merchantName,
      branch: card.branch || currentBranch,
      date: card.date,
      category: card.category,
      amount: card.amount,
      itemDetails: card.itemDetails,
      submitter: card.submitter,
      paymentMethod: card.paymentMethod,
      status: 'pending',
      notes: card.notes,
      createdAt: new Date().toISOString(),
    };

    onAddExpense(newExpense);

    // Update message status
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              status: 'confirmed',
            }
          : m
      )
    );

    // Bot reply confirmation
    setMessages((prev) => [
      ...prev,
      {
        id: 'bot-confirm-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✅【核銷申請已送達主管後台】\n單號：${card.receiptNumber}\n類別：${card.category}\n金額：NT$ ${card.amount.toLocaleString()}\n經手人：${card.submitter}\n\n主管已收到通知並可在管理儀表板進行審核核銷，資料同步至 Google Sheets！`,
      },
    ]);

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
    });

    scrollToBottom();
  };

  // Text message submission
  const handleSendText = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      id: 'text-' + Date.now(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    // Check commands
    setTimeout(() => {
      if (text.includes('今日') || text.includes('支出') || text.includes('總計')) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-resp-' + Date.now(),
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `📊【門市今日財務即時看板】\n・今日支出總計：NT$ ${todayTotal.toLocaleString()}\n・等待主管審核：${pendingCount} 筆\n\n您可以隨時在右側「主管核銷儀表板」查看各分類圖表與單據明細。`,
          },
        ]);
      } else if (text.includes('核銷') || text.includes('待審')) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-resp-' + Date.now(),
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `⏳ 目前共有 ${pendingCount} 筆支出單據等待主管審核核銷。\n若您剛上傳發票，通常主管會在交班時或每日下午統一核銷撥款！`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'bot-resp-' + Date.now(),
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `收到！建議直接點擊下方「📸 拍發票記帳」或從相簿上傳發票存證圖片，我會以 Gemini 多模態 AI 立即為您辨識歸類喔！`,
          },
        ]);
      }
      scrollToBottom();
    }, 400);
  };

  return (
    <div className="flex flex-col h-[760px] bg-[#849EB8] rounded-2xl overflow-hidden shadow-2xl border border-slate-300 relative">
      {/* LINE App Header */}
      <div className="bg-[#243444] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#06C755] flex items-center justify-center font-bold text-white text-base shadow-sm">
            🥗
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <span>懂吃健康餐盒 記帳機器人</span>
              <ShieldCheck className="w-4 h-4 text-[#06C755] fill-[#06C755]/20" />
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <span>門市：</span>
                <select
                  value={currentBranch}
                  onChange={(e) => {
                    const br = e.target.value as Branch;
                    setCurrentBranch(br);
                    if (br === '五甲店') setCurrentStaff('小陳 (五甲外場)');
                    else setCurrentStaff('王店長 (美麗島)');
                  }}
                  className="bg-emerald-800 text-white font-semibold rounded px-1.5 py-0.5 text-[11px] outline-none border border-emerald-600 cursor-pointer"
                >
                  <option value="五甲店">五甲店</option>
                  <option value="美麗島店">美麗島店</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span>經辦：</span>
                <select
                  value={currentStaff}
                  onChange={(e) => setCurrentStaff(e.target.value)}
                  className="bg-slate-700/80 text-white rounded px-1.5 py-0.5 text-[11px] outline-none border border-slate-600 cursor-pointer"
                >
                  {currentBranch === '五甲店' ? (
                    <>
                      <option value="小陳 (五甲外場)">小陳 (五甲外場)</option>
                      <option value="林店長 (五甲)">林店長 (五甲)</option>
                      <option value="阿豪 (五甲內廚)">阿豪 (五甲內廚)</option>
                    </>
                  ) : (
                    <>
                      <option value="王店長 (美麗島)">王店長 (美麗島)</option>
                      <option value="阿豪 (美麗島內廚)">阿豪 (美麗島內廚)</option>
                      <option value="小雅 (美麗島收銀)">小雅 (美麗島收銀)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRichMenu(!showRichMenu)}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded text-slate-200 transition-colors"
          >
            {showRichMenu ? '收合選單' : '展開選單'}
          </button>
        </div>
      </div>

      {/* Quick Test Receipt Chips */}
      <div className="bg-slate-100/90 backdrop-blur-sm border-b border-slate-200 px-3 py-2 shrink-0 flex items-center gap-1.5 overflow-x-auto text-xs">
        <span className="text-slate-500 shrink-0 font-medium text-[11px]">⚡ 快速示範樣張：</span>
        {SAMPLE_RECEIPTS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSampleReceipt(s)}
            className="shrink-0 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all shadow-xs"
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'bot' && (
              <span className="text-[11px] text-slate-600 font-medium mb-1 pl-1">
                健康餐記帳 Bot
              </span>
            )}

            {/* Normal Text Message */}
            {msg.text && (
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#06C755] text-white rounded-tr-xs'
                    : 'bg-white text-slate-900 rounded-tl-xs border border-slate-100'
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* Uploaded Image Preview */}
            {msg.image && (
              <div className="max-w-[70%] rounded-xl overflow-hidden border-2 border-[#06C755] shadow-md my-1 bg-white">
                <img src={msg.image} alt="發票存證" className="w-full h-auto object-cover max-h-52" />
                <div className="bg-slate-900/90 text-white text-[10px] px-2 py-1 flex items-center justify-between">
                  <span>📸 門市拍照存證完成</span>
                  <span>AI 辨識中</span>
                </div>
              </div>
            )}

            {/* LINE Flex Message Card (Interactive) */}
            {msg.flexCard && (
              <div className="max-w-[92%] w-full bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200 mt-2">
                {/* Flex Card Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-950/40 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {msg.flexCard.branch}
                      </span>
                      <span className="text-[11px] font-bold tracking-wider uppercase opacity-90">
                        智慧發票憑證
                      </span>
                    </div>
                    <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      {msg.flexCard.category}
                    </span>
                  </div>
                  <div className="mt-1.5 text-base font-bold truncate">
                    {msg.flexCard.merchantName}
                  </div>
                  <div className="text-[11px] opacity-80 font-mono">
                    {msg.flexCard.receiptNumber} · {msg.flexCard.date}
                  </div>
                </div>

                {/* Flex Card Body */}
                <div className="p-3.5 space-y-2.5 text-xs text-slate-700 bg-white">
                  <div>
                    <div className="text-slate-400 text-[10px]">購買品項與數量</div>
                    <div className="font-medium text-slate-900 mt-0.5 leading-snug">
                      {msg.flexCard.itemDetails}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">分店：</span>
                      <span className="font-semibold text-emerald-800">{msg.flexCard.branch}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">經辦：</span>
                      <span className="font-semibold text-slate-800">{msg.flexCard.submitter.split(' ')[0]}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">方式：</span>
                      <span className="text-slate-800">{msg.flexCard.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-slate-500 font-medium">總核銷金額</span>
                    <span className="text-xl font-bold font-mono text-emerald-700">
                      NT$ {msg.flexCard.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Flex Card Actions */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
                  {msg.status === 'confirmed' ? (
                    <div className="w-full py-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      已送呈主管核銷 (待審批)
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingCard({ msgId: msg.id, ...msg.flexCard })}
                        className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> 修改
                      </button>
                      <button
                        onClick={() => handleConfirmFlexCard(msg.id, msg.flexCard!)}
                        className="flex-2 py-2 px-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4" /> 確認送出核銷
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <span className="text-[10px] text-slate-500 mt-0.5 px-1 font-mono">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {/* AI Analyzing Spinner */}
        {isAnalyzing && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs">
              🤖
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-3 shadow-sm border border-slate-200 text-xs text-slate-700 flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Gemini 3.8 Flash 正在分析發票照片、萃取品項與自動分類...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900">微調發票辨識資訊</h4>
              <button
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-slate-500 font-medium">廠商名稱</label>
              <input
                type="text"
                value={editingCard.merchantName}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, merchantName: e.target.value })
                }
                className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 font-medium">門市分店</label>
                <select
                  value={editingCard.branch || currentBranch}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      branch: e.target.value as Branch,
                    })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300 font-medium bg-white"
                >
                  <option value="五甲店">五甲店</option>
                  <option value="美麗島店">美麗島店</option>
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-medium">支出分類</label>
                <select
                  value={editingCard.category}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      category: e.target.value as ExpenseCategory,
                    })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300 font-medium bg-white"
                >
                  {DONG_CHI_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 font-medium">金額 (TWD)</label>
                <input
                  type="number"
                  value={editingCard.amount}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, amount: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300 font-mono font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="text-slate-500 font-medium">經辦同仁</label>
                <input
                  type="text"
                  value={editingCard.submitter}
                  onChange={(e) =>
                    setEditingCard({ ...editingCard, submitter: e.target.value })
                  }
                  className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-medium">品項明細</label>
              <textarea
                rows={2}
                value={editingCard.itemDetails}
                onChange={(e) =>
                  setEditingCard({ ...editingCard, itemDetails: e.target.value })
                }
                className="w-full mt-1 px-2.5 py-1.5 border rounded border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCard(null)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === editingCard.msgId
                        ? {
                            ...m,
                            flexCard: {
                              merchantName: editingCard.merchantName,
                              branch: editingCard.branch || currentBranch,
                              receiptNumber: editingCard.receiptNumber,
                              date: editingCard.date,
                              amount: editingCard.amount,
                              category: editingCard.category,
                              itemDetails: editingCard.itemDetails,
                              submitter: editingCard.submitter,
                              paymentMethod: editingCard.paymentMethod,
                              notes: editingCard.notes,
                            },
                          }
                        : m
                    )
                  );
                  setEditingCard(null);
                }}
                className="px-4 py-1.5 rounded bg-[#06C755] text-white font-semibold hover:bg-[#05b34c]"
              >
                更新內容
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINE Rich Menu (Bottom Bar) */}
      {showRichMenu && (
        <div className="bg-[#1E2B37] border-t border-slate-700 p-2 shrink-0 grid grid-cols-4 gap-1.5 text-white text-[11px] select-none">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 transition-all active:scale-95 text-center"
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="font-semibold">拍照記帳</span>
          </button>

          <button
            onClick={() => {
              setInputText('查詢今日支出');
              handleSendText();
            }}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 text-center text-slate-200"
          >
            <Clock className="w-5 h-5 mb-1 text-amber-400" />
            <span>今日支出</span>
          </button>

          <button
            onClick={() => {
              setInputText('查閱待核銷進度');
              handleSendText();
            }}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 text-center text-slate-200 relative"
          >
            <FileCheck2 className="w-5 h-5 mb-1 text-sky-400" />
            <span>待核銷清單</span>
            {pendingCount > 0 && (
              <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setInputText('Google Sheets 同步狀態');
              handleSendText();
            }}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 text-center text-slate-200"
          >
            <UploadCloud className="w-5 h-5 mb-1 text-emerald-400" />
            <span>試算表同步</span>
          </button>
        </div>
      )}

      {/* Hidden File Input for Real Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Bottom Input Area */}
      <div className="bg-white border-t border-slate-200 p-2.5 flex items-center gap-2 shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="上傳或拍攝發票照片"
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 flex items-center justify-center transition-colors shrink-0"
        >
          <Camera className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="輸入文字記帳或查詢..."
          className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#06C755]"
        />

        <button
          onClick={handleSendText}
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-full bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
};
