import type { Metadata } from "next";
import "./globals.css";
import { ConditionalNavigation } from "@/components/layout/ConditionalNavigation";

export const metadata: Metadata = {
  title: "Diet Survival - 다이어트 생존 게임",
  description: "AI 기반 영양 분석과 소셜 게임화를 통한 다이어트 관리 서비스",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#011936",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#011936" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <div className="app-container">
          <ConditionalNavigation />
          <main className="app-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}