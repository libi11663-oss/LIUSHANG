"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Send,
  Sparkles,
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { PublicCompanyConfig } from "@/lib/saas/types";

interface HostedChatClientProps {
  initialCompany: PublicCompanyConfig | null;
  targetId: string;
}

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  time: string;
}

export default function HostedChatClient({
  initialCompany,
  targetId
}: HostedChatClientProps) {
  const [config, setConfig] = useState<PublicCompanyConfig | null>(initialCompany);
  const [loadingConfig, setLoadingConfig] = useState(!initialCompany);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialCompany) {
      return [
        {
          id: "welcome-init",
          role: "model",
          content: initialCompany.welcomeMessage,
          time: "00:00"
        }
      ];
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // 分享 & QR Code 彈窗
  const [showShareModal, setShowShareModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareUrl] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.href : ""
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 若伺服器端尚未載入，由前端拉取
  useEffect(() => {
    if (!config) {
      fetch(`/api/saas/widget-config?companyId=${encodeURIComponent(targetId)}&widgetId=${encodeURIComponent(targetId)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((data) => {
          if (data?.config) {
            setConfig(data.config);
            setMessages((prev) => {
              if (prev.length === 0) {
                return [
                  {
                    id: "welcome-async",
                    role: "model",
                    content: data.config.welcomeMessage,
                    time: "00:00"
                  }
                ];
              }
              return prev;
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingConfig(false);
        });
    }
  }, [config, targetId]);

  // 2. 自動捲動至最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // 3. 產生 QR Code
  useEffect(() => {
    if (showShareModal) {
      const currentUrl =
        shareUrl || (typeof window !== "undefined" ? window.location.href : "");
      if (currentUrl) {
        QRCode.toDataURL(currentUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: config?.theme?.primaryColor || "#0f172a",
            light: "#ffffff"
          }
        })
          .then((url) => setQrCodeDataUrl(url))
          .catch((err) => console.error("QR Code generation error", err));
      }
    }
  }, [showShareModal, shareUrl, config]);

  const handleCopyLink = () => {
    const currentUrl =
      shareUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (typeof navigator !== "undefined" && navigator.clipboard && currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `${config?.companyName || "ai-chat"}-qrcode.png`;
    a.click();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || sending || !config) return;

    const userMsg: Message = {
      id: `usr-${messages.length + 1}`,
      role: "user",
      content: text,
      time: "剛剛"
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setSending(true);

    try {
      // 整理歷史記錄（排除第一則歡迎詞）
      const historyPayload = messages
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/saas/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Widget-Id": config.widgetId,
          "X-Widget-Company-Id": config.companyId
        },
        body: JSON.stringify({
          widgetId: config.widgetId,
          companyId: config.companyId,
          message: text,
          history: historyPayload
        })
      });

      const data = await res.json();
      const replyText =
        data.reply || "感謝您的詢問，系統目前稍微繁忙，請稍後重試。";

      setMessages((prev) => [
        ...prev,
        {
          id: `mod-${prev.length + 1}`,
          role: "model",
          content: replyText,
          time: "剛剛"
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${prev.length + 1}`,
          role: "model",
          content: "網路連線稍有延遲，請稍候再試一次。",
          time: "剛剛"
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  // 查無公司時的友善提示
  if (!loadingConfig && !config) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">未找到該企業的客服頁面</h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            找不到代碼為 <code className="text-amber-300 font-mono">{targetId}</code> 的專屬客服。請確認網址是否正確，或至 SaaS 管理後台確認已登錄此企業。
          </p>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition"
          >
            前往 SaaS 管理後台
          </a>
        </div>
      </div>
    );
  }

  // 取得主題設定
  const theme = config?.theme || {
    primaryColor: "#123e52",
    gradientFrom: "#10364a",
    gradientTo: "#123e52",
    accentGold: "#c9a15a",
    backgroundColor: "#fffdf9",
    userBubbleColor: "#17485e",
    assistantBubbleColor: "#fffdf9",
    textColor: "#20343e"
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between font-sans antialiased"
      style={{
        backgroundColor: "#f4f1eb",
        color: theme.textColor
      }}
    >
      {/* 頂部品牌導航列 (Top Bar Contract: 3 區塊) */}
      <header
        className="w-full sticky top-0 z-20 shadow-md border-b"
        style={{
          background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
          borderColor: `${theme.accentGold}40`,
          color: "#ffffff"
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                border: `1px solid ${theme.accentGold}80`,
                color: theme.accentGold
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white tracking-wide">
                  {config?.companyName}
                </h1>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${theme.accentGold}33`,
                    border: `1px solid ${theme.accentGold}66`,
                    color: "#ffffff"
                  }}
                >
                  {config?.badgeText || "24H 在線"}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">{config?.tagline || "官方 AI 智慧客服"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#ffffff"
              }}
              title="取得專屬連結與 QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">專屬連結 & QR Code</span>
            </button>

            {config?.ctaButton && (
              <a
                href={config.ctaButton.targetSelectorOrUrl}
                target={config.ctaButton.targetSelectorOrUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                style={{
                  backgroundColor: theme.accentGold,
                  color: "#1b1210"
                }}
              >
                <span>{config.ctaButton.label}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 主對話視窗 (響應式居中卡片佈局) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {/* 對話訊息捲動區 */}
        <div
          className="flex-1 rounded-2xl border shadow-sm p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto min-h-[500px] max-h-[calc(100vh-220px)]"
          style={{
            backgroundColor: theme.backgroundColor,
            borderColor: `${theme.accentGold}33`
          }}
        >
          {/* 安全隱私提醒標籤 */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 bg-slate-100/70 py-1.5 px-3 rounded-full mx-auto border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>對話已受加密保護 · 請勿透露銀行密碼等敏感資料</span>
          </div>

          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-end gap-2 max-w-[90%] sm:max-w-[80%]">
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mb-1"
                      style={{
                        backgroundColor: theme.primaryColor
                      }}
                    >
                      AI
                    </div>
                  )}

                  <div
                    className="p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-line"
                    style={{
                      backgroundColor: isUser
                        ? theme.userBubbleColor
                        : theme.assistantBubbleColor,
                      color: isUser ? "#ffffff" : theme.textColor,
                      border: isUser
                        ? "none"
                        : `1px solid ${theme.accentGold}40`,
                      borderRadius: isUser
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px"
                    }}
                  >
                    {m.content}

                    {/* 行動呼籲按鈕 */}
                    {!isUser &&
                      config?.ctaButton &&
                      (m.content.includes("表單") ||
                        m.content.includes("聯絡") ||
                        m.content.includes("香油錢") ||
                        m.content.includes("隨喜")) && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                          <a
                            href={config.ctaButton.targetSelectorOrUrl}
                            target={
                              config.ctaButton.targetSelectorOrUrl.startsWith("http")
                                ? "_blank"
                                : undefined
                            }
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition"
                            style={{
                              backgroundColor: theme.primaryColor,
                              color: "#ffffff"
                            }}
                          >
                            <span>{config.ctaButton.label}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {m.time}
                </span>
              </div>
            );
          })}

          {sending && (
            <div className="flex items-start gap-2 max-w-[80%]">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: theme.primaryColor }}
              >
                AI
              </div>
              <div
                className="p-3.5 rounded-2xl text-xs flex items-center gap-2 border shadow-sm"
                style={{
                  backgroundColor: theme.assistantBubbleColor,
                  borderColor: `${theme.accentGold}40`,
                  color: theme.textColor
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: theme.primaryColor }} />
                <span>{config?.assistantName || "小幫手"} 正在思考回答...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 快捷推薦問題按鈕 */}
        {config?.quickQuestions && config.quickQuestions.length > 0 && (
          <div className="py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap pl-1">
              推薦問題：
            </span>
            {config.quickQuestions.map((q, idx) => (
              <button
                key={idx}
                disabled={sending}
                onClick={() => handleSendMessage(q)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs transition border shadow-xs disabled:opacity-50"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: `${theme.accentGold}60`,
                  color: theme.textColor
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* 底部輸入框 */}
        <div
          className="rounded-2xl p-2 sm:p-2.5 border shadow-sm bg-white mt-1"
          style={{
            borderColor: `${theme.accentGold}40`
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={1}
              placeholder="請輸入您的問題...（按 Enter 發送）"
              className="flex-1 max-h-28 min-h-[42px] py-2 px-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-2.5 rounded-xl text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow"
              style={{
                backgroundColor: theme.primaryColor
              }}
              title="發送訊息"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="px-2 pt-1.5 pb-0.5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{config?.privacyNotice || "請勿輸入敏感機密資料"}</span>
            <span className="hidden sm:inline">Powered by Gemini 3.8</span>
          </div>
        </div>
      </main>

      {/* 獨立專屬網址 & QR Code 彈窗 (完美解決無網站/不需HTML) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    專屬網頁連結 & QR Code
                  </h3>
                  <p className="text-[11px] text-slate-500">零網站、零程式碼，任何人點開即聊</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* QR Code 預覽 */}
            <div className="flex flex-col items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="AI Chat QR Code"
                  className="w-48 h-48 rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  生成 QR Code 中...
                </div>
              )}
              <div className="text-[11px] text-slate-500 mt-2 text-center">
                可將此 QR Code 印於<strong>名片、菜單、店面櫃檯立牌、宣傳海報</strong>
              </div>
              <button
                onClick={handleDownloadQr}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                下載 QR Code 圖片 (PNG)
              </button>
            </div>

            {/* 專屬網址複製 */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                專屬直連網址 (可直接貼到 LINE / IG / FB / Google 商家)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      已複製
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      複製網址
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 使用情境指引 */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                沒有網站或客戶無法改 HTML 時的用法：
              </div>
              <p>• <strong>LINE 官方帳號</strong>：放進「圖文選單按鈕」或設為歡迎詞自動回應。</p>
              <p>• <strong>Instagram / Facebook</strong>：放進個人首頁簡介連結「24H 智慧線上諮詢」。</p>
              <p>• <strong>Google 商家檔案</strong>：填入「網站」或「預約/諮詢連結」。</p>
            </div>

            <div className="text-right pt-1">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
