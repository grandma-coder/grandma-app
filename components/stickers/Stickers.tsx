// Stickers.tsx — Pillar sticker family
// Generated to fill the 24 pillar entries the manifest references as
// `Stickers.Pillar*` but that were never authored.

import React from 'react';
import Svg, { Rect, Circle, Path, Line, Ellipse, Text as SvgText } from 'react-native-svg';

// Pillar stickers — generated to cover the 24 pillar entries that the
// asset manifest references as `Stickers.Pillar*` but that were never
// authored. Same paper-cutout vocabulary as src/stickers.jsx and
// src/missing-stickers.jsx — 100×100 viewBox, charcoal stroke #141313.
//
// Used as pillar-card hero accents (~64-88px in product), pillar-detail
// hero (~120-160px), and "reuse Pillar*" references across activities,
// scan types, vault sections, and insights cards.

const STROKE = '#141313';
const PINK = '#F2B2C7';
const HOT_PINK = '#FF8AD8';
const PURPLE = '#C8B6E8';
const VIOLET = '#B983FF';
const BLUE = '#9DC3E8';
const ROYAL = '#4D96FF';
const YELLOW = '#F5D652';
const GREEN = '#BDD48C';
const DEEP_GREEN = '#7FA85E';
const PEACH = '#F4C29B';
const CREAM = '#FBEFD8';
const PAPER = '#FFF4DE';
const RED = '#E58B7B';
const MINT = '#B6E0C8';
const NAVY = '#3F4A8A';

const PillarSVG: React.FC<{ size?: number; children?: React.ReactNode; vb?: string }> = ({
  size = 100,
  children,
  vb = '0 0 100 100',
}) => (
  <Svg width={size} height={size} viewBox={vb}>{children}</Svg>
);

/* =================================================================== */
/*  PRE-PREGNANCY PILLARS (6) — mode accent: pink                        */
/* =================================================================== */

// Fertility Basics — six-petal flower with bee dot at center
const PillarFertility = ({ size = 100 }) => <PillarSVG size={size}>
  {Array.from({length:6}).map((_,i)=>{
    const a = (i/6)*Math.PI*2 - Math.PI/2;
    const x = 50 + Math.cos(a)*22, y = 50 + Math.sin(a)*22;
    return <Ellipse key={i} cx={x} cy={y} rx="14" ry="20" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6" transform={`rotate(${(i/6)*360} ${x} ${y})`}/>
  })}
  <Circle cx="50" cy="50" r="13" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="46" cy="48" r="1.6" fill={STROKE}/>
  <Circle cx="54" cy="48" r="1.6" fill={STROKE}/>
  <Path d="M46 54 q4 3 8 0" fill="none" stroke={STROKE} strokeWidth="1.4" strokeLinecap="round"/>
</PillarSVG>;

// Nutrition Prep — avocado half with pit + leaf
const PillarNutritionPrep = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 12 C28 12 18 32 18 54 c0 18 14 34 32 34 c18 0 32 -16 32 -34 c0 -22 -10 -42 -32 -42 z" fill={GREEN} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M50 22 C36 22 28 38 28 54 c0 14 10 26 22 26 c12 0 22 -12 22 -26 c0 -16 -8 -32 -22 -32 z" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Ellipse cx="50" cy="56" rx="10" ry="14" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 12 q-6 -6 -14 -4 q4 8 14 8" fill={DEEP_GREEN} stroke={STROKE} strokeWidth="1.4"/>
</PillarSVG>;

// Emotional Readiness — heart cradled in two open hands
const PillarEmotionalReadiness = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 56 C32 44 22 36 22 26 C22 18 30 14 36 18 C40 14 50 14 50 24 C50 14 60 14 64 18 C70 14 78 18 78 26 C78 36 68 44 50 56 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 58 q8 -4 18 0 q4 10 18 14 q-22 4 -32 -4 q-4 -4 -4 -10 z" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M86 58 q-8 -4 -18 0 q-4 10 -18 14 q22 4 32 -4 q4 -4 4 -10 z" fill={PEACH} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="22" y1="64" x2="28" y2="62" stroke={STROKE} strokeWidth="1.2"/>
  <Line x1="78" y1="64" x2="72" y2="62" stroke={STROKE} strokeWidth="1.2"/>
