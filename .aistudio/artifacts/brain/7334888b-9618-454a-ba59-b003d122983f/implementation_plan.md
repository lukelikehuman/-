# 健康餐門市 LINE 記帳與主管核銷智能管理系統 (HealthyBento Expense Bot & Hub)

專為健康餐飲門市打造的雙向財務記帳與核銷系統：結合手機端 **LINE 機器人互動體驗（拍照存證 + Gemini 3.8 Flash 智慧發票與收據品項辨識）** 以及電腦端 **主管核銷管理儀表板（分類報表圖表、單據審核與 Google Sheets 即時同步）**。

---

## User Review & Critical Decisions

> [!IMPORTANT]
> 依據您在第一階段確認的情境偏好，系統核心規格與流程已完成定調：

- **確認支出類別 (Confirmed Categories)**：專為健康餐門市預設 5 大核心分類：
  1. `生鮮食材` (舒肥雞胸肉、鮭魚、有機蔬菜、五穀紫米、冷壓橄欖油、天然香料調味)
  2. `包材耗材` (植纖環保餐盒、沙拉透明碗、木質餐具、牛皮紙袋、出單熱感貼紙)
  3. `門市水電` (商用電費、瓦斯/天然氣、自來水費、店內寬頻網路)
  4. `人事雜支` (計時兼職津貼、員工餐補貼、工作圍裙、清潔消毒耗材)
  5. `設備維護` (低溫烹調機、商用蒸烤箱、冷藏展示櫃保養、POS收銀機維修)
- **確認記帳流程 (Confirmed Flow)**：員工在 LINE 機器人上傳或拍攝發票/收據照片，後端由 Gemini 3.8 Flash 自動進行多模態 OCR 解析（商家名稱、統編、消費日期、品項明細、總金額），並自動預測健康餐支出類別，員工一鍵點選「確認送出」即可進入主管核銷待審池。
- **確認主管核銷與查閱 (Confirmed Review Mode)**：網頁管理後台提供直覺的即時審核隊列（點擊查看發票原圖存證與品項）、即時月度支出分類圓餅與走勢圖表、以及 Google Sheets 試算表格式同步與匯出。同時提供完整 LINE Messaging API Webhook 與 Google Apps Script 串接設定教學。

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **員工端 (LINE 機器人模擬器 & 真實 Webhook 支援)**：隨手拍下菜市場採購單、大賣場生鮮發票、包材廠商收據或水電繳費單，AI 即刻辨識金額與分類，產生如真實 LINE Flex Message 般的精美確認卡片，點擊確認即可送出。
  2. **主管端 (核銷審核中心 & 報表儀表板)**：一眼掌握本月支出總計、待核銷筆數、各分類佔比；主管可直接查看發票照片核對明細，執行「核准核銷」、「退回重填」或標記「已撥款」。
  3. **財務端 (Google Sheets 雙向同步)**：內建 Google Sheets 欄位規格即時同步預覽，支援一鍵下載 CSV、複製試算表資料，並整合 Google Workspace OAuth 連結功能與 Google Apps Script 橋接程式碼。
- **Target Audience / Persona**:
  - 健康餐/舒肥低卡便當門市店長與採購同仁（快速記錄外採食材、緊急補包材、日常店務支出）。
  - 餐飲品牌負責人/財務主管（防範漏報、避免憑證遺失、精準分析食材成本比率）。
- **Key Value**: 告別月底一堆發票收據塞滿抽屜與人工比對算盤，實現「拍照即記帳、AI 自動分流、主管一鍵核銷、試算表即時歸檔」。

---

## 2. User Experience & Visual Design

### Key User Flows

```
[ 員工在門市採購完成 ]
         │
         ▼
[ 拍下發票 / 收據照片 ]
         │
         ▼
[ LINE Bot 接收圖片 ] ──► [ Gemini 3.8 Flash 多模態解析 ]
                                  │
                                  ├─► 辨識商家、日期、明細、總金額
                                  └─► 自動推薦類別 (如: 生鮮食材 / 舒肥生肉)
                                  │
         ┌────────────────────────┘
         ▼
[ LINE Flex Message 確認卡 ]
   ├── 發票縮圖存證
   ├── 辨識結果 (金額 / 類別 / 經手人)
   └── 互動按鈕: [ 修改明細 ] 或 [ 確認送出核銷 ]
         │ (員工點擊送出)
         ▼
[ 主管 Web 管理後台 ]
   ├── 待核銷清單即時更新 (通知標記)
   ├── 主管點擊展開發票檢視燈箱 (核對原圖 vs 辨識資料)
   ├── 審核決策: [ 核准報銷 ] / [ 退回要求補件 ]
   └── 報表自動彙整 (食材成本率、包材佔比、水電支出趨勢)
         │
         ▼
[ Google Sheets 試算表同步 ] ──► 永久存檔、財務會計報表產出
```

