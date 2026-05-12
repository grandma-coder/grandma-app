# grandma.app — Design Assets Needed

> Audit of every screen, modal, and section that needs an icon or sticker. Use this to scope your design work.
>
> **Asset types**
> - **Icon** — functional, lucide-style line icon (e.g. tab bar, action button)
> - **Sticker** — decorative cream-paper collage-style asset (e.g. hero illustration, empty state)
>
> **Current state**
> - `🟢 has asset` — already designed (lucide icon or existing sticker, may need refresh)
> - `🟡 placeholder` — uses emoji or generic icon, needs design pass
> - `🔴 missing` — no visual exists, must be created

**Summary**
- ~155 total entries
- By mode: Pre-Pregnancy ~22, Pregnancy ~32, Kids ~36, Cross-mode ~65
- By type: ~95 stickers, ~60 icons
- Heaviest screens: (1) Pillar grids — 24 pillar stickers across 3 modes, (2) Kids home (KidsHome.tsx) — 12+ tiles + log stickers, (3) Pregnancy home (PregnancyHome + TodaySummaryCard) — 10+ stickers, (4) Onboarding activities — 15 emoji-tile stickers per mode, (5) Log forms / log stickers (logStickers.tsx) — 36 distinct log type stickers

---

## 🌸 Pre-Pregnancy Mode (color: #FF8AD8 pink)

### Onboarding — Cycle flow — `app/onboarding/cycle/index.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_prepreg_onboarding_hero` | Sticker | 🟡 placeholder | Hero illustration on the "Trying to conceive" intro step — playful pink flower / heart vibe |
| `sticker_prepreg_onboarding_cycle_tracking` | Sticker | 🟡 placeholder | Step illustration: tracking the cycle |
| `sticker_prepreg_onboarding_partner` | Sticker | 🔴 missing | Step illustration: bringing in partner |
| `sticker_prepreg_onboarding_doctor` | Sticker | 🔴 missing | Step illustration: pre-conception checkup |

### Cycle Home — `components/home/CycleHome.tsx` + `components/home/cycle/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_prepreg_home_cycle_ring_menstruation` | Sticker | 🟡 placeholder | Center of CyclePhaseRing during menstruation phase — soft pink drop |
| `sticker_prepreg_home_cycle_ring_follicular` | Sticker | 🟡 placeholder | Cycle ring center, follicular — bud / sprout |
| `sticker_prepreg_home_cycle_ring_ovulation` | Sticker | 🟡 placeholder | Cycle ring center, ovulation — radiant burst |
| `sticker_prepreg_home_cycle_ring_luteal` | Sticker | 🟡 placeholder | Cycle ring center, luteal — moon / crescent |
| `sticker_prepreg_home_fertile_window` | Sticker | 🟡 placeholder | FertileWindowStrip accent — fertile window marker |
| `sticker_prepreg_home_hormones_estrogen` | Sticker | 🔴 missing | HormonesCard chip — estrogen accent |
| `sticker_prepreg_home_hormones_progesterone` | Sticker | 🔴 missing | HormonesCard chip — progesterone accent |
| `sticker_prepreg_home_hormones_lh` | Sticker | 🔴 missing | HormonesCard chip — LH surge |
| `sticker_prepreg_home_wisdom` | Sticker | 🟡 placeholder | WisdomCard decoration — Grandma whisper accent |
| `icon_prepreg_log_period_start` | Icon | 🟢 has asset | LogPeriodStart sticker exists |
| `icon_prepreg_log_period_end` | Icon | 🟢 has asset | LogPeriodEnd sticker exists |
| `icon_prepreg_log_ovulation` | Icon | 🟢 has asset | LogOvulation sticker exists |
| `icon_prepreg_log_basal_temp` | Icon | 🟢 has asset | LogTemperature sticker exists |
| `icon_prepreg_log_cervical_fluid` | Icon | 🟢 has asset | LogCervicalFluid sticker exists |
| `icon_prepreg_log_intimacy` | Icon | 🟢 has asset | LogIntimacy sticker exists |

