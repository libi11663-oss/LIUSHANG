# 留聲 (STORIES THAT STAY) — Gemini AI 客服系統交接規格書 (Handover Guide)

這份文件專為接手本專案的開發者或 AI 助手（如 GPT 系列模型）撰寫，說明如何保留並維護現有的 **Google Gemini 客服系統**，同時避免誤用已棄用的舊版 SDK 或暴露金鑰。

---

## 1. 核心架構與檔案清單

本專案的 AI 客服採用 **Next.js App Router 伺服器端代理架構（Server-Side Only）**，前端絕不直接接觸 Gemini SDK 或 API Key：

| 檔案路徑 | 功能說明 |
| :--- | :--- |
| `lib/ai/config.ts` | 集中管理模型名稱（預設 `gemini-3.1-flash-lite`）、字數上限（500 字）、歷史對話輪數（6 輪）、Rate Limit（15 次/分）、溫度（`0.3`）與降級訊息。 |
| `lib/ai/gemini-provider.ts` | 封裝 `@google/genai` 官方 SDK，實作 `AIChatProvider` 介面，包含自動備援重試（Fallback 至 `gemini-3.8-flash`）與伺服器端 Token 用量紀錄。 |
| `lib/ai/prompts.ts` | 定義嚴格的客服 System Prompt（防幻覺、禁止捏造價格、防 Prompt Injection）。 |
| `lib/customer-service-knowledge.ts` | 「留聲」官方知識庫（品牌理念、四大典藏服務、製作流程、首批 3 組免費試作規範、FAQ）。 |
| `lib/ai/chat-service.ts` | 整合知識庫、System Prompt 與 `GeminiChatProvider` 的單例服務 (`defaultChatEngine`)。 |
| `lib/ai/usage-logger.ts` | 伺服器端記錄每次對話的 `promptTokens`、`candidatesTokens`、`totalTokens` 與延遲時間。 |
| `app/api/chat/route.ts` | 單一品牌客服 API 端點 (`POST /api/chat`)，含 IP Rate Limiting 與輸入清洗。 |
| `app/api/saas/chat/route.ts` | 多租戶 SaaS 擴充版客服 API 端點 (`POST /api/saas/chat`)。 |
| `components/chat/CustomerServiceWidget.tsx` | 前端懸浮客服對話視窗，僅透過 `fetch('/api/chat')` 與後端通訊。 |

---

## 2. 環境變數設定 (`.env.local` / 部署平台環境變數)

請在伺服器環境設定以下變數（**嚴禁**加上 `NEXT_PUBLIC_` 前綴）：

```env
# 必填：Google AI Studio 申請的 Gemini API Key（僅供伺服器端讀取）
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# 選填：覆寫預設客服模型名稱
CHAT_MODEL_NAME="gemini-3.1-flash-lite"
```

---

## 3. `@google/genai` SDK 強制開發規範（給接手 AI 的重要指令）

> **⚠️ 警告接手的 AI 助手**：請務必使用全新官方套件 `@google/genai`，**嚴禁**使用已廢棄的 `@google/generative-ai`。

### ✅ 正確寫法 (Correct Usage)
```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-lite", // 或 "gemini-3.8-flash"
  contents: [
    { role: "user", parts: [{ text: "請問首批免費試作包含什麼？" }] }
  ],
  config: {
    systemInstruction: "你是留聲官方網站的客服小幫手...",
    temperature: 0.3
  }
});

// 注意：response.text 是屬性 (Getter)，不是函式！
const replyText = response.text;
```

### ❌ 嚴格禁止的舊版/錯誤寫法 (Prohibited)
1. **禁止匯入舊套件或舊類別**：不可使用 `@google/generative-ai` 或 `import { GoogleGenerativeAI } from "@google/genai"`。
2. **禁止呼叫 `getGenerativeModel`**：不可寫 `ai.getGenerativeModel(...)` 或 `ai.models.getModel(...)`，必須直接呼叫 `ai.models.generateContent({ model, contents, config })`。
3. **禁止將 `.text` 當成函式呼叫**：必須寫 `response.text`，不可寫 `response.text()`。
4. **禁止使用已淘汰的模型名稱**：嚴禁使用 `gemini-1.5-flash`、`gemini-1.5-pro`、`gemini-2.0-flash`、`gemini-pro`。請使用：
   - 輕量高速客服首選：`gemini-3.1-flash-lite`
   - 標準文字任務備援：`gemini-3.8-flash`
   - 複雜推理任務：`gemini-3.1-pro-preview`
5. **禁止在前端 (`'use client'`) 匯入 `@google/genai`**：所有 Gemini 呼叫必須留在 `app/api/*` 或伺服器端模組。

---

## 4. 前後端 API 通訊協定 (`POST /api/chat`)

如果未來重新設計前端 UI，只需對接 `/api/chat` 即可無縫沿用 Gemini 客服：

### Request (`application/json`)
```json
{
  "message": "長輩不會用電腦也能參加嗎？",
  "history": [
    { "role": "user", "content": "你好" },
    { "role": "model", "content": "您好，我是留聲 AI 小幫手，很高興為您服務！" }
  ]
}
```

### Response (`200 OK`)
```json
{
  "reply": "可以！受訪長輩完全不需要會用電腦，只需要自在地分享聊天..."
}
```