### Visual Identity & Theme
- **風格定位 (Aesthetic Direction)**：清新現代的健康餐飲專業風格（Clean Organic & Utilitarian Dashboard），結合健康餐代表的輕盈植萃綠 (`emerald-700` / `teal-600`) 與純粹高易讀的米白/暖灰結構底色 (`slate-50` / `stone-50`)。
- **色彩策略 (60-30-10 Rule)**：
  - **60% 淨白基底**：`#F8FAFC` (Slate-50) 與純白卡片表面，給予財務數據清爽無雜訊的瀏覽視野。
  - **30% 結構與排版**：`#0F172A` (Slate-900) 深色文字、`#64748B` (Slate-500) 輔助說明、微細 1px 邊框 (`#E2E8F0`)。
  - **10% 重點動作色**：健康有機綠 (`#059669` / Emerald-600) 用於確認操作與核銷通過；琥珀黃 (`#D97706` / Amber-600) 用於待審狀態；珊瑚紅 (`#DC2626` / Red-600) 用於退回補件。
- **字型與數字排版 (Typographic & Tabular Math)**：
  - 介面字體採 `Plus Jakarta Sans` 與系統清晰繁體中文微軟正黑/蘋方。
  - 所有金額、發票號碼、日期與統編皆嚴格套用 `font-mono tabular-nums`，保證金額在試算表對齊無抖動。
- **雙重視角無縫切換**：
  - **視角 A：LINE 機器人手機端實機模擬器 (LINE Client Simulator)**：精緻的綠色頂部 LINE 標題欄、對話氣泡、Rich Menu 快捷選單（拍照記帳、查今日支出、待核銷狀態）、多模態發票圖片拖曳上傳與 AI 模擬回覆。
  - **視角 B：主管電腦端核銷儀表板 (Manager Dashboard)**：頂部 KPI 數字、分類花費佔比圓餅圖、月度走勢圖、待審核/已核銷清單篩選、發票原圖大圖審查燈箱、Google Sheets 實時檢視器。

---

## 3. Key Product Decisions & Trade-Offs

- **決策 1：結合「LINE 互動模擬器」與「真實 Webhook API 整合設定指南」**
  - *決定*：應用程式內建 100% 擬真可互動的 LINE 機器人面板，讓使用者與店長即使在瀏覽器中也能直接上傳真實發票圖片體驗 AI 辨識、送審核銷的完整鏈路；同時在系統提供真實 LINE Developers Messaging API Webhook 端點設定檔、Token 設定與範例代碼，確保使用者若要直接綁定真實 LINE 官方帳號時可無痛上線。
  - *原因*：使用者開健康餐店日常繁忙，需立刻在畫面上看到、試用、體驗發票辨識與報表效果，無需先花數小時去 LINE 開發者後台申請 Channel 才能看見成果。
- **決策 2：Gemini 3.8 Flash 多模態發票與收據 OCR 結構化解析**
  - *決定*：在伺服器端 `/api/ocr-receipt` 呼叫 `@google/genai` 的 `gemini-3.8-flash` 模型，傳入照片 base64 與嚴格的 JSON Schema，直接輸出：店名、日期、發票號碼、品項清單、含稅總額、推薦分類、信心度。
  - *原因*：健康餐的採購單常有傳統手寫收據（果菜市場蔬菜行、土雞肉品行）或二聯/三聯電子發票，Gemini 3.8 Flash 對繁體中文手寫與折皺收據辨識率極高，且推理速度小於 2 秒。