### Pillars (6) — `lib/prePregPillars.ts` → rendered in Library tab + PillarGrid

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_prepreg_pillar_fertility` | Sticker | 🟡 placeholder | Pillar card hero: Fertility Basics (currently 🌸) |
| `sticker_prepreg_pillar_nutrition_prep` | Sticker | 🟡 placeholder | Pillar card: Nutrition Prep (currently 🥑) |
| `sticker_prepreg_pillar_emotional_readiness` | Sticker | 🟡 placeholder | Pillar card: Emotional Readiness (currently 💛) |
| `sticker_prepreg_pillar_financial_planning` | Sticker | 🟡 placeholder | Pillar card: Financial Planning (currently 💰) |
| `sticker_prepreg_pillar_partner_alignment` | Sticker | 🟡 placeholder | Pillar card: Partner Alignment (currently 💑) |
| `sticker_prepreg_pillar_health_checkup` | Sticker | 🟡 placeholder | Pillar card: Pre-conception Health (currently 🩺) |

### Agenda — Cycle calendar + checklist — `components/calendar/CycleCalendar.tsx`, `components/agenda/PrePregChecklist.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_prepreg_calendar_period_day` | Sticker | 🟡 placeholder | Period day marker on calendar — soft pink drop |
| `sticker_prepreg_calendar_fertile_day` | Sticker | 🟡 placeholder | Fertile-window day marker — sparkle |
| `sticker_prepreg_checklist_empty` | Sticker | 🔴 missing | Empty state for pre-pregnancy checklist screen |

---

## 🤰 Pregnancy Mode (color: #B983FF purple)

### Onboarding — Pregnancy flow — `app/onboarding/pregnancy/index.tsx`, `app/onboarding/due-date.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_onboarding_hero` | Sticker | 🟡 placeholder | "I'm pregnant" welcome — belly + heart |
| `sticker_pregnancy_onboarding_due_date` | Sticker | 🟡 placeholder | Due date picker step — calendar + baby |
| `sticker_pregnancy_onboarding_partner` | Sticker | 🔴 missing | Inviting partner step |

### Pregnancy Home — `components/home/PregnancyHome.tsx` + `components/home/pregnancy/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_home_week_hero` | Sticker | 🟢 has asset | WeekCard hero baby illustration (40 week BabyIllustration set already in `babyIllustrations.tsx`) |
| `sticker_pregnancy_home_baby_size_fruit` | Sticker | 🟢 has asset | AnimatedFruit baby-size comparison (weekly fruit set exists) |
| `sticker_pregnancy_home_today_summary` | Sticker | 🟡 placeholder | TodaySummaryCard decorative corner sticker |
| `sticker_pregnancy_home_affirmation` | Sticker | 🟡 placeholder | AffirmationRevealCard hero — soft hand-lettered heart |
| `sticker_pregnancy_home_affirmation_share` | Sticker | 🟡 placeholder | AffirmationShareModal share-card background sticker |
| `sticker_pregnancy_home_reminder_pill` | Sticker | 🟡 placeholder | PregnancyUserReminders pill chip — bullet sticker |
| `sticker_pregnancy_home_week_ruler` | Sticker | 🟡 placeholder | WeekRuler tick / marker style |
| `sticker_pregnancy_home_weight_trend` | Sticker | 🟡 placeholder | WeightTrendCard scale accent |
| `sticker_pregnancy_home_dashboard_hero` | Sticker | 🟡 placeholder | TodayDashboardModal hero |
| `sticker_pregnancy_journey_ring` | Sticker | 🟡 placeholder | PregnancyJourneyRing trimester progress accent |

### Pillars (9) — `lib/pregnancyPillars.ts`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_pillar_week_by_week` | Sticker | 🟡 placeholder | Pillar card: Week by Week (📅) |
| `sticker_pregnancy_pillar_symptoms_relief` | Sticker | 🟡 placeholder | Pillar card: Symptoms & Relief (🩹) |
| `sticker_pregnancy_pillar_birth_planning` | Sticker | 🟡 placeholder | Pillar card: Birth Planning (🏥) |
| `sticker_pregnancy_pillar_breastfeeding_prep` | Sticker | 🟡 placeholder | Pillar card: Breastfeeding Prep (🤱) |
| `sticker_pregnancy_pillar_baby_gear` | Sticker | 🟡 placeholder | Pillar card: Baby Gear (🍼) |
| `sticker_pregnancy_pillar_partner_support` | Sticker | 🟡 placeholder | Pillar card: Partner Support (💑) |
| `sticker_pregnancy_pillar_postpartum_prep` | Sticker | 🟡 placeholder | Pillar card: Postpartum Prep (🌙) |
| `sticker_pregnancy_pillar_nutrition` | Sticker | 🟡 placeholder | Pillar card: Nutrition (🥗) |
| `sticker_pregnancy_pillar_emotional_wellness` | Sticker | 🟡 placeholder | Pillar card: Emotional Wellness (🧘) |

