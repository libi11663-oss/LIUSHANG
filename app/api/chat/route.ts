import { NextRequest, NextResponse } from "next/server";
import { defaultChatEngine } from "@/lib/ai/chat-service";
import { AI_CONFIG } from "@/lib/ai/config";
import { ChatMessage } from "@/lib/ai/gemini-provider";

// 簡易記憶體速率限制（防止惡意刷量與濫用）
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分鐘
  const entry = rateLimitMap.get(ip);

  // 定期清理過期項目，避免記憶體洩漏
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= AI_CONFIG.rateLimitPerMinute) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 檢查 Content-Type
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "不支援的資料格式" },
        { status: 415 }
      );
    }

    // 取得客戶端 IP 辨識碼
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 頻率限制防護
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { reply: AI_CONFIG.rateLimitMessage },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, history } = body;

    // 輸入檢查
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "請輸入您的問題" },
        { status: 400 }
      );
    }

    const cleanMessage = message.trim();

    // 長度限制
    if (cleanMessage.length > AI_CONFIG.maxInputLength) {
      return NextResponse.json(
        { reply: AI_CONFIG.inputTooLongMessage },
        { status: 400 }
      );
    }

    // 格式化歷史紀錄
    const validHistory: ChatMessage[] = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (
          item &&
          (item.role === "user" || item.role === "model") &&
          typeof item.content === "string" &&
          item.content.length <= 1500
        ) {
          validHistory.push({
            role: item.role,
            content: item.content
          });
        }
      }
    }

    // 呼叫聊天引擎
    const result = await defaultChatEngine.answerQuestion(
      cleanMessage,
      validHistory,
      clientIp.substring(0, 15) // 只保留部分 IP 資訊做為日誌辨識
    );

    return NextResponse.json({
      reply: result.reply
    });
  } catch (error: unknown) {
    console.error("[Chat API Error]", error);
    return NextResponse.json(
      { reply: AI_CONFIG.offlineMessage },
      { status: 500 }
    );
  }
}
