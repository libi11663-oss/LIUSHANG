import { NextRequest, NextResponse } from "next/server";
import { GeminiChatProvider, ChatMessage } from "@/lib/ai/gemini-provider";
import { AI_CONFIG } from "@/lib/ai/config";
import { getCompanyRecord, getCompanyRecordByWidgetId, validateCompanyOrigin } from "@/lib/saas/knowledge-service";
import { buildSaaSCustomerServicePrompt } from "@/lib/saas/prompts";

// 記憶體速率限制記錄 (按 IP + Company 雙重隔離)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limitPerMinute: number): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = rateLimitMap.get(key);

  if (rateLimitMap.size > 10000) {
    for (const [k, val] of rateLimitMap.entries()) {
      if (val.resetAt < now) {
        rateLimitMap.delete(k);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limitPerMinute) {
    return false;
  }

  entry.count += 1;
  return true;
}

function setCorsHeaders(res: NextResponse, origin: string | null) {
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Widget-Company-Id, Authorization"
  );
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = new NextResponse(null, { status: 204 });
  return setCorsHeaders(res, origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  try {
    // 檢查 Content-Type
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const errRes = NextResponse.json(
        { error: "不支援的資料格式" },
        { status: 415 }
      );
      return setCorsHeaders(errRes, origin);
    }

    const body = await req.json();
    const { widgetId: bodyWidgetId, companyId: bodyCompanyId, message, history } = body;

    // 優先以 widgetId 識別（若無則相容舊版 companyId）
    const widgetId = (bodyWidgetId || req.headers.get("x-widget-id") || "").toString().trim();
    const companyId = (bodyCompanyId || req.headers.get("x-widget-company-id") || "").toString().trim().toLowerCase();

    // 1. 在 Server Side 查出它真正對應的 company 資料，嚴格禁止前端直接決定租戶
    let companyRecord = null;
    if (widgetId) {
      companyRecord = await getCompanyRecordByWidgetId(widgetId);
    } else if (companyId) {
      companyRecord = await getCompanyRecord(companyId);
    } else {
      companyRecord = await getCompanyRecord("liusheng");
    }

    if (!companyRecord) {
      const notFoundRes = NextResponse.json(
        { error: "查無此企業或 Widget 識別碼無效" },
        { status: 404 }
      );
      return setCorsHeaders(notFoundRes, origin);
    }

    if (companyRecord.status !== "active") {
      const suspendedRes = NextResponse.json(
        { error: "此企業客服帳號目前非啟用狀態" },
        { status: 403 }
      );
      return setCorsHeaders(suspendedRes, origin);
    }

    // 2. 跨站網域白名單驗證 (防止公司 B 在未授權網站盜用公司 A 的配額)
    const isOriginValid = validateCompanyOrigin(companyRecord, origin, referer);
    if (!isOriginValid && process.env.NODE_ENV === "production") {
      console.warn(
        `[Security Denied] Cross-tenant unauthorized chat request for company: ${companyId}, origin: ${origin}`
      );
      const deniedRes = NextResponse.json(
        { error: "此網域未獲授權使用該公司的 AI 客服系統" },
        { status: 403 }
      );
      return setCorsHeaders(deniedRes, origin);
    }

    // 3. 取得客戶端 IP 並進行防刷頻率限制
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateLimitKey = `${companyId}:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, companyRecord.rateLimitPerMinute)) {
      const limitedRes = NextResponse.json(
        { reply: AI_CONFIG.rateLimitMessage },
        { status: 429 }
      );
      return setCorsHeaders(limitedRes, origin);
    }

    // 4. 輸入長度與防護檢查
    if (!message || typeof message !== "string" || !message.trim()) {
      const badReqRes = NextResponse.json(
        { error: "請輸入您的問題" },
        { status: 400 }
      );
      return setCorsHeaders(badReqRes, origin);
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > AI_CONFIG.maxInputLength) {
      const longRes = NextResponse.json(
        { reply: AI_CONFIG.inputTooLongMessage },
        { status: 400 }
      );
      return setCorsHeaders(longRes, origin);
    }

    // 5. 格式化對話歷史紀錄
    const validHistory: ChatMessage[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-AI_CONFIG.maxHistoryTurns)) {
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

    // 6. 伺服器動態建構該公司專屬 System Instruction (Prompt)
    const systemInstruction = buildSaaSCustomerServicePrompt({
      companyName: companyRecord.publicConfig.companyName,
      assistantName: companyRecord.publicConfig.assistantName,
      knowledgeBaseText: companyRecord.knowledgeBaseText,
      fallbackMessage: companyRecord.fallbackMessage,
      privacyNotice: companyRecord.publicConfig.privacyNotice,
      customRules: companyRecord.systemInstructionCustom
    });

    // 7. 呼叫伺服器端 Gemini Provider (使用伺服器密鑰 process.env.GEMINI_API_KEY)
    const provider = new GeminiChatProvider();
    const result = await provider.sendMessage({
      message: cleanMessage,
      history: validHistory,
      systemInstruction,
      model: AI_CONFIG.model,
      temperature: AI_CONFIG.temperature,
      clientIpHash: `${companyId}_${clientIp.substring(0, 10)}`
    });

    const successRes = NextResponse.json({
      reply: result.reply,
      companyId: companyRecord.companyId
    });

    return setCorsHeaders(successRes, origin);
  } catch (err: unknown) {
    console.error("[SaaS Chat API Error]", err);
    const errRes = NextResponse.json(
      { reply: AI_CONFIG.offlineMessage },
      { status: 500 }
    );
    return setCorsHeaders(errRes, origin);
  }
}