</PillarSVG>;

// Financial Planning — piggy bank with coin slot + heart
const PillarFinancialPlanning = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M14 56 C14 40 30 30 50 30 C70 30 86 40 86 56 C86 70 76 78 64 80 L60 86 L52 82 L44 86 L40 80 C26 78 14 70 14 56 Z" fill={PINK} stroke={STROKE} strokeWidth="1.8"/>
  <Circle cx="22" cy="48" r="3" fill={STROKE}/>
  <Rect x="44" y="36" width="14" height="3" rx="1.5" fill={STROKE}/>
  <Path d="M70 32 q4 -10 12 -10 q-2 6 0 12" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  <Circle cx="78" cy="20" r="6" fill={YELLOW} stroke={STROKE} strokeWidth="1.6"/>
  <SvgText x="78" y="24" fontFamily="Fraunces, serif" fontSize="8" textAnchor="middle" fontWeight="700" fill={STROKE}>$</SvgText>
</PillarSVG>;

// Partner Alignment — two interlocking rings with heart spark
const PillarPartnerAlignment = ({ size = 100 }) => <PillarSVG size={size}>
  <Circle cx="38" cy="52" r="22" fill="none" stroke={STROKE} strokeWidth="6"/>
  <Circle cx="38" cy="52" r="22" fill="none" stroke={HOT_PINK} strokeWidth="3"/>
  <Circle cx="64" cy="52" r="22" fill="none" stroke={STROKE} strokeWidth="6"/>
  <Circle cx="64" cy="52" r="22" fill="none" stroke={ROYAL} strokeWidth="3"/>
  <Path d="M51 44 C46 39 41 36 41 30 C41 26 45 24 48 26 C50 24 54 26 51 30 C54 26 58 24 60 26 C63 24 60 36 60 30 C60 36 56 39 51 44 Z" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
</PillarSVG>;

// Pre-conception Health — stethoscope with heart
const PillarHealthCheckup = ({ size = 100 }) => <PillarSVG size={size}>
  <Circle cx="36" cy="24" r="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="64" cy="24" r="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M36 30 Q36 50 50 56 Q64 50 64 30" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="50" y1="56" x2="50" y2="64" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Circle cx="50" cy="72" r="14" fill={MINT} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M50 80 C44 76 40 72 40 68 C40 64 44 62 47 64 C49 62 51 64 50 68 C51 64 55 62 57 64 C60 62 60 76 50 80 Z" fill={RED} stroke={STROKE} strokeWidth="1.4"/>
</PillarSVG>;

/* =================================================================== */
/*  PREGNANCY PILLARS (9) — mode accent: violet                          */
/* =================================================================== */

// Week by Week — calendar with growing sprout
const PillarWeekByWeek = ({ size = 100 }) => <PillarSVG size={size}>
  <Rect x="14" y="22" width="72" height="64" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.8"/>
  <Rect x="14" y="22" width="72" height="16" rx="6" fill={VIOLET} stroke={STROKE} strokeWidth="1.8"/>
  <Line x1="28" y1="14" x2="28" y2="32" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="72" y1="14" x2="72" y2="32" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Circle cx="32" cy="52" r="3" fill={PURPLE}/>
  <Circle cx="50" cy="52" r="3" fill={PURPLE}/>
  <Circle cx="68" cy="52" r="3" fill={PURPLE}/>
  <Circle cx="32" cy="68" r="3" fill={PURPLE}/>
  <Circle cx="50" cy="68" r="4.5" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M50 72 q-4 4 -2 10 q4 -2 6 -8" fill={GREEN} stroke={STROKE} strokeWidth="1.2"/>
