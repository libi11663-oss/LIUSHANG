import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG } from "./config";
import { logTokenUsage } from "./usage-logger";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface ChatProviderRequest {
  message: string;
  history: ChatMessage[];
  systemInstruction: string;
  model?: string;
  temperature?: number;
  clientIpHash?: string;
}

export interface ChatProviderResponse {
  reply: string;
  model: string;
  tokens?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
}

/**
 * 抽象 AI 服務介面（利於未來擴充其他 Provider 或 SaaS 化）
 */
export interface AIChatProvider {
  sendMessage(req: ChatProviderRequest): Promise<ChatProviderResponse>;
}

/**
 * 官方 Gemini Provider 實作
 */
export class GeminiChatProvider implements AIChatProvider {
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async sendMessage(req: ChatProviderRequest): Promise<ChatProviderResponse> {
    const startTime = Date.now();
    const modelToUse = req.model || AI_CONFIG.model;

    // 動態確保 client 初始化（避免伺服器啟動階段時序問題）
    if (!this.client && process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    // 若未設定金鑰，友善降級回傳提示
    if (!this.client || !process.env.GEMINI_API_KEY) {
      console.warn("[Gemini Provider] GEMINI_API_KEY is not configured on server.");
      return {
        reply: AI_CONFIG.offlineMessage,
        model: modelToUse
      };
    }

    // 整理歷史對話，確保交替與格式符合 Gemini SDK 規格
    const formattedContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    for (const h of req.history) {
      if (h.content && h.content.trim()) {
        formattedContents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content.trim() }]
        });
      }
    }
    formattedContents.push({
      role: "user",
      parts: [{ text: req.message.trim() }]
    });

    try {

      const response = await this.client.models.generateContent({
        model: modelToUse,
        contents: formattedContents,
        config: {
          systemInstruction: req.systemInstruction,
          temperature: req.temperature ?? AI_CONFIG.temperature
        }
      });

      const replyText = response.text?.trim() || AI_CONFIG.fallbackMessage;
      const latencyMs = Date.now() - startTime;

      // 解析 token 使用量
      const usageMeta = response.usageMetadata;
      const promptTokens = usageMeta?.promptTokenCount || 0;
      const candidatesTokens = usageMeta?.candidatesTokenCount || 0;
      const totalTokens = usageMeta?.totalTokenCount || promptTokens + candidatesTokens;

      // 伺服器端紀錄 Token 與成本資料（不外洩給前端訪客）
      await logTokenUsage({
        model: modelToUse,
        promptTokens,
        candidatesTokens,
        totalTokens,
        latencyMs,
        status: "success",
        clientIpHash: req.clientIpHash
      });

      return {
        reply: replyText,
        model: modelToUse,
        tokens: {
          promptTokens,
          candidatesTokens,
          totalTokens
        }
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Gemini Provider Error]", errorMessage);

      // 記錄失敗事件
      await logTokenUsage({
        model: modelToUse,
        promptTokens: 0,
        candidatesTokens: 0,
        totalTokens: 0,
        latencyMs,
        status: "error",
        clientIpHash: req.clientIpHash,
        errorDetail: errorMessage
      });

      // 針對常見錯誤提供精準友善回覆
      if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota")) {
        return {
          reply: "目前諮詢人數較多，小幫手稍微繁忙，請稍等一分鐘後再試，或直接在網頁下方表單留言。",
          model: modelToUse
        };
      }

      // 若主要模型遇突發狀況，嘗試備用模型 gemini-3.8-flash 自動重試
      if (modelToUse !== "gemini-3.8-flash") {
        try {
          const fallbackRes = await this.client.models.generateContent({
            model: "gemini-3.8-flash",
            contents: formattedContents,
            config: {
              systemInstruction: req.systemInstruction,
              temperature: req.temperature ?? AI_CONFIG.temperature
            }
          });
          const fallbackReply = fallbackRes.text?.trim();
          if (fallbackReply) {
            return {
              reply: fallbackReply,
              model: "gemini-3.8-flash"
            };
          }
        } catch (retryErr) {
          console.error("[Gemini Fallback Error]", retryErr);
        }
      }

      return {
        reply: AI_CONFIG.offlineMessage,
        model: modelToUse
      };
    }
  }
}