### Agenda — Pregnancy — `components/calendar/PregnancyCalendar.tsx`, `components/agenda/KickCounter.tsx`, `ContractionTimer.tsx`, `SymptomLogger.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_kicks_hero` | Sticker | 🟢 has asset | LogKicks sticker exists; KickCounter screen hero may want larger variant |
| `sticker_pregnancy_contraction_hero` | Sticker | 🟢 has asset | LogContraction exists; ContractionTimer hero accent |
| `sticker_pregnancy_symptom_empty` | Sticker | 🔴 missing | SymptomLogger empty state |
| `icon_pregnancy_log_vitamins` | Icon | 🟢 has asset | LogVitamins |
| `icon_pregnancy_log_water` | Icon | 🟢 has asset | LogWater |
| `icon_pregnancy_log_weight` | Icon | 🟢 has asset | LogWeight |
| `icon_pregnancy_log_appointment` | Icon | 🟢 has asset | LogAppointment |
| `icon_pregnancy_log_ultrasound` | Icon | 🟢 has asset | LogUltrasound |
| `icon_pregnancy_log_heartbeat` | Icon | 🟢 has asset | LogHeartbeat |
| `icon_pregnancy_log_kegel` | Icon | 🟢 has asset | LogKegel |
| `icon_pregnancy_log_nesting` | Icon | 🟢 has asset | LogNesting |
| `icon_pregnancy_log_birth_prep` | Icon | 🟢 has asset | LogBirthPrep |

### Birth — `app/birth-plan.tsx`, `components/pregnancy/BirthGuideModal.tsx`, `components/pregnancy/BirthDetailModal.tsx`, `components/pregnancy/BirthTypeCard.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_birth_plan_hero` | Sticker | 🟡 placeholder | Hero on birth-plan screen — hospital + heart |
| `sticker_pregnancy_birth_type_vaginal` | Sticker | 🔴 missing | BirthTypeCard option illustration |
| `sticker_pregnancy_birth_type_csection` | Sticker | 🔴 missing | BirthTypeCard option illustration |
| `sticker_pregnancy_birth_type_water` | Sticker | 🔴 missing | BirthTypeCard option illustration |
| `sticker_pregnancy_birth_guide_early_labor` | Sticker | 🟡 placeholder | BirthGuideModal phase — early labor (🌅) |
| `sticker_pregnancy_birth_guide_active_labor` | Sticker | 🟡 placeholder | BirthGuideModal phase — active labor (🌊) |
| `sticker_pregnancy_birth_guide_transition` | Sticker | 🟡 placeholder | BirthGuideModal phase — transition (💫) |
| `sticker_pregnancy_birth_guide_birth` | Sticker | 🟡 placeholder | BirthGuideModal phase — birth & golden hour (👶) |
| `sticker_pregnancy_birth_guide_postpartum` | Sticker | 🟡 placeholder | BirthGuideModal phase — recovery (🌸) |
| `sticker_pregnancy_hospital_bag` | Sticker | 🔴 missing | Hospital-bag checklist hero |

### Partner — `components/pregnancy/PartnerDashboard.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pregnancy_partner_hero` | Sticker | 🔴 missing | PartnerDashboard hero — two hands / shared bump |

---

## 👶 Kids Mode (color: #4D96FF blue)

### Onboarding — Kids — `app/onboarding/kids/index.tsx`, `app/onboarding/baby-name.tsx`, `app/onboarding/child-profile.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_onboarding_hero` | Sticker | 🟡 placeholder | "I have a baby" welcome — cradle + star |
| `sticker_kids_onboarding_baby_name` | Sticker | 🟡 placeholder | baby-name step illustration |
| `sticker_kids_onboarding_child_profile` | Sticker | 🟡 placeholder | child-profile step — baby photo frame |

### Kids Home — `components/home/KidsHome.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_home_sleep_circle` | Sticker | 🟡 placeholder | Sleep ring center — moon / Z's |
| `sticker_kids_home_mood_analysis` | Sticker | 🟡 placeholder | Mood card hero — face range |
| `sticker_kids_home_calories` | Sticker | 🟡 placeholder | Calories tile — bowl / spoon |
| `sticker_kids_home_growth_leaps` | Sticker | 🟡 placeholder | Growth leaps tile — measuring tape |
| `sticker_kids_home_diaper_pee` | Sticker | 🟡 placeholder | Diaper breakdown chip — pee (currently 💧) |
| `sticker_kids_home_diaper_poop` | Sticker | 🟡 placeholder | Diaper chip — poop (currently 💩) |
| `sticker_kids_home_diaper_mixed` | Sticker | 🟡 placeholder | Diaper chip — mixed (currently 🔄) |
| `sticker_kids_home_milk_tracker` | Sticker | 🟡 placeholder | MilkTracker hero — bottle/breast |
| `sticker_kids_home_nanny_updates` | Sticker | 🟡 placeholder | NannyUpdatesFeed empty / header decoration |
| `sticker_kids_home_journey_ring` | Sticker | 🟡 placeholder | KidsJourneyRing decoration |
| `sticker_kids_home_location` | Sticker | 🟡 placeholder | LocationCard map pin / airtag accent |
| `sticker_kids_home_empty_tile` | Sticker | 🔴 missing | Generic "Tap to log" empty tile sticker (shared across tiles) |

