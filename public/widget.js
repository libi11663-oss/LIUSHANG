(function () {
  "use strict";

  // 避免重複載入
  if (window.__AI_CHAT_WIDGET_LOADED__) return;
  window.__AI_CHAT_WIDGET_LOADED__ = true;

  // 取得目前 script tag 上的設定參數
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  var widgetId =
    currentScript.getAttribute("data-widget-id") ||
    currentScript.getAttribute("data-widget") ||
    "";

  var companyId =
    currentScript.getAttribute("data-company-id") ||
    currentScript.getAttribute("data-company") ||
    (widgetId ? "" : "liusheng");

  var explicitApiHost = currentScript.getAttribute("data-api-host");
  var apiHost =
    explicitApiHost ||
    (function () {
      try {
        var src = currentScript.src;
        var url = new URL(src);
        return url.origin;
      } catch {
        return window.location.origin;
      }
    })();

  // 預設樣式與公司公開設定（待非同步載入補充）
  var config = {
    widgetId: widgetId,
    companyId: companyId || "liusheng",
    companyName: "AI 智慧客服",
    assistantName: "AI 小幫手",
    badgeText: "即時解答",
    tagline: "官方服務說明",
    welcomeMessage: "您好！請問今天有什麼我可以協助您的？",
    quickQuestions: ["常見服務項目？", "如何聯繫？"],
    privacyNotice: "請勿在對話中提供身分證字號、銀行帳號等機密個人資訊。",
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
    ctaButton: null
  };

  var state = {
    isOpen: false,
    loading: false,
    messages: []
  };

  // 注入 Widget 獨立隔離 CSS
  function injectStyles() {
    var styleId = "ai-chat-widget-styles";
    if (document.getElementById(styleId)) return;

    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #ai-widget-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang TC", "Noto Sans TC", sans-serif;
      }
      #ai-widget-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
      }
      .ai-widget-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border-radius: 9999px;
        background: linear-gradient(135deg, ${config.theme.gradientFrom}, ${config.theme.gradientTo});
        color: #ffffff;
        border: 1px solid ${config.theme.accentGold}88;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2), 0 0 0 1px ${config.theme.accentGold}44;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.05em;
        transition: transform 0.25s, box-shadow 0.25s;
        outline: none;
      }
      .ai-widget-btn:hover {
        transform: scale(1.03);
        box-shadow: 0 14px 32px rgba(0,0,0,0.25);
      }
      .ai-widget-window {
        position: fixed;
        bottom: 86px;
        right: 24px;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 580px;
        max-height: calc(100vh - 120px);
        background: ${config.theme.backgroundColor};
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.22), 0 0 0 1px ${config.theme.accentGold}44;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid ${config.theme.accentGold}40;
        transition: opacity 0.2s, transform 0.2s;
      }
      .ai-widget-header {
        background: linear-gradient(135deg, ${config.theme.gradientFrom}, ${config.theme.gradientTo});
        color: #ffffff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${config.theme.accentGold}33;
      }
      .ai-widget-header-title {
        font-size: 15px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ai-widget-badge {
        font-size: 10px;
        background: ${config.theme.accentGold}44;
        color: #fff;
        padding: 2px 6px;
        border-radius: 9999px;
        border: 1px solid ${config.theme.accentGold}66;
      }
      .ai-widget-subtitle {
        font-size: 11px;
        opacity: 0.8;
        margin-top: 2px;
      }
      .ai-widget-close-btn {
        background: transparent;
        border: none;
        color: #ffffff;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 16px;
        border-radius: 4px;
        opacity: 0.8;
      }
      .ai-widget-close-btn:hover {
        opacity: 1;
        background: rgba(255,255,255,0.15);
      }
      .ai-widget-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: rgba(0,0,0,0.015);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .ai-widget-msg {
        max-width: 86%;
        padding: 10px 14px;
        font-size: 13.5px;
        line-height: 1.6;
        word-break: break-word;
      }
      .ai-widget-msg.assistant {
        align-self: flex-start;
        background: ${config.theme.assistantBubbleColor};
        color: ${config.theme.textColor};
        border: 1px solid #e5ded4;
        border-radius: 14px 14px 14px 2px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      }
      .ai-widget-msg.user {
        align-self: flex-end;
        background: ${config.theme.userBubbleColor};
        color: #ffffff;
        border-radius: 14px 14px 2px 14px;
      }
      .ai-widget-cta-btn {
        margin-top: 8px;
        display: inline-block;
        font-size: 12px;
        padding: 6px 12px;
        background: #f4ede1;
        color: #123e52;
        border: 1px solid #c8b794;
        border-radius: 999px;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
      }
      .ai-widget-quick-box {
        padding: 8px 12px;
        background: #f7f4ed;
        border-top: 1px solid #e8e0d2;
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        white-space: nowrap;
      }
      .ai-widget-quick-btn {
        background: #ffffff;
        border: 1px solid #d4c8b6;
        color: #2c3e4a;
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 999px;
        cursor: pointer;
      }
      .ai-widget-quick-btn:hover {
        background: #eee5d3;
      }
      .ai-widget-input-box {
        padding: 10px 12px;
        background: #ffffff;
        border-top: 1px solid #e8e0d2;
      }
      .ai-widget-input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f9f8f4;
        border: 1px solid #d6cdc1;
        border-radius: 10px;
        padding: 4px 8px;
      }
      .ai-widget-textarea {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 13.5px;
        color: #222;
        outline: none;
        resize: none;
        height: 28px;
        line-height: 28px;
      }
      .ai-widget-send-btn {
        background: ${config.theme.primaryColor};
        color: #ffffff;
        border: none;
        border-radius: 6px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ai-widget-send-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .ai-widget-privacy {
        font-size: 10.5px;
        color: #887a6f;
        text-align: center;
        margin-top: 6px;
      }
      @media(max-width: 600px) {
        #ai-widget-container {
          bottom: 16px;
          right: 16px;
        }
        .ai-widget-window {
          bottom: 74px;
          right: 12px;
          left: 12px;
          width: auto;
          height: calc(100vh - 100px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 建立 DOM 元素
  var container, floatBtn, chatWindow, bodyEl, inputEl, sendBtn, quickBoxEl;

  function initUI() {
    injectStyles();

    container = document.createElement("div");
    container.id = "ai-widget-container";

    // 懸浮按鈕
    floatBtn = document.createElement("button");
    floatBtn.className = "ai-widget-btn";
    floatBtn.setAttribute("aria-label", "開啟客服");
    floatBtn.innerHTML =
      '<span style="font-size: 16px;">💬</span><span>' +
      config.assistantName +
      "</span>";
    floatBtn.onclick = toggleWindow;

    // 對話視窗
    chatWindow = document.createElement("div");
    chatWindow.className = "ai-widget-window";
    chatWindow.style.display = "none";

    // Header
    var header = document.createElement("div");
    header.className = "ai-widget-header";
    header.innerHTML =
      '<div><div class="ai-widget-header-title"><span>' +
      config.companyName +
      '</span><span class="ai-widget-badge">' +
      config.badgeText +
      '</span></div><div class="ai-widget-subtitle">' +
      config.tagline +
      "</div></div>" +
      '<button class="ai-widget-close-btn" title="關閉視窗">✕</button>';

    header.querySelector(".ai-widget-close-btn").onclick = toggleWindow;

    // Body
    bodyEl = document.createElement("div");
    bodyEl.className = "ai-widget-body";

    // 快捷問題列
    quickBoxEl = document.createElement("div");
    quickBoxEl.className = "ai-widget-quick-box";
    renderQuickQuestions();

    // Input Area
    var inputBox = document.createElement("div");
    inputBox.className = "ai-widget-input-box";

    var wrapper = document.createElement("div");
    wrapper.className = "ai-widget-input-wrapper";

    inputEl = document.createElement("textarea");
    inputEl.className = "ai-widget-textarea";
    inputEl.placeholder = "輸入您的問題...";
    inputEl.rows = 1;
    inputEl.onkeydown = function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    sendBtn = document.createElement("button");
    sendBtn.className = "ai-widget-send-btn";
    sendBtn.title = "發送";
    sendBtn.innerHTML = "➤";
    sendBtn.onclick = function () {
      sendMessage();
    };

    wrapper.appendChild(inputEl);
    wrapper.appendChild(sendBtn);

    var privacy = document.createElement("div");
    privacy.className = "ai-widget-privacy";
    privacy.innerText = config.privacyNotice;

    inputBox.appendChild(wrapper);
    inputBox.appendChild(privacy);

    chatWindow.appendChild(header);
    chatWindow.appendChild(bodyEl);
    chatWindow.appendChild(quickBoxEl);
    chatWindow.appendChild(inputBox);

    container.appendChild(floatBtn);
    container.appendChild(chatWindow);
    document.body.appendChild(container);

    // 加入初始歡迎詞
    appendMessage("assistant", config.welcomeMessage);
  }

  function renderQuickQuestions() {
    if (!quickBoxEl) return;
    quickBoxEl.innerHTML = "";
    (config.quickQuestions || []).forEach(function (q) {
      var btn = document.createElement("button");
      btn.className = "ai-widget-quick-btn";
      btn.innerText = q;
      btn.onclick = function () {
        sendMessage(q);
      };
      quickBoxEl.appendChild(btn);
    });
  }

  function toggleWindow() {
    state.isOpen = !state.isOpen;
    if (state.isOpen) {
      chatWindow.style.display = "flex";
      setTimeout(function () {
        inputEl.focus();
      }, 100);
    } else {
      chatWindow.style.display = "none";
    }
  }

  function appendMessage(role, text) {
    var msgDiv = document.createElement("div");
    msgDiv.className = "ai-widget-msg " + role;
    msgDiv.innerText = text;

    // 若留聲或其他客戶提到表單，提供行動呼籲
    if (
      role === "assistant" &&
      config.ctaButton &&
      (text.indexOf("申請表單") !== -1 || text.indexOf("留下聯絡資訊") !== -1)
    ) {
      var cta = document.createElement("div");
      var ctaBtn = document.createElement("a");
      ctaBtn.className = "ai-widget-cta-btn";
      ctaBtn.innerText = config.ctaButton.label;
      ctaBtn.href = config.ctaButton.targetSelectorOrUrl;
      ctaBtn.onclick = function () {
        state.isOpen = false;
        chatWindow.style.display = "none";
      };
      cta.appendChild(ctaBtn);
      msgDiv.appendChild(cta);
    }

    bodyEl.appendChild(msgDiv);
    bodyEl.scrollTop = bodyEl.scrollHeight;

    state.messages.push({
      role: role === "user" ? "user" : "model",
      content: text
    });
  }

  function sendMessage(textToSend) {
    var content = (textToSend || inputEl.value || "").trim();
    if (!content || state.loading) return;

    if (!textToSend) inputEl.value = "";
    appendMessage("user", content);

    state.loading = true;
    sendBtn.disabled = true;

    // 建立載入中提示
    var loadingDiv = document.createElement("div");
    loadingDiv.className = "ai-widget-msg assistant";
    loadingDiv.style.opacity = "0.7";
    loadingDiv.innerText = "小幫手正在為您解答...";
    bodyEl.appendChild(loadingDiv);
    bodyEl.scrollTop = bodyEl.scrollHeight;

    // 呼叫 SaaS 後端 API
    var historyPayload = state.messages
      .slice(1, -1) // 排除第一句歡迎語與剛加入的這句
      .map(function (m) {
        return { role: m.role, content: m.content };
      });

    fetch(apiHost + "/api/saas/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Widget-Id": widgetId,
        "X-Widget-Company-Id": companyId
      },
      body: JSON.stringify({
        widgetId: widgetId,
        companyId: companyId,
        message: content,
        history: historyPayload
      })
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        var reply = data.reply || "感謝您的詢問，客服系統目前稍微繁忙。";
        appendMessage("assistant", reply);
      })
      .catch(function () {
        if (loadingDiv.parentNode) {
          loadingDiv.parentNode.removeChild(loadingDiv);
        }
        appendMessage(
          "assistant",
          "網路連線稍微不穩定，請稍候重試或至網站留下聯絡方式。"
        );
      })
      .finally(function () {
        state.loading = false;
        sendBtn.disabled = false;
      });
  }

  // 從 SaaS Backend 動態載入該公司的品牌設定
  function loadCompanyConfig() {
    var queryParam = widgetId
      ? "widgetId=" + encodeURIComponent(widgetId)
      : "companyId=" + encodeURIComponent(companyId || "liusheng");

    fetch(apiHost + "/api/saas/widget-config?" + queryParam, {
      headers: {
        "X-Widget-Id": widgetId,
        "X-Widget-Company-Id": companyId
      }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Config not found");
        return res.json();
      })
      .then(function (data) {
        if (data && data.config) {
          var c = data.config;
          if (c.companyId) companyId = c.companyId;
          if (c.widgetId) widgetId = c.widgetId;
          config.companyId = c.companyId || config.companyId;
          config.widgetId = c.widgetId || config.widgetId;
          config.companyName = c.companyName || config.companyName;
          config.assistantName = c.assistantName || config.assistantName;
          config.badgeText = c.badgeText || config.badgeText;
          config.tagline = c.tagline || config.tagline;
          config.welcomeMessage = c.welcomeMessage || config.welcomeMessage;
          config.quickQuestions = c.quickQuestions || config.quickQuestions;
          config.privacyNotice = c.privacyNotice || config.privacyNotice;
          if (c.theme) {
            config.theme = Object.assign(config.theme, c.theme);
          }
          if (c.ctaButton) {
            config.ctaButton = c.ctaButton;
          }
        }
      })
      .catch(function (e) {
        console.warn("[AI Widget] using default config", e);
      })
      .finally(function () {
        initUI();
      });
  }

  // 確保 DOM Ready 後啟動
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadCompanyConfig);
  } else {
    loadCompanyConfig();
  }
})();
