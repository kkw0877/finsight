import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSight",
  description: "카드 명세서를 업로드하면 AI가 분석해주는 지출 인사이트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
