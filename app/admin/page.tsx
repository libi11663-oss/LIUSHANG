"use client";

import React, { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
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
  FileText,
  QrCode,
  ExternalLink,
  HelpCircle,
  Globe,
  Layers,
  Smartphone,
  Download,
  MessageSquare
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
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [integrationTab, setIntegrationTab] = useState<"standalone" | "script" | "gtm" | "cms" | "line">("standalone");
  const [modalQrCode, setModalQrCode] = useState<string>("");
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
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
        if (data.company) {
          openIntegrationModal({
            companyId: data.company.companyId,
            widgetId: data.company.widgetId,
            companyName: data.company.companyName,
            assistantName: data.company.assistantName,
            websiteUrl: data.company.websiteUrl,
            allowedOrigins: data.company.allowedOrigins || ["*"],
            status: "active",
            rateLimit: 20,
            knowledgeLength: 0,
            createdAt: new Date().toISOString()
          });
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

  const openIntegrationModal = (c: CompanyItem) => {
    setSelectedCompany(c);
    setIntegrationTab("standalone");
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/chat/${c.companyId}`;
      QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" }
      })
        .then((dataUrl) => setModalQrCode(dataUrl))
        .catch(() => {});
    }
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
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded-xl border border-amber-500/30 transition shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>無網站／無法改HTML 替代指南</span>
          </button>
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
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        <a
                          href={`/chat/${encodeURIComponent(c.companyId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs border border-blue-500/30 transition"
                          title="客戶沒有網站時，直接給這條專屬連結，開箱即用！"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>專屬獨立頁 (免網站)</span>
                        </a>
                        <a
                          href={`/demo-client.html?widgetId=${encodeURIComponent(c.widgetId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs border border-slate-700 transition"
                        >
                          浮動預覽
                        </a>
                        <button
                          onClick={() => openIntegrationModal(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs border border-amber-500/30 transition"
                          title="查看直連網址、QR Code、GTM 與 HTML 代碼"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          交付方案 &amp; QR
                        </button>
                      </div>
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

      {/* 彈出視窗：全方位交付方案（專屬獨立頁、QR Code、HTML 標籤、GTM、CMS、LINE） */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  {selectedCompany.companyName} — AI 客服交付與串接方案
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Widget ID: <code className="text-amber-300 font-mono">{selectedCompany.widgetId}</code>
                </p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* 標籤頁切換 */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto text-xs">
              <button
                onClick={() => setIntegrationTab("standalone")}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  integrationTab === "standalone"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>獨立專屬頁 &amp; QR Code (免網站)</span>
              </button>
              <button
                onClick={() => setIntegrationTab("script")}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  integrationTab === "script"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>官網 HTML &amp; iframe</span>
              </button>
              <button
                onClick={() => setIntegrationTab("gtm")}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  integrationTab === "gtm"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Google Tag Manager</span>
              </button>
              <button
                onClick={() => setIntegrationTab("cms")}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  integrationTab === "cms"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Shopify / WordPress / Wix</span>
              </button>
              <button
                onClick={() => setIntegrationTab("line")}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                  integrationTab === "line"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>LINE 官方帳號 / IG</span>
              </button>
            </div>

            {/* TAB 1: 獨立專屬頁 & QR Code (零網站 / 免改 HTML 首選) */}
            {integrationTab === "standalone" && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 leading-relaxed">
                  <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
                    <Globe className="w-4 h-4 text-blue-400" />
                    客戶沒有網站，或無法修改 HTML 的終極解法：
                  </div>
                  客戶不需要擁有自己的伺服器或修改任何原始碼。只要給他下方這條獨立網址，任何人用手機或電腦點開即可直接與 AI 客服對話！
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    專屬獨立對話網址 (全螢幕 Responsive 網頁)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/chat/${selectedCompany.companyId}` : `/chat/${selectedCompany.companyId}`}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-300 font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(
                          typeof window !== "undefined"
                            ? `${window.location.origin}/chat/${selectedCompany.companyId}`
                            : `/chat/${selectedCompany.companyId}`
                        )
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition shrink-0"
                    >
                      {copied ? "已複製！" : "複製網址"}
                    </button>
                    <a
                      href={`/chat/${selectedCompany.companyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-medium transition shrink-0 flex items-center gap-1"
                    >
                      <span>開啟預覽</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex flex-col items-center">
                    {modalQrCode ? (
                      <img
                        src={modalQrCode}
                        alt="QR Code"
                        className="w-40 h-40 rounded-lg shadow-md border border-slate-700 bg-white p-1"
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center bg-slate-900 rounded-lg text-slate-500">
                        生成 QR 中...
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!modalQrCode) return;
                        const a = document.createElement("a");
                        a.href = modalQrCode;
                        a.download = `${selectedCompany.companyName}-qrcode.png`;
                        a.click();
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下載 QR Code (PNG)
                    </button>
                  </div>
                  <div className="space-y-2 text-slate-300">
                    <div className="font-semibold text-white">實體與社群落地場景：</div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                      <li>印在<strong>實體店面櫃檯立牌、桌牌、菜單、海報</strong>，客人掃描立刻發問。</li>
                      <li>印在<strong>業務名片</strong>背面，掃描即可進入專屬 24 小時智慧諮詢。</li>
                      <li>放入<strong>診所掛號單、說明摺頁</strong>，隨時提供術後護理與療程解答。</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 官網 HTML & iframe */}
            {integrationTab === "script" && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  若客戶<strong>有網站且能修改 HTML</strong>，請將下方代碼貼在官網的 <code className="text-amber-300 font-mono">&lt;body&gt;</code> 結束標籤前：
                </p>

                <div className="relative">
                  <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-300 overflow-x-auto text-[11px]">
{`<!-- ${selectedCompany.companyName} 專屬 AI 客服 Widget -->
<script
  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"
  data-widget-id="${selectedCompany.widgetId}"
  defer>
</script>`}
                  </pre>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `<!-- ${selectedCompany.companyName} 專屬 AI 客服 Widget -->\n<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-widget-id="${selectedCompany.widgetId}"\n  defer>\n</script>`
                      )
                    }
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] flex items-center gap-1 shadow"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    複製 script
                  </button>
                </div>

                <div className="pt-2">
                  <div className="font-semibold text-white mb-1.5">或使用 iframe 內嵌於頁面區塊：</div>
                  <div className="relative">
                    <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-amber-300 overflow-x-auto text-[11px]">
{`<iframe
  src="${typeof window !== "undefined" ? window.location.origin : ""}/chat/${selectedCompany.companyId}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #ccc;">
</iframe>`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `<iframe\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/chat/${selectedCompany.companyId}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border-radius: 12px; border: 1px solid #ccc;">\n</iframe>`
                        )
                      }
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] flex items-center gap-1 shadow"
                    >
                      複製 iframe
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Google Tag Manager (GTM) */}
            {integrationTab === "gtm" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                  <strong>外包工程團隊不願配合改 code 時的利器：</strong> 現代 90% 的企業官網都已安裝 Google Tag Manager。客戶的行銷或數位部門自己就能新增代碼發布，完全不需要動到網站工程師！
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                    <span>登入客戶的 <strong>Google Tag Manager (GTM)</strong> 容器後台。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                    <span>左側點選「<strong>代碼 (Tags)</strong>」&gt; 點擊右上角「<strong>新增 (New)</strong>」。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                    <span>代碼類型選擇「<strong>自訂 HTML (Custom HTML)</strong>」，將 Widget 的 script 標籤貼入。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                    <span>觸發條件選擇「<strong>All Pages (所有網頁)</strong>」或「<strong>網頁瀏覽 (Page View)</strong>」。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">5</span>
                    <span>點擊「<strong>儲存</strong>」並在右上角點擊「<strong>提交 (Submit) &gt; 發布</strong>」，1 分鐘全站生效！</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Shopify / WordPress / Wix / SHOPLINE */}
            {integrationTab === "cms" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="font-semibold text-white">常見架站平台貼法（後台設定欄位，免動 HTML 檔案）：</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-amber-300">WordPress</div>
                    <p className="text-[11px] text-slate-400">
                      安裝免費外掛「<strong>WPCode</strong>」或「<strong>Insert Headers and Footers</strong>」，在 <em>Footer Scripts</em> 欄位貼上代碼並儲存。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-300">Shopify</div>
                    <p className="text-[11px] text-slate-400">
                      進入「線上商店 &gt; 佈景主題 &gt; 編輯程式碼 &gt; <code>theme.liquid</code>」，在 <code>&lt;/body&gt;</code> 前貼上即可。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-blue-300">Wix</div>
                    <p className="text-[11px] text-slate-400">
                      進入「設定 &gt; 進階 &gt; 自訂程式碼 (Custom Code)」，新增代碼並選擇貼在「Body - end」位置。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-bold text-purple-300">SHOPLINE / Cyberbiz</div>
                    <p className="text-[11px] text-slate-400">
                      進入後台「設定 &gt; 追蹤代碼設定 &gt; 第三方代碼」，選擇「全站 Body 結尾」貼入代碼。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: LINE 官方帳號 / Instagram / Facebook */}
            {integrationTab === "line" && (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300">
                  <strong>台灣顧客最習慣的社群渠道：</strong> 客戶就算完全沒網站，只要有 LINE 官方帳號 (LINE OA) 或 Instagram，就能讓 AI 客服開始工作！
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="font-bold text-emerald-400 mb-1">方法 1：LINE 官方帳號「圖文選單 (Rich Menu)」</div>
                    <p className="text-[11px] text-slate-400">
                      在 LINE Official Account Manager 後台設計圖文選單，將其中一格設定為動作：「<strong>開啟連結</strong>」，並填入該公司的<strong>專屬直連網址</strong>。顧客點選按鈕立刻全螢幕對話！
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="font-bold text-emerald-400 mb-1">方法 2：LINE「加入好友歡迎訊息」與「自動回應」</div>
                    <p className="text-[11px] text-slate-400">
                      設定歡迎詞：「您好！若有任何服務問題，歡迎隨時點擊 24 小時智慧線上專員：<code>{typeof window !== "undefined" ? window.location.origin : ""}/chat/{selectedCompany.companyId}</code> 為您即時解答！」
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="font-bold text-pink-400 mb-1">方法 3：Instagram / Facebook 個人簡介連結</div>
                    <p className="text-[11px] text-slate-400">
                      貼在 IG 商業帳號「個人檔案網址」或 Linktree 導流，標註「💬 24H 智慧線上諮詢」。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-right pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs transition"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 彈出視窗：全面攻略指南 (當客戶沒有網站或無法提供 HTML 時) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    客戶無網站／無法提供 HTML 的 5 大萬能替代方案
                  </h3>
                  <p className="text-xs text-slate-400">商業落地百寶箱 · 任何情境都能成功交付並收費</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  方案 1：託管專屬直連頁 (免網站，開箱即用)
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>適用情境：</strong>客戶完全沒有官網（實體店面、個人教練、自由工作者、團購主、餐廳、診所）。
                </p>
                <p>
                  你這套系統已經為每個客戶自動生成專屬的 Hosted URL（例如 <code>/chat/yuelao</code>、<code>/chat/公司代碼</code>）。客戶不需要任何工程師，直接將網址提供給顧客即可全螢幕對話！
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-blue-300 text-sm flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  方案 2：QR Code 實體立牌與名片
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>適用情境：</strong>咖啡廳、美容美髮、牙醫診所、展覽攤位、實體門市、紙本宣傳單。
                </p>
                <p>
                  在後台下載專屬 QR Code 圖檔，交給印刷廠印製成「桌上壓克力立牌」、「櫃檯掃碼牌」或印在業務名片背面，顧客拿起手機相機掃描，立即啟動 24H 智慧答覆。
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-emerald-300 text-sm flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  方案 3：LINE 官方帳號 (LINE OA) 圖文選單
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>適用情境：</strong>台灣絕大多數店家都有經營 LINE 官方帳號。
                </p>
                <p>
                  在 LINE 官方帳號的「圖文選單 (Rich Menu)」切出一塊「24H 智慧線上諮詢」，動作設定為「開啟連結」並填入專屬直連頁。客人點擊後在手機瀏覽器無縫對話，體驗極佳。
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-purple-300 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  方案 4：Google Tag Manager (GTM)
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>適用情境：</strong>客戶有網站，但網站由外包廠商維護，改 HTML 要加收費用或拖延數週。
                </p>
                <p>
                  請客戶行銷窗口提供 GTM 帳號或代為操作，在 GTM 新增「自訂 HTML 代碼」貼上一行 script，發布後自動出現在全站右下角，完全避開外包合約與工程限制！
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="font-bold text-rose-300 text-sm flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  方案 5：Shopify / WordPress / Wix 後台設定欄
                </div>
                <p className="text-slate-400 text-[11px]">
                  <strong>適用情境：</strong>客戶使用主流電商與建站系統，完全不需要修改 HTML 原始碼檔案。
                </p>
                <p>
                  WordPress 透過「WPCode」或「Insert Headers and Footers」外掛；Shopify 透過「自訂程式碼」；Wix 透過「自訂代碼」設定，直接貼在後台框框內即刻啟用。
                </p>
              </div>
            </div>

            <div className="text-right pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs transition"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
