import { ImageResponse } from "next/og";

export const alt = "kim toksik — whatsapp toksiklik testi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0c0c",
          color: "#e5e5e5",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 128,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          kim<span style={{ color: "#ef4444" }}>toksik</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 44,
            color: "#999999",
          }}
        >
          whatsapp toksiklik testi
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 24,
            fontSize: 28,
            color: "#e5e5e5",
          }}
        >
          <span>red flagler</span>
          <span>&middot;</span>
          <span>kim kimi darlıyor</span>
          <span>&middot;</span>
          <span>kim haklı</span>
        </div>
      </div>
    ),
    size
  );
}