import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "留聲｜把家人的故事與聲音留下來",
  description: "從一次自在的聊天開始，將人生故事、照片與真實聲音留給下一代。首批免費試作家庭招募中。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
