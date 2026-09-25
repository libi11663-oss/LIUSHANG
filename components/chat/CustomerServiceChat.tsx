"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquareHeart,
  X,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Minimize2
} from "lucide-react";

interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
}

const INITIAL_GREETING =
  "您好，我是留聲 AI 小幫手。關於人生訪談、故事冊、紀錄片、人生典藏頁與免費試作，都可以問我。";

const QUICK_QUESTIONS = [
  "免費試作包含什麼？",
  "長輩不會用電腦可以嗎？",
  "可以製作精裝書嗎？",
  "故事會公開嗎？"
];

let nextMsgId = 1;
function generateId(prefix: string) {
  return `${prefix}_${nextMsgId++}`;
}

function getCurrentTime() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function CustomerServiceChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      text: INITIAL_GREETING,
      timestamp: ""
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastToggleTimeRef = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggleOpen = () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 250) return;
    lastToggleTimeRef.current = now;
    setIsOpen((prev) => !prev);
  };

  // 當開啟時自動聚焦輸入框
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 原生點擊與觸控綁定雙重防護（防範環境阻擋合成點擊）
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const onNativeClick = () => {
      toggleOpen();
    };

    btn.addEventListener("click", onNativeClick);
    btn.addEventListener("touchend", onNativeClick, { passive: true });

    // 同步暴露至全域以備除錯與跨框架呼叫
    (window as unknown as { __toggleAiChat?: () => void }).__toggleAiChat = toggleOpen;

    return () => {
      btn.removeEventListener("click", onNativeClick);
      btn.removeEventListener("touchend", onNativeClick);
    };
  }, []);

  // 當有新訊息時平滑捲動到底部
  useEffect(() => {
    if (isOpen && messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length]);

  // 支援鍵盤 Escape 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend ?? input).trim();
    if (!messageContent || loading) return;

    const userMessage: Message = {
      id: generateId("user"),
      role: "user",
      text: messageContent,
      timestamp: getCurrentTime()
    };

    // 更新訊息清單
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      // 整理歷史記錄傳遞給後端（轉換成 API 格式）
      const historyPayload = messages
        .filter((m) => m.id !== "init")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          content: m.text
        }));

      let replyText = "";
      const res = await fetch("/api/saas/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Widget-Id": "wgt_liusheng_live",
          "X-Widget-Company-Id": "liusheng"
        },
        body: JSON.stringify({
          widgetId: "wgt_liusheng_live",
          companyId: "liusheng",
          message: messageContent,
          history: historyPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data.reply;
      } else {
        // 自動降級回退到 /api/chat
        const fallbackRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageContent,
            history: historyPayload
          })
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          replyText = fallbackData.reply;
        }
      }

      if (!replyText) {
        replyText =
          "抱歉，目前連線稍有延遲。若您有任何疑問，歡迎隨時透過下方表單聯絡我們。";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: generateId("assistant"),
          role: "assistant",
          text: replyText,
          timestamp: getCurrentTime()
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId("err"),
          role: "assistant",
          text: "網路連線稍不穩定。您也可以直接滑動至網頁下方填寫試作申請表單，留聲團隊將會儘速與您聯繫！",
          timestamp: getCurrentTime()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: generateId("reset"),
        role: "assistant",
        text: INITIAL_GREETING,
        timestamp: ""
      }
    ]);
  };

  const scrollToApplyForm = () => {
    setIsOpen(false);
    const applyEl = document.getElementById("apply");
    if (applyEl) {
      applyEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside aria-label="AI 客服助理" className="font-sans">
      {/* 獨立固定在右下角的對話視窗 */}
      <div
        id="ai-customer-service-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="留聲 AI 小幫手客服對話視窗"
        className={`fixed bottom-[78px] sm:bottom-[86px] right-3 sm:right-6 z-[999999] w-[calc(100vw-24px)] sm:w-[410px] h-[520px] sm:h-[580px] max-h-[calc(100dvh-95px)] flex flex-col bg-[#fffefb] rounded-2xl shadow-2xl border border-[#b1965e]/40 overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto visible"
            : "opacity-0 translate-y-4 pointer-events-none invisible"
        }`}
        style={{
          boxShadow:
            "0 24px 60px rgba(18, 62, 82, 0.25), 0 0 0 1px rgba(177, 150, 94, 0.3)"
        }}
      >
          {/* Header */}
          <header className="px-5 py-4 bg-gradient-to-r from-[#10364a] via-[#17485e] to-[#123e52] text-white flex items-center justify-between border-b border-[#b1965e]/30 flex-shrink-0 h-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#f9f7f1]/15 border border-[#e2d0a3]/40 flex items-center justify-center text-[#e2d0a3] shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium tracking-wider font-serif text-[#f8eee5] m-0">
                    留聲 AI 小幫手
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#af9156]/30 text-[#f5ebd7] border border-[#d8bc7e]/30">
                    即時解答
                  </span>
                </div>
                <p className="text-[11px] text-[#c3d3dc] tracking-wide m-0">
                  人生故事典藏諮詢 · 官方服務說明
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="重新開啟對話"
                aria-label="重新開啟對話"
                className="p-1.5 text-[#d0dfdf] hover:text-[#f8eee5] hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="最小化"
                aria-label="最小化聊天視窗"
                className="p-1.5 text-[#d0dfdf] hover:text-[#f8eee5] hover:bg-white/10 rounded-lg transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="關閉"
                aria-label="關閉聊天視窗"
                className="p-1.5 text-[#d0dfdf] hover:text-[#f8eee5] hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Messages Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-[14px] leading-relaxed bg-[#f9f7f1]/50">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              const mentionsApply =
                isAssistant &&
                (msg.text.includes("申請表單") || msg.text.includes("留下聯絡資訊"));

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                      isAssistant
                        ? "bg-[#fffdf9] text-[#22353f] border border-[#e5ded4] rounded-tl-sm"
                        : "bg-gradient-to-r from-[#17485e] to-[#123e52] text-white rounded-tr-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-[1.75] font-normal">{msg.text}</p>

                    {/* 引導表單按鈕（若 AI 提到需要團隊確認或填寫表單時出現） */}
                    {mentionsApply && (
                      <div className="mt-3 pt-2.5 border-t border-[#b1965e]/20">
                        <button
                          type="button"
                          onClick={scrollToApplyForm}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#123e52] bg-[#f2ecde] hover:bg-[#ebd5ad] px-3 py-1.5 rounded-full border border-[#c5b084] transition-all"
                        >
                          <span>前往試作申請表單</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#917742]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.timestamp && (
                    <span className="text-[10px] text-[#93877d] mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              );
            })}

            {/* 載入中動畫 */}
            {loading && (
              <div className="flex items-start">
                <div className="bg-[#fffdf9] border border-[#e5ded4] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span className="text-[12px] text-[#786b62] mr-1">留聲小幫手正在思考</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#af9156] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#af9156] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#af9156] animate-bounce" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 快速問題按鈕列（只在第一輪或輔助探索時提供） */}
          <div className="px-3.5 py-2.5 bg-[#f5f1e8] border-t border-[#e2d8ca] flex-shrink-0">
            <div className="text-[11px] text-[#867667] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#af9156]" />
              <span>常客詢問：</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendMessage(q)}
                  className="whitespace-nowrap flex-shrink-0 text-[12px] bg-white hover:bg-[#eee6d7] text-[#2c3f49] border border-[#d5c7b3] px-2.5 py-1 rounded-full transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-[#fffefb] border-t border-[#e4dcce] flex-shrink-0">
            <div className="flex items-end gap-2 bg-[#f9f8f4] border border-[#d8cfc3] rounded-xl p-2 focus-within:border-[#9c875c] focus-within:ring-2 focus-within:ring-[#b1965e]/20 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入您的問題（Enter 送出）..."
                rows={1}
                maxLength={500}
                disabled={loading}
                className="w-full resize-none border-0 bg-transparent text-[14px] text-[#20343e] placeholder-[#93857a] focus:outline-none focus:ring-0 max-h-24 leading-relaxed"
                style={{ minHeight: "24px" }}
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                title="發送訊息"
                aria-label="發送訊息"
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#123e52] hover:bg-[#1b5269] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* 隱私聲明提示 */}
            <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#867a70]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#af9156] flex-shrink-0" />
              <span>請勿在對話中提供身分證字號、銀行帳號、病歷等敏感個人資料。</span>
            </div>
          </div>
        </div>

      {/* 懸浮按鈕：常駐右下角 */}
      <button
        ref={btnRef}
        type="button"
        id="ai-customer-service-btn"
        onClick={() => toggleOpen()}
        aria-expanded={isOpen}
        aria-label={isOpen ? "收起 AI 客服" : "開啟 AI 客服"}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999999] group flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-[#10364a] via-[#17485e] to-[#123e52] text-white shadow-xl hover:shadow-2xl border border-[#b1965e]/70 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer select-none"
        style={{
          boxShadow:
            "0 10px 30px rgba(18, 62, 82, 0.28), 0 0 0 1px rgba(177, 150, 94, 0.4)",
          touchAction: "manipulation"
        }}
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-5 h-5 text-[#e2d0a3] transition-transform group-hover:rotate-90" />
          ) : (
            <MessageSquareHeart className="w-5 h-5 text-[#e2d0a3] transition-transform group-hover:rotate-6" />
          )}
        </div>

        <span className="text-[14px] font-medium tracking-wider text-[#f5efe6]">
          {isOpen ? "收起客服" : "AI 客服"}
        </span>

        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#af9156]" />
        <span className="hidden sm:inline-block text-[11px] text-[#c9d8dc] tracking-wide">
          {isOpen ? "點擊關閉" : "有問必答"}
        </span>
      </button>
    </aside>
  );
}
