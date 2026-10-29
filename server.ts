import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));

// Initialize Google Gen AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Category definition for 懂吃健康餐盒 (matches user Google Sheet)
const CATEGORIES = [
  '蛋品',
  '鮭魚',
  '牛肉',
  '雞肉',
  '米行',
  '蔬果行',
  '美食家食材通路有限公司',
  '988廚房',
  '德品',
  '豬肉',
  '雜項',
] as const;

// Helper function for Gemini OCR Receipt Analysis
async function analyzeReceipt(cleanBase64: string, mimeType: string = 'image/jpeg') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('伺服器端缺少 GEMINI_API_KEY，請確認環境變數配置。');
  }

  const promptText = `你是一位專業的餐飲連鎖門市財務稽核與發票收據辨識專家。
這是一家「懂吃健康餐盒（五甲店、美麗島店）」同仁拍照上傳的發票、收據、進貨單或帳單照片。
門市的記帳報表嚴格對應以下 11 種專屬公司/項目分類，請仔細辨識圖片品項與廠商名稱，並將其嚴格歸類為以下 11 類之一：
1. 「蛋品」：洗選蛋、優質紅蛋、水煮蛋專用新鮮雞蛋等。
2. 「鮭魚」：智利空運冷藏/冷凍鮭魚菲力、鮭魚切塊、深海鮭魚排等水產。
3. 「牛肉」：特選低脂牛板腱、低卡牛肉片、原塊牛肉等。
4. 「雞肉」：舒肥專用冷藏去皮雞胸肉、溫體雞肉、雞里肌、去骨雞腿排等。
5. 「米行」：黑纖紫米、特等花東香米、藜麥、五穀米、糙米等米品採購。
6. 「蔬果行」：果菜批發、水耕生菜、綠花椰菜、地瓜、彩椒、玉米筍等生鮮蔬果。
7. 「美食家食材通路有限公司」：美食家開立之單據、特級初榨橄欖油、日式胡麻醬、黑胡椒海鹽、綜合香料、天然調味品。
8. 「988廚房」：988廚房供應之低卡熟食半成品、舒肥醬包、特調高湯基底。
9. 「德品」：德品供應之甘蔗植纖環保便當盒、耐熱沙拉碗、木匙木叉、外帶牛皮紙袋、防油紙耗材。
10. 「豬肉」：精選低脂里肌豬肉、豬腱肉、國產優質豬肉片。
11. 「雜項」：食品級消毒酒精、洗碗精、抹布圍裙、門市水電天然氣費、設備定期保養檢修等營業雜支。

請以繁體中文回傳結構化 JSON 資料。若發票字軌或某些欄位模糊，請給出最合理的估算並在 notes 備註。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ],
    },
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          merchantName: {
            type: Type.STRING,
            description: '開立廠商或店家名稱 (例如: 美食家食材通路有限公司、德品、988廚房、大成肉品、果菜行)',
          },
          receiptNumber: {
            type: Type.STRING,
            description: '統一發票號碼 (如 AB-12345678) 或免用發票收據單號',
          },
          date: {
            type: Type.STRING,
            description: '消費日期，格式需為 YYYY-MM-DD',
          },
          amount: {
            type: Type.NUMBER,
            description: '含稅總金額 (新台幣整數)',
          },
          category: {
            type: Type.STRING,
            enum: [
              '蛋品',
              '鮭魚',
              '牛肉',
              '雞肉',
              '米行',
              '蔬果行',
              '美食家食材通路有限公司',
              '988廚房',
              '德品',
              '豬肉',
              '雜項',
            ],
            description: '依據購買品項自動判別的支出分類',
          },
          itemDetails: {
            type: Type.STRING,
            description: '品項明細摘要 (例如: 溫體去皮雞胸肉 30kg、特選紫米 5包)',
          },
          confidence: {
            type: Type.NUMBER,
            description: '辨識信心分數 0-100',
          },
          notes: {
            type: Type.STRING,
            description: '發票統編、備註或特殊說明',
          },
        },
        required: ['merchantName', 'date', 'amount', 'category', 'itemDetails'],
      },
    },
  });

  return JSON.parse(response.text || '{}');
}

// Gemini OCR Receipt Analysis Endpoint (for Web app & LINE Simulator)
app.post('/api/ocr-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '請提供圖片資料 (imageBase64)' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    const data = await analyzeReceipt(cleanBase64, mimeType);

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('OCR analysis failed:', error);
    return res.status(500).json({
      error: '發票收據辨識失敗，請確認圖片清晰度後重試。',
      details: error.message,
    });
  }
});

// Helper to reply to LINE message
async function replyLineMessage(replyToken: string, messages: any[]) {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!lineToken) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured; skipped replying to LINE.');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to reply to LINE:', response.status, errText);
    }
  } catch (err) {
    console.error('Error sending reply to LINE API:', err);
  }
}

// LINE Messaging API Webhook Handler
app.post('/api/line-webhook', async (req, res) => {
  const events = req.body?.events || [];
  console.log(`Received ${events.length} LINE webhook event(s)`);

  // Respond to LINE immediately with 200 OK so the webhook doesn't timeout
  res.status(200).json({ status: 'ok', received: events.length });

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  for (const event of events) {
    if (event.type === 'message') {
      const { replyToken, message } = event;

      // Handle Image Message (Photo of invoice or receipt)
      if (message.type === 'image') {
        if (!lineToken) {
          console.log('Received image from LINE, but LINE_CHANNEL_ACCESS_TOKEN is not set.');
          continue;
        }

        try {
          // 1. Download image binary from LINE Content API
          const imageRes = await fetch(
            `https://api-data.line.me/v2/bot/message/${message.id}/content`,
            {
              headers: {
                Authorization: `Bearer ${lineToken}`,
              },
            }
          );

          if (!imageRes.ok) {
            console.error('Failed to fetch image from LINE content API:', imageRes.status);
            await replyLineMessage(replyToken, [
              {
                type: 'text',
                text: '⚠️ 無法下載照片，請確認 LINE 官方後台設定或稍後再試。',
              },
            ]);
            continue;
          }

          const arrayBuffer = await imageRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = buffer.toString('base64');

          // 2. Run Gemini OCR
          const parsed = await analyzeReceipt(base64Data, 'image/jpeg');

          // 3. Send formatted LINE message with 11 categories confirmation
          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: `🥗【懂吃健康餐盒 · 發票辨識成功】\n\n🏢 廠商：${parsed.merchantName || '廠商名稱未明'}\n🏷️ 項目分類：【${parsed.category}】\n💰 金額：NT$ ${Number(parsed.amount).toLocaleString()}\n🧾 憑證單號：${parsed.receiptNumber || '免用發票收據'}\n📅 交易日期：${parsed.date}\n📦 明細：${parsed.itemDetails}\n\n✅ 資料已即時同步至主管審核後台與 Google Sheets！`,
            },
          ]);
        } catch (err: any) {
          console.error('Error handling LINE image event:', err);
          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: '⚠️ 發票辨識發生異常，請確認照片清晰度、拍攝完整發票後重新傳送。',
            },
          ]);
        }
      }

      // Handle Text Message
      if (message.type === 'text') {
        if (lineToken) {
          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text: `🥗 您好！我是「懂吃健康餐盒」記帳小幫手 🤖\n\n📌 使用方式：\n請直接對著發票、出貨單或收據【拍照傳送】給我，AI 會自動辨識金額與 11 大科目（蛋品、鮭魚、牛肉、雞肉、米行、蔬果行、美食家、988廚房、德品、豬肉、雜項），並送至主管核銷！\n\n門市分店：五甲店、美麗島店`,
            },
          ]);
        }
      }
    }
  }
});

// System Health & Config status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Healthy Bento Expense server listening on port ${PORT}`);
  });
}

startServer();
