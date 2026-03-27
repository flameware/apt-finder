import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "숲뷰 아파트 찾기",
  description: "산·숲·호수 인접 남향 아파트 탐색 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-background text-foreground">
        {children}
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}&submodules=visualization`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
