import { CompanyPrivateRecord } from "./types";
import { getFormattedKnowledgeBase } from "../customer-service-knowledge";

/**
 * 伺服器端集中公司登錄表 (Server-Side Registry)
 *
 * 安全性保證：
 * 1. 僅存放於後端伺服器內存或未來轉入 Supabase `companies` 資料表。
 * 2. 透過 allowedOrigins 校驗 Origin/Referer，防止外部網站偽造 companyId。
 * 3. 各公司擁有完全隔離的知識庫，絕不跨公司污染或外洩。
 */
export const REGISTERED_COMPANIES: Record<string, CompanyPrivateRecord> = {
  // 客戶 001：留聲｜人生故事典藏
  liusheng: {
    companyId: "liusheng",
    widgetId: "wgt_liusheng_live",
    companyKey: "comp_liusheng_live",
    websiteUrl: "https://mowang.com.tw",
    status: "active",
    allowedOrigins: [
      "*",
      "mowang.com.tw",
      "www.mowang.com.tw",
      "localhost",
      "127.0.0.1",
      "run.app",
      "vercel.app"
    ],
    rateLimitPerMinute: 20,
    publicConfig: {
      widgetId: "wgt_liusheng_live",
      companyId: "liusheng",
      companyName: "留聲｜人生故事典藏",
      assistantName: "留聲 AI 小幫手",
      badgeText: "即時解答",
      tagline: "人生故事典藏諮詢 · 官方服務說明",
      welcomeMessage:
        "您好，我是留聲 AI 小幫手。關於人生訪談、故事冊、紀錄片、人生典藏頁與免費試作，都可以問我。",
      quickQuestions: [
        "免費試作包含什麼？",
        "長輩不會用電腦可以嗎？",
        "可以製作精裝書嗎？",
        "故事會公開嗎？"
      ],
      privacyNotice:
        "請勿在對話中提供身分證字號、銀行帳號、病歷等敏感個人資料。",
      theme: {
        primaryColor: "#123e52",
        gradientFrom: "#10364a",
        gradientTo: "#123e52",
        accentGold: "#b1965e",
        backgroundColor: "#fffefb",
        userBubbleColor: "#17485e",
        assistantBubbleColor: "#fffdf9",
        textColor: "#20343e"
      },
      ctaButton: {
        label: "前往試作申請表單",
        targetSelectorOrUrl: "#apply"
      }
    },
    knowledgeBaseText: getFormattedKnowledgeBase(),
    fallbackMessage:
      "這個問題目前需要由留聲團隊進一步確認，我可以引導您前往申請表單留下聯絡資訊。"
  },

  // 客戶 002 範例（架構預留：未來隨時新增）
  company_002: {
    companyId: "company_002",
    widgetId: "wgt_demo_company002",
    companyKey: "comp_002_demo",
    websiteUrl: "https://example.com",
    status: "active",
    allowedOrigins: ["example.com", "localhost", "127.0.0.1"],
    rateLimitPerMinute: 15,
    publicConfig: {
      widgetId: "wgt_demo_company002",
      companyId: "company_002",
      companyName: "未來示範企業",
      assistantName: "示範客服助理",
      badgeText: "在線客服",
      tagline: "24 小時智慧答覆",
      welcomeMessage: "您好！我是企業智慧客服，請問今天能為您提供什麼協助？",
      quickQuestions: ["服務項目有哪些？", "如何預約諮詢？", "營業時間是什麼時候？"],
      privacyNotice: "請勿在對話中透露銀行帳號等機密個人資訊。",
      theme: {
        primaryColor: "#2563eb",
        gradientFrom: "#1d4ed8",
        gradientTo: "#2563eb",
        accentGold: "#60a5fa",
        backgroundColor: "#ffffff",
        userBubbleColor: "#2563eb",
        assistantBubbleColor: "#f8fafc",
        textColor: "#0f172a"
      }
    },
    knowledgeBaseText: "【示範公司介紹】這是一家提供企業智慧解決方案的示範公司。",
    fallbackMessage: "這個問題需要由專人為您服務，請留下您的聯繫方式。"
  }
};
