import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
        }}
      >
        <svg
          width="118"
          height="118"
          viewBox="0 0 24 24"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
