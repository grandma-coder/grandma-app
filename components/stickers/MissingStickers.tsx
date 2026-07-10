// missing-stickers.tsx — Sticker components for grandma.app
// Generated from the design-system project — drop into components/stickers/
// Each component accepts a single `size` prop (default 100).

import React from 'react';
import Svg, { Rect, Circle, Path, Line, Ellipse, G, Text as SvgText } from 'react-native-svg';

// Missing & placeholder stickers — generated to cover gaps from
// design-assets-needed.md (status: todo / missing in coverage manifest).
// Same paper-cutout vocabulary as src/stickers.jsx — 100×100 viewBox,
// charcoal stroke #141313, palette pulled from the existing system.

const STROKE = '#141313';
const PINK = '#F2B2C7';
const HOT_PINK = '#FF8AD8';
const PURPLE = '#C8B6E8';
const VIOLET = '#B983FF';
const BLUE = '#9DC3E8';
const ROYAL = '#4D96FF';
const YELLOW = '#F5D652';
const GREEN = '#BDD48C';
const PEACH = '#F4C29B';
const CREAM = '#FBEFD8';
const PAPER = '#FFF4DE';
const RED = '#E58B7B';
const MINT = '#B6E0C8';

/* ------------------------------------------------------------------ */
/*  Helper: standard 100×100 sticker SVG wrapper                       */
/* ------------------------------------------------------------------ */
const S = ({ size = 100, children, vb = '0 0 100 100' }: { size?: number; children: React.ReactNode; vb?: string }) => (
  <Svg width={size} height={size} viewBox={vb}>{children}</Svg>
);

/* =================================================================== */
/*  PRE-PREGNANCY (mode: pink #FF8AD8)                                  */
/* =================================================================== */

// Onboarding — cycle tracking: phone with cycle ring on screen
const PrepregOnboardingCycleTracking = ({ size = 100 }) => <S size={size}>
  <Rect x="30" y="14" width="40" height="72" rx="8" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="50" r="14" fill="none" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 2.6"/>
  <Circle cx="50" cy="36" r="4" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
  <Line x1="46" y1="76" x2="54" y2="76" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round"/>
  <Path d="M76 22 q6 -2 8 4 q1 6 -5 7" fill="none" stroke={HOT_PINK} strokeWidth="2" strokeLinecap="round"/>
</S>;

// Onboarding — partner: two figures holding hands
const PrepregOnboardingPartner = ({ size = 100 }) => <S size={size}>
  <Circle cx="36" cy="34" r="10" fill={PINK} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M22 86 q2 -28 14 -28 q12 0 14 28 z" fill={PINK} stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="66" cy="34" r="10" fill={BLUE} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M52 86 q2 -28 14 -28 q12 0 14 28 z" fill={BLUE} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M44 64 q6 -6 12 0" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  <Path d="M50 56 l-2 -4 l4 0 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Onboarding — doctor visit: clipboard + stethoscope
