"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Key,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  Bot,
  Database,
  LogOut,
  Palette,
  AlertCircle,
  FileText
} from "lucide-react";

interface CompanyItem {
  companyId: string;
  widgetId: string;
  companyName: string;
  assistantName: string;
  websiteUrl: string;
  allowedOrigins: string[];
  status: string;
  rateLimit: number;
  knowledgeLength: number;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // 公司列表與建立表單狀態
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedEmbedCode, setSelectedEmbedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [createMessage, setCreateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 表單欄位
  const [form, setForm] = useState({
    companyName: "",
    companyId: "",
    websiteUrl: "",
    allowedOrigins: "",
    assistantName: "專屬 AI 小幫手",
    welcomeMessage: "您好！我是企業智慧客服，請問今天有什麼我可以協助您的？",
    primaryColor: "#123e52",
    quickQuestions: "服務項目有哪些？\n如何預約諮詢？\n營業時間是什麼時候？",
    knowledgeContent: "",
    fallbackMessage: "這個問題目前需要由專人進一步確認，歡迎留下您的聯繫方式與需求。",
    rateLimit: 20
  });

  // 嘗試載入公司列表
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/admin/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/saas/admin/companies")
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw new Error("Unauthorized");
      })
      .then((data) => {
        if (isMounted) {
          setCompanies(data.companies || []);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await fetch("/api/saas/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setPasswordInput("");
        fetchCompanies();
      } else {
        setLoginError(data.error || "密碼錯誤");
      }
    } catch {
      setLoginError("登入連線失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/saas/admin/login", { method: "DELETE" });
    setIsAuthenticated(false);
    setCompanies([]);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/saas/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (res.ok) {
        setCreateMessage({ type: "success", text: data.message || "建立成功！" });
        if (data.company?.embedCode) {
          setSelectedEmbedCode(data.company.embedCode);
        }
        fetchCompanies();
        // 清空表單
        setForm({
          companyName: "",
          companyId: "",
          websiteUrl: "",
          allowedOrigins: "",
          assistantName: "專屬 AI 小幫手",
          welcomeMessage: "您好！我是企業智慧客服，請問今天有什麼我可以協助您的？",
          primaryColor: "#123e52",
          quickQuestions: "服務項目有哪些？\n如何預約諮詢？\n營業時間是什麼時候？",
          knowledgeContent: "",
          fallbackMessage: "這個問題目前需要由專人進一步確認，歡迎留下您的聯繫方式與需求。",
          rateLimit: 20
        });
      } else {
        setCreateMessage({ type: "error", text: data.error || "建立失敗" });
      }
    } catch {
      setCreateMessage({ type: "error", text: "網路傳輸異常，請稍候重試" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. 未登入介面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-center tracking-wide mb-2 text-white">
            AI 客服 SaaS 平台管理後台
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            企業客戶多租戶管理 · 知識庫配置 · 安裝代碼產生器
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                平台管理員密碼 (Admin Secret)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="請輸入後台管理密碼（預設 admin888）"
                  className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                若未設定 ADMIN_SECRET_KEY 環境變數，預設密碼為: <code className="text-amber-300 font-mono">admin888</code>
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? "驗證中..." : "登入管理後台"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. 已登入後台主畫面
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 頂部導航列 */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-2">
              AI 客服 SaaS 企業管理後台
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multi-Tenant Engine
              </span>
            </h1>
            <p className="text-xs text-slate-400">零程式碼擴充 · Supabase 知識庫 · 獨立 Widget ID</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            新增企業客戶
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
            登出
          </button>
        </div>
      </header>

      {/* 主體內容 */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 系統說明看板 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">儲存引擎</div>
              <div className="text-base font-semibold text-white mt-0.5">Supabase / REST API</div>
              <div className="text-xs text-slate-400 mt-1">
                新增公司直接寫入資料庫，完全不需要修改任何程式碼或重新 Build。
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">安全性保護</div>
              <div className="text-base font-semibold text-white mt-0.5">Widget ID + 網域白名單</div>
              <div className="text-xs text-slate-400 mt-1">
                前端僅公開 Widget ID，Server Side 動態查出公司，嚴防跨公司越權與額度盜用。
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">極簡安裝</div>
              <div className="text-base font-semibold text-white mt-0.5">一行 script 標籤</div>
              <div className="text-xs text-slate-400 mt-1">
                第三方網站貼上一行語法，右下角即刻啟動專屬品牌色與知識庫。
              </div>
            </div>
          </div>
        </div>

        {/* 企業客戶列表 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-white text-sm">目前已登錄的企業客戶</h2>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                {companies.length} 間
              </span>
            </div>
            <button
              onClick={fetchCompanies}
              className="text-xs text-slate-400 hover:text-amber-300 transition"
            >
              重新整理
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-medium">企業名稱 / ID</th>
                  <th className="py-3.5 px-4 font-medium">公開 Widget ID</th>
                  <th className="py-3.5 px-4 font-medium">客服名稱</th>
                  <th className="py-3.5 px-4 font-medium">授權網域白名單</th>
                  <th className="py-3.5 px-4 font-medium">狀態</th>
                  <th className="py-3.5 px-4 font-medium text-right">操作 / 安裝碼</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {companies.map((c) => (
                  <tr key={c.companyId} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4">
                      <div className="font-medium text-white text-sm">{c.companyName}</div>
                      <div className="text-[11px] font-mono text-slate-400">ID: {c.companyId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg font-mono text-amber-300">
                        {c.widgetId}
                        <button
                          onClick={() => copyToClipboard(c.widgetId)}
                          title="複製 Widget ID"
                          className="hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {c.assistantName}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.allowedOrigins.map((o) => (
                          <span
                            key={o}
                            className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => {
                          const code = `<!-- ${c.companyName} 專屬 AI 客服 Widget -->\n<script\n  src="${window.location.origin}/widget.js"\n  data-widget-id="${c.widgetId}"\n  defer>\n</script>`;
                          setSelectedEmbedCode(code);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs border border-slate-700 transition"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        取得安裝碼
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 彈出視窗：新增企業客戶表單 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-400" />
                  新增企業客戶（自動產生 Widget ID 與安裝碼）
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  填寫完成後直接存入 Supabase，完全不需改動任何前端或伺服器程式碼。
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    公司名稱 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如：日青室內設計裝修"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    內部代碼 (Company ID Slug，選填)
                  </label>
                  <input
                    type="text"
                    placeholder="若留空將自動依名稱產生，如 comp_002"
                    value={form.companyId}
                    onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    公司官網網址 (選填)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={form.websiteUrl}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    允許使用 AI 客服的網域 (白名單) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="example.com, localhost (以逗號分開)"
                    value={form.allowedOrigins}
                    onChange={(e) => setForm({ ...form, allowedOrigins: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-400">只有名單內的網址才能載入，防範盜用額度</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    AI 客服名稱
                  </label>
                  <input
                    type="text"
                    value={form.assistantName}
                    onChange={(e) => setForm({ ...form, assistantName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    品牌主色 (HEX 色碼)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  初始歡迎詞
                </label>
                <input
                  type="text"
                  value={form.welcomeMessage}
                  onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  快速問題按鈕 (一行一個)
                </label>
                <textarea
                  rows={3}
                  value={form.quickQuestions}
                  onChange={(e) => setForm({ ...form, quickQuestions: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  公司專屬知識庫內容 (SOP、服務說明、FAQ、報價原則)
                </label>
                <textarea
                  rows={6}
                  placeholder="請在此貼上該公司的服務流程、常見問題解答、營業時間等。AI 回答時將嚴格以此依據，零幻覺答覆。"
                  value={form.knowledgeContent}
                  onChange={(e) => setForm({ ...form, knowledgeContent: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  無足夠資料時的官方回覆規範 (Fallback Message)
                </label>
                <input
                  type="text"
                  value={form.fallbackMessage}
                  onChange={(e) => setForm({ ...form, fallbackMessage: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {createMessage && (
                <div
                  className={`p-3 rounded-xl ${
                    createMessage.type === "success"
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                  }`}
                >
                  {createMessage.text}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
                >
                  {loading ? "儲存中..." : "建立並產生安裝碼"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 彈出視窗：查看 / 複製網站安裝碼 */}
      {selectedEmbedCode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                專屬網站安裝碼 (Embed Code)
              </h3>
              <button
                onClick={() => setSelectedEmbedCode(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              請將下方這段代碼交給客戶，客戶只要將它貼到自己官網 HTML 的 <code className="text-amber-300 font-mono">&lt;body&gt;</code> 結束標籤前，即可立刻啟用 AI 客服！
            </p>

            <div className="relative">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
                {selectedEmbedCode}
              </pre>
              <button
                onClick={() => copyToClipboard(selectedEmbedCode)}
                className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    已複製！
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    複製代碼
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                安全性保證：代碼中僅包含公開的 Widget ID，不包含任何後端金鑰或私密知識庫。後端會在伺服器安全校驗來源網域。
              </span>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setSelectedEmbedCode(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition"
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
