import { NextRequest, NextResponse } from "next/server";
import { getCompanyRecord, getCompanyRecordByWidgetId, validateCompanyOrigin } from "@/lib/saas/knowledge-service";

/**
 * CORS 與安全性標頭設定
 */
function setCorsHeaders(res: NextResponse, origin: string | null) {
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Widget-Id, X-Widget-Company-Id");
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = new NextResponse(null, { status: 204 });
  return setCorsHeaders(res, origin);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const { searchParams } = new URL(req.url);

  // 優先接收 widgetId (若無則相容舊版 companyId)
  const widgetId = searchParams.get("widgetId") || req.headers.get("x-widget-id");
  const companyId = searchParams.get("companyId") || req.headers.get("x-widget-company-id");

  let companyRecord = null;
  if (widgetId) {
    companyRecord = await getCompanyRecordByWidgetId(widgetId);
  } else if (companyId) {
    companyRecord = await getCompanyRecord(companyId);
  } else {
    // 預設留聲
    companyRecord = await getCompanyRecord("liusheng");
  }

  // 1. 取得公司完整資料
  if (!companyRecord) {
    const errRes = NextResponse.json(
      { error: "無效或未授權的 Widget ID / Company ID" },
      { status: 404 }
    );
    return setCorsHeaders(errRes, origin);
  }

  // 2. 來源網域安全性驗證 (防止跨站未授權濫用)
  const isOriginValid = validateCompanyOrigin(companyRecord, origin, referer);
  if (!isOriginValid && process.env.NODE_ENV === "production") {
    console.warn(`[Security Alert] Unauthorized origin access attempt for company: ${companyRecord.companyId}, origin: ${origin}, referer: ${referer}`);
    const unauthRes = NextResponse.json(
      { error: "此網域未獲授權使用此 AI 客服 Widget" },
      { status: 403 }
    );
    return setCorsHeaders(unauthRes, origin);
  }

  // 3. 僅回傳公開的品牌與客服設定 (絕不含 Gemini Key、系統內部 prompt 或未公開資料)
  const successRes = NextResponse.json({
    success: true,
    config: companyRecord.publicConfig
  });

  return setCorsHeaders(successRes, origin);
}
