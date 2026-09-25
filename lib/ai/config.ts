/**
 * AI 客服集中設定檔
 * 集中管理模型名稱、限制參數與預設回覆，方便日後隨時調整或抽換模型。
 */

function resolveModelName(): string {
  const envModel = process.env.CHAT_MODEL_NAME;
  if (!envModel || envModel.includes("2.5")) {
    return "gemini-3.5-flash-lite";
  }
  return envModel;
}

export const AI_CONFIG = {
  // 集中設定模型名稱：低成本、反應迅速的文字客服首選
  model: resolveModelName(),

  // 輸入限制
  maxInputLength: 500,

  // 對話歷史記錄最大回合數 (避免 token 膨脹)
  maxHistoryTurns: 6,

  // 頻率限制 (每分鐘每 IP 允許最大請求次數)
  rateLimitPerMinute: 15,

  // 溫度參數 (客服需穩定、精準、不天馬行空)
  temperature: 0.3,

  // 缺乏資訊時的固定指示句
  fallbackMessage:
    "這個問題目前需要由留聲團隊進一步確認，我可以引導您前往申請表單留下聯絡資訊。",

  // 系統離線或故障時的友善提示
  offlineMessage:
    "AI 客服小幫手目前正在休息維護中。若您有任何疑問，歡迎直接滑動至網頁下方填寫試作申請表單，留聲團隊將會盡快與您聯繫！",

  // 輸入超過長度提示
  inputTooLongMessage:
    "問題字數請在 500 字以內，方便小幫手為您更精準解答。",

  // 頻率限制觸發提示
  rateLimitMessage:
    "諮詢次數較為頻繁，請稍候半分鐘後再提出問題，感謝您的耐心等待。"
};