### Pillars (9) — `lib/pillars.ts`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_pillar_milk` | Sticker | 🟡 placeholder | Pillar card: Breastfeeding (🍼) |
| `sticker_kids_pillar_food` | Sticker | 🟡 placeholder | Pillar card: Feeding (🥑) |
| `sticker_kids_pillar_nutrition` | Sticker | 🟡 placeholder | Pillar card: Nutrition (🧬) |
| `sticker_kids_pillar_vaccines` | Sticker | 🟡 placeholder | Pillar card: Vaccines (💉) |
| `sticker_kids_pillar_clothes` | Sticker | 🟡 placeholder | Pillar card: Layette (👶) |
| `sticker_kids_pillar_recipes` | Sticker | 🟡 placeholder | Pillar card: Recipes (🍲) |
| `sticker_kids_pillar_habits` | Sticker | 🟡 placeholder | Pillar card: Natural Care (🌿) |
| `sticker_kids_pillar_medicine` | Sticker | 🟡 placeholder | Pillar card: Medicine (💊) |
| `sticker_kids_pillar_milestones` | Sticker | 🟡 placeholder | Pillar card: Milestones (⭐) |

### Agenda — Kids — `components/calendar/KidsCalendar.tsx`, `components/agenda/FoodDashboard.tsx`, `components/agenda/NannyNotesPanel.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_calendar_empty` | Sticker | 🔴 missing | Empty day on KidsCalendar — soft cloud |
| `sticker_kids_food_dashboard_hero` | Sticker | 🟡 placeholder | FoodDashboard hero — plate of food |
| `sticker_kids_food_photo_entry` | Sticker | 🟡 placeholder | FoodPhotoEntry add-photo state — camera |
| `sticker_kids_nanny_notes_empty` | Sticker | 🔴 missing | NannyNotesPanel empty state |
| `icon_kids_log_feeding` | Icon | 🟢 has asset | LogFeeding sticker |
| `icon_kids_log_food` | Icon | 🟢 has asset | LogFood |
| `icon_kids_log_diaper` | Icon | 🟢 has asset | LogDiaper |
| `icon_kids_log_sleep` | Icon | 🟢 has asset | LogSleep |
| `icon_kids_log_nap` | Icon | 🟢 has asset | LogNap |
| `icon_kids_log_medicine` | Icon | 🟢 has asset | LogMedicine |
| `icon_kids_log_vaccine` | Icon | 🟢 has asset | LogVaccine |
| `icon_kids_log_fever` | Icon | 🟢 has asset | LogFever |
| `icon_kids_log_bath` | Icon | 🟢 has asset | LogBath |
| `icon_kids_log_potty` | Icon | 🟢 has asset | LogPotty |
| `icon_kids_log_tooth` | Icon | 🟢 has asset | LogTooth |
| `icon_kids_log_growth` | Icon | 🟢 has asset | LogGrowth |
| `icon_kids_log_milestone` | Icon | 🟢 has asset | LogMilestone |
| `icon_kids_log_note` | Icon | 🟢 has asset | LogNote |
| `icon_kids_log_mood` | Icon | 🟢 has asset | LogMood |

### Vault — Kids — `app/(tabs)/vault.tsx`, `components/vault/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_vault_vaccines_section` | Sticker | 🟡 placeholder | Vaccines section header — shield + syringe |
| `sticker_kids_vault_exams_section` | Sticker | 🟡 placeholder | Exams section header — clipboard |
| `sticker_kids_vault_hospital_section` | Sticker | 🟡 placeholder | Hospital records header — building |
| `sticker_kids_vault_emergency_card` | Sticker | 🟡 placeholder | EmergencyCard hero — red-cross-style |
| `sticker_kids_vault_document_empty` | Sticker | 🔴 missing | DocumentSection empty state |
| `sticker_kids_vault_document_upload` | Sticker | 🟡 placeholder | DocumentUpload tap zone — paper + plus |

### Milestones / Achievements (kids-specific) — already in `RewardStickers.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_kids_milestone_first_tooth` | Sticker | 🟢 has asset | FirstTooth |
| `sticker_kids_milestone_first_word` | Sticker | 🟢 has asset | FirstWord |
| `sticker_kids_milestone_first_step` | Sticker | 🟢 has asset | FirstStep |
| `sticker_kids_milestone_first_roll` | Sticker | 🟢 has asset | FirstRoll |
| `sticker_kids_milestone_first_crawl` | Sticker | 🟢 has asset | FirstCrawl |
| `sticker_kids_milestone_first_smile` | Sticker | 🟢 has asset | FirstSmile |
| `sticker_kids_milestone_first_solid_food` | Sticker | 🟢 has asset | FirstSolidFood |
| `sticker_kids_milestone_first_haircut` | Sticker | 🟢 has asset | FirstHaircut |
| `sticker_kids_milestone_first_potty` | Sticker | 🟢 has asset | FirstPotty |
| `sticker_kids_milestone_sleep_through` | Sticker | 🟢 has asset | SleepThrough |

