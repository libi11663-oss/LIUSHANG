import { NextRequest, NextResponse } from "next/server";
import { getAllCompaniesList } from "@/lib/saas/knowledge-service";

/**
 * 簡易安全的 Admin 身份校驗機制
 * 1. 預設密碼為 ADMIN_SECRET_KEY 環境變數，若無設定則預設 'admin888'（提示於後台登入介面）
 * 2. 透過 Header: Authorization: Bearer <token> 或 Cookie: admin_session 傳送
 */
function verifyAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET_KEY || "admin888";
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === adminSecret) return true;
  }
  const sessionCookie = req.cookies.get("admin_session")?.value;
  if (sessionCookie && sessionCookie === adminSecret) {
    return true;
  }
  return false;
}

// 產生唯一的公開 Widget ID：格式 wgt_xxxxxxxxxxxx (9-12位隨機安全字串)
function generateWidgetId(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 10; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `wgt_${randomStr}`;
}

// 產生安全的 company_id slug (若使用者未輸入英數代碼，由名稱或隨機自動產生)
function sanitizeCompanyId(raw: string): string {
  const clean = (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  if (clean.length >= 2) return clean;
  return `company_${Math.random().toString(36).substring(2, 8)}`;
}

// 解析允許的網域清單
function parseOrigins(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n,;]+/)
    .map((s) => {
      let trimmed = s.trim().toLowerCase();
      // 去除 http:// 或 https:// 及路徑，保留主機網域名稱
      try {
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          const url = new URL(trimmed);
          trimmed = url.hostname;
        } else {
          trimmed = trimmed.split("/")[0].split(":")[0];
        }
      } catch {
        // 保留原樣
      }
      return trimmed;
    })
    .filter(Boolean);
}

// GET: 取得目前所有已註冊的企業客戶列表
export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未授權存取，請先登入管理員帳號" }, { status: 401 });
  }

  const companies = await getAllCompaniesList();
  return NextResponse.json({
    success: true,
    companies: companies.map((c) => ({
      companyId: c.companyId,
      widgetId: c.widgetId,
      companyName: c.publicConfig.companyName,
      assistantName: c.publicConfig.assistantName,
      websiteUrl: c.websiteUrl || "",
      allowedOrigins: c.allowedOrigins,
      status: c.status,
      rateLimit: c.rateLimitPerMinute,
      knowledgeLength: c.knowledgeBaseText?.length || 0,
      createdAt: c.createdAt || new Date().toISOString()
    }))
  });
}

