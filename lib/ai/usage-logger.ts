/**
 * AI Token 與使用量紀錄器 (Usage Logger)
 *
 * 職責：
 * 1. 記錄每次 API 請求的 input tokens, output tokens, total tokens, 模型名稱、耗時與時間戳記。
 * 2. 第一版以結構化 Server Log 輸出。
 * 3. 預留可抽換的 Storage Adapter（如未來寫入 Cloud SQL / Firestore / 資料庫以供管理後台查看）。
 * 4. 嚴格不對前端公開內部成本數據。
 */

export interface TokenUsageRecord {
  id: string;
  timestamp: string;
  model: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: "success" | "error";
  clientIpHash?: string;
  errorDetail?: string;
}

// 可擴充的儲存介面
export interface UsageLogStorageAdapter {
  save(record: TokenUsageRecord): Promise<void>;
}

// 預設第一版 Console 結構化日誌 Adapter
class ConsoleUsageStorageAdapter implements UsageLogStorageAdapter {
  async save(record: TokenUsageRecord): Promise<void> {
    // 輸出標準化 JSON 日誌，日後可被 Cloud Logging、Datadog 或 Logtail 收集
    const logPayload = {
      tag: "AI_TOKEN_USAGE",
      ...record
    };
    if (record.status === "error") {
      console.warn("[AI Usage Error]", JSON.stringify(logPayload));
    } else {
      console.log("[AI Usage]", JSON.stringify(logPayload));
    }
  }
}

// 可隨時替換為資料庫 Adapter (例如 DatabaseUsageStorageAdapter)
let currentAdapter: UsageLogStorageAdapter = new ConsoleUsageStorageAdapter();

export function setUsageStorageAdapter(adapter: UsageLogStorageAdapter) {
  currentAdapter = adapter;
}

export async function logTokenUsage(record: Omit<TokenUsageRecord, "id" | "timestamp">): Promise<void> {
  const fullRecord: TokenUsageRecord = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...record
  };

  try {
    await currentAdapter.save(fullRecord);
  } catch (err) {
    console.error("Failed to save token usage log:", err);
  }
}