---

## 🌐 Cross-mode / shared

### Auth — `app/(auth)/welcome.tsx`, `sign-in.tsx`, `sign-up.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_auth_welcome_hero` | Sticker | 🟡 placeholder | Welcome screen hero — heart-eye Grandma logo / collage |
| `sticker_auth_logo` | Sticker | 🟢 has asset | grandma.app logo (heart-eye logo) |
| `icon_auth_apple` | Icon | 🟢 has asset | Apple sign-in glyph (system) |
| `icon_auth_google` | Icon | 🟢 has asset | Google sign-in glyph (lucide) |
| `sticker_auth_email_input` | Sticker | 🔴 missing | Email input decorative accent (optional) |

### Onboarding — Journey selector — `app/onboarding/journey.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_onboarding_journey_trying` | Sticker | 🟢 has asset | ModeTrying card sticker |
| `sticker_onboarding_journey_pregnant` | Sticker | 🟢 has asset | ModePregnant card sticker |
| `sticker_onboarding_journey_parent` | Sticker | 🟢 has asset | ModeParent card sticker |
| `sticker_onboarding_transition` | Sticker | 🟡 placeholder | Transition screen hero — between journey modes |

### Onboarding — Activities picker — `app/onboarding/activities.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_onboarding_activity_feeding` | Sticker | 🟡 placeholder | Activity tile — Feeding (🍼) |
| `sticker_onboarding_activity_sleep` | Sticker | 🟡 placeholder | Activity tile — Sleep (🌙) |
| `sticker_onboarding_activity_diaper` | Sticker | 🟡 placeholder | Activity tile — Diaper (💧) |
| `sticker_onboarding_activity_mood` | Sticker | 🟡 placeholder | Activity tile — Mood (☺) |
| `sticker_onboarding_activity_growth` | Sticker | 🟡 placeholder | Activity tile — Growth (📏) |
| `sticker_onboarding_activity_medicine` | Sticker | 🟡 placeholder | Activity tile — Medicine (💊) |
| `sticker_onboarding_activity_vaccines` | Sticker | 🟡 placeholder | Activity tile — Vaccines (💉) |
| `sticker_onboarding_activity_milestones` | Sticker | 🟡 placeholder | Activity tile — Milestones (⭐) |
| `sticker_onboarding_activity_symptoms` | Sticker | 🟡 placeholder | Activity tile — Symptoms (🤰) |
| `sticker_onboarding_activity_appointments` | Sticker | 🟡 placeholder | Activity tile — Appointments (🏥) |
| `sticker_onboarding_activity_weight` | Sticker | 🟡 placeholder | Activity tile — Weight (⚖️) |
| `sticker_onboarding_activity_nutrition` | Sticker | 🟡 placeholder | Activity tile — Nutrition (🥗) |
| `sticker_onboarding_activity_fertility` | Sticker | 🟡 placeholder | Activity tile — Fertility (🌸) |
| `sticker_onboarding_activity_fitness` | Sticker | 🟡 placeholder | Activity tile — Fitness (🧘) |
| `sticker_onboarding_activity_learning` | Sticker | 🟡 placeholder | Activity tile — Learning (📚) |

### Tab Bar — `app/(tabs)/_layout.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `icon_tab_home` | Icon | 🟢 has asset | lucide Home — may want custom sticker-style line icon |
| `icon_tab_agenda` | Icon | 🟢 has asset | lucide Calendar |
| `icon_tab_library` | Icon | 🟡 placeholder | currently library tab uses generic icon — book / pillars |
| `icon_tab_vault` | Icon | 🟢 has asset | lucide BarChart3 (used for analytics/vault) |
| `icon_tab_exchange` | Icon | 🟡 placeholder | Garage / marketplace icon — shopping bag variant |
| `icon_tab_settings` | Icon | 🟢 has asset | lucide User |

### Pillar detail — `app/pillar/[id].tsx`, `components/pillar/PillarCard.tsx`, `TipCard.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_pillar_detail_hero` | Sticker | 🟡 placeholder | Pillar detail hero — uses pillar sticker at large size |
| `sticker_pillar_tip_card_accent` | Sticker | 🟡 placeholder | TipCard corner decoration |
| `icon_pillar_ask_grandma` | Icon | 🟡 placeholder | "Ask Grandma a question" CTA chip glyph |
| `sticker_pillar_suggestion_chip` | Sticker | 🔴 missing | Suggested question chip bullet sticker |