// POST: 新增一家公司，資料直接寫入 Supabase，絕不修改程式碼
export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未授權存取，請先登入管理員帳號" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      companyName,
      companyId: inputCompanyId,
      websiteUrl,
      allowedOrigins: inputOrigins,
      assistantName,
      welcomeMessage,
      primaryColor,
      quickQuestions: inputQuickQuestions,
      knowledgeContent,
      fallbackMessage,
      rateLimit
    } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: "請輸入公司名稱" }, { status: 400 });
    }

    const companyId = sanitizeCompanyId(inputCompanyId || companyName);
    const widgetId = generateWidgetId();
    const origins = parseOrigins(inputOrigins || "");
    const cleanPrimaryColor = (primaryColor || "#123e52").trim();
    const cleanAssistantName = (assistantName || "AI 小幫手").trim();
    const cleanWelcome = (welcomeMessage || "您好！請問今天有什麼我可以協助您的？").trim();
    const cleanFallback = (fallbackMessage || "這個問題目前需要由專人進一步確認，歡迎留下您的聯繫方式。").trim();
    const cleanKnowledge = (knowledgeContent || "").trim();

    // 處理快速問題
    let quickQuestions: string[] = [];
    if (Array.isArray(inputQuickQuestions)) {
      quickQuestions = inputQuickQuestions.map((q) => q.trim()).filter(Boolean);
    } else if (typeof inputQuickQuestions === "string") {
      quickQuestions = inputQuickQuestions.split(/[\n,;]+/).map((q) => q.trim()).filter(Boolean);
    }
    if (quickQuestions.length === 0) {
      quickQuestions = ["服務項目有哪些？", "如何預約諮詢？", "營業時間是什麼時候？"];
    }

    // 構建公開設定 (Public Config)
    const publicConfig = {
      widgetId,
      companyId,
      companyName: companyName.trim(),
      assistantName: cleanAssistantName,
      badgeText: "在線客服",
      tagline: `${companyName.trim()} · 官方服務說明`,
      welcomeMessage: cleanWelcome,
      quickQuestions,
      privacyNotice: "請勿在對話中提供身分證字號、銀行帳號等機密個人資訊。",
      theme: {
        primaryColor: cleanPrimaryColor,
        gradientFrom: cleanPrimaryColor,
        gradientTo: cleanPrimaryColor,
        accentGold: "#b1965e",
        backgroundColor: "#ffffff",
        userBubbleColor: cleanPrimaryColor,
        assistantBubbleColor: "#fcfbf7",
        textColor: "#1f2937"
      }
    };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let writeTarget = "supabase";

    if (supabaseUrl && supabaseKey) {
      // 1. 寫入 Supabase public.companies 表
      const insertCompanyRes = await fetch(`${supabaseUrl}/rest/v1/companies`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          company_id: companyId,
          widget_id: widgetId,
          company_name: companyName.trim(),
          website_url: websiteUrl || "",
          status: "active",
          allowed_origins: origins,
          rate_limit: Number(rateLimit) || 20,
          fallback_message: cleanFallback,
          public_config: publicConfig
        })
      });

      if (!insertCompanyRes.ok) {
        const errorText = await insertCompanyRes.text();
        console.error("[Supabase Insert Company Error]", errorText);
        return NextResponse.json(
          { error: `Supabase 寫入失敗: ${errorText}` },
          { status: 500 }
        );
      }

      // 2. 寫入 Supabase public.knowledge_bases 表
      if (cleanKnowledge) {
        const insertKbRes = await fetch(`${supabaseUrl}/rest/v1/knowledge_bases`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            company_id: companyId,
            category: "核心官方知識",
            title: `${companyName} 核心知識庫`,
            content: cleanKnowledge
          })
        });

        if (!insertKbRes.ok) {
          console.warn("[Supabase Insert KB Warning]", await insertKbRes.text());
        }
      }
    } else {
      writeTarget = "local_memory_preview";
      // 若尚未綁定 Supabase 環境變數，回傳提示引導使用者填寫 Supabase 變數，同時建立展示資料
    }

    // 產生專屬網站安裝代碼 (Embed Code)
    const host = req.headers.get("host") || "mowang.com.tw";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const scriptSrc = `${protocol}://${host}/widget.js`;

    const embedCode = `<!-- ${companyName.trim()} 專屬 AI 客服 Widget -->
<script
  src="${scriptSrc}"
  data-widget-id="${widgetId}"
  defer>
</script>`;

    return NextResponse.json({
      success: true,
      writeTarget,
      company: {
        companyId,
        widgetId,
        companyName: companyName.trim(),
        assistantName: cleanAssistantName,
        websiteUrl: websiteUrl || "",
        allowedOrigins: origins,
        embedCode
      },
      message: writeTarget === "supabase" 
        ? "公司資料已成功寫入 Supabase 資料庫！已自動產生專屬 Widget ID 與安裝碼。" 
        : "目前未偵測到 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY，系統已自動為您預覽生成 Widget ID 與安裝碼。請在 Vercel 設定 Supabase 環境變數即可永久儲存。"
    });
  } catch (err: unknown) {
    console.error("[Admin Create Company Error]", err);
    return NextResponse.json({ error: "伺服器內部錯誤，建立失敗" }, { status: 500 });
  }
}
