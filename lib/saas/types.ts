/**
 * AI SaaS 多租戶公司型別定義
 */

export interface PublicCompanyTheme {
  primaryColor: string; // 主色 (如 Prussian Blue: #123e52)
  gradientFrom: string;
  gradientTo: string;
  accentGold: string; // 輔色/金邊
  backgroundColor: string;
  userBubbleColor: string;
  assistantBubbleColor: string;
  textColor: string;
}

export interface PublicCompanyConfig {
  widgetId: string; // 公開 Widget 唯一碼，例如 'wgt_liusheng_live' 或 'wgt_abc123xyz'
  companyId: string;
  companyName: string;
  assistantName: string;
  badgeText: string;
  tagline: string;
  avatarText?: string;
  logoUrl?: string;
  welcomeMessage: string;
  quickQuestions: string[];
  privacyNotice: string;
  theme: PublicCompanyTheme;
  ctaButton?: {
    label: string;
    targetSelectorOrUrl: string;
  };
}

export interface CompanyPrivateRecord {
  widgetId: string; // 公開 Widget 唯一碼
  companyId: string;
  companyKey: string; // 內部私密唯一 key
  websiteUrl?: string; // 公司官網網址
  status: "active" | "suspended" | "trial";
  allowedOrigins: string[]; // 域名白名單防盜用 (如 ["mowang.com.tw", "localhost", "127.0.0.1"])
  rateLimitPerMinute: number;
  publicConfig: PublicCompanyConfig;
  knowledgeBaseText: string; // 注入 AI 的知識庫內容
  systemInstructionCustom?: string;
  fallbackMessage: string;
  createdAt?: string;
}
