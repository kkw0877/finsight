import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: {
    default: "FinSight — 카드 명세서 AI 분석",
    template: "%s | FinSight",
  },
  description:
    "카드사마다 제각각인 CSV·PDF 명세서를 업로드하면 AI가 항목을 분류해 카테고리별 지출과 월별 추이를 보여줍니다.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "FinSight",
    title: "FinSight — 카드 명세서 AI 분석",
    description:
      "카드사마다 제각각인 CSV·PDF 명세서를 업로드하면 AI가 항목을 분류해 카테고리별 지출과 월별 추이를 보여줍니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinSight — 카드 명세서 AI 분석",
    description:
      "카드사마다 제각각인 CSV·PDF 명세서를 업로드하면 AI가 항목을 분류해 카테고리별 지출과 월별 추이를 보여줍니다.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`dark ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
