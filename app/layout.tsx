import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://mowang.com.tw";
const siteTitle = "留聲｜把家人的故事與聲音留下來";
const siteDescription =
  "從一次自在的聊天開始，將人生故事、照片與真實聲音留給下一代。首批免費試作家庭招募中。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName: "留聲",
    images: [
      {
        url: "/family-album.webp",
        width: 1200,
        height: 630,
        alt: "留聲 - 把家人的故事與聲音留下來",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/family-album.webp"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "留聲",
      alternateName: "STORIES THAT STAY",
      description: siteDescription,
      inLanguage: "zh-Hant",
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "留聲",
      url: siteUrl,
      logo: `${siteUrl}/family-album.webp`,
      description: "留聲 · 人生故事典藏。把家人的故事與聲音留下來。",
    },
    {
      "@type": "Service",
      name: "人生故事典藏服務",
      provider: {
        "@id": `${siteUrl}/#organization`,
      },
      serviceType: "人生訪談、自傳書、回憶錄音與人生典藏頁",
      description: "專人到府訪談、整理口述與老照片，製作人生故事精裝書與專屬影音典藏。",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "TWD",
        description: "首批 3 組家庭免費試作",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <script
          src="https://ai-customer-service-saas-production-7a07.up.railway.app/widget.js"
          data-widget-id="wgt_4b6d1100a11970a7b5d3e700cb70c5a1"
          defer
        />
      </body>
    </html>
  );
}
