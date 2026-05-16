// partial-stickers.tsx — Sticker components for grandma.app
// Generated from the design-system project — drop into components/stickers/
// Each component accepts a single `size` prop (default 100).

import React from 'react';
import Svg, { Rect, Circle, Path, Line, Ellipse, G, Text as SvgText } from 'react-native-svg';

// Partial-coverage stickers — dedicated designs for the 58 entries previously
// marked "reuse X". Each adds intent (hero scale, combined elements, context)
// beyond what the original component offered. House style matches
// src/missing-stickers.jsx — 100×100, charcoal stroke #141313, paper palette.

const STK = '#141313';
const PINK = '#F2B2C7';
const HOT_PINK = '#FF8AD8';
const ROSE = '#EBB7C7';
const PURPLE = '#C8B6E8';
const VIOLET = '#B983FF';
const BLUE = '#9DC3E8';
const ROYAL = '#4D96FF';
const YELLOW = '#F5D652';
const GOLD = '#F4C254';
const GREEN = '#BDD48C';
const PEACH = '#F4C29B';
const CREAM = '#FBEFD8';
const PAPER = '#FFF4DE';
const RED = '#E58B7B';
const MINT = '#B6E0C8';

const S = ({ size = 100, children, vb = '0 0 100 100' }: { size?: number; children: React.ReactNode; vb?: string }) => (
  <Svg width={size} height={size} viewBox={vb}>{children}</Svg>
);

/* =================================================================== */
/*  HEROES — large-scale storytelling versions of existing components   */
/* =================================================================== */

// Pre-preg TTC welcome — pink flower halo + heart
const PrepregOnboardingHero = ({ size = 100 }) => <S size={size}>
  {Array.from({length:8}).map((_,i)=>{const a=(i/8)*Math.PI*2;const x=50+Math.cos(a)*32, y=50+Math.sin(a)*32;return <Ellipse key={i} cx={x} cy={y} rx="9" ry="14" fill={HOT_PINK} stroke={STK} strokeWidth="1.4" transform={`rotate(${i*45} ${x} ${y})`}/>})}
  <Circle cx="50" cy="50" r="20" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 64 C40 56 32 50 32 44 C32 38 38 36 42 40 C46 36 50 38 50 44 C50 38 54 36 58 40 C62 36 68 38 68 44 C68 50 60 56 50 64 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.5"/>
</S>;

// Pregnancy welcome — bump silhouette + heart eye
const PregnancyOnboardingHero = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="42" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 16 C40 16 36 22 36 30 C36 36 32 42 38 48 C28 56 22 68 24 80 C26 88 70 88 74 80 C72 68 68 60 60 50 C66 44 64 38 60 30 C58 22 56 16 50 16 Z" fill={PEACH} stroke={STK} strokeWidth="1.6"/>
  <Ellipse cx="48" cy="62" rx="3" ry="4" fill={STK}/>
  <Path d="M44 66 q4 -2 8 0" fill="none" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
  <Path d="M88 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={HOT_PINK} stroke={STK} strokeWidth="1"/>
</S>;

// Welcome auth hero — heart-eye logo + sticker frame
const AuthWelcomeHero = ({ size = 100 }) => <S size={size}>
  {Array.from({length:12}).map((_,i)=>{const a=(i/12)*Math.PI*2;const x1=50+Math.cos(a)*36, y1=50+Math.sin(a)*36, x2=50+Math.cos(a)*44, y2=50+Math.sin(a)*44;return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>})}
  <Circle cx="50" cy="50" r="32" fill={YELLOW} stroke={STK} strokeWidth="1.8"/>
  <Ellipse cx="50" cy="50" rx="22" ry="14" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 56 C42 50 38 46 38 42 C38 38 42 36 44 38 C46 36 50 38 50 42 C50 38 54 36 56 38 C58 36 62 38 62 42 C62 46 58 50 50 56 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Path d="M22 36 q8 -8 16 0" fill="none" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
  <Path d="M62 36 q8 -8 16 0" fill="none" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
</S>;

/* =================================================================== */
/*  CALENDAR DAY MARKERS — period / fertile (compact 100×100 chips)     */
/* =================================================================== */

const PrepregCalendarPeriodDay = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 24 C50 24 38 42 38 56 c0 10 6 16 12 16 c6 0 12 -6 12 -16 c0 -14 -12 -32 -12 -32 z" fill={HOT_PINK} stroke={STK} strokeWidth="1.5"/>
  <SvgText x="50" y="86" textAnchor="middle" fontFamily="serif" fontWeight="600" fontSize="11" fill={STK}>D1</SvgText>
</S>;

const PrepregCalendarFertileDay = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 22 l5 15 l15 5 l-15 5 l-5 15 l-5 -15 l-15 -5 l15 -5 z" fill={YELLOW} stroke={STK} strokeWidth="1.4" strokeLinejoin="round"/>
  <Path d="M50 50 q-3 -3 0 -6 q3 3 0 6 z" fill={HOT_PINK} stroke={STK} strokeWidth="0.9"/>
  <SvgText x="50" y="86" textAnchor="middle" fontFamily="serif" fontWeight="600" fontStyle="italic" fontSize="10" fill={STK}>fertile</SvgText>
