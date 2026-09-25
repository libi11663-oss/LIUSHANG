-- ==============================================================================
-- AI 客服 SaaS 多租戶 Supabase 資料庫架構 (Schema Blueprint)
-- ==============================================================================

-- 1. 啟用 UUID 擴充功能
create extension if not exists "uuid-ossp";

-- 2. 企業租戶主表 (companies)
create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  company_id text unique not null,               -- 如 'liusheng', 'company_002'
  widget_id text unique not null,                -- 公開識別碼，如 'wgt_k8f9a2b1c4e7'
  company_name text not null,                   -- 企業名稱
  website_url text default '',                  -- 企業官網
  status text not null default 'active',        -- 'active' | 'suspended' | 'trial'
  allowed_origins text[] not null default '{}', -- 網域白名單，防盜用 (如 ['mowang.com.tw'])
  rate_limit integer not null default 20,       -- 每分鐘請求次數上限
  fallback_message text not null default '這個問題需要由專人進一步確認。',
  public_config jsonb not null default '{}'::jsonb, -- 前端公開品牌外觀與設定 (Theme, Bot Name, Quick Questions)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 企業專屬知識庫表 (knowledge_bases)
-- 每一筆知識皆強制關聯至特定的 company_id，資料庫層級邏輯隔離
create table if not exists public.knowledge_bases (
  id uuid primary key default uuid_generate_v4(),
  company_id text not null references public.companies(company_id) on delete cascade,
  category text not null,                       -- 分類，如 '服務項目', 'FAQ', '收費原則'
  title text not null,                          -- 知識標題
  content text not null,                        -- 具體知識內容 (注入 Prompt 的核心)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. 對話記錄與 Token 成本追蹤表 (chat_logs)
create table if not exists public.chat_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id text not null references public.companies(company_id) on delete cascade,
  client_ip_hash text,
  model text not null,
  prompt_tokens integer not null default 0,
  candidates_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer not null default 0,
  status text not null default 'success',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. 建立索引加速查詢
create index if not exists idx_companies_company_id on public.companies(company_id);
create index if not exists idx_companies_widget_id on public.companies(widget_id);
create index if not exists idx_knowledge_bases_company_id on public.knowledge_bases(company_id);
create index if not exists idx_chat_logs_company_id_created on public.chat_logs(company_id, created_at desc);

-- 6. 安全策略 (RLS): 限制公開前端僅能讀取 public_config，禁止前端查詢全部知識庫或修改
alter table public.companies enable row level security;
alter table public.knowledge_bases enable row level security;
alter table public.chat_logs enable row level security;

-- 伺服器端使用 SUPABASE_SERVICE_ROLE_KEY 擁有完整存取權限，前端完全無法直讀知識庫
