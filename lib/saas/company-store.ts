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

  // 客戶 002：妙算月老線上求籤 (https://yuelao.tw/)
  yuelao: {
    companyId: "yuelao",
    widgetId: "wgt_yuelao_live",
    companyKey: "comp_yuelao_live",
    websiteUrl: "https://yuelao.tw",
    status: "active",
    allowedOrigins: [
      "*",
      "yuelao.tw",
      "www.yuelao.tw",
      "mowang.com.tw",
      "www.mowang.com.tw",
      "localhost",
      "127.0.0.1",
      "run.app",
      "vercel.app"
    ],
    rateLimitPerMinute: 20,
    publicConfig: {
      widgetId: "wgt_yuelao_live",
      companyId: "yuelao",
      companyName: "妙算月老線上求籤",
      assistantName: "月老廟祝 AI 小幫手",
      badgeText: "紅線牽姻緣",
      tagline: "線上擲筊求籤 · 六十甲子靈籤解惑",
      welcomeMessage:
        "善信您好，歡迎來到「妙算月老線上求籤」。無論想了解線上擲筊求籤步驟、籤詩意解、香油錢隨喜或隱私安全，都可以問我。",
      quickQuestions: [
        "如何向月老線上求籤？",
        "一直擲不到聖筊怎麼辦？",
        "香油錢隨喜怎麼付款？",
        "默念的個資會被記錄嗎？"
      ],
      privacyNotice:
        "請勿在對話中輸入信用卡號或密碼；求籤時之姓名與生辰僅需在心中默念。",
      theme: {
        primaryColor: "#7c1f2b",
        gradientFrom: "#5c141e",
        gradientTo: "#7c1f2b",
        accentGold: "#c9a15a",
        backgroundColor: "#fffdf9",
        userBubbleColor: "#7c1f2b",
        assistantBubbleColor: "#f9f3e6",
        textColor: "#2b2320"
      },
      ctaButton: {
        label: "隨喜添香油錢",
        targetSelectorOrUrl: "#offeringBlock"
      }
    },
    systemInstructionCustom:
      "語氣請保持溫和、安定、帶有台灣傳統月老廟宇的祝福感（可適度稱呼訪客為「您」或「善信」），回答請條理分明、簡潔好讀。若訪客貼出他在網站抽到的六十甲子籤詩內容或詢問感情方向，可依據傳統六十甲子籤意與正向感情經營觀念給予溫暖鼓勵，並提醒『姻緣詳解僅供參考，仍需自己用心經營，誠心祈願，好運自來』。",
    knowledgeBaseText: `【網站基本資料】
- 網站名稱：妙算月老線上求籤（yuelao.tw）
- 網站標語：紅線牽姻緣｜免出門線上擲筊求姻緣籤
- 服務性質：提供免費線上擲筊與抽取台灣廟宇通行之「六十甲子籤」（全套六十首，第1首甲子至第60首癸亥）姻緣靈籤服務。
- 官方聯絡信箱：libi11663@gmail.com

【線上求籤三步驟（標準流程）】
1. 第一步：誠心稟報與擲筊
   - 請先在心中默念自己的「姓名」、「生日」與「住址」（若有生辰八字更佳），並想清楚今天要向月老請示的感情或姻緣問題（建議一事一問）。
   - 默念完畢後，點擊畫面上的「擲筊」按鈕，請示月老是否同意賜籤。
   - 筊杯結果說明：
     * 「聖筊」（一正一反）：代表月老允筊同意賜籤，系統會自動開啟抽籤籤筒。
     * 「笑筊」（兩平面朝上）：代表月老笑而不語，可能是心意已明、問題不夠具體，或心中已有答案，建議重新釐清問題並誠心默念後再擲。
     * 「陰筊／蓋筊」（兩凸面朝上）：代表暫時不宜或問題方向需要調整，請稍作沉澱、重新稟報問題後再擲筊。
2. 第二步：搖籤筒抽籤
   - 獲得聖筊後，進入抽籤畫面，請再次誠心默念心中所求，點擊「抽籤」按鈕，系統會搖動籤筒並抽出專屬靈籤。
3. 第三步：查看靈籤與意解
   - 籤詩結果包含：第幾首（共60首）、歲次干支、籤運等級（如上上籤、大吉、中吉、中平、下籤等）、婚姻評語（大吉／吉／普／慎／凶）、緣份深淺（深厚／漸濃／未定／尚淺／淺薄）、四句七言籤詩，以及白話「意解」與感情建議。
   - 如需重新求問其他問題，可重新整理頁面再次誠心稟報。

【姻緣香油錢隨喜（贊助與金流說明）】
- 線上求籤完全免費。若善信感念月老指點，或想添香油錢祈求早日脫單、愛情圓滿，可於頁面下方「姻緣香油錢隨喜」區塊點擊「投投香油錢」。
- 單次隨喜金額預設為新台幣 100 元（NT$100）。
- 付款方式：點擊後將導向「PAYUNi 統一金流」安全加密付款頁面進行信用卡付款。
- 付款安全：yuelao.tw 網站本身絕對不會接觸、經手或儲存您的信用卡卡號與支付敏感資訊。

【音效與介面操作常見問題】
- 畫面右上角有兩個圓形按鈕：
  1. 「🔊」音效開關：本網站採用 Web Audio 即時合成木頭清脆擲筊聲、搖籤筒聲與靈籤鐘磬聲。若手機沒有聲音，請確認手機是否關閉靜音模式，並確保右上角喇叭為開啟狀態。
  2. 「?」說明按鈕：點擊可重新查看線上月老求籤的稟報說明。

【隱私權政策與個資保護】
- 擲筊、抽籤過程中所默念的姓名、生日、住址、生辰八字與感情問題，僅在您個人心中默念祈願，完全不需要在網頁輸入，也「絕對不會」被傳送或儲存至任何伺服器。
- 本網站目前未使用任何用於廣告投放或使用者行為分析之 Cookie 或追蹤工具，並採用 HTTPS 加密連線保護網站安全。`,
    fallbackMessage:
      "這個問題目前超出線上求籤小幫手的說明範圍，若您有網站操作、隨喜金流或合作相關問題，歡迎來信官方信箱 libi11663@gmail.com 由專人為您服務。"
  },

  // 客戶 003 範例（架構預留：未來隨時新增）
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