### Grandma chat — `app/grandma-talk.tsx`, `components/chat/GrandmaTalk.tsx`, `components/home/GrandmaBall.tsx`, `GrandmaWisdom.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_grandma_avatar` | Sticker | 🟢 has asset | GrandmaBall avatar (heart-eye logo) |
| `sticker_grandma_avatar_speaking` | Sticker | 🟡 placeholder | Animated speaking state — mouth open variant |
| `sticker_grandma_avatar_listening` | Sticker | 🔴 missing | Thinking / ear-cup state |
| `sticker_grandma_chat_empty` | Sticker | 🟡 placeholder | Chat empty state hero — tea cup + heart |
| `sticker_grandma_wisdom_card` | Sticker | 🟡 placeholder | GrandmaWisdom card decoration |
| `icon_chat_send` | Icon | 🟢 has asset | lucide Send |
| `icon_chat_voice` | Icon | 🟡 placeholder | Voice input button |
| `icon_chat_attach` | Icon | 🟡 placeholder | Attach scan to chat |

### Scan — `app/scan.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_scan_hero` | Sticker | 🟡 placeholder | Scan screen hero — camera + magnifying glass |
| `sticker_scan_type_medicine` | Sticker | 🟡 placeholder | Scan type chip — Medicine (💊) |
| `sticker_scan_type_food` | Sticker | 🟡 placeholder | Scan type chip — Food (🥦) |
| `sticker_scan_type_nutrition` | Sticker | 🟡 placeholder | Scan type chip — Nutrition (📊) |
| `sticker_scan_type_general` | Sticker | 🟡 placeholder | Scan type chip — General (📷) |
| `icon_scan_shutter` | Icon | 🟡 placeholder | Camera shutter button |
| `sticker_scan_result_card` | Sticker | 🔴 missing | ResultCard hero decoration |

### Paywall — `app/paywall.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_paywall_hero` | Sticker | 🟡 placeholder | Premium hero — sparkle burst / crown |
| `sticker_paywall_premium_badge` | Sticker | 🟢 has asset | Premium sticker exists |
| `sticker_paywall_feature_unlimited` | Sticker | 🔴 missing | Feature row — unlimited scans |
| `sticker_paywall_feature_insights` | Sticker | 🔴 missing | Feature row — analytics |
| `sticker_paywall_feature_reminders` | Sticker | 🔴 missing | Feature row — reminders |
| `sticker_paywall_feature_grandma` | Sticker | 🔴 missing | Feature row — unlimited Grandma chat |

### Insights / Analytics — `app/insights.tsx`, `components/analytics/`, `components/insights/InsightsScreen.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_insights_hero` | Sticker | 🟡 placeholder | Insights screen hero — chart + spark |
| `sticker_insights_empty` | Sticker | 🔴 missing | "No insights yet" empty state |
| `sticker_insights_metric_highlight` | Sticker | 🟡 placeholder | MetricsHighlight card accent |
| `sticker_insights_pillar_card` | Sticker | 🟡 placeholder | InsightCard per-pillar decoration |
| `icon_insights_tab_overview` | Icon | 🟢 has asset | lucide |
| `icon_insights_tab_history` | Icon | 🟢 has asset | lucide |

### Notifications — `app/notifications.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_notifications_empty` | Sticker | 🔴 missing | Empty inbox — sleeping bell |
| `icon_notification_reminder` | Icon | 🟡 placeholder | Reminder row glyph |
| `icon_notification_vaccine` | Icon | 🟡 placeholder | Vaccine alert glyph |
| `icon_notification_appointment` | Icon | 🟡 placeholder | Appointment glyph |
| `icon_notification_grandma` | Icon | 🟡 placeholder | Grandma whisper notification |

### Leaderboard — `app/leaderboard.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_leaderboard_hero` | Sticker | 🟡 placeholder | Hero — trophy / ribbon |
| `sticker_leaderboard_rank_1` | Sticker | 🔴 missing | 1st place ribbon |
| `sticker_leaderboard_rank_2` | Sticker | 🔴 missing | 2nd place ribbon |
| `sticker_leaderboard_rank_3` | Sticker | 🔴 missing | 3rd place ribbon |
| `sticker_leaderboard_points_coin` | Sticker | 🟢 has asset | PointsCoin |
| `sticker_leaderboard_empty` | Sticker | 🔴 missing | Empty / not-on-board state |

