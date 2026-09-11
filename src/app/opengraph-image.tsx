import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#121317",
          color: "#f5f5f5",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: "#f59e0b" }}>
          FinSight
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 56, fontWeight: 600, lineHeight: 1.25 }}>
          카드 명세서를 올리면,
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 600, lineHeight: 1.25 }}>
          소비 패턴을 정리해드립니다
        </div>
      </div>
    ),
    { ...size },
  );
}
