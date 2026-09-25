import { AI_CONFIG } from "./config";
import { GeminiChatProvider, AIChatProvider, ChatMessage } from "./gemini-provider";
import { buildCustomerServiceSystemPrompt } from "./prompts";
import { getFormattedKnowledgeBase } from "../customer-service-knowledge";

export interface ChatServiceOptions {
  provider?: AIChatProvider;
  brandName?: string;
  assistantName?: string;
  knowledgeBaseText?: string;
}

export class CustomerServiceChatEngine {
  private provider: AIChatProvider;
  private brandName: string;
  private assistantName: string;
  private knowledgeBaseText: string;

  constructor(options: ChatServiceOptions = {}) {
    this.provider = options.provider || new GeminiChatProvider();
    this.brandName = options.brandName || "留聲｜人生故事典藏";
    this.assistantName = options.assistantName || "留聲 AI 小幫手";
    this.knowledgeBaseText = options.knowledgeBaseText || getFormattedKnowledgeBase();
  }

  async answerQuestion(
    message: string,
    history: ChatMessage[] = [],
    clientIpHash?: string
  ): Promise<{ reply: string }> {
    // 限制歷史對話長度
    const trimmedHistory = history.slice(-AI_CONFIG.maxHistoryTurns);

    // 建立系統提示詞
    const systemInstruction = buildCustomerServiceSystemPrompt({
      brandName: this.brandName,
      assistantName: this.assistantName,
      serviceDescription: "把家人的故事與聲音留下來。以人生訪談、精裝書冊、紀錄短片、雲端典藏頁保存生命記憶。",
      knowledgeBaseText: this.knowledgeBaseText,
      fallbackMessage: AI_CONFIG.fallbackMessage
    });

    const result = await this.provider.sendMessage({
      message,
      history: trimmedHistory,
      systemInstruction,
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      clientIpHash
    });

    return {
      reply: result.reply
    };
  }
}

// 預設單例
export const defaultChatEngine = new CustomerServiceChatEngine();