### Daily rewards / Streaks — `app/daily-rewards.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_rewards_hero` | Sticker | 🟡 placeholder | Hero — flame + calendar |
| `sticker_rewards_flame` | Sticker | 🟢 has asset | Flame |
| `sticker_rewards_streak_chip` | Sticker | 🟢 has asset | StreakChip |
| `sticker_rewards_week_wheel` | Sticker | 🟢 has asset | WeekWheel |
| `sticker_rewards_day_badge` | Sticker | 🟢 has asset | DayBadge |
| `sticker_rewards_day_locked` | Sticker | 🟢 has asset | DayLocked |
| `sticker_rewards_gift_box` | Sticker | 🟢 has asset | GiftBox (reward reveal) |
| `sticker_rewards_quest_ribbon` | Sticker | 🟢 has asset | QuestRibbon |

### Badges — `app/profile/badges.tsx`, `components/stickers/BadgeIcon.tsx`, `components/profile/BadgesStrip.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_badges_hero` | Sticker | 🟡 placeholder | Badges screen hero — sticker album |
| `sticker_badges_locked_state` | Sticker | 🔴 missing | Locked badge placeholder |
| `sticker_badge_vault_secured` | Sticker | 🟢 has asset | VaultSecured |
| `sticker_badge_talk_master` | Sticker | 🟢 has asset | TalkMaster |
| `sticker_badge_emergency_ready` | Sticker | 🟢 has asset | EmergencyReady |
| `sticker_badge_legendary` | Sticker | 🟢 has asset | Legendary |
| `sticker_badge_first_post` | Sticker | 🟢 has asset | FirstPost |
| `sticker_badge_cycle_complete` | Sticker | 🟢 has asset | CycleComplete |
| `sticker_badge_fertile_hit` | Sticker | 🟢 has asset | FertileHit |
| `sticker_badge_trimester` | Sticker | 🟢 has asset | Trimester |
| `sticker_badge_first_kick` | Sticker | 🟢 has asset | FirstKick |
| `sticker_badge_health_checkup` | Sticker | 🟢 has asset | HealthCheckup |
| `sticker_badge_vaccine_shield` | Sticker | 🟢 has asset | VaccineShield |
| `sticker_badge_vaccine_complete` | Sticker | 🟢 has asset | VaccineComplete |
| `sticker_badge_diaper_first` | Sticker | 🟢 has asset | DiaperFirst |
| `sticker_badge_diaper_100` | Sticker | 🟢 has asset | Diaper100 |
| `sticker_badge_growth_first` | Sticker | 🟢 has asset | GrowthFirst |
| `sticker_badge_growth_tracker` | Sticker | 🟢 has asset | GrowthTracker |

### Profile / Account — `app/profile/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_profile_hero` | Sticker | 🟡 placeholder | ProfileHero card — avatar frame |
| `sticker_profile_avatar_placeholder` | Sticker | 🟡 placeholder | Default avatar (no photo) |
| `sticker_profile_journey_pill` | Sticker | 🟡 placeholder | MyJourneyPillGrid pill accent |
| `icon_profile_account` | Icon | 🟢 has asset | lucide User |
| `icon_profile_kids` | Icon | 🟢 has asset | lucide |
| `icon_profile_care_circle` | Icon | 🟡 placeholder | Care circle row glyph |
| `icon_profile_badges` | Icon | 🟢 has asset | lucide Award |
| `icon_profile_health_history` | Icon | 🟡 placeholder | Health history row |
| `icon_profile_memories` | Icon | 🟡 placeholder | Memories row |
| `icon_profile_emergency_insurance` | Icon | 🟡 placeholder | Insurance row |
| `icon_profile_privacy` | Icon | 🟢 has asset | lucide Lock |
| `icon_profile_settings` | Icon | 🟢 has asset | lucide Settings |
| `icon_profile_notifications` | Icon | 🟢 has asset | lucide Bell |
| `icon_profile_sign_out` | Icon | 🟢 has asset | lucide LogOut |

### Care circle — `app/connections.tsx`, `app/invite-caregiver.tsx`, `app/manage-caregivers.tsx`, `app/accept-invite.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_care_circle_hero` | Sticker | 🟢 has asset | CircleLinked |
| `sticker_care_circle_empty` | Sticker | 🟢 has asset | CircleDots (empty) |
| `sticker_care_circle_invite` | Sticker | 🔴 missing | Invite caregiver hero — open envelope |
| `icon_caregiver_role_partner` | Icon | 🟡 placeholder | Partner role chip |
| `icon_caregiver_role_nanny` | Icon | 🟡 placeholder | Nanny role chip |
| `icon_caregiver_role_family` | Icon | 🟡 placeholder | Family role chip |
| `icon_caregiver_role_doctor` | Icon | 🟡 placeholder | Doctor role chip |