const PrepregOnboardingDoctor = ({ size = 100 }) => <S size={size}>
  <Rect x="26" y="18" width="48" height="64" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="40" y="14" width="20" height="10" rx="3" fill={PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="34" y1="40" x2="62" y2="40" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
  <Line x1="34" y1="50" x2="58" y2="50" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
  <Path d="M40 64 q4 -4 8 0 q4 4 8 0" fill="none" stroke={HOT_PINK} strokeWidth="2"/>
  <Circle cx="60" cy="64" r="3" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Cycle ring — menstruation phase (soft pink drop)
const PrepregRingMenstruation = ({ size = 100 }) => <S size={size}>
  <Path d="M50 18 C50 18 28 48 28 64 c0 14 10 22 22 22 c12 0 22 -8 22 -22 c0 -16 -22 -46 -22 -46 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Ellipse cx="42" cy="56" rx="6" ry="10" fill={PINK} opacity=".7"/>
</S>;

// Cycle ring — follicular (sprout)
const PrepregRingFollicular = ({ size = 100 }) => <S size={size}>
  <Path d="M50 86 q0 -16 0 -28" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round"/>
  <Path d="M50 58 q-12 -4 -16 -16 q12 0 16 14" fill={GREEN} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M50 50 q12 -2 18 -12 q-10 -2 -18 10" fill={GREEN} stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="50" cy="86" r="6" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Cycle ring — ovulation (radiant burst)
const PrepregRingOvulation = ({ size = 100 }) => <S size={size}>
  {Array.from({length:10}).map((_,i)=>{const a=(i/10)*Math.PI*2;const x1=50+Math.cos(a)*22, y1=50+Math.sin(a)*22, x2=50+Math.cos(a)*40, y2=50+Math.sin(a)*40;return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="1.8" strokeLinecap="round"/>})}
  <Circle cx="50" cy="50" r="18" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="50" r="6" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Cycle ring — luteal (crescent moon)
const PrepregRingLuteal = ({ size = 100 }) => <S size={size}>
  <Path d="M64 16 C44 16 28 30 28 50 c0 22 18 36 38 36 c8 0 16 -3 20 -8 c-16 0 -32 -14 -32 -34 c0 -16 6 -26 10 -28 z" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="42" cy="38" r="2.5" fill={STROKE}/>
  <Circle cx="56" cy="58" r="1.8" fill={STROKE}/>
</S>;

// Fertile window — sparkle field
const PrepregFertileWindow = ({ size = 100 }) => <S size={size}>
  <Path d="M50 14 l6 18 l18 6 l-18 6 l-6 18 l-6 -18 l-18 -6 l18 -6 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M26 70 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round"/>
  <Path d="M78 76 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill={PINK} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round"/>
</S>;

// Hormone — estrogen (curved E + flower)
const PrepregHormoneEstrogen = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M62 30 q-22 -4 -22 20 q0 24 22 20" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round"/>
  <Line x1="42" y1="50" x2="58" y2="50" stroke={STROKE} strokeWidth="3" strokeLinecap="round"/>
  <Circle cx="74" cy="28" r="6" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Hormone — progesterone (P glyph)
const PrepregHormoneProgesterone = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M40 30 v40" stroke={STROKE} strokeWidth="3" strokeLinecap="round"/>
  <Path d="M40 30 h14 a10 10 0 0 1 0 20 h-14" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  <Path d="M68 64 q4 4 8 0" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
</S>;

// Hormone — LH surge (lightning bolt)
const PrepregHormoneLH = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M54 22 L34 54 l14 0 l-6 24 l22 -34 l-14 0 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

// Empty checklist — paper with sparkle
const PrepregChecklistEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M28 16 l40 0 q6 0 6 6 l0 56 q0 6 -6 6 l-40 0 q-6 0 -6 -6 l0 -56 q0 -6 6 -6 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="36" cy="36" r="3" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="36" cy="50" r="3" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="36" cy="64" r="3" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="44" y1="36" x2="64" y2="36" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 2"/>
  <Line x1="44" y1="50" x2="60" y2="50" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 2"/>
  <Path d="M78 22 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3"/>
</S>;

/* =================================================================== */
/*  PREGNANCY (mode: purple #B983FF)                                    */
/* =================================================================== */

// Onboarding — due date calendar with baby
const PregnancyOnboardingDueDate = ({ size = 100 }) => <S size={size}>
  <Rect x="18" y="22" width="64" height="58" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="18" y="22" width="64" height="14" rx="6" fill={VIOLET} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="32" y1="18" x2="32" y2="30" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
  <Line x1="68" y1="18" x2="68" y2="30" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
  <Circle cx="60" cy="60" r="14" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="56" cy="58" r="1.5" fill={STROKE}/><Circle cx="64" cy="58" r="1.5" fill={STROKE}/>
  <Path d="M56 64 q4 3 8 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
  <Path d="M30 56 l4 4 l8 -8" fill="none" stroke={HOT_PINK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

// Onboarding — invite partner: two heads with heart
const PregnancyOnboardingPartner = ({ size = 100 }) => <S size={size}>
  <Circle cx="34" cy="52" r="16" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="66" cy="52" r="16" fill={BLUE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 30 C44 22 32 22 32 32 C32 40 50 50 50 50 C50 50 68 40 68 32 C68 22 56 22 50 30 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Today summary — sun rising over horizon
const PregnancyTodaySummary = ({ size = 100 }) => <S size={size}>
  <Path d="M10 68 q40 -20 80 0 v22 h-80 z" fill={CREAM} stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="50" cy="48" r="14" fill={YELLOW} stroke={STROKE} strokeWidth="1.5"/>
  {Array.from({length:5}).map((_,i)=>{const a=Math.PI+Math.PI*((i+1)/6);const x1=50+Math.cos(a)*20,y1=48+Math.sin(a)*20,x2=50+Math.cos(a)*30,y2=48+Math.sin(a)*30;return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>})}
</S>;

// Affirmation — hand-lettered heart in oval banner
const PregnancyAffirmation = ({ size = 100 }) => <S size={size}>
  <Ellipse cx="50" cy="50" rx="42" ry="28" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 64 C32 52 24 44 24 36 C24 28 32 24 38 28 C42 24 50 24 50 32 C50 24 58 24 62 28 C68 24 76 28 76 36 C76 44 68 52 50 64 Z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M40 44 q4 4 10 0 q6 -4 10 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
</S>;

// Affirmation share — bordered card with heart
const PregnancyAffirmationShare = ({ size = 100 }) => <S size={size}>
  <Rect x="16" y="20" width="68" height="60" rx="8" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="22" y="26" width="56" height="48" rx="4" fill="none" stroke={STROKE} strokeWidth="1.2" strokeDasharray="3 2"/>
  <Path d="M50 60 C38 50 30 44 30 38 C30 32 36 28 42 32 C46 30 50 30 50 36 C50 30 54 30 58 32 C64 28 70 32 70 38 C70 44 62 50 50 60 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Week ruler — tick marks with current marker
const PregnancyWeekRuler = ({ size = 100 }) => <S size={size} vb="0 0 100 40">
  <Line x1="6" y1="22" x2="94" y2="22" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  {[0,1,2,3,4,5,6,7,8,9,10].map(i=>(<Line key={i} x1={10+i*8} y1={22} x2={10+i*8} y2={i%5===0?12:16} stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>))}
  <Circle cx="50" cy="22" r="6" fill={VIOLET} stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Dashboard hero — bump with sparkle ring
const PregnancyDashboardHero = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="52" r="34" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="52" r="34" fill="none" stroke={VIOLET} strokeWidth="1.4" strokeDasharray="3 3"/>
  <Path d="M44 50 q6 -4 12 0" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="62" cy="46" r="2" fill={STROKE}/>
  <Path d="M86 30 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={YELLOW} stroke={STROKE} strokeWidth="1"/>
</S>;

// Symptom empty — quiet leaf
const PregnancySymptomEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M16 84 C16 50 46 14 88 14 C88 50 58 84 16 84 Z" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M22 80 Q50 56 82 22" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <SvgText x="50" y="62" textAnchor="middle" fontSize="14" fill={STROKE} fontFamily="serif" fontStyle="italic">·</SvgText>
</S>;

// Birth plan hero — hospital + heart
const PregnancyBirthPlanHero = ({ size = 100 }) => <S size={size}>
  <Rect x="20" y="34" width="60" height="50" rx="4" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="30" y="28" width="40" height="10" fill={VIOLET} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="44" y="50" width="12" height="12" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="48" y="46" width="4" height="20" fill={CREAM} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="40" y="54" width="20" height="4" fill={CREAM} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="28" y="66" width="8" height="14" fill={BLUE} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="64" y="66" width="8" height="14" fill={BLUE} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Birth type — vaginal (waves)
const PregnancyBirthTypeVaginal = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M16 56 q8 -10 16 0 q8 10 18 0 q8 -10 18 0 q8 10 16 0" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
  <Path d="M16 68 q8 -10 16 0 q8 10 18 0 q8 -10 18 0 q8 10 16 0" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round" opacity=".5"/>
</S>;

// Birth type — c-section (suture line)
const PregnancyBirthTypeCsection = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M22 50 q28 -10 56 0" fill="none" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round"/>
  {[0,1,2,3,4,5].map(i=>(<Line key={i} x1={28+i*9} y1={48-i*0.5} x2={28+i*9} y2={56-i*0.5} stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>))}
  <Path d="M40 30 q10 -6 20 0" fill="none" stroke={HOT_PINK} strokeWidth="1.6"/>
</S>;

// Birth type — water (water + droplets)
const PregnancyBirthTypeWater = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={BLUE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 24 C50 24 36 44 36 56 c0 10 6 16 14 16 c8 0 14 -6 14 -16 c0 -12 -14 -32 -14 -32 z" fill={CREAM} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M20 70 q10 -4 16 0" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M64 70 q10 -4 16 0" fill="none" stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Birth phase — early labor (sunrise)
const PregnancyBirthPhaseEarly = ({ size = 100 }) => <S size={size}>
  <Path d="M10 70 L90 70" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  <Path d="M22 70 a28 28 0 0 1 56 0" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  {Array.from({length:5}).map((_,i)=>{const a=Math.PI+Math.PI*((i+1)/6);const x1=50+Math.cos(a)*32,y1=70+Math.sin(a)*32,x2=50+Math.cos(a)*42,y2=70+Math.sin(a)*42;return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STROKE} strokeWidth="1.5" strokeLinecap="round"/>})}
  <Path d="M10 78 q10 -4 20 0 q10 4 20 0 q10 -4 20 0 q10 4 20 0" fill="none" stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Birth phase — active labor (waves intensity)
const PregnancyBirthPhaseActive = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={BLUE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 36 q9 -10 18 0 q9 10 18 0 q9 -10 18 0 q9 10 18 0" fill="none" stroke={STROKE} strokeWidth="2.2"/>
  <Path d="M14 56 q9 -14 18 0 q9 14 18 0 q9 -14 18 0 q9 14 18 0" fill="none" stroke={STROKE} strokeWidth="2.4"/>
  <Path d="M14 76 q9 -10 18 0 q9 10 18 0 q9 -10 18 0 q9 10 18 0" fill="none" stroke={STROKE} strokeWidth="2.2"/>
</S>;

// Birth phase — transition (swirl)
const PregnancyBirthPhaseTransition = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={VIOLET} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 18 a32 32 0 0 1 0 64 a24 24 0 0 1 0 -48 a16 16 0 0 1 0 32 a8 8 0 0 1 0 -16" fill="none" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round"/>
</S>;

// Birth — golden hour (baby + halo)
const PregnancyBirthPhaseGoldenHour = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="52" r="38" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="58" r="20" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="44" cy="56" r="1.6" fill={STROKE}/><Circle cx="56" cy="56" r="1.6" fill={STROKE}/>
  <Path d="M44 64 q6 4 12 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
  <Ellipse cx="50" cy="34" rx="22" ry="6" fill="none" stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Postpartum recovery — moon + crescent care
const PregnancyBirthPhasePostpartum = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M64 28 C44 28 30 42 30 58 c0 16 14 28 32 28 c6 0 12 -2 16 -6 c-14 0 -28 -10 -28 -28 c0 -12 6 -20 14 -24 z" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M22 76 q8 -6 14 0" fill="none" stroke={HOT_PINK} strokeWidth="1.8" strokeLinecap="round"/>
</S>;

// Hospital bag — duffel with star
const PregnancyHospitalBag = ({ size = 100 }) => <S size={size}>
  <Path d="M18 40 l8 -8 h48 l8 8 v36 q0 4 -4 4 h-56 q-4 0 -4 -4 z" fill={VIOLET} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M40 32 v-4 q0 -6 10 -6 q10 0 10 6 v4" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 50 l3 8 l9 1 l-7 5 l2 9 l-7 -5 l-7 5 l2 -9 l-7 -5 l9 -1 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"/>
</S>;

// Partner dashboard hero — two hands cradling bump
const PregnancyPartnerHero = ({ size = 100 }) => <S size={size}>
  <Ellipse cx="50" cy="56" rx="22" ry="26" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M12 60 q12 -2 22 4 q4 4 -2 8 q-12 6 -22 -6 z" fill={PINK} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M88 60 q-12 -2 -22 4 q-4 4 2 8 q12 6 22 -6 z" fill={BLUE} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M50 38 q-4 -6 0 -10 q4 4 0 10 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3"/>
</S>;

/* =================================================================== */
/*  KIDS (mode: blue #4D96FF)                                           */
/* =================================================================== */

// Onboarding — kids hero: cradle + star
const KidsOnboardingHero = ({ size = 100 }) => <S size={size}>
  <Path d="M18 50 q32 -16 64 0 l-4 22 q0 6 -6 6 h-44 q-6 0 -6 -6 z" fill={BLUE} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M18 50 q32 -16 64 0" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="56" r="10" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M68 24 l3 8 l8 1 l-6 5 l2 8 l-7 -5 l-7 5 l2 -8 l-6 -5 l8 -1 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round"/>
</S>;

// Baby name — name tag
const KidsOnboardingBabyName = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="32" width="72" height="40" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="14" cy="52" r="4" fill={ROYAL} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="86" cy="52" r="4" fill={ROYAL} stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="26" y1="50" x2="74" y2="50" stroke={STROKE} strokeWidth="1.4" strokeDasharray="3 3"/>
  <SvgText x="50" y="60" textAnchor="middle" fontSize="11" fontFamily="serif" fontStyle="italic" fill={STROKE}>name</SvgText>
  <Path d="M22 24 q4 -4 8 0 q4 4 0 8 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Child profile — photo frame with baby
const KidsOnboardingChildProfile = ({ size = 100 }) => <S size={size}>
  <Rect x="20" y="20" width="60" height="60" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="46" r="14" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M28 76 q22 -16 44 0" fill="none" stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="46" cy="46" r="1.4" fill={STROKE}/><Circle cx="54" cy="46" r="1.4" fill={STROKE}/>
  <Path d="M46 52 q4 2 8 0" fill="none" stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Calories — bowl + spoon
const KidsHomeCalories = ({ size = 100 }) => <S size={size}>
  <Path d="M14 50 h72 q0 24 -16 30 h-40 q-16 -6 -16 -30 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="50" rx="36" ry="6" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
  <Ellipse cx="40" cy="48" rx="4" ry="2" fill={GREEN}/>
  <Ellipse cx="56" cy="46" rx="4" ry="2" fill={HOT_PINK}/>
  <Path d="M72 22 q4 0 4 4 q0 6 -4 8 v22" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
</S>;

// Diaper pee
const KidsDiaperPee = ({ size = 100 }) => <S size={size}>
  <Path d="M20 36 l60 0 l-6 28 q-2 8 -10 8 l-28 0 q-8 0 -10 -8 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 46 C50 46 38 60 38 68 c0 6 6 10 12 10 c6 0 12 -4 12 -10 c0 -8 -12 -22 -12 -22 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.5"/>
</S>;

// Diaper poop
const KidsDiaperPoop = ({ size = 100 }) => <S size={size}>
  <Path d="M20 36 l60 0 l-6 28 q-2 8 -10 8 l-28 0 q-8 0 -10 -8 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M36 70 q-2 -10 8 -10 q-2 -10 8 -8 q-2 -10 12 0 q8 0 6 8 q4 4 -2 10 z" fill="#8B6E4E" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round"/>
  <Circle cx="46" cy="62" r="1.4" fill={STROKE}/><Circle cx="54" cy="62" r="1.4" fill={STROKE}/>
</S>;

// Diaper mixed
const KidsDiaperMixed = ({ size = 100 }) => <S size={size}>
  <Path d="M20 36 l60 0 l-6 28 q-2 8 -10 8 l-28 0 q-8 0 -10 -8 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M40 50 C40 50 32 60 32 66 c0 4 4 8 8 8 c4 0 8 -4 8 -8 c0 -6 -8 -16 -8 -16 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M52 60 q-2 -8 6 -8 q0 -6 8 0 q6 -2 6 4 q4 4 -2 8 z" fill="#8B6E4E" stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"/>
</S>;

// Nanny updates — paper note with bow
const KidsHomeNannyUpdates = ({ size = 100 }) => <S size={size}>
  <Rect x="22" y="28" width="56" height="50" rx="4" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M30 22 q20 -8 40 0 l-4 8 q-18 -6 -32 0 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"/>
  <Line x1="30" y1="46" x2="60" y2="46" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="30" y1="56" x2="68" y2="56" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="30" y1="66" x2="52" y2="66" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Location — pin on map
const KidsHomeLocation = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="6" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M22 28 q10 8 22 0 q10 -8 22 0 q10 8 22 0" fill="none" stroke={STROKE} strokeWidth="1.4" opacity=".6"/>
  <Path d="M22 58 q10 8 22 0 q10 -8 22 0 q10 8 22 0" fill="none" stroke={STROKE} strokeWidth="1.4" opacity=".6"/>
  <Path d="M50 30 c-10 0 -16 8 -16 16 c0 14 16 28 16 28 c0 0 16 -14 16 -28 c0 -8 -6 -16 -16 -16 z" fill={ROYAL} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="46" r="5" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Empty tile — plus sign placeholder
const KidsHomeEmptyTile = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="14" fill="none" stroke={STROKE} strokeWidth="1.6" strokeDasharray="4 3"/>
  <Line x1="50" y1="34" x2="50" y2="66" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="34" y1="50" x2="66" y2="50" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
</S>;

// Calendar empty — soft cloud
const KidsCalendarEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M20 60 q-10 0 -10 -10 q0 -10 12 -10 q-2 -16 16 -16 q12 0 14 12 q14 -4 18 8 q14 -2 14 12 q0 10 -10 10 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="44" cy="76" r="2" fill={STROKE}/>
  <Circle cx="52" cy="76" r="2" fill={STROKE}/>
  <Circle cx="60" cy="76" r="2" fill={STROKE}/>
</S>;

// Nanny notes empty — pencil + dots
const KidsNannyNotesEmpty = ({ size = 100 }) => <S size={size}>
  <Rect x="22" y="20" width="56" height="60" rx="4" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="30" y1="36" x2="52" y2="36" stroke={STROKE} strokeWidth="1.4" strokeDasharray="3 2" opacity=".5"/>
  <Line x1="30" y1="48" x2="60" y2="48" stroke={STROKE} strokeWidth="1.4" strokeDasharray="3 2" opacity=".5"/>
  <Path d="M62 60 l16 -16 l6 6 l-16 16 l-8 2 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"/>
  <Path d="M76 46 l6 6" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Vault — exams section (clipboard with pulse)
const KidsVaultExams = ({ size = 100 }) => <S size={size}>
  <Rect x="22" y="22" width="56" height="62" rx="5" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="36" y="16" width="28" height="12" rx="3" fill={ROYAL} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M30 56 l8 0 l4 -10 l6 22 l4 -16 l4 4 l14 0" fill="none" stroke={HOT_PINK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

// Vault — hospital records (building)
const KidsVaultHospital = ({ size = 100 }) => <S size={size}>
  <Rect x="18" y="34" width="64" height="50" rx="4" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="28" y="28" width="44" height="10" fill={ROYAL} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="44" y="50" width="12" height="12" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="48" y="46" width="4" height="20" fill={CREAM} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="40" y="54" width="20" height="4" fill={CREAM} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="26" y="68" width="10" height="8" fill={BLUE} stroke={STROKE} strokeWidth="1.2"/>
  <Rect x="64" y="68" width="10" height="8" fill={BLUE} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Document empty — folder with question
const KidsVaultDocumentEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M16 30 h26 l6 6 h36 v44 q0 4 -4 4 h-60 q-4 0 -4 -4 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <SvgText x="50" y="68" textAnchor="middle" fontFamily="serif" fontSize="22" fill={STROKE} fontStyle="italic">?</SvgText>
</S>;

// Document upload — paper with plus
const KidsVaultDocumentUpload = ({ size = 100 }) => <S size={size}>
  <Rect x="26" y="20" width="48" height="60" rx="5" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="34" y1="34" x2="58" y2="34" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="34" y1="44" x2="64" y2="44" stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="68" cy="64" r="14" fill={ROYAL} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="68" y1="56" x2="68" y2="72" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="60" y1="64" x2="76" y2="64" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round"/>
</S>;

/* =================================================================== */
/*  CROSS-MODE                                                          */
/* =================================================================== */

// Auth email input accent — envelope
const AuthEmailInput = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="28" width="72" height="44" rx="4" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 28 l36 26 l36 -26" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 72 l28 -22" fill="none" stroke={STROKE} strokeWidth="1.4" opacity=".5"/>
  <Path d="M86 72 l-28 -22" fill="none" stroke={STROKE} strokeWidth="1.4" opacity=".5"/>
</S>;

// Onboarding mode transition — arrow loop
const OnboardingTransition = ({ size = 100 }) => <S size={size}>
  <Path d="M30 36 a24 24 0 1 1 -6 26" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Path d="M30 36 l-8 -8 l16 0 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="36" cy="56" r="4" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
  <Circle cx="52" cy="56" r="4" fill={VIOLET} stroke={STROKE} strokeWidth="1.2"/>
  <Circle cx="68" cy="56" r="4" fill={ROYAL} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Activity — symptoms (face with bandaid)
const ActivitySymptoms = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="40" cy="46" r="2" fill={STROKE}/><Circle cx="60" cy="46" r="2" fill={STROKE}/>
  <Path d="M42 64 q8 -6 16 0" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  <Rect x="56" y="28" width="20" height="8" rx="2" fill={CREAM} stroke={STROKE} strokeWidth="1.4" transform="rotate(-20 66 32)"/>
</S>;

// Activity — fitness (yoga pose)
const ActivityFitness = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="36" r="6" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M50 42 q-12 8 -16 22 q-2 4 4 4 q6 0 12 -10 q6 10 12 10 q6 0 4 -4 q-4 -14 -16 -22 z" fill={CREAM} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round"/>
</S>;

// Activity — learning (book)
const ActivityLearning = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M22 38 q14 -4 28 0 q14 -4 28 0 v28 q-14 -4 -28 0 q-14 -4 -28 0 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Line x1="50" y1="38" x2="50" y2="66" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Pillar — suggestion chip (speech bubble)
const PillarSuggestionChip = ({ size = 100 }) => <S size={size}>
  <Path d="M14 30 q0 -8 8 -8 h56 q8 0 8 8 v24 q0 8 -8 8 h-38 l-10 12 l0 -12 h-8 q-8 0 -8 -8 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="36" cy="42" r="2" fill={STROKE}/>
  <Circle cx="50" cy="42" r="2" fill={STROKE}/>
  <Circle cx="64" cy="42" r="2" fill={STROKE}/>
</S>;

// Grandma speaking — heart-eye + open mouth
const GrandmaSpeaking = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M30 40 C30 36 34 34 36 36 C38 34 42 36 42 40 C42 44 36 48 36 48 C36 48 30 44 30 40 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M58 40 C58 36 62 34 64 36 C66 34 70 36 70 40 C70 44 64 48 64 48 C64 48 58 44 58 40 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Ellipse cx="50" cy="66" rx="8" ry="6" fill={STROKE}/>
  <Ellipse cx="50" cy="68" rx="4" ry="2" fill={HOT_PINK}/>
</S>;

// Grandma listening — heart-eye + ear-cup
const GrandmaListening = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M30 40 C30 36 34 34 36 36 C38 34 42 36 42 40 C42 44 36 48 36 48 C36 48 30 44 30 40 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M58 40 C58 36 62 34 64 36 C66 34 70 36 70 40 C70 44 64 48 64 48 C64 48 58 44 58 40 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M42 64 q8 2 16 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
  <Path d="M84 38 q6 4 4 12 q-2 8 -8 6" fill="none" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
  <Circle cx="86" cy="42" r="2" fill={STROKE}/>
</S>;

// Chat empty — teacup with heart steam
const GrandmaChatEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M22 50 h44 v18 a14 14 0 0 1 -14 14 h-16 a14 14 0 0 1 -14 -14 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M66 56 q12 0 12 8 q0 8 -12 8" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="22" y1="50" x2="66" y2="50" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M36 38 q-4 -6 0 -10 q4 4 0 10 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3"/>
  <Path d="M48 32 q-4 -6 0 -10 q4 4 0 10 z" fill={PINK} stroke={STROKE} strokeWidth="1.3"/>
  <Path d="M60 38 q-4 -6 0 -10 q4 4 0 10 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3"/>
</S>;

// Wisdom card — open book with heart
const GrandmaWisdomCard = ({ size = 100 }) => <S size={size}>
  <Path d="M14 32 q18 -6 36 0 q18 -6 36 0 v40 q-18 -6 -36 0 q-18 -6 -36 0 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Line x1="50" y1="32" x2="50" y2="72" stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M50 56 C42 50 36 46 36 42 C36 38 40 36 44 38 C46 36 50 38 50 42 C50 38 54 36 56 38 C60 36 64 38 64 42 C64 46 58 50 50 56 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Scan shutter button
const ScanShutter = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="38" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="50" r="30" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="50" cy="50" r="22" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
</S>;

// Scan result card — paper with checkmark
const ScanResultCard = ({ size = 100 }) => <S size={size}>
  <Rect x="20" y="18" width="60" height="64" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="38" r="12" fill={GREEN} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M44 38 l4 4 l8 -8" fill="none" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  <Line x1="28" y1="58" x2="72" y2="58" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="28" y1="66" x2="64" y2="66" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="28" y1="74" x2="56" y2="74" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Paywall hero — crown with sparkle
const PaywallHero = ({ size = 100 }) => <S size={size}>
  <Path d="M16 64 l8 -32 l14 18 l12 -28 l12 28 l14 -18 l8 32 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round"/>
  <Rect x="16" y="64" width="68" height="12" rx="2" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="24" cy="32" r="3" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
  <Circle cx="50" cy="22" r="3" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
  <Circle cx="76" cy="32" r="3" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</S>;

// Feature unlimited — infinity loop
const PaywallFeatureUnlimited = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="38" fill={VIOLET} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M30 50 a10 10 0 1 1 12 8 q4 -8 16 -8 a10 10 0 1 1 12 -8 q-4 8 -16 8 a10 10 0 1 1 -12 8 q4 -8 -12 -8 z" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round"/>
  <Path d="M30 50 C30 38 50 38 50 50 C50 62 70 62 70 50 C70 38 50 38 50 50 C50 62 30 62 30 50 Z" fill="none" stroke={STROKE} strokeWidth="2.4"/>
</S>;

// Feature reminders — bell with ribbon
const PaywallFeatureReminders = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="38" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M32 60 q0 -22 18 -22 q18 0 18 22 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="50" cy="32" r="3" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M30 60 h40" stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="68" r="3" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Insights empty — chart with sleeping cap
const InsightsEmpty = ({ size = 100 }) => <S size={size}>
  <Line x1="18" y1="80" x2="82" y2="80" stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="18" y1="80" x2="18" y2="30" stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="26" y="64" width="12" height="16" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="42" y="56" width="12" height="24" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="58" y="48" width="12" height="32" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <SvgText x="78" y="38" textAnchor="end" fontFamily="serif" fontStyle="italic" fontSize="14" fill={STROKE}>z z z</SvgText>
</S>;

// Notifications empty — sleeping bell
const NotificationsEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M30 64 q0 -22 20 -22 q20 0 20 22 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="50" cy="36" r="3" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M28 64 h44" stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="72" r="3" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <SvgText x="74" y="36" fontFamily="serif" fontStyle="italic" fontSize="16" fill={STROKE}>z</SvgText>
  <SvgText x="82" y="28" fontFamily="serif" fontStyle="italic" fontSize="12" fill={STROKE}>z</SvgText>
</S>;

// Leaderboard hero — trophy
const LeaderboardHero = ({ size = 100 }) => <S size={size}>
  <Path d="M30 16 h40 v18 q0 16 -20 16 q-20 0 -20 -16 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M30 22 h-10 q0 14 10 16" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M70 22 h10 q0 14 -10 16" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="42" y="50" width="16" height="14" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="30" y="64" width="40" height="10" rx="2" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M50 28 l2 5 l5 1 l-3.5 3.5 l1 5 l-4.5 -2.5 l-4.5 2.5 l1 -5 l-3.5 -3.5 l5 -1 z" fill={CREAM} stroke={STROKE} strokeWidth="1"/>
</S>;

// Rank 1 ribbon
const LeaderboardRank1 = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="42" r="24" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <SvgText x="50" y="50" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="22" fill={STROKE}>1</SvgText>
  <Path d="M34 60 l-8 28 l16 -8 l8 8 l8 -8 l16 8 l-8 -28" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

// Rank 2 ribbon
const LeaderboardRank2 = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="42" r="24" fill="#D8D8D8" stroke={STROKE} strokeWidth="1.6"/>
  <SvgText x="50" y="50" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="22" fill={STROKE}>2</SvgText>
  <Path d="M34 60 l-8 28 l16 -8 l8 8 l8 -8 l16 8 l-8 -28" fill={BLUE} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

// Rank 3 ribbon
const LeaderboardRank3 = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="42" r="24" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <SvgText x="50" y="50" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="22" fill={STROKE}>3</SvgText>
  <Path d="M34 60 l-8 28 l16 -8 l8 8 l8 -8 l16 8 l-8 -28" fill={MINT} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
</S>;

// Leaderboard empty — empty podium
const LeaderboardEmpty = ({ size = 100 }) => <S size={size}>
  <Rect x="40" y="46" width="20" height="34" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="16" y="58" width="24" height="22" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="60" y="64" width="24" height="16" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <SvgText x="50" y="38" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="16" fill={STROKE}>—</SvgText>
</S>;

// Badges hero — sticker album
const BadgesHero = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="16" width="72" height="68" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="32" cy="34" r="10" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="58" cy="36" r="9" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="76" cy="52" r="8" fill={BLUE} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="40" cy="60" r="9" fill={VIOLET} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="60" cy="68" r="8" fill={GREEN} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M16 78 q34 -10 68 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeDasharray="3 2"/>
</S>;

// Locked badge state
const BadgesLockedState = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="36" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeDasharray="3 3"/>
  <Rect x="38" y="48" width="24" height="20" rx="3" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M42 48 v-6 q0 -8 8 -8 q8 0 8 8 v6" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="58" r="2.5" fill={STROKE}/>
</S>;

// Profile hero — avatar frame
const ProfileHero = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="34" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="50" r="34" fill="none" stroke={HOT_PINK} strokeWidth="2" strokeDasharray="4 3"/>
  <Circle cx="50" cy="42" r="10" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M32 66 q18 -14 36 0" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M84 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={YELLOW} stroke={STROKE} strokeWidth="1"/>
</S>;

// Avatar placeholder — silhouette
const ProfileAvatarPlaceholder = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="50" r="40" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="50" cy="42" r="12" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M28 80 q22 -20 44 0" fill={PEACH} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Care circle invite — open envelope + heart
const CareCircleInvite = ({ size = 100 }) => <S size={size}>
  <Path d="M14 36 l36 -16 l36 16 v36 q0 4 -4 4 h-64 q-4 0 -4 -4 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M14 36 l36 26 l36 -26" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 52 C42 46 36 42 36 38 C36 34 40 32 44 34 C46 32 50 34 50 38 C50 34 54 32 56 34 C60 32 64 34 64 38 C64 42 58 46 50 52 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Caregiver — nanny (sun hat)
const CaregiverNanny = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="56" r="22" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Ellipse cx="50" cy="40" rx="36" ry="6" fill={MINT} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M32 40 q0 -16 18 -16 q18 0 18 16" fill={MINT} stroke={STROKE} strokeWidth="1.5"/>
  <Circle cx="44" cy="58" r="1.6" fill={STROKE}/><Circle cx="56" cy="58" r="1.6" fill={STROKE}/>
  <Path d="M44 66 q6 4 12 0" fill="none" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Caregiver — family (3 figures)
const CaregiverFamily = ({ size = 100 }) => <S size={size}>
  <Circle cx="30" cy="44" r="10" fill={PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M20 80 q0 -16 10 -16 q10 0 10 16" fill={PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="70" cy="44" r="10" fill={BLUE} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M60 80 q0 -16 10 -16 q10 0 10 16" fill={BLUE} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="50" cy="58" r="7" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M44 80 q0 -10 6 -10 q6 0 6 10" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Caregiver — doctor (cross + figure)
const CaregiverDoctor = ({ size = 100 }) => <S size={size}>
  <Circle cx="50" cy="40" r="12" fill={PEACH} stroke={STROKE} strokeWidth="1.5"/>
  <Path d="M30 86 q0 -28 20 -28 q20 0 20 28" fill={CREAM} stroke={STROKE} strokeWidth="1.5"/>
  <Rect x="46" y="64" width="8" height="14" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="42" y="68" width="16" height="6" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Channels hero — overlapping chat clouds
const ChannelsHero = ({ size = 100 }) => <S size={size}>
  <Path d="M14 28 q0 -8 8 -8 h28 q8 0 8 8 v14 q0 8 -8 8 h-16 l-8 8 l0 -8 h-4 q-8 0 -8 -8 z" fill={PINK} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round"/>
  <Path d="M42 50 q0 -8 8 -8 h28 q8 0 8 8 v14 q0 8 -8 8 h-4 l0 8 l-8 -8 h-16 q-8 0 -8 -8 z" fill={BLUE} stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round"/>
</S>;

// Channel card default cover
const ChannelCardDefault = ({ size = 100 }) => <S size={size}>
  <Rect x="14" y="14" width="72" height="72" rx="8" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 30 q40 -16 72 0" fill="none" stroke={HOT_PINK} strokeWidth="3" strokeLinecap="round"/>
  <Circle cx="34" cy="56" r="6" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="50" cy="62" r="6" fill={VIOLET} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="66" cy="56" r="6" fill={MINT} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Channel empty — bubble with plus
const ChannelEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M16 30 q0 -10 10 -10 h48 q10 0 10 10 v24 q0 10 -10 10 h-28 l-12 14 l0 -14 h-8 q-10 0 -10 -10 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Line x1="50" y1="32" x2="50" y2="52" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round"/>
  <Line x1="40" y1="42" x2="60" y2="42" stroke={STROKE} strokeWidth="2.2" strokeLinecap="round"/>
</S>;

// Channel thread empty — dotted thread
const ChannelThreadEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M18 26 q0 -6 6 -6 h44 q6 0 6 6 v18 q0 6 -6 6 h-26 l-8 8 l0 -8 h-10 q-6 0 -6 -6 z" fill={CREAM} stroke={STROKE} strokeWidth="1.4" strokeLinejoin="round"/>
  <Line x1="30" y1="34" x2="58" y2="34" stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M50 66 v18" fill="none" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 3"/>
  <Circle cx="50" cy="86" r="3" fill="none" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Garage — sell tag
const GarageListingSell = ({ size = 100 }) => <S size={size}>
  <Path d="M20 50 l30 -30 h28 v28 l-30 30 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="64" cy="36" r="5" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <SvgText x="40" y="58" textAnchor="middle" fontFamily="serif" fontWeight="700" fontSize="13" fill={CREAM} transform="rotate(-45 40 58)">SELL</SvgText>
</S>;

// Garage — trade (arrows loop)
const GarageListingTrade = ({ size = 100 }) => <S size={size}>
  <Path d="M20 50 l30 -30 h28 v28 l-30 30 z" fill={MINT} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M36 56 q-4 -10 6 -10 h12" fill="none" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round"/>
  <Path d="M50 50 l4 -4 l4 4" fill="none" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  <Path d="M56 36 q4 10 -6 10 h-12" fill="none" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round"/>
  <Path d="M42 42 l-4 4 l-4 -4" fill="none" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

// Garage — donate (hand + heart)
const GarageListingDonate = ({ size = 100 }) => <S size={size}>
  <Path d="M20 50 l30 -30 h28 v28 l-30 30 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M50 50 C42 44 36 40 36 36 C36 32 40 30 44 32 C46 30 50 32 50 36 C50 32 54 30 56 32 C60 30 64 32 64 36 C64 40 58 44 50 50 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Garage — create hero (open box)
const GarageCreateHero = ({ size = 100 }) => <S size={size}>
  <Path d="M18 50 l32 -18 l32 18 v26 q0 4 -4 4 h-56 q-4 0 -4 -4 z" fill={PEACH} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M18 50 l32 18 l32 -18" fill="none" stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="50" y1="32" x2="50" y2="68" stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 28 v-12 M44 22 l6 -6 l6 6" fill="none" stroke={HOT_PINK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

// Garage — empty (empty barn)
const GarageEmpty = ({ size = 100 }) => <S size={size}>
  <Path d="M14 50 l36 -32 l36 32 v34 h-72 z" fill={CREAM} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M50 18 v66 M14 50 h72" fill="none" stroke={STROKE} strokeWidth="1.4" opacity=".4"/>
  <SvgText x="50" y="72" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="16" fill={STROKE}>—</SvgText>
</S>;

// Garage share card bg
const GarageShareCard = ({ size = 100 }) => <S size={size}>
  <Rect x="10" y="14" width="80" height="72" rx="10" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M10 28 q40 -12 80 0" fill="none" stroke={HOT_PINK} strokeWidth="2.2"/>
  <Path d="M10 80 q40 -12 80 0" fill="none" stroke={HOT_PINK} strokeWidth="2.2"/>
  <SvgText x="50" y="56" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="13" fill={STROKE}>share</SvgText>
</S>;

// Vault — tests section
const VaultSectionTests = ({ size = 100 }) => <S size={size}>
  <Rect x="34" y="14" width="32" height="58" rx="10" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M34 50 q16 -8 32 0" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Rect x="34" y="60" width="32" height="14" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="42" y1="22" x2="58" y2="22" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="42" y1="32" x2="58" y2="32" stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="42" y1="42" x2="58" y2="42" stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Brand — paper tape
const BrandPaperTape = ({ size = 100 }) => <S size={size} vb="0 0 100 40">
  <Path d="M4 14 l92 -2 q4 0 4 4 l-2 14 q0 4 -4 4 l-92 -2 q-4 0 -4 -4 l2 -10 q0 -4 4 -4 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="14" y1="16" x2="14" y2="32" stroke={STROKE} strokeWidth="1" opacity=".4"/>
  <Line x1="26" y1="14" x2="26" y2="32" stroke={STROKE} strokeWidth="1" opacity=".4"/>
  <Line x1="62" y1="14" x2="62" y2="32" stroke={STROKE} strokeWidth="1" opacity=".4"/>
  <Line x1="80" y1="14" x2="80" y2="32" stroke={STROKE} strokeWidth="1" opacity=".4"/>
</S>;

// Brand — torn paper corner
const BrandPaperCorner = ({ size = 100 }) => <S size={size}>
  <Path d="M0 0 L100 0 L100 70 Q90 80 80 72 Q60 80 50 70 Q30 80 20 72 Q10 80 0 70 Z" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
</S>;

// Brand — hand-drawn arrow
const BrandHandDrawnArrow = ({ size = 100 }) => <S size={size} vb="0 0 100 60">
  <Path d="M8 32 q20 -16 44 -8 q14 4 24 -8" fill="none" stroke={STROKE} strokeWidth="2.6" strokeLinecap="round"/>
  <Path d="M70 14 l8 4 l-6 8" fill="none" stroke={STROKE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
</S>;

// Brand — star doodle (5-point hand-drawn)
const BrandStarDoodle = ({ size = 100 }) => <S size={size}>
  <Path d="M50 14 q4 12 14 18 q-12 4 -16 18 q-2 -14 -16 -18 q12 -4 18 -18 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Path d="M50 16 q4 14 14 20" fill="none" stroke={STROKE} strokeWidth="1" opacity=".5"/>
</S>;

/* ------------------------------------------------------------------ */
export const MissingStickers = {
  // Pre-preg
  PrepregOnboardingCycleTracking, PrepregOnboardingPartner, PrepregOnboardingDoctor,
  PrepregRingMenstruation, PrepregRingFollicular, PrepregRingOvulation, PrepregRingLuteal,
  PrepregFertileWindow, PrepregHormoneEstrogen, PrepregHormoneProgesterone, PrepregHormoneLH,
  PrepregChecklistEmpty,
  // Pregnancy
  PregnancyOnboardingDueDate, PregnancyOnboardingPartner, PregnancyTodaySummary,
  PregnancyAffirmation, PregnancyAffirmationShare, PregnancyWeekRuler, PregnancyDashboardHero,
  PregnancySymptomEmpty, PregnancyBirthPlanHero,
  PregnancyBirthTypeVaginal, PregnancyBirthTypeCsection, PregnancyBirthTypeWater,
  PregnancyBirthPhaseEarly, PregnancyBirthPhaseActive, PregnancyBirthPhaseTransition,
  PregnancyBirthPhaseGoldenHour, PregnancyBirthPhasePostpartum, PregnancyHospitalBag,
  PregnancyPartnerHero,
  // Kids
  KidsOnboardingHero, KidsOnboardingBabyName, KidsOnboardingChildProfile,
  KidsHomeCalories, KidsDiaperPee, KidsDiaperPoop, KidsDiaperMixed,
  KidsHomeNannyUpdates, KidsHomeLocation, KidsHomeEmptyTile,
  KidsCalendarEmpty, KidsNannyNotesEmpty,
  KidsVaultExams, KidsVaultHospital, KidsVaultDocumentEmpty, KidsVaultDocumentUpload,
  // Cross-mode
  AuthEmailInput, OnboardingTransition,
  ActivitySymptoms, ActivityFitness, ActivityLearning,
  PillarSuggestionChip,
  GrandmaSpeaking, GrandmaListening, GrandmaChatEmpty, GrandmaWisdomCard,
  ScanShutter, ScanResultCard,
  PaywallHero, PaywallFeatureUnlimited, PaywallFeatureReminders,
  InsightsEmpty, NotificationsEmpty,
  LeaderboardHero, LeaderboardRank1, LeaderboardRank2, LeaderboardRank3, LeaderboardEmpty,
  BadgesHero, BadgesLockedState,
  ProfileHero, ProfileAvatarPlaceholder,
  CareCircleInvite, CaregiverNanny, CaregiverFamily, CaregiverDoctor,
  ChannelsHero, ChannelCardDefault, ChannelEmpty, ChannelThreadEmpty,
  GarageListingSell, GarageListingTrade, GarageListingDonate, GarageCreateHero, GarageEmpty, GarageShareCard,
  VaultSectionTests,
  BrandPaperTape, BrandPaperCorner, BrandHandDrawnArrow, BrandStarDoodle,
};
