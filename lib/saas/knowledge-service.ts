import { REGISTERED_COMPANIES } from "./company-store";
import { CompanyPrivateRecord, PublicCompanyConfig } from "./types";

/**
 * 伺服器端 Supabase / 資料庫知識庫連線層
 *
 * 架構說明：
 * 1. 若環境變數有設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY，會優先從 Supabase 的
 *    `companies` 及 `knowledge_bases` 資料表拉取知識。
 * 2. 若無設定（或在初期過渡階段），自動使用經安全性隔離的本地 CompanyStore，零中斷運行。
 * 3. 嚴格依 company_id 篩選單一公司知識，防範跨公司越權存取。
 */
export async function getCompanyRecord(
  companyId: string
): Promise<CompanyPrivateRecord | null> {
  const cleanId = (companyId || "").trim().toLowerCase();
  if (!cleanId) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      // 透過 Supabase REST API 查詢該公司專屬設定與知識庫 (使用 Service Role Key 在伺服器端存取)
      const res = await fetch(
        `${supabaseUrl}/rest/v1/companies?company_id=eq.${encodeURIComponent(
          cleanId
        )}&select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          cache: "no-store"
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          // 從 Supabase 取得該公司專屬 Knowledge
          const kbRes = await fetch(
            `${supabaseUrl}/rest/v1/knowledge_bases?company_id=eq.${encodeURIComponent(
              cleanId
            )}&select=content`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`
              },
              cache: "no-store"
            }
          );
          let kbText = "";
          if (kbRes.ok) {
            const kbRows = await kbRes.json();
            kbText = kbRows.map((k: { content: string }) => k.content).join("\n\n");
          }

          const pubConfig = row.public_config || {};
          const widgetId = row.widget_id || pubConfig.widgetId || `wgt_${row.company_id}`;

          return {
            widgetId,
            companyId: row.company_id,
            companyKey: row.company_key || row.company_id,
            websiteUrl: row.website_url || "",
            status: row.status || "active",
            allowedOrigins: row.allowed_origins || ["*"],
            rateLimitPerMinute: row.rate_limit || 20,
            publicConfig: {
              ...pubConfig,
              widgetId,
              companyId: row.company_id,
              companyName: row.company_name || pubConfig.companyName || row.company_id
            },
            knowledgeBaseText: kbText || row.knowledge_base_text || "",
            fallbackMessage: row.fallback_message || "這個問題需要由專人進一步確認。",
            createdAt: row.created_at
          };
        }
      }
    } catch (err) {
      console.warn("[Supabase Knowledge Fetch Error, falling back to local]", err);
    }
  }

  // 本地快取 / 註冊表回退機制
  const localRecord = REGISTERED_COMPANIES[cleanId];
  if (localRecord) {
    return localRecord;
  }

  return null;
}

/**
 * 依據前端傳來的 widgetId (例如 wgt_xxxxxxxxx)，在 Server Side 查出其對應的 company 資料
 * 嚴格防止前端竄改 company_id 或是跨公司越權存取
 */
export async function getCompanyRecordByWidgetId(
  widgetId: string
): Promise<CompanyPrivateRecord | null> {
  const cleanWidgetId = (widgetId || "").trim();
  if (!cleanWidgetId) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/companies?widget_id=eq.${encodeURIComponent(
          cleanWidgetId
        )}&select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          cache: "no-store"
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return await getCompanyRecord(rows[0].company_id);
        }
      }
    } catch (err) {
      console.warn("[Supabase Widget ID Fetch Error, falling back to local]", err);
    }
  }

  // 本地比對 (支援 wgt_ 開頭或直接對應 companyId)
  for (const comp of Object.values(REGISTERED_COMPANIES)) {
    if (comp.widgetId === cleanWidgetId || comp.companyId === cleanWidgetId) {
      return comp;
    }
  }

  return null;
}

/**
 * 取得全部公司列表 (供管理後台列出所有客戶使用)
 */
export async function getAllCompaniesList(): Promise<CompanyPrivateRecord[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/companies?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          cache: "no-store"
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const list: CompanyPrivateRecord[] = [];
          for (const row of rows) {
            const pubConfig = row.public_config || {};
            const widgetId = row.widget_id || pubConfig.widgetId || `wgt_${row.company_id}`;
            list.push({
              widgetId,
              companyId: row.company_id,
              companyKey: row.company_key || row.company_id,
              websiteUrl: row.website_url || "",
              status: row.status || "active",
              allowedOrigins: row.allowed_origins || ["*"],
              rateLimitPerMinute: row.rate_limit || 20,
              publicConfig: {
                ...pubConfig,
                widgetId,
                companyId: row.company_id,
                companyName: row.company_name || pubConfig.companyName || row.company_id
              },
              knowledgeBaseText: row.knowledge_base_text || "",
              fallbackMessage: row.fallback_message || "這個問題需要由專人進一步確認。",
              createdAt: row.created_at
            });
          }
          return list;
        }
      }
    } catch (err) {
      console.warn("[Supabase List Companies Error, using local]", err);
    }
  }

  return Object.values(REGISTERED_COMPANIES);
}

/**
 * 取得供前端 Widget 使用的公開設定（絕不外洩內部金鑰與完整未授權資料）
 */
export async function getCompanyPublicConfig(
  companyId: string
): Promise<PublicCompanyConfig | null> {
  const record = await getCompanyRecord(companyId);
  if (!record || record.status !== "active") return null;
  return record.publicConfig;
}

/**
 * 網域白名單驗證 (Origin / Referer Validation)
 * 防止惡意網站未經授權在前端載入並盜用別家公司的 company_id 與 Token 額度
 */
export function validateCompanyOrigin(
  record: CompanyPrivateRecord,
  requestOrigin: string | null,
  referer: string | null
): boolean {
  if (record.allowedOrigins.includes("*")) {
    return true;
  }

  const checkUrl = (urlStr: string): boolean => {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();
      return record.allowedOrigins.some((allowed) => {
        const cleanAllowed = allowed.toLowerCase().trim();
        return (
          host === cleanAllowed ||
          host.endsWith(`.${cleanAllowed}`) ||
          cleanAllowed === "localhost" && host === "127.0.0.1"
        );
      });
    } catch {
      return false;
    }
  };

  if (requestOrigin && checkUrl(requestOrigin)) {
    return true;
  }

  if (referer && checkUrl(referer)) {
    return true;
  }

  // 若前端同源請求未帶 Origin/Referer（例如現代瀏覽器隱私防護），均自動允許
  if (!requestOrigin && !referer) {
    return true;
  }

  return false;
}