- **決策 3：Google Sheets 即時整合 (多層次方案)**
  - *決定*：提供三合一支援：
    1. 儀表板內嵌宛如 Google Sheets 的高密度試算表資料檢視與即時搜尋。
    2. 一鍵匯出標準 CSV / Excel 相容試算表格式。
    3. 整合 Google Workspace 試算表 OAuth 同步與 Google Apps Script 一鍵接收 Webhook 寫入指令。
  - *原因*：保障單機無配置亦能匯出使用，進階使用者亦可直連自己雲端硬碟的試算表。

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HealthyBento Expense Hub (React 19)                    │
│                                                                             │
│  ┌──────────────────────────────┐        ┌───────────────────────────────┐  │
│  │   LINE Bot Phone Simulator   │        │     Executive Review Center   │  │
│  │                              │        │                               │  │
│  │  - Rich Menu: 拍照/查帳/選單  │        │  - KPI Overview Cards         │  │
│  │  - Real Camera/File Upload   │        │  - Expense Category Analytics │  │
│  │  - Flex Message Confirmation │        │  - Audit Queue (Approve/Reject│  │
│  │  - Quick Action Buttons      │        │  - Receipt Image Zoom Modal   │  │
│  └──────────────┬───────────────┘        └───────────────┬───────────────┘  │
│                 │                                        │                  │
│                 │ (Staff Submit)                         │ (Review/Filter)  │
│                 ▼                                        ▼                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Expense State Store & Local DB                    │  │
│  │     (Default Healthy Meal Seed Data + New AI Scanned Records)         │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │                                       │
│       ┌─────────────────────────────┼─────────────────────────────┐         │
│       ▼                             ▼                             ▼         │
│ ┌───────────────┐          ┌────────────────┐            ┌────────────────┐ │
│ │ Gemini 3.8    │          │ Google Sheets  │            │ LINE Webhook   │ │
│ │ Flash API     │          │ Sync Engine    │            │ Bridge Spec    │ │
│ │ (/api/gemini) │          │ (CSV/AppsScript│            │ (Production    │ │
│ └───────────────┘          └────────────────┘            └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Data Models

```typescript
export type ExpenseCategory = 
  | '生鮮食材' 
  | '包材耗材' 
  | '門市水電' 
  | '人事雜支' 
  | '設備維護';

export type ExpenseStatus = 
  | 'pending'    // 待主管核銷
  | 'approved'   // 主管已核准
  | 'rejected'   // 退回補件
  | 'reimbursed'; // 已撥款完成

export interface ExpenseItem {
  id: string;
  receiptNumber?: string;       // 發票號碼 (如: AB-12345678)
  merchantName: string;         // 開立廠商 (如: 台北農產運銷 / 好市多 / 台電)
  date: string;                 // 交易日期 YYYY-MM-DD
  category: ExpenseCategory;    // 支出類別
  amount: number;               // 總金額 (NT$)
  itemDetails: string;          // 品項說明 (如: 舒肥溫體雞胸肉 50kg)
  submitter: string;            // 經手/報帳人員 (如: 小陳、店長王姐)
  paymentMethod: '現金零用金' | '主管信用卡' | '公務轉帳';
  receiptImageUrl?: string;     // 發票收據照片存證
  status: ExpenseStatus;        // 核銷狀態
  notes?: string;               // 備註或主管核銷批註
  createdAt: string;
}
```

---

## 5. Step-by-Step Implementation Strategy

1. **Step 1: Setup Metadata & Project Skeleton**
   - 設定 `metadata.json` 與 `index.html` 品牌標題「健康餐門市 LINE 記帳與主管核銷系統」。
   - 安裝輔助套件（若需要 `canvas-confetti` 核銷慶祝效果等）。
2. **Step 2: Server-Side Gemini 3.8 Flash Receipt OCR API**
   - 建立 `/server.ts` Express 後端服務，支援 `/api/ocr-receipt` 與 `/api/line-webhook`。
   - 使用 `@google/genai` 撰寫繁體中文發票收據結構化辨識邏輯，準確萃取發票資訊並依據品項推薦健康餐類別。
3. **Step 3: Core Domain Seed Data & State Management**
   - 預載貼近健康餐門市真實情境的記帳數據（舒肥雞肉採購、環保紙盒、台電電費、低溫烹調機維修），讓主管儀表板開箱即有豐富圖表與數據。
4. **Step 4: LINE Bot Phone Simulator & Interactive Rich Menu**
   - 建立高擬真 LINE 手機互動視窗：包含相機/檔案上傳按鈕、拍照存證預覽、AI 辨識進度骨架屏、Flex Message 卡片確認與修改明細彈窗。
5. **Step 5: Executive Audit & Analytics Dashboard**
   - 打造大氣俐落的主管審查中心：月度花費指標、5 大分類佔比圖表、多條件篩選（類別/狀態/日期）、發票原圖大圖審核與退回/核准操作。
6. **Step 6: Google Sheets Live Sync & Deployment Guide**
   - 內建 Google Sheets 即時表格檢視器、CSV 匯出下載、以及為使用者量身打造的 LINE Messaging API + Google Sheets Apps Script 一鍵部署指引。
7. **Step 7: Verification & Build Quality**
   - 執行 `compile_applet` 驗證編譯無誤，測試發票圖片上傳與各交互狀態切換。
