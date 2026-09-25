"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
          <h2>系統連線稍有延遲</h2>
          <p>{error?.message || "請重新整理頁面再試。"}</p>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#123e52",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "16px",
            }}
          >
            重新載入
          </button>
        </div>
      </body>
    </html>
  );
}
