import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ReachAudit | Know who to call, and that you're safe to.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #7C3AED 100%)",
          padding: "70px 80px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: "linear-gradient(135deg, #9F67FF, #C4A8FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(124,58,237,0.5)",
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              RA
            </div>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            ReachAudit
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#C4A8FF",
              }}
            />
            <div
              style={{
                color: "#C4A8FF",
                fontSize: 22,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              Monthly reachability and compliance
            </div>
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>Know who to call,</div>
            <div
              style={{
                background: "linear-gradient(135deg, #C4A8FF, #FFFFFF)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              and that you&apos;re safe to.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            A free score of how many of your leads you can actually reach.
          </div>
          <div
            style={{
              color: "white",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            reachaudit.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