</S>;

/* =================================================================== */
/*  PREGNANCY EXTRAS                                                    */
/* =================================================================== */

const PregnancyReminderPill = ({ size = 100 }) => <S size={size} vb="0 0 100 60">
  <Rect x="6" y="14" width="88" height="32" rx="16" fill={PURPLE} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="22" cy="30" r="10" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Path d="M18 30 l4 4 l6 -6" fill="none" stroke={STK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  <Line x1="40" y1="26" x2="78" y2="26" stroke={CREAM} strokeWidth="3" strokeLinecap="round"/>
  <Line x1="40" y1="34" x2="68" y2="34" stroke={CREAM} strokeWidth="3" strokeLinecap="round" opacity=".6"/>
</S>;

const PregnancyWeightTrend = ({ size = 100 }) => <S size={size}>
  <Rect x="10" y="14" width="80" height="72" rx="10" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M16 70 q12 -4 22 -16 q10 12 22 -8 q10 -4 22 -12" fill="none" stroke={ROYAL} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  <Circle cx="38" cy="54" r="3" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="60" cy="46" r="3" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="82" cy="34" r="4" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Line x1="16" y1="78" x2="84" y2="78" stroke={STK} strokeWidth="1" opacity=".4"/>
</S>;

const PregnancyJourneyRing = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill="none" stroke={CREAM} strokeWidth="9"/>
  <Path d="M50 14 a36 36 0 1 1 -18 67" fill="none" stroke={VIOLET} strokeWidth="9" strokeLinecap="round"/>
  <Circle cx="50" cy="50" r="20" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="50" y="48" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="13" fill={STK}>W 24</SvgText>
  <SvgText x="50" y="60" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="10" fill={STK} opacity=".6">of 40</SvgText>
</S>;

/* =================================================================== */
/*  KIDS — hero variants of log stickers                                */
/* =================================================================== */

const KidsHomeSleepCircle = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill="none" stroke={CREAM} strokeWidth="8"/>
  <Path d="M50 10 a40 40 0 1 1 -28 11" fill="none" stroke={VIOLET} strokeWidth="8" strokeLinecap="round"/>
  <Path d="M58 32 C44 32 32 42 32 56 c0 12 10 20 22 20 c6 0 11 -2 14 -5 c-10 0 -20 -8 -20 -22 c0 -8 4 -14 10 -17 z" fill={PURPLE} stroke={STK} strokeWidth="1.5"/>
  <SvgText x="78" y="32" fontFamily="serif" fontStyle="italic" fontSize="14" fill={STK}>z</SvgText>
  <SvgText x="86" y="24" fontFamily="serif" fontStyle="italic" fontSize="10" fill={STK}>z</SvgText>
</S>;

const KidsHomeMoodAnalysis = ({ size = 100 }) => <S size={size}>
  <Circle cx="28" cy="40" r="14" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="24" cy="38" r="1.4" fill={STK}/><Circle cx="32" cy="38" r="1.4" fill={STK}/>
  <Path d="M24 44 q4 3 8 0" fill="none" stroke={STK} strokeWidth="1.2"/>
  <Circle cx="50" cy="52" r="18" fill={YELLOW} stroke={STK} strokeWidth="1.5"/>
  <Circle cx="45" cy="50" r="1.8" fill={STK}/><Circle cx="55" cy="50" r="1.8" fill={STK}/>
  <Path d="M44 56 q6 5 12 0" fill="none" stroke={STK} strokeWidth="1.4"/>
  <Circle cx="74" cy="40" r="12" fill={BLUE} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="70" cy="40" r="1.2" fill={STK}/><Circle cx="78" cy="40" r="1.2" fill={STK}/>
  <Path d="M70 46 l8 0" stroke={STK} strokeWidth="1.2" strokeLinecap="round"/>
  <Path d="M20 80 q14 -4 30 0 q14 -4 30 0" fill="none" stroke={STK} strokeWidth="1.4"/>
</S>;

const KidsHomeGrowthLeaps = ({ size = 100 }) => <S size={size}>
  <Path d="M16 78 L34 60 L48 70 L66 40 L86 22" fill="none" stroke={ROYAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  <Circle cx="16" cy="78" r="4" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="34" cy="60" r="4" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="48" cy="70" r="4" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="66" cy="40" r="4" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="86" cy="22" r="6" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="86" y="26" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="9" fill={STK}>5</SvgText>
</S>;

const KidsHomeMilkTracker = ({ size = 100 }) => <S size={size}>
  <Path d="M34 14 h32 v6 l-6 8 v50 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 v-50 l-6 -8 z" fill={CREAM} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M30 56 h40 v22 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8 z" fill={BLUE} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <Line x1="38" y1="40" x2="62" y2="40" stroke={STK} strokeWidth="1" opacity=".4"/>
  <Line x1="38" y1="48" x2="62" y2="48" stroke={STK} strokeWidth="1" opacity=".4"/>
  <SvgText x="50" y="74" textAnchor="middle" fontFamily="serif" fontWeight="600" fontSize="13" fill={CREAM}>120 ml</SvgText>
</S>;

const KidsHomeJourneyRing = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill="none" stroke={CREAM} strokeWidth="9"/>
  <Path d="M50 14 a36 36 0 1 1 -32 19" fill="none" stroke={ROYAL} strokeWidth="9" strokeLinecap="round"/>
  <Circle cx="50" cy="50" r="20" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="50" y="48" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="13" fill={STK}>1y 6m</SvgText>
  <SvgText x="50" y="60" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="10" fill={STK} opacity=".6">old</SvgText>
</S>;

const KidsFoodDashboardHero = ({ size = 100 }) => <S size={size}>
  <Ellipse cx="50" cy="64" rx="38" ry="6" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Path d="M18 58 h64 q-2 16 -10 22 h-44 q-8 -6 -10 -22 z" fill={CREAM} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="36" cy="50" r="8" fill={GREEN} stroke={STK} strokeWidth="1.4"/>
  <Path d="M44 48 q6 -10 16 0" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="64" cy="52" r="7" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
  <Path d="M50 26 v8 M40 30 q4 -4 10 -4 q6 0 10 4" fill="none" stroke={STK} strokeWidth="1.6" strokeLinecap="round"/>
</S>;

const KidsFoodPhotoEntry = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="26" width="72" height="56" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="40" y="20" width="20" height="10" rx="2" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="54" r="18" fill="none" stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="54" r="10" fill={HOT_PINK} stroke={STK} strokeWidth="1.5"/>
  <Ellipse cx="44" cy="38" rx="3" ry="2" fill={CREAM} stroke={STK} strokeWidth="1"/>
  <Path d="M14 70 q14 -10 22 -2 q8 -10 16 4 q8 -10 16 0 q8 -8 18 4 v8 q0 4 -4 4 h-64 q-4 0 -4 -4 z" fill={MINT} stroke={STK} strokeWidth="1.4" strokeLinejoin="round" opacity=".4"/>
</S>;

const KidsVaultVaccinesSection = ({ size = 100 }) => <S size={size}>
  <Path d="M50 14 C40 18 26 18 18 18 v32 c0 22 16 32 32 36 c16 -4 32 -14 32 -36 v-32 c-8 0 -22 0 -32 -4 z" fill={ROYAL} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <G transform="rotate(-30 50 50)">
    <Rect x="34" y="46" width="32" height="8" rx="2" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
    <Rect x="56" y="42" width="10" height="16" rx="2" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
    <Line x1="66" y1="50" x2="74" y2="50" stroke={STK} strokeWidth="1.6" strokeLinecap="round"/>
    <Line x1="36" y1="40" x2="36" y2="60" stroke={STK} strokeWidth="1.6" strokeLinecap="round"/>
  </G>
</S>;

const KidsVaultEmergencyCard = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="22" width="72" height="56" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.8"/>
  <Rect x="14" y="22" width="72" height="14" rx="6" fill={RED} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="50" y="32" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="10" fill={CREAM}>EMERGENCY</SvgText>
  <Rect x="42" y="46" width="16" height="22" fill={RED} stroke={STK} strokeWidth="1.6"/>
  <Rect x="34" y="54" width="32" height="6" fill={RED} stroke={STK} strokeWidth="1.6"/>
</S>;

/* =================================================================== */
/*  ONBOARDING ACTIVITY TILES — 12 dedicated card-style chips           */
/* =================================================================== */

const _tile = (bg: string, art: React.ReactNode) => <S size={100}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={bg} stroke={STK} strokeWidth="1.6"/>
  {art}
</S>;

const ActivityFeeding = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={PEACH} stroke={STK} strokeWidth="1.6"/>
  <Path d="M40 26 h20 v6 l-4 6 v32 a6 6 0 0 1 -6 6 h-2 a6 6 0 0 1 -6 -6 v-32 l-4 -6 z" fill={CREAM} stroke={STK} strokeWidth="1.5" strokeLinejoin="round"/>
  <Line x1="42" y1="48" x2="58" y2="48" stroke={STK} strokeWidth="1" opacity=".4"/>
  <Line x1="42" y1="56" x2="58" y2="56" stroke={STK} strokeWidth="1" opacity=".4"/>
</S>;

const ActivitySleep = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={PURPLE} stroke={STK} strokeWidth="1.6"/>
  <Path d="M62 30 C46 30 32 42 32 56 c0 14 12 22 26 22 c8 0 14 -2 18 -6 c-12 -2 -22 -10 -22 -24 c0 -10 4 -16 8 -18 z" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="74" y="34" fontFamily="serif" fontStyle="italic" fontSize="14" fill={STK}>z</SvgText>
</S>;

const ActivityDiaper = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={BLUE} stroke={STK} strokeWidth="1.6"/>
  <Path d="M22 36 l56 0 l-6 26 q-2 8 -10 8 l-24 0 q-8 0 -10 -8 z" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 46 C50 46 40 60 40 66 c0 6 4 10 10 10 c6 0 10 -4 10 -10 c0 -6 -10 -20 -10 -20 z" fill={YELLOW} stroke={STK} strokeWidth="1.5"/>
</S>;

const ActivityMood = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="50" r="24" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="42" cy="46" r="2.4" fill={STK}/><Circle cx="58" cy="46" r="2.4" fill={STK}/>
  <Path d="M40 58 q10 8 20 0" fill="none" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
</S>;

const ActivityGrowth = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={GREEN} stroke={STK} strokeWidth="1.6"/>
  <Rect x="40" y="20" width="20" height="60" rx="3" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  {[28,38,48,58,68,78].map((y,i)=>(<Line key={i} x1="42" y1={y} x2={i%2===0?52:48} y2={y} stroke={STK} strokeWidth="1.4"/>))}
  <SvgText x="50" y="56" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="11" fill={STK} transform="rotate(-90 50 56)">cm</SvgText>
</S>;

const ActivityMedicine = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={RED} stroke={STK} strokeWidth="1.6"/>
  <G transform="rotate(-30 50 50)">
    <Rect x="22" y="42" width="56" height="16" rx="8" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
    <Rect x="22" y="42" width="28" height="16" rx="8 0 0 8" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
    <Line x1="50" y1="42" x2="50" y2="58" stroke={STK} strokeWidth="1.6"/>
  </G>
</S>;

const ActivityVaccines = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={ROYAL} stroke={STK} strokeWidth="1.6"/>
  <G transform="rotate(-30 50 50)">
    <Rect x="26" y="46" width="34" height="8" rx="2" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
    <Rect x="56" y="42" width="10" height="16" rx="2" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
    <Line x1="66" y1="50" x2="76" y2="50" stroke={STK} strokeWidth="1.8" strokeLinecap="round"/>
    <Line x1="32" y1="38" x2="32" y2="62" stroke={STK} strokeWidth="1.6" strokeLinecap="round"/>
    <Line x1="26" y1="44" x2="26" y2="56" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
  </G>
</S>;

const ActivityMilestones = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={YELLOW} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 24 l7 18 l20 2 l-15 13 l5 20 l-17 -11 l-17 11 l5 -20 l-15 -13 l20 -2 z" fill={CREAM} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

const ActivityAppointments = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={MINT} stroke={STK} strokeWidth="1.6"/>
  <Rect x="22" y="28" width="56" height="50" rx="4" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="22" y="28" width="56" height="12" rx="4" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Line x1="32" y1="22" x2="32" y2="34" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
  <Line x1="68" y1="22" x2="68" y2="34" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
  <Path d="M36 56 l6 6 l16 -16" fill="none" stroke={HOT_PINK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

const ActivityWeight = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={PEACH} stroke={STK} strokeWidth="1.6"/>
  <Rect x="22" y="36" width="56" height="40" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="56" r="13" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Line x1="50" y1="56" x2="50" y2="46" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round"/>
  <Line x1="36" y1="56" x2="32" y2="56" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
  <Line x1="64" y1="56" x2="68" y2="56" stroke={STK} strokeWidth="1.4" strokeLinecap="round"/>
</S>;

const ActivityNutrition = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={GREEN} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 22 q-12 0 -12 12 q0 16 12 28 q12 -12 12 -28 q0 -12 -12 -12 z" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 22 q-2 4 0 8 q2 -4 0 -8 z" fill={STK} opacity=".15"/>
  <Line x1="50" y1="62" x2="50" y2="78" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
</S>;

const ActivityFertility = ({ size = 100 }) => <S size={size}>
  <Rect x="8" y="8" width="84" height="84" rx="14" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
  {Array.from({length:6}).map((_,i)=>{const a=(i/6)*Math.PI*2;const x=50+Math.cos(a)*16, y=50+Math.sin(a)*16;return <Ellipse key={i} cx={x} cy={y} rx="7" ry="11" fill={CREAM} stroke={STK} strokeWidth="1.4" transform={`rotate(${i*60} ${x} ${y})`}/>})}
  <Circle cx="50" cy="50" r="6" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
</S>;

/* =================================================================== */
/*  ICONS — dedicated nav / role / utility glyphs                       */
/* =================================================================== */

const IconTabExchange = ({ size = 100 }) => <S size={size}>
  <Path d="M20 56 q-4 -10 6 -10 h36 l-6 -8 l16 12 l-16 12 l6 -10 h-36 q-4 0 -6 4 z" fill={STK}/>
  <Path d="M80 38 q4 10 -6 10 h-36 l6 8 l-16 -12 l16 -12 l-6 10 h36 q4 0 6 -4 z" fill={STK} opacity=".5"/>
  <Circle cx="22" cy="80" r="5" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="78" cy="20" r="5" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
</S>;

const IconPillarAskGrandma = ({ size = 100 }) => <S size={size}>
  <Path d="M14 30 q0 -10 10 -10 h52 q10 0 10 10 v26 q0 10 -10 10 h-32 l-14 14 v-14 h-6 q-10 0 -10 -10 z" fill={CREAM} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M50 56 C42 50 36 46 36 42 C36 38 40 36 44 38 C46 36 50 38 50 42 C50 38 54 36 56 38 C60 36 64 38 64 42 C64 46 58 50 50 56 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
</S>;

const IconChatAttach = ({ size = 100 }) => <S size={size}>
  <Path d="M30 50 l30 -30 q12 -12 22 -2 q10 10 -2 22 l-26 26 q-8 8 -16 0 q-8 -8 0 -16 l22 -22 q4 -4 6 0 q2 4 -2 6 l-18 18" fill="none" stroke={STK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

const IconNotificationVaccine = ({ size = 100 }) => <S size={size}>
  <G transform="rotate(-30 50 50)">
    <Rect x="26" y="46" width="32" height="8" rx="2" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
    <Rect x="56" y="42" width="10" height="16" rx="2" fill={YELLOW} stroke={STK} strokeWidth="1.6"/>
    <Line x1="66" y1="50" x2="74" y2="50" stroke={STK} strokeWidth="1.8" strokeLinecap="round"/>
  </G>
  <Circle cx="78" cy="22" r="10" fill={RED} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="78" y="26" textAnchor="middle" fontFamily="sans-serif" fontWeight="700" fontSize="13" fill={CREAM}>!</SvgText>
</S>;

const IconNotificationAppointment = ({ size = 100 }) => <S size={size}>
  <Rect x="18" y="26" width="64" height="56" rx="5" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="18" y="26" width="64" height="14" rx="5" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Line x1="32" y1="18" x2="32" y2="32" stroke={STK} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="68" y1="18" x2="68" y2="32" stroke={STK} strokeWidth="2.4" strokeLinecap="round"/>
  <Path d="M30 60 l8 8 l22 -22" fill="none" stroke={HOT_PINK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

const IconNotificationGrandma = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="34" fill={YELLOW} stroke={STK} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="50" rx="22" ry="14" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 56 C44 52 40 48 40 44 C40 40 44 38 46 40 C48 38 50 40 50 44 C50 40 52 38 54 40 C56 38 60 40 60 44 C60 48 56 52 50 56 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="80" cy="22" r="6" fill={RED} stroke={STK} strokeWidth="1.4"/>
</S>;

const IconProfileHealthHistory = ({ size = 100 }) => <S size={size}>
  <Rect x="16" y="14" width="68" height="72" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M28 50 l6 0 l4 -12 l5 24 l4 -8 l6 0" fill="none" stroke={HOT_PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  <Line x1="62" y1="50" x2="76" y2="50" stroke={STK} strokeWidth="1" opacity=".3"/>
  <Line x1="28" y1="64" x2="68" y2="64" stroke={STK} strokeWidth="1" opacity=".3"/>
  <Line x1="28" y1="72" x2="60" y2="72" stroke={STK} strokeWidth="1" opacity=".3"/>
  <Path d="M68 30 l3 6 l6 1 l-4.5 5 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -5 l6 -1 z" fill={YELLOW} stroke={STK} strokeWidth="1"/>
</S>;

const IconProfileMemories = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="18" width="34" height="42" rx="3" fill={CREAM} stroke={STK} strokeWidth="1.6" transform="rotate(-8 31 39)"/>
  <Rect x="32" y="22" width="34" height="42" rx="3" fill={PEACH} stroke={STK} strokeWidth="1.6" transform="rotate(4 49 43)"/>
  <Rect x="50" y="32" width="34" height="42" rx="3" fill={HOT_PINK} stroke={STK} strokeWidth="1.6" transform="rotate(-3 67 53)"/>
  <Path d="M70 56 C64 52 60 48 60 44 C60 40 64 38 66 40 C68 38 70 40 70 44 C70 40 72 38 74 40 C76 38 80 40 80 44 C80 48 76 52 70 56 Z" fill={CREAM} stroke={STK} strokeWidth="1.2"/>
</S>;

const IconProfileEmergencyInsurance = ({ size = 100 }) => <S size={size}>
  <Path d="M50 14 C60 18 76 18 84 18 v30 c0 20 -14 32 -34 36 c-20 -4 -34 -16 -34 -36 v-30 c8 0 24 0 34 -4 z" fill={CREAM} stroke={STK} strokeWidth="1.8" strokeLinejoin="round"/>
  <Rect x="44" y="36" width="12" height="28" fill={RED} stroke={STK} strokeWidth="1.4"/>
  <Rect x="36" y="44" width="28" height="12" fill={RED} stroke={STK} strokeWidth="1.4"/>
</S>;

const IconCaregiverRolePartner = ({ size = 100 }) => <S size={size}>
  <Circle cx="34" cy="38" r="14" fill={PINK} stroke={STK} strokeWidth="1.5"/>
  <Circle cx="66" cy="38" r="14" fill={BLUE} stroke={STK} strokeWidth="1.5"/>
  <Path d="M50 80 C36 70 26 62 26 56 C26 50 30 48 34 50 C38 48 42 50 42 56 C42 50 46 48 50 50 C54 48 58 50 58 56 C58 50 62 48 66 50 C70 48 74 50 74 56 C74 62 64 70 50 80 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.5"/>
</S>;

const IconSettingsModeSwitch = ({ size = 100 }) => <S size={size} vb="0 0 100 60">
  <Rect x="6" y="14" width="88" height="32" rx="16" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="22" cy="30" r="11" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="30" r="11" fill={VIOLET} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="78" cy="30" r="11" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="30" r="14" fill="none" stroke={STK} strokeWidth="2"/>
</S>;

/* =================================================================== */
/*  SCAN tiles                                                          */
/* =================================================================== */

const ScanHero = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="22" width="72" height="52" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="48" r="14" fill="none" stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="48" r="8" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Path d="M22 30 v-4 q0 -4 4 -4 h6 M68 22 h6 q4 0 4 4 v4 M22 66 v4 q0 4 4 4 h6 M68 74 h6 q4 0 4 -4 v-4" fill="none" stroke={STK} strokeWidth="1.6" strokeLinecap="round"/>
  <Line x1="22" y1="48" x2="78" y2="48" stroke={HOT_PINK} strokeWidth="1.4" strokeDasharray="3 2" opacity=".5"/>
</S>;

const ScanTypeMedicine = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="14" fill={RED} stroke={STK} strokeWidth="1.6"/>
  <G transform="rotate(-30 50 50)">
    <Rect x="26" y="44" width="48" height="14" rx="7" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
    <Rect x="26" y="44" width="24" height="14" rx="7 0 0 7" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
    <Line x1="50" y1="44" x2="50" y2="58" stroke={STK} strokeWidth="1.6"/>
  </G>
</S>;

const ScanTypeFood = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="14" fill={GREEN} stroke={STK} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="58" rx="28" ry="4" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Path d="M22 56 h56 q-2 14 -10 18 h-36 q-8 -4 -10 -18 z" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 30 v8 M42 34 q4 -4 8 -4 q4 0 8 4" fill="none" stroke={STK} strokeWidth="1.4"/>
</S>;

const ScanTypeNutrition = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="14" fill={YELLOW} stroke={STK} strokeWidth="1.6"/>
  <Rect x="26" y="26" width="48" height="56" rx="3" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="34" y="40" fontFamily="sans-serif" fontSize="8" fontWeight="700" fill={STK}>NUTRITION</SvgText>
  <Line x1="32" y1="46" x2="68" y2="46" stroke={STK} strokeWidth="1" opacity=".4"/>
  <Line x1="32" y1="54" x2="60" y2="54" stroke={STK} strokeWidth="1" opacity=".4"/>
  <Line x1="32" y1="62" x2="56" y2="62" stroke={STK} strokeWidth="1" opacity=".4"/>
  <Line x1="32" y1="70" x2="52" y2="70" stroke={STK} strokeWidth="1" opacity=".4"/>
</S>;

const ScanTypeGeneral = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="14" fill={PURPLE} stroke={STK} strokeWidth="1.6"/>
  <Rect x="22" y="32" width="56" height="40" rx="4" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="42" y="26" width="16" height="8" rx="2" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="52" r="10" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="52" r="4" fill={CREAM}/>
</S>;

/* =================================================================== */
/*  PAYWALL / INSIGHTS                                                  */
/* =================================================================== */

const PaywallFeatureInsights = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="38" fill={ROYAL} stroke={STK} strokeWidth="1.6"/>
  <Line x1="22" y1="74" x2="78" y2="74" stroke={CREAM} strokeWidth="1.4"/>
  <Rect x="28" y="60" width="10" height="14" fill={CREAM}/>
  <Rect x="44" y="50" width="10" height="24" fill={CREAM}/>
  <Rect x="60" y="40" width="10" height="34" fill={CREAM}/>
  <Path d="M22 38 L34 44 L50 32 L68 28" fill="none" stroke={HOT_PINK} strokeWidth="2.4" strokeLinecap="round"/>
</S>;

const PaywallFeatureGrandma = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="38" fill={YELLOW} stroke={STK} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="50" rx="26" ry="16" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M50 56 C42 50 36 46 36 42 C36 38 40 36 44 38 C46 36 50 38 50 42 C50 38 54 36 56 38 C60 36 64 38 64 42 C64 46 58 50 50 56 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Path d="M86 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={CREAM} stroke={STK} strokeWidth="1"/>
  <SvgText x="50" y="86" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="11" fill={STK}>unlimited</SvgText>
</S>;

const InsightsHero = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="20" width="72" height="60" rx="8" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Path d="M22 64 q12 0 18 -10 q8 -14 16 4 q8 -18 22 -22" fill="none" stroke={HOT_PINK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
  <Circle cx="22" cy="64" r="3" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="40" cy="54" r="3" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="78" cy="36" r="5" fill={YELLOW} stroke={STK} strokeWidth="1.4"/>
  <Path d="M88 14 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z" fill={HOT_PINK} stroke={STK} strokeWidth="0.8"/>
</S>;

const InsightsPillarCard = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="12" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="32" cy="32" r="11" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="32" cy="32" r="5" fill={CREAM} stroke={STK} strokeWidth="1"/>
  <Line x1="48" y1="30" x2="78" y2="30" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
  <Line x1="48" y1="38" x2="68" y2="38" stroke={STK} strokeWidth="1.4" strokeLinecap="round" opacity=".4"/>
  <Path d="M22 56 q14 -4 24 0 q14 -4 24 0" fill="none" stroke={ROYAL} strokeWidth="2.2" strokeLinecap="round"/>
  <Line x1="22" y1="72" x2="78" y2="72" stroke={STK} strokeWidth="1" opacity=".3"/>
  <SvgText x="50" y="83" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fontWeight="600" opacity=".6">PILLAR</SvgText>
</S>;

/* =================================================================== */
/*  REWARDS HERO                                                        */
/* =================================================================== */

const RewardsHero = ({ size = 100 }) => <S size={size}>
  <Rect x="22" y="40" width="56" height="44" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="22" y="40" width="56" height="10" rx="6" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <G transform="translate(0,-12)">
    {[0,1,2].map(i => (<Rect key={i} x={30+i*16} y={62} width="8" height="10" rx="2" fill={i<2?MINT:CREAM} stroke={STK} strokeWidth="1.2"/>))}
    {[3,4,5,6].map(i => (<Rect key={i} x={30+(i-3)*12+32} y={62} width="8" height="10" rx="2" fill="none" stroke={STK} strokeWidth="1.2" opacity=".5"/>))}
  </G>
  <Path d="M50 18 q-4 14 0 22 q-12 -8 -16 4 q12 -2 16 4 q4 -6 16 -4 q-4 -12 -16 -4 q4 -8 0 -22 z" fill={HOT_PINK} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

/* =================================================================== */
/*  PROFILE JOURNEY PILL                                                */
/* =================================================================== */

const ProfileJourneyPill = ({ size = 100 }) => <S size={size} vb="0 0 100 60">
  <Rect x="4" y="14" width="92" height="32" rx="16" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="6" y="16" width="30" height="28" rx="14" fill={HOT_PINK} stroke={STK} strokeWidth="1.2"/>
  <Rect x="35" y="16" width="30" height="28" rx="0" fill={VIOLET} stroke={STK} strokeWidth="1.2"/>
  <Rect x="64" y="16" width="30" height="28" rx="14" fill={ROYAL} stroke={STK} strokeWidth="1.2"/>
  <Circle cx="50" cy="30" r="6" fill={CREAM} stroke={STK} strokeWidth="1.4"/>
</S>;

/* =================================================================== */
/*  GARAGE / VAULT extras                                               */
/* =================================================================== */

const GarageHero = ({ size = 100 }) => <S size={size}>
  <Path d="M14 48 l36 -32 l36 32 v36 q0 4 -4 4 h-64 q-4 0 -4 -4 z" fill={PEACH} stroke={STK} strokeWidth="1.6" strokeLinejoin="round"/>
  <Rect x="34" y="58" width="32" height="30" fill={CREAM} stroke={STK} strokeWidth="1.5"/>
  <Line x1="34" y1="68" x2="66" y2="68" stroke={STK} strokeWidth="1.4"/>
  <Line x1="34" y1="78" x2="66" y2="78" stroke={STK} strokeWidth="1.4"/>
  <Circle cx="20" cy="30" r="5" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Path d="M84 20 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={YELLOW} stroke={STK} strokeWidth="1"/>
</S>;

const VaultHero = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="22" width="72" height="60" rx="8" fill={ROYAL} stroke={STK} strokeWidth="1.8"/>
  <Rect x="22" y="30" width="56" height="44" rx="4" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="52" r="14" fill={ROYAL} stroke={STK} strokeWidth="1.4"/>
  <Circle cx="50" cy="52" r="6" fill={CREAM} stroke={STK} strokeWidth="1.2"/>
  <Line x1="50" y1="58" x2="50" y2="68" stroke={STK} strokeWidth="2" strokeLinecap="round"/>
</S>;

const VaultSectionUltrasound = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="8" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Circle cx="50" cy="48" r="22" fill={STK} opacity=".7"/>
  <Path d="M48 38 c-6 4 -8 12 -4 16 c4 4 4 12 -2 14" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round"/>
  <Ellipse cx="58" cy="40" rx="4" ry="3" fill={CREAM} opacity=".4"/>
  <SvgText x="50" y="80" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="11" fill={STK}>20 wk</SvgText>
</S>;

const VaultSectionBirthPlan = ({ size = 100 }) => <S size={size}>
  <Rect x="16" y="14" width="68" height="72" rx="6" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Rect x="30" y="10" width="40" height="14" rx="3" fill={VIOLET} stroke={STK} strokeWidth="1.4"/>
  <Line x1="24" y1="36" x2="76" y2="36" stroke={STK} strokeWidth="1.2"/>
  <Line x1="24" y1="46" x2="68" y2="46" stroke={STK} strokeWidth="1.2"/>
  <Line x1="24" y1="56" x2="74" y2="56" stroke={STK} strokeWidth="1.2"/>
  <Path d="M50 76 C42 70 38 66 38 62 C38 58 42 56 44 58 C46 56 50 58 50 62 C50 58 54 56 56 58 C58 56 62 58 62 62 C62 66 58 70 50 76 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
</S>;

const VaultEmergency = ({ size = 100 }) => <S size={size}>
  <Path d="M50 14 C60 18 76 18 84 18 v30 c0 20 -14 32 -34 36 c-20 -4 -34 -16 -34 -36 v-30 c8 0 24 0 34 -4 z" fill={RED} stroke={STK} strokeWidth="1.8" strokeLinejoin="round"/>
  <Rect x="44" y="32" width="12" height="32" fill={CREAM} stroke={STK} strokeWidth="1.5"/>
  <Rect x="34" y="42" width="32" height="12" fill={CREAM} stroke={STK} strokeWidth="1.5"/>
</S>;

const PrepregHomeWisdom = ({ size = 100 }) => <S size={size}>
  <Ellipse cx="50" cy="56" rx="36" ry="24" fill={CREAM} stroke={STK} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="56" rx="22" ry="12" fill={YELLOW} stroke={STK} strokeWidth="1.5"/>
  <Path d="M50 64 C42 58 36 54 36 50 C36 46 40 44 44 46 C46 44 50 46 50 50 C50 46 54 44 56 46 C60 44 64 46 64 50 C64 54 58 58 50 64 Z" fill={HOT_PINK} stroke={STK} strokeWidth="1.4"/>
  <Path d="M16 80 q34 -12 68 0" fill="none" stroke={STK} strokeWidth="1.4" strokeDasharray="3 2"/>
</S>;

const PillarTipCardAccent = ({ size = 100 }) => <S size={size}>
  {Array.from({length:12}).map((_,i)=>{const a=(i/12)*Math.PI*2;const r1 = i % 2 === 0 ? 40 : 28; const x=50+Math.cos(a)*r1, y=50+Math.sin(a)*r1; return <Circle key={i} cx={x} cy={y} r="2" fill={YELLOW} stroke={STK} strokeWidth="0.8"/>;})}
  <Circle cx="50" cy="50" r="20" fill={HOT_PINK} stroke={STK} strokeWidth="1.6"/>
  <SvgText x="50" y="55" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="16" fill={CREAM}>!</SvgText>
</S>;

/* =================================================================== */
/*  EXPORT                                                              */
/* =================================================================== */

export const PartialStickers = {
  // Heroes
  PrepregOnboardingHero,
  PregnancyOnboardingHero,
  AuthWelcomeHero,
  // Calendar
  PrepregCalendarPeriodDay,
  PrepregCalendarFertileDay,
  // Pregnancy
  PregnancyReminderPill,
  PregnancyWeightTrend,
  PregnancyJourneyRing,
  // Kids hero variants
  KidsHomeSleepCircle,
  KidsHomeMoodAnalysis,
  KidsHomeGrowthLeaps,
  KidsHomeMilkTracker,
  KidsHomeJourneyRing,
  KidsFoodDashboardHero,
  KidsFoodPhotoEntry,
  KidsVaultVaccinesSection,
  KidsVaultEmergencyCard,
  // Onboarding activity tiles
  ActivityFeeding,
  ActivitySleep,
  ActivityDiaper,
  ActivityMood,
  ActivityGrowth,
  ActivityMedicine,
  ActivityVaccines,
  ActivityMilestones,
  ActivityAppointments,
  ActivityWeight,
  ActivityNutrition,
  ActivityFertility,
  // Icons
  IconTabExchange,
  IconPillarAskGrandma,
  IconChatAttach,
  IconNotificationVaccine,
  IconNotificationAppointment,
  IconNotificationGrandma,
  IconProfileHealthHistory,
  IconProfileMemories,
  IconProfileEmergencyInsurance,
  IconCaregiverRolePartner,
  IconSettingsModeSwitch,
  // Scan
  ScanHero,
  ScanTypeMedicine,
  ScanTypeFood,
  ScanTypeNutrition,
  ScanTypeGeneral,
  // Paywall / Insights
  PaywallFeatureInsights,
  PaywallFeatureGrandma,
  InsightsHero,
  InsightsPillarCard,
  // Rewards
  RewardsHero,
  // Profile
  ProfileJourneyPill,
  // Garage / Vault
  GarageHero,
  VaultHero,
  VaultSectionUltrasound,
  VaultSectionBirthPlan,
  VaultEmergency,
  // Wisdom & decoration
  PrepregHomeWisdom,
  PillarTipCardAccent,
};