</PillarSVG>;

// Symptoms & Relief — bandage cross with comfort sparkle
const PillarSymptomsRelief = ({ size = 100 }) => <PillarSVG size={size}>
  <Rect x="14" y="42" width="72" height="20" rx="10" fill={PEACH} stroke={STROKE} strokeWidth="1.8" transform="rotate(-22 50 52)"/>
  <Rect x="22" y="46" width="14" height="12" rx="2" fill={CREAM} stroke={STROKE} strokeWidth="1.4" transform="rotate(-22 50 52)"/>
  <Rect x="64" y="46" width="14" height="12" rx="2" fill={CREAM} stroke={STROKE} strokeWidth="1.4" transform="rotate(-22 50 52)"/>
  <Circle cx="42" cy="49" r="1.5" fill={STROKE}/>
  <Circle cx="50" cy="51" r="1.5" fill={STROKE}/>
  <Circle cx="58" cy="53" r="1.5" fill={STROKE}/>
  <Path d="M22 22 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.3"/>
  <Path d="M78 70 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.3"/>
</PillarSVG>;

// Birth Planning — hospital tag clipboard with heart
const PillarBirthPlanning = ({ size = 100 }) => <PillarSVG size={size}>
  <Rect x="22" y="18" width="56" height="68" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.8"/>
  <Rect x="38" y="12" width="24" height="12" rx="3" fill={VIOLET} stroke={STROKE} strokeWidth="1.4"/>
  <Circle cx="50" cy="18" r="2" fill={CREAM} stroke={STROKE} strokeWidth="1"/>
  <Path d="M50 56 C42 48 36 42 36 36 C36 32 40 30 44 32 C46 30 50 32 50 36 C50 32 54 30 56 32 C60 30 64 32 64 36 C64 42 58 48 50 56 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="32" y1="68" x2="68" y2="68" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 2.5"/>
  <Line x1="32" y1="76" x2="58" y2="76" stroke={STROKE} strokeWidth="1.4" strokeDasharray="2 2.5"/>
</PillarSVG>;

// Breastfeeding Prep — droplet with heart inside
const PillarBreastfeedingPrep = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 14 C50 14 22 46 22 64 c0 16 12 26 28 26 c16 0 28 -10 28 -26 c0 -18 -28 -50 -28 -50 z" fill={PEACH} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M50 76 C42 68 36 62 36 56 C36 52 40 50 44 52 C46 50 50 52 50 56 C50 52 54 50 56 52 C60 50 64 52 64 56 C64 62 58 68 50 76 Z" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M38 38 q-2 -8 6 -10" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round"/>
</PillarSVG>;