### Channels / Community — `app/channel/`, `components/channels/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_channels_hero` | Sticker | 🟡 placeholder | Channels list hero — chat clouds |
| `sticker_channel_card_default` | Sticker | 🟡 placeholder | ChannelCard default cover |
| `sticker_channel_empty` | Sticker | 🔴 missing | Empty channel detail — first post invite |
| `sticker_channel_thread_empty` | Sticker | 🔴 missing | No replies yet |
| `icon_channel_create` | Icon | 🟢 has asset | lucide Plus |
| `icon_channel_upvote` | Icon | 🟢 has asset | lucide ArrowUp |
| `icon_channel_reply` | Icon | 🟢 has asset | lucide MessageCircle |

### Exchange / Garage — `app/(tabs)/exchange.tsx`, `app/garage/`, `app/exchange/`, `components/exchange/ListingCard.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_garage_hero` | Sticker | 🟡 placeholder | Garage tab hero — barn / open box |
| `sticker_garage_tag` | Sticker | 🟢 has asset | GarageTag |
| `sticker_garage_listing_sell` | Sticker | 🔴 missing | Sell-type chip |
| `sticker_garage_listing_trade` | Sticker | 🔴 missing | Trade-type chip |
| `sticker_garage_listing_donate` | Sticker | 🔴 missing | Donate-type chip |
| `sticker_garage_create_hero` | Sticker | 🔴 missing | Create listing screen hero |
| `sticker_garage_empty` | Sticker | 🔴 missing | No listings yet |
| `sticker_garage_share_card` | Sticker | 🔴 missing | Share-listing card background |

### Vault — shared/pregnancy — `app/(tabs)/vault.tsx`, `components/vault/`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_vault_hero` | Sticker | 🟡 placeholder | Vault tab hero — safe / folder |
| `sticker_vault_section_ultrasound` | Sticker | 🟡 placeholder | Pregnancy: ultrasound section |
| `sticker_vault_section_tests` | Sticker | 🟡 placeholder | Pregnancy: lab tests section |
| `sticker_vault_section_birth_plan` | Sticker | 🟡 placeholder | Pregnancy: birth plan section |
| `sticker_vault_emergency` | Sticker | 🟡 placeholder | EmergencyCard hero (shared kids+pregnancy) |
| `icon_vault_upload_doc` | Icon | 🟢 has asset | lucide Upload |
| `icon_vault_signed_url` | Icon | 🟢 has asset | lucide ExternalLink |

### Settings — `app/(tabs)/settings.tsx`, `app/profile/settings.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `icon_settings_theme` | Icon | 🟢 has asset | lucide Moon/Sun |
| `icon_settings_language` | Icon | 🟢 has asset | lucide Globe |
| `icon_settings_mode_switch` | Icon | 🟡 placeholder | Mode switch row glyph |
| `icon_settings_about` | Icon | 🟢 has asset | lucide Info |
| `icon_settings_help` | Icon | 🟢 has asset | lucide HelpCircle |

### AirTag setup — `app/airtag-setup.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_airtag_hero` | Sticker | 🔴 missing | AirTag setup hero — tag on stroller |
| `sticker_airtag_step_pair` | Sticker | 🔴 missing | Step 1 — pairing illustration |
| `sticker_airtag_step_attach` | Sticker | 🔴 missing | Step 2 — attaching illustration |
| `sticker_airtag_step_done` | Sticker | 🔴 missing | Success state |

### Mode switcher pill — `components/home/ModeSwitcher.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `icon_mode_trying` | Icon | 🟡 placeholder | Pink mode chip glyph |
| `icon_mode_pregnant` | Icon | 🟡 placeholder | Purple mode chip glyph |
| `icon_mode_parent` | Icon | 🟡 placeholder | Blue mode chip glyph |

### Shared decorative — `components/stickers/BrandStickers.tsx`

| Asset id | Type | Current | Purpose / vibe |
|----------|------|---------|----------------|
| `sticker_brand_burst` | Sticker | 🟢 has asset | Burst (sunburst) |
| `sticker_brand_blob` | Sticker | 🟢 has asset | Blob (organic squircle) |
| `sticker_brand_heart` | Sticker | 🟢 has asset | Heart |
| `sticker_brand_squishy` | Sticker | 🟢 has asset | Squishy rectangle |
| `sticker_brand_paper_tape` | Sticker | 🔴 missing | Washi tape strip — used to "tape" cards (collage feel) |
| `sticker_brand_paper_corner` | Sticker | 🔴 missing | Torn-paper corner accent |
| `sticker_brand_handdrawn_arrow` | Sticker | 🔴 missing | Hand-drawn arrow / scribble pointer |
| `sticker_brand_star_doodle` | Sticker | 🔴 missing | Hand-drawn star doodle for "new" / accent |
