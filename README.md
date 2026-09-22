# 留聲｜人生故事典藏

品牌官網原始碼，包含普魯士藍與霧金視覺、服务介紹、故事示意、免費試作申請及資料保存 API。

## 技術
React 19、TypeScript、Tailwind CSS 4、shadcn/ui、vinext / Vite、Cloudflare Workers 與 D1、Drizzle migrations。

## 開發
需 Node.js 22.13 以上及 package.json 指定的 pnpm 版本。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

建置：`pnpm build`。此專案原先部署於 ChatGPT Sites，相關建置與環境適配保留在 scripts/、build/ 與 .openai/ 中。搬到其他平台須調整建置設定與 Worker / D1 綁定，並套用 drizzle/ 資料庫遷移；不能只上傳至 GitHub Pages 就保有表單功能。

## 主要檔案
- app/page.tsx：首頁、服務內容、故事切換與申請表。
- app/globals.css：版面、手機樣式與品牌色。
- app/api/applications/route.ts：申請驗證與 D1 寫入。
- db/schema.ts、drizzle/：資料表與遷移。
- public/：主視覺與圖示。

## 已有功能與界線
申請表保存至 D1；尚未串接 Email 通知、付款、會員後台或自動成書功能。網站介紹的紀錄片、精裝書與人生典藏頁是服務項目，不代表本程式已包含製作或客戶典藏平台。

不含客戶資料、正式資料庫備份、密鑰與 node_modules。請勿將 .env 或客戶資料提交至 GitHub。

## 接手修改
保留繁體中文、普魯士藍與霧金色、圓角按鈕，以及「把不凡的一生，好好收藏」文案。官網不呈現 AI 製作字樣。故事與圖片已標示為示意；免費試作範圍與另行報價服務分開呈現。

## 部署
目前 GitHub 儲存庫是原始碼備份與協作入口，尚未設定自動部署。GitHub 修改不會自動更新現有 Sites 網站。
