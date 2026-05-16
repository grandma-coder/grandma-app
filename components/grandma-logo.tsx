"use client";

import { cn } from "@/lib/utils";

interface GrandmaLogoProps {
  size?: number;
  className?: string;
  animation?: "none" | "heartbeat" | "grow" | "mode" | "rain" | "squeeze" | "wake" | "wink" | "spin";
  bodyColor?: string;
  accentColor?: string;
  outlineColor?: string;
}

export function GrandmaLogo({
  size = 48,
  className,
  animation = "none",
  bodyColor = "#F5D652",
  accentColor = "#EE7B6D",
  outlineColor = "#141313",
}: GrandmaLogoProps) {
  const strokeWidth = size >= 128 ? 5 : size >= 64 ? 5.5 : 6;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("grandma-logo", className)}
      aria-label="Grandma logo"
    >
      <style>{`
        ${animation === "heartbeat" ? `
          .hb-eye { animation: hb-blink 3.6s infinite; transform-origin: 100px 100px; }
          @keyframes hb-blink { 0%, 88%, 100% { transform: scaleY(1); } 92%, 96% { transform: scaleY(0.05); } }
          .hb-iris { animation: hb-pulse 1.6s ease-in-out infinite; transform-origin: 100px 104px; }
          @keyframes hb-pulse { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.14); } 60% { transform: scale(0.96); } }
        ` : ""}
        ${animation === "grow" ? `
          .gr-iris { animation: gr-grow 2.4s ease-in-out infinite; transform-origin: 100px 104px; }
          @keyframes gr-grow { 0%, 100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1.45); opacity: 1; } }
        ` : ""}
        ${animation === "mode" ? `
          .md-body { animation: md-shift 6s linear infinite; }
          @keyframes md-shift { 0%, 28% { fill: #F5D652; } 36%, 62% { fill: #F2B2C7; } 70%, 100% { fill: #C8B6E8; } }
        ` : ""}
        ${animation === "squeeze" ? `
          .sq-iris { animation: sq-pop 1.8s ease-in-out infinite; transform-origin: 100px 104px; }
          @keyframes sq-pop { 0%, 100% { transform: scale(1); } 30% { transform: scale(1.25, 0.85); } 60% { transform: scale(0.85, 1.15); } }
        ` : ""}
        ${animation === "wake" ? `
          .wk-l { animation: wk-l 2.6s ease-out infinite; transform-origin: 100px 100px; }
          .wk-e { animation: wk-e 2.6s ease-out infinite; transform-origin: 100px 100px; }
          .wk-i { animation: wk-i 2.6s ease-out 0.5s infinite; transform-origin: 100px 104px; opacity: 0; }
          @keyframes wk-l { 0%, 20% { opacity: 0; transform: scale(0.3); } 40%, 100% { opacity: 1; transform: scale(1); } }
          @keyframes wk-e { 0% { transform: scaleY(0); } 30% { transform: scaleY(0.2); } 50%, 100% { transform: scaleY(1); } }
          @keyframes wk-i { 0% { opacity: 0; transform: scale(0.1); } 80%, 100% { opacity: 1; transform: scale(1); } }
        ` : ""}
        ${animation === "wink" ? `
          .wn-eye { animation: wn-wink 2.4s ease-in-out infinite; transform-origin: 100px 100px; }
          @keyframes wn-wink { 0%, 55%, 100% { transform: scaleY(1); } 65%, 80% { transform: scaleY(0.05); } }
          .wn-iris { animation: wn-iris 2.4s ease-in-out infinite; transform-origin: 100px 104px; }
          @keyframes wn-iris { 0%, 55%, 100% { transform: scale(1); } 65%, 80% { transform: scale(0.6); } }
        ` : ""}
        ${animation === "spin" ? `
          .sp-iris { animation: sp-spin 3s linear infinite; transform-origin: 100px 104px; }
          @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ` : ""}
        ${animation === "rain" ? `
          .rd-1 { animation: rd-drop 2s ease-in 0s infinite; opacity: 0; }
          .rd-2 { animation: rd-drop 2s ease-in 0.5s infinite; opacity: 0; }
          .rd-3 { animation: rd-drop 2s ease-in 1s infinite; opacity: 0; }
          @keyframes rd-drop { 0% { opacity: 0; transform: translate(0, -30px) scale(0.3); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(0, 60px) scale(1); } }
        ` : ""}
      `}</style>

      {/* Lashes */}
      <g className={animation === "wake" ? "wk-l" : ""}>
        <path d="M100 35 L100 60" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M70 42 L78 65" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M130 42 L122 65" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M48 58 L62 74" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M152 58 L138 74" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M100 160 L100 140" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M70 158 L78 138" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M130 158 L122 138" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M48 142 L62 128" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        <path d="M152 142 L138 128" stroke={outlineColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      </g>

      {/* Eye body (almond shape) */}
      <g className={animation === "heartbeat" ? "hb-eye" : animation === "wink" ? "wn-eye" : animation === "wake" ? "wk-e" : ""}>
        <path
          className={animation === "mode" ? "md-body" : ""}
          d="M 35 100 Q 100 55 165 100 Q 100 145 35 100 Z"
          fill={bodyColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />

        {/* Heart iris */}
        <g className={
          animation === "heartbeat" ? "hb-iris" :
          animation === "grow" ? "gr-iris" :
          animation === "squeeze" ? "sq-iris" :
          animation === "wink" ? "wn-iris" :
          animation === "spin" ? "sp-iris" :
          animation === "wake" ? "wk-i" : ""
        }>
          {/* Shadow */}
          <path
            d="M100 128 C 72 106 64 86 82 76 C 92 71 100 80 100 88 C 100 80 108 71 118 76 C 136 86 128 106 100 128 Z"
            fill={outlineColor}
          />
          {/* Heart */}
          <path
            d="M100 122 C 78 104 72 88 86 80 C 94 77 100 83 100 90 C 100 83 106 77 114 80 C 128 88 122 104 100 122 Z"
            fill={accentColor}
          />
          {/* Highlight */}
          <path
            d="M92 88 C 88 86 84 90 86 94"
            stroke="#FFFEF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />
        </g>
      </g>

      {/* Rain hearts (only for rain animation) */}
      {animation === "rain" && (
        <>
          <g className="rd-1" transform="translate(50 40)">
            <path d="M0 8 C -6 2 -8 -4 -2 -8 C 1 -10 4 -8 4 -4 C 4 -8 7 -10 10 -8 C 16 -4 14 2 8 8 L 4 12 Z" fill={bodyColor} />
          </g>
          <g className="rd-2" transform="translate(150 40)">
            <path d="M0 8 C -6 2 -8 -4 -2 -8 C 1 -10 4 -8 4 -4 C 4 -8 7 -10 10 -8 C 16 -4 14 2 8 8 L 4 12 Z" fill={accentColor} />
          </g>
          <g className="rd-3" transform="translate(100 30)">
            <path d="M0 8 C -6 2 -8 -4 -2 -8 C 1 -10 4 -8 4 -4 C 4 -8 7 -10 10 -8 C 16 -4 14 2 8 8 L 4 12 Z" fill={bodyColor} />
          </g>
        </>
      )}
    </svg>
  );
}

// Wordmark with logo
export function GrandmaWordmark({
  size = 40,
  className,
  animation = "heartbeat",
}: {
  size?: number;
  className?: string;
  animation?: GrandmaLogoProps["animation"];
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <GrandmaLogo size={size} animation={animation} />
      <div className="flex flex-col">
        <span className="font-display text-2xl font-bold tracking-tight leading-none">grandma</span>
        <span className="font-italic text-sm text-sticker-coral italic leading-none">sees you</span>
      </div>
    </div>
  );
}

// Simple icon version for app icon / favicon
export function GrandmaIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-[22%] bg-sticker-yellow flex items-center justify-center", className)}
      style={{ width: size, height: size, boxShadow: "0 2px 8px -2px rgba(0,0,0,0.15)" }}
    >
      <GrandmaLogo size={size * 0.72} bodyColor="#F3ECD9" />
    </div>
  );
}