// Baby Gear — bottle with stars
const PillarBabyGear = ({ size = 100 }) => <PillarSVG size={size}>
  <Rect x="34" y="32" width="32" height="50" rx="10" fill={BLUE} stroke={STROKE} strokeWidth="1.8"/>
  <Rect x="36" y="22" width="28" height="14" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="42" y="14" width="16" height="12" rx="4" fill={PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="34" y1="50" x2="66" y2="50" stroke={STROKE} strokeWidth="1.2" strokeDasharray="3 3"/>
  <Path d="M42 60 q4 -2 8 0" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round"/>
  <Path d="M20 30 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.2"/>
  <Path d="M78 64 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</PillarSVG>;

// Partner Support — two hands forming heart
const PillarPartnerSupport = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M14 42 q6 -10 18 -8 q10 2 18 12 l-8 24 q-6 6 -16 4 q-14 -2 -16 -16 q-2 -10 4 -16 z" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M86 42 q-6 -10 -18 -8 q-10 2 -18 12 l8 24 q6 6 16 4 q14 -2 16 -16 q2 -10 -4 -16 z" fill={BLUE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 78 C40 68 32 60 32 52 C32 46 38 42 44 46 C46 42 50 42 50 50 C50 42 54 42 56 46 C62 42 68 46 68 52 C68 60 60 68 50 78 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.8"/>
</PillarSVG>;

// Postpartum Prep — crescent moon with stars + cozy waves
const PillarPostpartumPrep = ({ size = 100 }) => <PillarSVG size={size}>
  <Circle cx="50" cy="48" r="34" fill={NAVY} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M68 26 C50 26 36 38 36 56 c0 16 14 26 28 24 c-12 -4 -20 -14 -20 -28 c0 -12 8 -20 16 -22 c4 -2 6 0 8 0 z" fill={CREAM} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M26 22 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.2"/>
  <Path d="M76 64 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z" fill={PINK} stroke={STROKE} strokeWidth="1.2"/>
</PillarSVG>;

// Nutrition (Pregnancy) — leafy bowl with steam
const PillarNutrition = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M44 14 q-4 8 0 14 q-8 -2 -10 -10 q4 -8 10 -4 z" fill={GREEN} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M54 14 q4 8 0 14 q8 -2 10 -10 q-4 -8 -10 -4 z" fill={MINT} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M50 28 q-4 8 0 16" fill="none" stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M14 46 h72 c0 24 -16 36 -36 36 c-20 0 -36 -12 -36 -36 z" fill={CREAM} stroke={STROKE} strokeWidth="1.8"/>
  <Ellipse cx="50" cy="46" rx="36" ry="6" fill={GREEN} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="38" cy="44" r="3" fill={PEACH}/>
  <Circle cx="60" cy="44" r="3" fill={RED}/>
  <Ellipse cx="50" cy="48" rx="3" ry="2" fill={YELLOW}/>
</PillarSVG>;

// Emotional Wellness — lotus / blooming flower
const PillarEmotionalWellness = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 50 q-30 -4 -36 -22 q14 -8 36 8" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 50 q30 -4 36 -22 q-14 -8 -36 8" fill={PURPLE} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 50 q-16 -6 -16 -28 q12 -2 16 14" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 50 q16 -6 16 -28 q-12 -2 -16 14" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 50 q-6 -10 0 -28 q6 18 0 28" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M14 56 q36 14 72 0 q-10 16 -36 16 q-26 0 -36 -16 z" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
</PillarSVG>;

/* =================================================================== */
/*  KIDS PILLARS (9) — mode accent: blue                                 */
/* =================================================================== */

// Breastfeeding (Milk) — baby bottle with milk line
const PillarMilk = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M32 30 q0 -4 4 -4 h28 q4 0 4 4 v8 h-36 z" fill={PINK} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="28" y="38" width="44" height="44" rx="8" fill={CREAM} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M28 56 q22 -6 44 0 v22 q0 4 -4 4 h-36 q-4 0 -4 -4 z" fill={BLUE} stroke={STROKE} strokeWidth="1.6"/>
  <Rect x="36" y="14" width="28" height="14" rx="6" fill={CREAM} stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="36" y1="68" x2="52" y2="68" stroke={CREAM} strokeWidth="1.6" strokeLinecap="round"/>
</PillarSVG>;

// Feeding (solids) — apple with leaf
const PillarFood = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 22 q-10 -10 -22 -4 q-12 8 -10 24 q2 28 18 38 q10 6 14 0 q4 6 14 0 q16 -10 18 -38 q2 -16 -10 -24 q-12 -6 -22 4 z" fill={RED} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M50 22 q-2 -8 -10 -10 q-2 4 0 10 q4 4 10 0 z" fill={DEEP_GREEN} stroke={STROKE} strokeWidth="1.4"/>
  <Line x1="50" y1="22" x2="50" y2="14" stroke={STROKE} strokeWidth="2" strokeLinecap="round"/>
  <Ellipse cx="38" cy="40" rx="6" ry="3" fill={PINK} opacity=".7"/>
</PillarSVG>;

// Nutrition (Kids) — DNA helix / wheat strands
const PillarNutritionKids = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M30 14 Q70 36 30 58 Q70 80 30 86" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Path d="M70 14 Q30 36 70 58 Q30 80 70 86" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="30" y1="22" x2="70" y2="22" stroke={GREEN} strokeWidth="5" strokeLinecap="round"/>
  <Line x1="30" y1="34" x2="70" y2="34" stroke={MINT} strokeWidth="5" strokeLinecap="round"/>
  <Line x1="30" y1="46" x2="70" y2="46" stroke={GREEN} strokeWidth="5" strokeLinecap="round"/>
  <Line x1="30" y1="58" x2="70" y2="58" stroke={MINT} strokeWidth="5" strokeLinecap="round"/>
  <Line x1="30" y1="70" x2="70" y2="70" stroke={GREEN} strokeWidth="5" strokeLinecap="round"/>
  <Line x1="30" y1="82" x2="70" y2="82" stroke={MINT} strokeWidth="5" strokeLinecap="round"/>
</PillarSVG>;

// Vaccines — syringe with heart drop
const PillarVaccines = ({ size = 100 }) => <PillarSVG size={size}>
  <Rect x="34" y="30" width="32" height="40" rx="3" fill={CREAM} stroke={STROKE} strokeWidth="1.8" transform="rotate(-32 50 50)"/>
  <Rect x="28" y="22" width="12" height="14" rx="2" fill={ROYAL} stroke={STROKE} strokeWidth="1.6" transform="rotate(-32 34 28)"/>
  <Line x1="38" y1="20" x2="46" y2="14" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="70" y1="64" x2="86" y2="80" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Line x1="50" y1="40" x2="56" y2="46" stroke={ROYAL} strokeWidth="2"/>
  <Line x1="44" y1="46" x2="50" y2="52" stroke={ROYAL} strokeWidth="2"/>
  <Path d="M20 70 C16 66 12 62 12 58 C12 54 16 52 20 54 C24 52 26 56 22 60 C26 56 30 60 26 66 C30 60 22 74 20 70 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
</PillarSVG>;

// Layette — onesie on hanger
const PillarClothes = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 12 Q44 18 48 22 L40 30" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
  <Path d="M48 22 L60 30" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Path d="M24 36 q4 -4 16 -6 q4 6 10 6 q6 0 10 -6 q12 2 16 6 l-4 10 l-8 -2 v36 q0 4 -4 4 h-24 q-4 0 -4 -4 v-36 l-8 2 z" fill={PINK} stroke={STROKE} strokeWidth="1.8"/>
  <Circle cx="44" cy="58" r="1.6" fill={STROKE}/>
  <Circle cx="56" cy="58" r="1.6" fill={STROKE}/>
  <Path d="M44 64 q6 4 12 0" fill="none" stroke={STROKE} strokeWidth="1.2" strokeLinecap="round"/>
  <Circle cx="50" cy="80" r="2" fill={YELLOW} stroke={STROKE} strokeWidth="1"/>
</PillarSVG>;

// Recipes — pot/cauldron with steam-hearts
const PillarRecipes = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M34 24 q-4 -8 4 -10 q-2 6 2 8" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  <Path d="M50 18 C46 14 42 12 42 8 C42 4 46 4 48 6 C50 4 54 4 54 8 C54 12 50 14 50 18 Z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.4"/>
  <Path d="M66 22 q4 -8 -4 -10 q2 6 -2 8" fill="none" stroke={STROKE} strokeWidth="1.6" strokeLinecap="round"/>
  <Rect x="14" y="36" width="72" height="14" rx="3" fill={PEACH} stroke={STROKE} strokeWidth="1.8"/>
  <Path d="M18 50 h64 v22 q0 12 -10 14 h-44 q-10 -2 -10 -14 z" fill={RED} stroke={STROKE} strokeWidth="1.8"/>
  <Line x1="14" y1="58" x2="18" y2="58" stroke={STROKE} strokeWidth="1.6"/>
  <Line x1="82" y1="58" x2="86" y2="58" stroke={STROKE} strokeWidth="1.6"/>
  <Ellipse cx="50" cy="50" rx="28" ry="3" fill={YELLOW} stroke={STROKE} strokeWidth="1.4"/>
</PillarSVG>;

// Natural Care (Habits) — leafy branch
const PillarHabits = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M22 80 Q40 60 50 50 Q60 40 78 22" fill="none" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round"/>
  <Path d="M44 58 q-12 -6 -16 -18 q14 -2 18 14 z" fill={GREEN} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M50 48 q12 -10 18 -22 q-14 -2 -20 16 z" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M40 66 q-10 0 -16 8 q12 6 18 -4 z" fill={MINT} stroke={STROKE} strokeWidth="1.6"/>
  <Path d="M56 42 q10 -2 14 -12 q-12 -2 -16 10 z" fill={GREEN} stroke={STROKE} strokeWidth="1.6"/>
  <Circle cx="80" cy="20" r="3" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.2"/>
</PillarSVG>;

// Medicine — pill capsule split with cross
const PillarMedicine = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M22 38 a18 18 0 0 1 18 -18 h20 a18 18 0 0 1 18 18 v0 a18 18 0 0 1 -18 18 h-20 a18 18 0 0 1 -18 -18 z" fill={RED} stroke={STROKE} strokeWidth="1.8" transform="rotate(38 50 38)"/>
  <Path d="M22 62 a18 18 0 0 1 18 -18 h20 a18 18 0 0 1 18 18 v0 a18 18 0 0 1 -18 18 h-20 a18 18 0 0 1 -18 -18 z" fill={CREAM} stroke={STROKE} strokeWidth="1.8" transform="rotate(38 50 62)"/>
  <Line x1="20" y1="50" x2="80" y2="50" stroke={STROKE} strokeWidth="1.8" transform="rotate(38 50 50)"/>
  <Rect x="46" y="30" width="8" height="3" fill={CREAM} transform="rotate(38 50 50)"/>
  <Rect x="46" y="38" width="8" height="3" fill={CREAM} transform="rotate(38 50 50)"/>
</PillarSVG>;

// Milestones — star with banner ribbon
const PillarMilestones = ({ size = 100 }) => <PillarSVG size={size}>
  <Path d="M50 16 l9 18 l20 3 l-14.5 14 l3.5 20 l-18 -10 l-18 10 l3.5 -20 l-14.5 -14 l20 -3 z" fill={YELLOW} stroke={STROKE} strokeWidth="1.8" strokeLinejoin="round"/>
  <Path d="M22 70 q14 8 28 4 q14 4 28 -4 l-4 16 l-10 -4 l-6 8 l-8 -10 l-8 10 l-6 -8 l-10 4 z" fill={HOT_PINK} stroke={STROKE} strokeWidth="1.6" strokeLinejoin="round"/>
  <Circle cx="50" cy="42" r="3" fill={STROKE}/>
</PillarSVG>;

/* ------------------------------------------------------------------ */
const PillarStickers = {
  // Pre-preg
  PillarFertility, PillarNutritionPrep, PillarEmotionalReadiness,
  PillarFinancialPlanning, PillarPartnerAlignment, PillarHealthCheckup,
  // Pregnancy
  PillarWeekByWeek, PillarSymptomsRelief, PillarBirthPlanning,
  PillarBreastfeedingPrep, PillarBabyGear, PillarPartnerSupport,
  PillarPostpartumPrep, PillarNutrition, PillarEmotionalWellness,
  // Kids
  PillarMilk, PillarFood, PillarNutritionKids, PillarVaccines,
  PillarClothes, PillarRecipes, PillarHabits, PillarMedicine,
  PillarMilestones,
};

export { PillarStickers };
export default PillarStickers;
