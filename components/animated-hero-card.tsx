"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GrandmaLogo } from "./grandma-logo";
import {
  HeartSticker,
  FlowerSticker,
  LeafSticker,
  SparkleSticker,
  SunSticker,
  MoonSticker,
  FootprintSticker,
} from "./stickers";

type Stage = "pre" | "pregnancy" | "kids";

interface StageConfig {
  id: Stage;
  label: string;
  week: string;
  weekLabel: string;
  message: string;
  progress: number;
  bodyColor: string;
  ringColor: string;
  bgAccent: string;
}

const stages: StageConfig[] = [
  {
    id: "pre",
    label: "Pre-Pregnancy",
    week: "Cycle Day 14",
    weekLabel: "fertile window",
    message: "your body is preparing",
    progress: 0.45,
    bodyColor: "#F5D652",
    ringColor: "#F5D652",
    bgAccent: "bg-sticker-yellow/20",
  },
  {
    id: "pregnancy",
    label: "Pregnancy",
    week: "Week 24",
    weekLabel: "lemon size",
    message: "you're doing beautifully today",
    progress: 0.6,
    bodyColor: "#C8B6E8",
    ringColor: "#C8B6E8",
    bgAccent: "bg-mode-lavender/30",
  },
  {
    id: "kids",
    label: "Kids",
    week: "Month 8",
    weekLabel: "crawling stage",
    message: "every moment is precious",
    progress: 0.75,
    bodyColor: "#F2B2C7",
    ringColor: "#F2B2C7",
    bgAccent: "bg-mode-rose/30",
  },
];

function ProgressRing({
  progress,
  color,
  size = 160,
}: {
  progress: number;
  color: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.25}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      {/* Dot at progress end */}
      <circle
        cx={size / 2 + radius * Math.cos(2 * Math.PI * progress - Math.PI / 2)}
        cy={size / 2 + radius * Math.sin(2 * Math.PI * progress - Math.PI / 2)}
        r={6}
        fill={color}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

export function AnimatedHeroCard({ className }: { className?: string }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStage((prev) => (prev + 1) % stages.length);
        setIsAnimating(false);
      }, 400);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const stage = stages[currentStage];

  return (
    <div className={cn("relative", className)}>
      {/* Floating stickers */}
      <div className="absolute -top-4 -left-6 animate-float-slow">
        <HeartSticker className="w-14 h-14 text-sticker-coral" />
      </div>
      <div className="absolute top-1/4 -right-8 animate-float-medium" style={{ animationDelay: "0.5s" }}>
        <FlowerSticker className="w-12 h-12 text-mode-lavender" />
      </div>
      <div className="absolute -bottom-2 -left-10 animate-float-slow" style={{ animationDelay: "1s" }}>
        <LeafSticker className="w-10 h-10 text-sticker-leaf" />
      </div>
      <div className="absolute bottom-1/4 -right-6 animate-float-medium" style={{ animationDelay: "1.5s" }}>
        <SparkleSticker className="w-8 h-8 text-sticker-coral" />
      </div>
      <div className="absolute -bottom-6 right-1/4 animate-float-slow" style={{ animationDelay: "0.8s" }}>
        <FootprintSticker className="w-8 h-8 text-mode-rose" />
      </div>

      {/* Main card */}
      <div
        className={cn(
          "relative bg-paper rounded-[28px] p-8 shadow-card border border-line/50 transition-all duration-500",
          isAnimating && "scale-95 opacity-80"
        )}
        style={{ width: 320, minHeight: 380 }}
      >
        {/* Stage indicator pills */}
        <div className="flex justify-center gap-2 mb-6">
          {stages.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setCurrentStage(i);
                  setIsAnimating(false);
                }, 200);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
                i === currentStage
                  ? "bg-ink text-cream"
                  : "bg-cream-deep text-ink/60 hover:bg-ink/10"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Progress ring with week */}
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <ProgressRing progress={stage.progress} color={stage.ringColor} size={160} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold tracking-tight text-ink">
                {stage.week}
              </span>
              <span className="font-italic text-sm italic text-ink/60 mt-1">
                {stage.weekLabel}
              </span>
            </div>
          </div>

          {/* Encouragement message */}
          <div
            className={cn(
              "mt-6 px-6 py-3 rounded-full transition-all duration-500",
              stage.bgAccent
            )}
          >
            <p className="text-sm text-ink/80 text-center">{stage.message}</p>
          </div>

          {/* Grandma logo with mode animation */}
          <div className="mt-6 flex items-center gap-2">
            <GrandmaLogo
              size={32}
              animation="mode"
              bodyColor={stage.bodyColor}
            />
            <span className="text-xs text-ink/50 font-medium uppercase tracking-wide">
              Grandma is with you
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alternative: Full animation showcase of all 3 behaviors
export function ThreeBehaviorsShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-6", className)}>
      {/* Pre-Pregnancy */}
      <div className="flex flex-col items-center gap-4 p-6 bg-sticker-yellow/20 rounded-[28px]">
        <GrandmaLogo size={80} animation="heartbeat" bodyColor="#F5D652" />
        <div className="text-center">
          <p className="font-display text-lg font-semibold">Pre-Pregnancy</p>
          <p className="text-sm text-ink/60 font-italic italic">Heartbeat pulse</p>
        </div>
      </div>

      {/* Pregnancy */}
      <div className="flex flex-col items-center gap-4 p-6 bg-mode-lavender/30 rounded-[28px]">
        <GrandmaLogo size={80} animation="grow" bodyColor="#C8B6E8" />
        <div className="text-center">
          <p className="font-display text-lg font-semibold">Pregnancy</p>
          <p className="text-sm text-ink/60 font-italic italic">Growing love</p>
        </div>
      </div>

      {/* Kids */}
      <div className="flex flex-col items-center gap-4 p-6 bg-mode-rose/30 rounded-[28px]">
        <GrandmaLogo size={80} animation="squeeze" bodyColor="#F2B2C7" />
        <div className="text-center">
          <p className="font-display text-lg font-semibold">Kids</p>
          <p className="text-sm text-ink/60 font-italic italic">Playful squeeze</p>
        </div>
      </div>
    </div>
  );
}
