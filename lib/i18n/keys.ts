/**
 * All translation keys used in the app.
 * Add new keys here — TypeScript will enforce that every language file implements them.
 */

export interface TranslationKeys {
  // ─── Common ────────────────────────────────────────────────────────────
  common_cancel: string
  common_save: string
  common_done: string
  common_delete: string
  common_edit: string
  common_close: string
  common_back: string
  common_next: string
  common_skip: string
  common_search: string
  common_loading: string
  common_retry: string
  common_confirm: string
  common_yes: string
  common_no: string
  common_ok: string
  common_error: string
  common_success: string
  common_seeAll: string
  common_today: string
  common_yesterday: string
  common_noData: string
  common_nDays: string
  common_kcal: string
  common_couldntLoad: string
  common_update: string
  common_at: string
  common_dotSeparator: string

  // ─── Tabs ──────────────────────────────────────────────────────────────
  tab_home: string
  tab_calendar: string
  tab_analytics: string
  tab_profile: string
  tab_library: string
  tab_vault: string

  // ─── Radial Menu ───────────────────────────────────────────────────────
  menu_grandmaTalk: string
  menu_insights: string
  menu_dailyRewards: string
  menu_garage: string
  menu_channels: string

  // ─── Journey Modes ─────────────────────────────────────────────────────
  mode_prePregnancy: string
  mode_pregnancy: string
  mode_kids: string
  mode_cycleTracking: string

  // ─── Home Screen ───────────────────────────────────────────────────────
  home_greeting: string
  home_goodMorning: string
  home_goodAfternoon: string
  home_goodEvening: string
  home_todaysPlan: string
  home_quickActions: string
  home_recentActivity: string
  home_noChildren: string
  home_addChild: string

  // ─── Calendar / Agenda ─────────────────────────────────────────────────
  agenda_title: string
  agenda_noEvents: string
  agenda_addEvent: string
  agenda_feeding: string
  agenda_sleep: string
  agenda_diaper: string
  agenda_medicine: string
  agenda_vaccine: string
  agenda_mood: string
  agenda_note: string
  agenda_activity: string
  agenda_milestone: string
  agenda_appointment: string

  // ─── Grandma Talk (AI Chat) ────────────────────────────────────────────
  chat_title: string
  chat_placeholder: string
  chat_thinking: string
  chat_errorRetry: string
  chat_clearHistory: string
  chat_clearConfirm: string

  // ─── Profile & Settings ────────────────────────────────────────────────
  profile_title: string
  profile_myProfile: string
  profile_behaviorProfile: string
  profile_careCircle: string
  profile_emergencyInsurance: string
  profile_badgeWallet: string
  profile_memories: string
  profile_healthHistory: string
  profile_notifications: string
  profile_unitsDisplay: string
  profile_subscription: string
  profile_accountSecurity: string
  profile_dataPrivacy: string
  profile_signOut: string
  profile_signOutConfirm: string
  profile_version: string

  // ─── Settings Screen ───────────────────────────────────────────────────
  settings_title: string
  settings_display: string
  settings_darkMode: string
  settings_units: string
  settings_temperature: string
  settings_weight: string
  settings_language: string
  settings_selectLanguage: string
  settings_account: string
  settings_deleteAccount: string
  settings_deleteConfirm: string
  settings_deleteContact: string
  settings_signOutTitle: string
  settings_signOutEverywhereHint: string

  // ─── Children ──────────────────────────────────────────────────────────
  children_title: string
  children_addChild: string
  children_editChild: string
  children_name: string
  children_dateOfBirth: string
  children_allergies: string
  children_bloodType: string
  children_pediatrician: string
  children_noChildren: string

  // ─── Care Circle ───────────────────────────────────────────────────────
  careCircle_title: string
  careCircle_invite: string
  careCircle_parent: string
  careCircle_nanny: string
  careCircle_family: string
  careCircle_doctor: string
  careCircle_pending: string
  careCircle_accepted: string
  careCircle_noMembers: string

  // ─── Vault ─────────────────────────────────────────────────────────────
  vault_title: string
  vault_emergencyCard: string
  vault_documents: string
  vault_vaccines: string
  vault_upload: string
  vault_noDocuments: string

  // ─── Insights / Analytics ──────────────────────────────────────────────
  insights_title: string
  insights_history: string
  insights_sleepTrend: string
  insights_feedingPattern: string
  insights_growthChart: string
  insights_moodOverview: string
  insights_noInsights: string

  // ─── Scan ──────────────────────────────────────────────────────────────
  scan_title: string
  scan_takePhoto: string
  scan_choosePhoto: string
  scan_analyzing: string
  scan_result: string
  scan_tryAgain: string

  // ─── Badges & Rewards ──────────────────────────────────────────────────
  badges_title: string
  badges_earned: string
  badges_locked: string
  badges_streak: string
  badges_dailyReward: string
  badges_claimReward: string
  badges_claimed: string
  badges_stripAllCount: string                    // "All {{total}} →"
  badges_stripEmpty: string

  // ─── Leaderboard ───────────────────────────────────────────────────────
  leaderboard_title: string
  leaderboard_thisWeek: string
  leaderboard_allTime: string
  leaderboard_yourRank: string
  leaderboard_points: string

  // ─── Notifications ─────────────────────────────────────────────────────
  notifications_title: string
  notifications_empty: string
  notifications_markAllRead: string
  notifications_vaccineReminder: string
  notifications_feedingTime: string
  notifications_milestone: string

  // ─── Onboarding ────────────────────────────────────────────────────────
  onboarding_welcome: string
  onboarding_chooseJourney: string
  onboarding_parentName: string
  onboarding_whatsYourName: string
  onboarding_dueDate: string
  onboarding_whenDue: string
  onboarding_babyName: string
  onboarding_whatsTheName: string
  onboarding_activities: string
  onboarding_selectActivities: string
  onboarding_getStarted: string
  onboarding_letsGo: string

  // ─── Auth ──────────────────────────────────────────────────────────────
  auth_signIn: string
  auth_signUp: string
  auth_email: string
  auth_password: string
  auth_forgotPassword: string
  auth_continueWithApple: string
  auth_continueWithGoogle: string
  auth_noAccount: string
  auth_hasAccount: string
  auth_termsPrefix: string                        // "By continuing, you agree to Grandma's "
  auth_termsOfSerenity: string
  auth_termsAnd: string
  auth_welcome: string
  auth_welcomeSubtitle: string

  // ─── Paywall ───────────────────────────────────────────────────────────
  paywall_title: string
  paywall_subtitle: string
  paywall_monthly: string
  paywall_yearly: string
  paywall_perMonth: string
  paywall_perYear: string
  paywall_subscribe: string
  paywall_restore: string
  paywall_features_unlimitedChat: string
  paywall_features_unlimitedScans: string
  paywall_features_insights: string
  paywall_features_vaccineReminders: string

  // ─── Cycle (Pre-Pregnancy) nudges ──────────────────────────────────────
  cycle_nudge_menstruation_headline: string
  cycle_nudge_menstruation_body: string
  cycle_nudge_follicular_headline: string
  cycle_nudge_follicular_body: string
  cycle_nudge_ovulation_headline: string
  cycle_nudge_ovulation_body: string
  cycle_nudge_luteal_headline: string
  cycle_nudge_luteal_body: string
  cycle_nudge_late_headline: string
  cycle_nudge_late_body: string
  cycle_nudge_follicular_lh_headline: string
  cycle_nudge_follicular_lh_body: string
  cycle_nudge_window_open_headline: string
  cycle_nudge_window_open_body: string
  cycle_nudge_ovulation_confirmed_headline: string
  cycle_nudge_ovulation_confirmed_body: string
  cycle_nudge_luteal_pms_headline: string
  cycle_nudge_luteal_pms_body: string
  cycle_nudge_label: string
  cycle_nudge_from: string
  cycle_nudge_read_more: string
  cycle_nudge_reflect_from?: string
  cycle_nudge_log_it?: string
  // Daily-rotation extras — optional so non-English locales fall back to en
  // at runtime until translated (see i18n wave plan).
  cycle_nudge_menstruation_iron_headline?: string
  cycle_nudge_menstruation_iron_body?: string
  cycle_nudge_menstruation_warmth_headline?: string
  cycle_nudge_menstruation_warmth_body?: string
  cycle_nudge_follicular_plan_headline?: string
  cycle_nudge_follicular_plan_body?: string
  cycle_nudge_follicular_hydrate_headline?: string
  cycle_nudge_follicular_hydrate_body?: string
  cycle_nudge_ovulation_timing_headline?: string
  cycle_nudge_ovulation_timing_body?: string
  cycle_nudge_luteal_sleep_headline?: string
  cycle_nudge_luteal_sleep_body?: string
  cycle_nudge_luteal_move_headline?: string
  cycle_nudge_luteal_move_body?: string
  cycle_nudge_fertility_follicular_headline?: string
  cycle_nudge_fertility_follicular_body?: string
  cycle_nudge_fertility_luteal_headline?: string
  cycle_nudge_fertility_luteal_body?: string
  cycle_nudge_fertility_menstruation_headline?: string
  cycle_nudge_fertility_menstruation_body?: string
  cycle_nudge_reflect_mood_headline?: string
  cycle_nudge_reflect_mood_body?: string
  cycle_nudge_reflect_symptom_headline?: string
  cycle_nudge_reflect_symptom_body?: string
  cycle_nudge_reflect_energy_headline?: string
  cycle_nudge_reflect_energy_body?: string
  cycle_nudge_nutrition_luteal_headline?: string
  cycle_nudge_nutrition_luteal_body?: string
  cycle_nudge_nutrition_ovulation_headline?: string
  cycle_nudge_nutrition_ovulation_body?: string
  cycle_nudge_edu_menstruation_headline?: string
  cycle_nudge_edu_menstruation_body?: string
  cycle_nudge_edu_follicular_headline?: string
  cycle_nudge_edu_follicular_body?: string
  cycle_nudge_edu_ovulation_headline?: string
  cycle_nudge_edu_ovulation_body?: string
  cycle_nudge_edu_luteal_headline?: string
  cycle_nudge_edu_luteal_body?: string
  cycle_pillar_fertility: string
  cycle_pillar_nutrition_prep: string
  cycle_pillar_emotional_readiness: string
  cycle_pillar_financial_planning: string
  cycle_pillar_partner_journey: string
  cycle_pillar_health_checkups: string
  cycle_conf_calendar: string
  cycle_conf_bbt_only: string
  cycle_conf_bbt_lh: string
  cycle_conf_shift_confirmed: string

  // ─── Pregnancy-specific ────────────────────────────────────────────────
  pregnancy_week: string
  pregnancy_dueDate: string
  pregnancy_babySize: string
  pregnancy_symptoms: string
  pregnancy_kicks: string
  pregnancy_contractions: string
  pregnancy_weightGain: string
  pregnancy_birthPlan: string

  // ─── Pregnancy home (Wave 1) ──────────────────────────────────────────
  pregnancy_todaysRoutines: string
  pregnancy_reminders: string
  pregnancy_birthGuideTitle: string
  pregnancy_birthGuideSubtitle: string
  pregnancy_grandmaCtaSubtitle: string
  pregnancy_waterChip: string                 // "{{count}}/8 glasses"
  pregnancy_weekDay: string                    // "Week {{week}} · {{weekday}}"
  pregnancy_routineDone: string                // "✓ {{label}}"
  // Inline log sheet titles
  pregnancy_logTitle_mood: string
  pregnancy_logTitle_symptom: string
  pregnancy_logTitle_appointment: string
  pregnancy_logTitle_kicks: string
  pregnancy_logTitle_vitamins: string
  pregnancy_logTitle_water: string
  pregnancy_logTitle_weight: string
  pregnancy_logTitle_sleep: string
  pregnancy_logTitle_exercise: string
  pregnancy_logTitle_kegel: string
  pregnancy_logTitle_nutrition: string

  // ─── TodaySummaryCard (Wave 1) ────────────────────────────────────────
  pregnancy_todayAtGlance: string
  pregnancy_summaryHint_balanced: string
  pregnancy_summaryHint_progress: string        // "{{done}}/{{total}} routines logged today."
  pregnancy_summaryHint_started: string         // "Started — {{remaining}} more to round out the day."
  pregnancy_summaryHint_empty: string

  // ─── TodayDashboardModal (Wave 1) ─────────────────────────────────────
  pregnancy_todayDashboard: string
  pregnancy_dashboard_notLoggedYet: string
  pregnancy_dashboard_howYouFelt: string
  pregnancy_dashboard_tapMoodAbove: string
  pregnancy_dashboard_perEight: string          // "/ 8 glasses"
  pregnancy_dashboard_restfulNight: string
  pregnancy_dashboard_couldUseMore: string
  pregnancy_dashboard_notLogged: string
  pregnancy_dashboard_kcal: string              // "~{{count}} kcal"
  pregnancy_dashboard_doneToday: string
  pregnancy_dashboard_sessionsToday: string
  pregnancy_dashboard_loggedToday: string

  // ─── RemindersSection (Wave 1) ────────────────────────────────────────
  pregnancy_reminder_weekTip: string            // "Week {{week}} tip"
  pregnancy_reminder_kickCountTitle: string
  pregnancy_reminder_kickCountSubtitle: string

  // ─── AffirmationRevealCard chrome (Wave 1) ────────────────────────────
  pregnancy_dailyAffirmation: string
  pregnancy_affirmationAwaits: string
  pregnancy_revealToday: string
  pregnancy_comeBackTomorrow: string
  pregnancy_share: string

  // ─── AppointmentDetailModal (Wave 1) ──────────────────────────────────
  pregnancy_appt_thisWeek: string
  pregnancy_appt_nextWeek: string
  pregnancy_appt_inWeeks: string                // "In {{count}} weeks"
  pregnancy_appt_overdue: string
  pregnancy_appt_whatToExpect: string
  pregnancy_appt_scheduleInAgenda: string
  pregnancy_appt_askGrandma: string
  pregnancy_appt_weekTiming: string                // "Week {{week}} · {{timing}}"
  pregnancy_appt_prep: string
  pregnancy_appt_questionsToAsk: string
  // ─── B7b: DevelopmentInsight.tsx residual strings ─────────────────────────
  devInsight_label: string
  devInsight_titleLine1: string
  devInsight_titleLine2: string
  devInsight_recordLullaby: string
  // ─── B7b: CycleDayDetail.tsx residual strings ─────────────────────────────
  cycleDayDetail_phaseDay: string                 // "{{phase}} · Day {{day}}"
  cycleDayDetail_loggedThisDay: string
  cycleDayDetail_emptyDay: string
  cycleDayDetail_addLog: string
  // ─── B7b: calendar/AppointmentDetailModal.tsx residual strings ────────────
  calAppt_addDetails: string
  // ─── B7b: FoodPhotoEntry.tsx residual strings ─────────────────────────────
  foodPhotoEntry_title: string
  foodPhotoEntry_ratingLabel: string
  // ─── B7b: (tabs)/_layout.tsx residual strings ─────────────────────────────
  tabFan_kicker: string
  tabFan_whereTo: string                          // "where to, "
  tabFan_pickCorner: string

  // ─── ContractionTimer (Wave 2) ────────────────────────────────────────
  preg_contractions_title: string
  preg_contractions_subtitle: string
  preg_contractions_inProgress: string
  preg_contractions_ready: string
  preg_contractions_ended: string
  preg_contractions_started: string
  preg_contractions_alert511: string
  preg_contractions_total: string
  preg_contractions_avgDuration: string
  preg_contractions_avgInterval: string
  preg_contractions_saving: string
  preg_contractions_saveSession: string
  preg_contractions_reset: string
  preg_contractions_thisSession: string
  preg_contractions_durationSeconds: string     // "{{seconds}}s duration"
  preg_contractions_intervalApart: string       // "{{minutes}}m {{seconds}}s apart"
  preg_contractions_rule511: string

  // ─── KickCounter (Wave 2) ─────────────────────────────────────────────
  preg_kicks_title: string
  preg_kicks_goal: string
  preg_kicks_startSession: string
  preg_kicks_kicksLabel: string
  preg_kicks_timeLabel: string
  preg_kicks_goalReached: string
  preg_kicks_tapForKick: string
  preg_kicks_endSession: string
  preg_kicks_recentSessions: string
  preg_kicks_countLabel: string                 // "{{count}} kicks"
  preg_kicks_info: string

  // ─── AppointmentList (Wave 2) ─────────────────────────────────────────
  preg_appts_addButton: string
  preg_appts_upcoming: string
  preg_appts_past: string
  preg_appts_emptyTitle: string
  preg_appts_emptyDesc: string
  preg_appts_modalTitle: string
  preg_appts_label_type: string
  preg_appts_label_title: string
  preg_appts_label_doctor: string
  preg_appts_label_notes: string
  preg_appts_placeholder_title: string
  preg_appts_placeholder_doctor: string
  preg_appts_placeholder_notes: string
  preg_appts_submitAdd: string
  preg_appts_type_checkup: string
  preg_appts_type_bloodwork: string
  preg_appts_type_ultrasound: string
  preg_appts_type_glucose: string
  preg_appts_type_fertility: string
  preg_appts_type_specialist: string
  preg_appts_type_other: string
  // ─── B7c: agenda/AppointmentList.tsx residual strings ──────────────────────
  preg_appts_doctorName: string                 // "Dr. {{name}}"
  // ─── B7c: agenda/CalendarView.tsx residual strings ─────────────────────────
  calendarView_noActivitiesDay: string

  // ─── PregnancyLogForms — Mood + Symptoms (Wave 2) ─────────────────────
  preg_form_mood_question: string
  preg_form_mood_notesPlaceholder: string
  preg_mood_excited: string
  preg_mood_happy: string
  preg_mood_okay: string
  preg_mood_anxious: string
  preg_mood_energetic: string
  preg_form_symptoms_question: string
  preg_form_symptoms_notesPlaceholder: string
  preg_symptom_nausea: string
  preg_symptom_fatigue: string
  preg_symptom_backPain: string
  preg_symptom_headache: string
  preg_symptom_swelling: string
  preg_symptom_heartburn: string
  preg_symptom_insomnia: string
  preg_symptom_cramps: string
  preg_symptom_moodSwings: string
  preg_symptom_cravings: string
  preg_symptom_braxtonHicks: string
  preg_symptom_shortBreath: string

  // ─── PregnancyLogForms — other forms (Wave 2) ─────────────────────────
  preg_form_appt_title: string
  preg_form_appt_typePlaceholder: string
  preg_form_appt_doctorPlaceholder: string
  preg_form_appt_notesPlaceholder: string
  preg_form_kick_title: string
  preg_form_kick_subtitle: string
  preg_form_kick_countLabel: string
  preg_form_kick_durationLabel: string
  preg_form_sleep_title: string
  preg_form_sleep_hoursLabel: string
  preg_form_sleep_qualityLabel: string
  preg_form_weight_title: string
  preg_form_weight_kgLabel: string
  preg_form_water_title: string
  preg_form_water_glassesLabel: string
  preg_form_exercise_title: string
  preg_form_exercise_typeLabel: string
  preg_form_exercise_minutesLabel: string
  preg_form_vitamins_title: string
  preg_form_vitamins_takenLabel: string
  preg_form_kegel_title: string
  preg_form_kegel_setsLabel: string
  preg_form_nutrition_title: string
  preg_form_nutrition_caloriesLabel: string
  preg_form_kick_tap: string
  preg_form_sleep_hoursSlept: string
  preg_form_sleep_qualityRange: string
  preg_form_exercise_minutesFieldLabel: string
  preg_form_nutrition_coverageLabel: string
  preg_form_kegel_setsCompletedLabel: string
  preg_form_water_glassesTodayLabel: string
  preg_form_vitamins_question: string
  preg_form_nesting_categoryLabel: string
  preg_form_nesting_alreadyDone: string
  preg_form_birthprep_dueByWeek: string
  preg_form_contraction_durationLabel: string
  preg_form_contraction_intervalLabel: string
  preg_form_weight_fieldLabel: string

  // ─── WeightTrendCard (Wave 3) ─────────────────────────────────────────
  preg_weight_sheetTitle: string
  preg_weight_kgPrePreg: string
  preg_weight_kgTotal: string
  preg_weight_kgPerWeek: string
  preg_weight_trendHeader: string                // "TREND · LAST {{count}} ENTRIES"
  preg_weight_emptyHelp: string
  preg_weight_iomBandLabel: string
  preg_weight_iomBandBody: string                // "By week {{week}}, a typical {{cat}} pregnancy gains {{low}}–{{high}} kg total."
  preg_weight_openInsights: string
  preg_weight_statusEmpty: string
  preg_weight_statusBelow: string                // "Below target — expected {{low}}–{{high}} kg by week {{week}}"
  preg_weight_statusAbove: string                // "Above target — expected {{low}}–{{high}} kg by week {{week}}"
  preg_weight_statusOnTrack: string              // "On track — {{gain}} kg of {{low}}–{{high}} kg"
  preg_weight_chartEmpty: string
  preg_weight_targetFooter: string               // "Target: {{low}}–{{high}} kg total · {{label}}"
  preg_weight_details: string
  preg_weight_labelStarting: string
  preg_weight_labelGained: string
  preg_weight_labelPace: string
  preg_weight_iomTargetFull: string
  preg_weight_recentEntries: string
  preg_weight_trendWeekLabel: string
  preg_weight_labelStart: string
  preg_weight_byWeekExpect: string
  preg_weight_hitARange: string

  // ─── PregnancyUserReminders (Wave 3) ──────────────────────────────────
  preg_reminders_addButton: string
  preg_reminders_inputPlaceholder: string
  preg_reminders_setDate: string
  preg_reminders_setTime: string
  preg_reminders_save: string
  preg_reminders_done: string                    // iOS picker confirm
  preg_reminders_dueOverdue: string              // "{{days}}d overdue{{timeSuffix}}"
  preg_reminders_dueToday: string                // "Due today{{timeSuffix}}"
  preg_reminders_dueOn: string                   // "Due {{date}}{{timeSuffix}}"

  // ─── PregnancyJourneyRing (Wave 3) ────────────────────────────────────
  preg_ring_statusHere: string
  preg_ring_statusCompleted: string
  preg_ring_statusUpcoming: string
  preg_ring_weekLabel: string
  preg_ring_gestureHint: string
  preg_ring_length: string
  preg_ring_weight: string
  preg_ring_thisWeek: string
  preg_ring_loggedThisWeek: string
  preg_ring_emptyCurrent: string
  preg_ring_emptyPast: string
  preg_ring_emptyFuture: string
  preg_ring_trimester1: string
  preg_ring_trimester2: string
  preg_ring_trimester3: string
  preg_ring_log_weight: string
  preg_ring_log_mood: string
  preg_ring_log_kicks: string
  preg_ring_log_symptom: string
  preg_ring_log_sleep: string
  preg_ring_log_appointment: string
  preg_ring_log_exercise: string
  preg_ring_log_water: string
  preg_ring_log_vitamins: string
  preg_ring_log_contraction: string
  preg_ring_log_nutrition: string
  preg_ring_log_kegel: string
  preg_ring_log_nesting: string
  preg_ring_log_birthPrep: string
  preg_ring_log_examResult: string

  // ─── PregnancyAnalytics (Wave 3) ──────────────────────────────────────
  preg_analytics_pillar_wellbeing: string
  preg_analytics_pillar_weight: string
  preg_analytics_pillar_kicks: string
  preg_analytics_pillar_sleep: string
  preg_analytics_pillar_mood: string
  preg_analytics_pillar_symptoms: string
  preg_analytics_pillar_hydration: string
  preg_analytics_pillar_nutrition: string
  preg_analytics_pillar_exercise: string
  preg_analytics_pillar_contractions: string
  preg_analytics_pillar_birthReadiness: string
  preg_analytics_card_fivePillars: string
  preg_analytics_card_weightOverTime: string
  preg_analytics_card_byWeek: string
  preg_analytics_card_recentKicks: string
  preg_analytics_card_sleepHoursPerNight: string
  preg_analytics_card_sleepDebt: string
  preg_analytics_card_moodMix: string
  preg_analytics_card_distribution: string
  preg_analytics_card_breakdown: string
  preg_analytics_card_worthACall: string
  preg_analytics_card_today: string
  preg_analytics_card_hydrationWhy: string
  preg_analytics_card_smartSip: string
  preg_analytics_card_dailyNutrient: string
  preg_analytics_card_trimesterFocus: string
  preg_analytics_card_minutesPerSession: string
  preg_analytics_card_safeMovement: string
  preg_analytics_card_recentContractions: string
  preg_analytics_card_whenToCall: string
  preg_analytics_card_suggestedNext: string
  preg_analytics_card_scoreScale: string
  preg_analytics_card_howScored: string
  preg_analytics_pill_onTrack: string
  preg_analytics_pill_almostThere: string
  preg_analytics_pill_belowTarget: string
  preg_analytics_stat_streak: string
  preg_analytics_stat_bestDay: string
  preg_analytics_stat_volume: string

  // ─── BirthGuideModal (Wave 4) ─────────────────────────────────────────
  preg_birthGuide_title: string
  preg_birthGuide_subtitle: string
  preg_birthGuide_alsoIn: string

  // ─── BirthDetailModal (Wave 4) ────────────────────────────────────────
  preg_birthDetail_askGrandma: string
  preg_birthDetail_sources: string

  // ─── WeekDetailModal (Wave 4) ─────────────────────────────────────────
  preg_weekDetail_heroLabel: string                // "WEEK {{week}} · {{trimester}} TRIMESTER"
  preg_weekDetail_babyDevelopment: string
  preg_weekDetail_commonSymptoms: string
  preg_weekDetail_whatToPrepare: string
  preg_weekDetail_prep_whyNow: string
  preg_weekDetail_prep_howToDoIt: string
  preg_weekDetail_prep_watchFor: string

  // ─── Birth Plan screen (Wave 4) ───────────────────────────────────────
  preg_birthPlan_title: string
  preg_birthPlan_italicSubtitle: string
  preg_birthPlan_typesOfBirth: string
  preg_birthPlan_hospitalBagHeader: string          // "HOSPITAL BAG · {{done}}/{{total}}"
  preg_birthPlan_a11y_packed: string                // accessibilityLabel suffix "packed" — keep simple
  preg_birthPlan_a11y_notPacked: string

  // ─── Onboarding due-date (Wave 4) ─────────────────────────────────────
  preg_onboard_dueDate_headline1: string
  preg_onboard_dueDate_headline2: string             // "your bundle."
  preg_onboard_dueDate_subtitle: string
  preg_onboard_dueDate_tabDue: string
  preg_onboard_dueDate_tabLmp: string
  preg_onboard_dueDate_labelDue: string
  preg_onboard_dueDate_labelLmp: string
  preg_onboard_dueDate_placeholder: string
  preg_onboard_dueDate_weekOfFortyt: string          // "Week {{week}} of 40"
  preg_onboard_dueDate_continue: string

  // ─── Onboarding baby-name (Wave 4) ────────────────────────────────────
  preg_onboard_babyName_titleAsk1: string            // "Have you"
  preg_onboard_babyName_titleAsk2: string            // "chosen a name?"
  preg_onboard_babyName_titleCare1: string           // "What's your"
  preg_onboard_babyName_titleCare2: string           // "little one called?"
  preg_onboard_babyName_subtitleAsk: string
  preg_onboard_babyName_subtitleCare: string
  preg_onboard_babyName_labelBaby: string            // "BABY'S NAME (OPTIONAL)"
  preg_onboard_babyName_labelChild: string           // "CHILD'S NAME"
  preg_onboard_babyName_placeholderBaby: string
  preg_onboard_babyName_placeholderChild: string
  preg_onboard_babyName_skipLink: string

  // ─── Onboarding pregnancy step questions (Wave 4) ─────────────────────
  preg_onboard_step_dueDate: string
  preg_onboard_step_firstPregnancy: string
  preg_onboard_step_mood: string
  preg_onboard_step_birthPlace: string
  preg_onboard_step_careProvider: string
  preg_onboard_step_conditions: string
  preg_onboard_step_partner: string
  preg_onboard_partnerNamePlaceholder: string
  preg_onboard_partnerHint: string
  preg_onboard_careProviderPlaceholder: string
  preg_onboard_conditionsPlaceholder: string
  preg_onboard_birth_hospital: string
  preg_onboard_birth_center: string
  preg_onboard_birth_home: string
  preg_onboard_birth_undecided: string
  preg_onboard_mood_excited: string
  preg_onboard_mood_happy: string
  preg_onboard_mood_calm: string
  preg_onboard_mood_anxious: string
  preg_onboard_mood_tired: string
  preg_onboard_mood_nauseous: string
  preg_onboard_yes: string
  preg_onboard_no: string
  preg_onboard_completionTitle: string
  preg_onboard_completionBody: string
  preg_onboard_completionBadge: string               // "Currently at week {{week}} — {{days}} days to go!"
  preg_onboard_completionCta: string
  preg_onboard_completionCountdownLabel: string
  preg_onboard_completionCurrentlyWeek: string       // "Currently at week {{week}}"
  preg_onboard_errorTitle: string
  preg_onboard_errorBehavior: string                 // "Saving your pregnancy info failed: {{message}}. Please try again."
  preg_onboard_errorDueDate: string                  // "Saving your due date failed: {{message}}. Please try again."

  // ─── Profile / pregnancy (Wave 4) ─────────────────────────────────────
  preg_profile_dueDate: string
  preg_profile_currentWeek: string
  preg_profile_trimester: string
  preg_profile_daysToGo: string
  preg_profile_conceptionType: string
  preg_profile_bloodType: string
  preg_profile_rhFactor: string
  preg_profile_height: string
  preg_profile_currentWeight: string
  preg_profile_weightGained: string
  preg_profile_birthLocation: string
  preg_profile_painManagement: string
  preg_profile_atmosphere: string
  preg_profile_cordCutting: string
  preg_profile_feedingPlan: string

  // ─── Pre-pregnancy-specific ────────────────────────────────────────────
  prepreg_cycleDay: string
  prepreg_period: string
  prepreg_ovulation: string
  prepreg_fertile: string
  prepreg_luteal: string
  prepreg_follicular: string
  prepreg_basal: string
  prepreg_symptoms: string

  // ─── Kids-specific ─────────────────────────────────────────────────────
  kids_sleepCircle: string
  kids_moodAnalysis: string
  kids_calories: string
  kids_growthLeaps: string
  kids_location: string
  kids_nannyUpdates: string
  kids_milkTracker: string

  // ─── Kids Home (Wave B1) ──────────────────────────────────────────────
  kids_home_age_newborn: string
  kids_home_range_7days: string
  kids_home_range_30days: string
  kids_home_range_custom: string
  kids_home_vaccine_future_date_title: string
  kids_home_vaccine_future_date_msg: string
  kids_home_health_task_vitamins: string
  kids_home_health_task_vaccine_check: string
  kids_home_health_task_growth_log: string
  kids_home_empty_state_title: string
  kids_home_empty_state_msg: string
  kids_home_empty_state_cta: string
  kids_home_all_kids_title: string
  kids_home_custom_range_title: string
  kids_home_range_start: string
  kids_home_range_end: string
  kids_home_range_apply: string
  kids_home_set_goals_btn: string
  kids_home_set_goals_hint: string
  kids_home_section_health_care: string
  kids_home_section_reminders: string
  kids_home_reminders_view_all: string
  kids_home_reminders_add_btn: string
  kids_home_reminder_add_header: string
  kids_home_reminder_placeholder: string
  kids_home_reminder_set_date: string
  kids_home_reminder_set_time: string
  kids_home_reminder_child_all: string
  kids_home_picker_pick_date: string
  kids_home_picker_confirm_date: string
  kids_home_picker_set_time_header: string
  kids_home_picker_clear_time: string
  kids_home_picker_confirm_time: string
  kids_home_reminders_empty_title: string
  kids_home_reminders_empty_hint: string
  kids_home_grandma_cta_title: string
  kids_home_grandma_cta_desc1: string
  kids_home_grandma_cta_desc2: string
  kids_home_rewards_title: string
  kids_home_rewards_desc1: string
  kids_home_rewards_desc2: string
  kids_home_log_sleep_title: string
  kids_home_log_mood_title: string
  kids_home_log_feeding_title: string
  kids_home_log_activity_title: string
  kids_home_tile_last_sleep: string
  kids_home_tile_tap_to_log: string
  kids_home_tile_mood: string
  kids_home_tile_mood_empty: string
  kids_home_tile_feedings: string
  kids_home_tile_calories: string
  kids_home_tile_activities: string
  kids_home_tile_activity_empty_sub: string
  kids_home_tile_no_goal: string
  kids_home_mood_mostly: string
  kids_home_mood_tap_details: string
  kids_home_mood_empty_title: string
  kids_home_mood_empty_hint: string
  kids_home_nutrition_no_feeds: string
  kids_home_nutrition_tap_breakdown: string
  kids_home_vaccine_up_to_date: string
  kids_home_vaccine_overdue: string
  kids_home_vaccine_next: string
  kids_home_vaccine_last: string
  kids_home_vaccine_none_logged: string
  kids_home_card_diapers: string
  kids_home_diaper_pee: string
  kids_home_diaper_poop: string
  kids_home_diaper_mixed: string
  kids_home_range_past_7days: string
  kids_home_range_past_30days: string
  kids_home_diaper_tracker_title: string
  kids_home_diaper_trend_label: string
  kids_home_diaper_stool_color: string
  kids_home_mood_trends_title: string
  kids_home_mood_modal_empty_title: string
  kids_home_mood_modal_empty_hint: string
  kids_home_activity_breakdown_title: string
  kids_home_activity_empty: string
  kids_home_activity_total_suffix: string
  kids_home_vaccine_info_protects: string
  kids_home_vaccine_info_why: string
  kids_home_vaccine_info_side_effects: string
  kids_home_vaccine_info_disclaimer: string
  kids_home_vaccine_schedule_empty: string
  kids_home_vaccine_mark_given: string
  kids_home_vaccine_set_date: string
  kids_home_vaccine_no_info: string
  kids_home_sleep_modal_total_range: string
  kids_home_sleep_modal_hours_unit: string
  kids_home_sleep_modal_past7: string
  kids_home_sleep_modal_chart_note: string
  kids_home_sleep_modal_quality_read: string
  kids_home_sleep_below_target: string
  kids_home_health_overview_title: string
  kids_home_health_sleep_quality_label: string
  kids_home_health_weight_for_age: string
  kids_home_health_height_for_age: string
  kids_home_health_latest_growth: string
  kids_home_health_weight_label: string
  kids_home_health_height_label: string
  kids_home_health_activity_overview: string
  kids_home_health_activities_label: string
  kids_home_health_feedings_label: string
  kids_home_health_feeds_label: string
  kids_home_health_calories_label: string
  kids_home_health_total_volume: string
  kids_home_health_allergies: string
  kids_home_health_add_allergy: string
  kids_home_health_add_btn_short: string
  kids_home_health_medications: string
  kids_home_health_medication_active: string
  kids_home_health_vaccine_schedule: string
  kids_home_health_view_history: string
  kids_home_breastfeeding_insights_title: string
  kids_home_breastfeeding_side_balance: string
  kids_home_breastfeeding_time_of_day: string
  kids_home_breastfeeding_avg_session: string
  kids_home_breastfeeding_feeds_per_day: string
  kids_home_breastfeeding_min_per_day: string
  kids_home_feeding_modal_title: string
  kids_home_nutrition_modal_title: string
  kids_home_feeding_modal_total_suffix: string
  kids_home_feeding_modal_breast: string
  kids_home_feeding_modal_bottle: string
  kids_home_feeding_modal_total_vol: string
  kids_home_feeding_modal_no_detail_title: string
  kids_home_feeding_modal_no_detail_hint: string
  kids_home_feeding_modal_breast_vs_bottle: string
  kids_home_feeding_modal_solids_calories: string
  kids_home_feeding_modal_calories: string
  kids_home_feeding_modal_breakdown_cat: string
  kids_home_activities_modal_title: string
  kids_home_activities_modal_active_days: string
  kids_home_activities_modal_top: string
  kids_home_activities_modal_types: string
  kids_home_activities_modal_ranking: string
  kids_home_activities_modal_no_entries: string
  kids_home_goals_set_title: string
  kids_home_goals_suggested_banner: string
  kids_home_goals_use_suggested: string
  kids_home_goals_save: string
  kids_home_goals_not_saved_title: string
  kids_home_reminder_mark_not_done: string
  kids_home_reminder_mark_done: string
  kids_home_reminders_modal_tab_active: string
  kids_home_reminders_modal_done_week: string
  kids_home_reminders_modal_completion: string
  kids_home_reminders_modal_filter_all: string
  kids_home_reminders_modal_tab_active_count: string
  kids_home_reminders_modal_tab_archived_count: string
  kids_home_reminders_modal_no_active: string
  kids_home_reminders_modal_no_archived: string
  kids_home_leaps_all_complete: string
  kids_home_leaps_all_complete_desc: string
  kids_home_leaps_status_now: string
  kids_home_leaps_status_all_done: string
  kids_home_leaps_detail_title: string
  kids_home_leaps_all_complete_short: string
  kids_home_leaps_path_title: string
  kids_home_leaps_intensity_label: string
  kids_home_leaps_sheet_typical_age: string
  kids_home_leaps_sheet_duration: string
  kids_home_leaps_sheet_phases_title: string
  kids_home_leaps_phase_happening_now: string
  kids_home_leaps_signs_active: string
  kids_home_leaps_signs_watch: string
  kids_home_leaps_skills_gained: string
  kids_home_leaps_skills_emerging: string
  kids_home_leaps_skills_upcoming: string
  kids_home_leaps_activities_title: string
  kids_home_leaps_completed: string

  // ─── Kids Analytics (Wave B1) ─────────────────────────────────────────
  kids_analytics_loading: string
  kids_analytics_error_load: string
  kids_analytics_tap_retry: string
  kids_analytics_thriving_breakdown: string
  kids_analytics_no_data_title: string
  kids_analytics_no_data_hint: string
  kids_analytics_chart_eat_quality: string
  kids_analytics_chart_meals_per_day: string
  kids_analytics_chart_top_foods: string
  kids_analytics_chart_sleep_daily: string
  kids_analytics_chart_sleep_quality: string
  kids_analytics_chart_mood_dist: string
  kids_analytics_chart_mood_daily: string
  kids_analytics_chart_health_events: string
  kids_analytics_chart_weight: string
  kids_analytics_chart_height: string
  kids_analytics_score_guide_title: string
  kids_analytics_score_weighted_avg: string
  kids_analytics_score_scale_label: string
  kids_analytics_pillar_scoring_label: string
  kids_analytics_ask_grandma_tip: string
  kids_analytics_child_wellness_label: string
  kids_analytics_caption_thriving: string
  kids_analytics_caption_on_track: string
  kids_analytics_caption_developing: string
  kids_analytics_caption_needs_care: string
  kids_analytics_tap_info_hint: string
  kids_analytics_grandma_says_label: string
  kids_analytics_discuss_btn: string
  kids_analytics_insight_strength_label: string
  kids_analytics_insight_concern_label: string
  kids_analytics_insight_trend_label: string
  kids_analytics_insight_next_steps_label: string
  kids_analytics_insight_no_highlights: string
  kids_analytics_confirm_share_title: string
  kids_analytics_confirm_share_yes: string
  kids_analytics_confirm_share_no: string
  kids_analytics_health_tips_label: string
  kids_analytics_tip_tap_details: string
  kids_analytics_ask_grandma_full_ctx: string
  kids_analytics_routine_compliance_title: string
  kids_analytics_routine_adherence: string
  kids_analytics_routine_total_skips: string
  kids_analytics_routine_skips_per_day: string
  kids_analytics_routine_most_skipped: string
  kids_analytics_routine_no_skips: string
  kids_analytics_pillar_tap_details: string
  kids_analytics_pillar_no_data: string
  kids_analytics_activity_guide_title: string
  kids_analytics_score_how_works: string
  kids_analytics_chart_feeds_per_day: string
  kids_analytics_nutrition_breast_bottle: string
  kids_analytics_nutrition_breast_sessions: string
  kids_analytics_chart_sleep_quality_breakdown: string
  kids_analytics_chart_mood_dist_week: string
  kids_analytics_health_recent_events: string
  kids_analytics_chart_health_events_week: string
  kids_analytics_vaccine_tracker_title: string
  kids_analytics_vaccine_logged_count: string
  kids_analytics_chart_weight_time: string
  kids_analytics_chart_height_time: string
  kids_analytics_growth_need_more: string
  kids_analytics_chart_activity_sessions: string
  kids_analytics_activity_rec_split: string
  kids_analytics_empty_nutrition: string
  kids_analytics_empty_sleep: string
  kids_analytics_empty_mood: string
  kids_analytics_empty_health: string
  kids_analytics_empty_growth: string
  kids_analytics_empty_activity: string
  kids_analytics_legend_ate_well: string
  kids_analytics_legend_a_little: string
  kids_analytics_legend_didnt_eat: string
  kids_analytics_sleep_quality_great: string
  kids_analytics_sleep_quality_good: string
  kids_analytics_sleep_quality_restless: string
  kids_analytics_sleep_quality_poor: string
  kids_analytics_event_temperature: string
  kids_analytics_event_medicine: string
  kids_analytics_event_vaccine: string
  kids_analytics_event_note: string
  kids_analytics_score_child_label: string
  kids_analytics_insight_overall_week: string
  kids_analytics_pillar_no_data_hint: string
  kids_analytics_no_data_short: string

  // ─── Pillars ───────────────────────────────────────────────────────────
  pillar_title: string
  pillar_tips: string
  pillar_askGrandma: string

  // ─── Exchange / Garage ─────────────────────────────────────────────────
  exchange_title: string
  exchange_sell: string
  exchange_trade: string
  exchange_donate: string
  exchange_createListing: string
  exchange_noListings: string

  // ─── Channels ──────────────────────────────────────────────────────────
  channels_title: string
  channels_create: string
  channels_join: string
  channels_noChannels: string
  channels_members: string
  channels_threads: string

  // ─── Time & Date ───────────────────────────────────────────────────────
  time_justNow: string
  time_minutesAgo: string
  time_hoursAgo: string
  time_daysAgo: string
  time_weeksAgo: string

  // ─── Errors ────────────────────────────────────────────────────────────
  error_network: string
  error_generic: string
  error_unauthorized: string
  error_notFound: string
  error_tryAgain: string

  // ─── Kids Log Forms (Wave B2) ───────────────────────────────────────────
  kids_logForm_selectChild: string
  kids_logForm_alreadyRoutine: string
  kids_logForm_saveAsRoutine: string
  kids_logForm_labelFeeding: string
  kids_logForm_labelSleep: string
  kids_logForm_labelHealth: string
  kids_logForm_labelMood: string
  kids_logForm_labelMemory: string
  kids_logForm_labelActivity: string
  kids_logForm_labelDiaper: string
  kids_logForm_labelWakeUp: string
  kids_logForm_mealBreakfast: string
  kids_logForm_mealAmSnack: string
  kids_logForm_mealLunch: string
  kids_logForm_mealPmSnack: string
  kids_logForm_mealDinner: string
  kids_logForm_mealNight: string
  kids_logForm_ateWell: string
  kids_logForm_ateLittle: string
  kids_logForm_didNotEat: string
  kids_logForm_healthTemp: string
  kids_logForm_healthVaccine: string
  kids_logForm_healthMedicine: string
  kids_logForm_healthDoctor: string
  kids_logForm_healthInjury: string
  kids_logForm_healthOther: string
  kids_logForm_moodHappy: string
  kids_logForm_moodCalm: string
  kids_logForm_moodFussy: string
  kids_logForm_moodCranky: string
  kids_logForm_moodEnergetic: string
  kids_logForm_activityClass: string
  kids_logForm_activitySchool: string
  kids_logForm_activityStudy: string
  kids_logForm_activityReading: string
  kids_logForm_activitySport: string
  kids_logForm_activitySwimming: string
  kids_logForm_activityDance: string
  kids_logForm_activityMusic: string
  kids_logForm_activityArt: string
  kids_logForm_activityPlayground: string
  kids_logForm_activityWalk: string
  kids_logForm_activityTherapy: string
  kids_logForm_activityPlaydate: string
  kids_logForm_diaperPee: string
  kids_logForm_diaperPoop: string
  kids_logForm_diaperBoth: string
  kids_logForm_diaperColorYellow: string
  kids_logForm_diaperColorGreen: string
  kids_logForm_diaperColorBrown: string
  kids_logForm_diaperColorBlack: string
  kids_logForm_diaperColorOrange: string
  kids_logForm_diaperColorRed: string
  kids_logForm_diaperConsistLiquid: string
  kids_logForm_diaperConsistSoft: string
  kids_logForm_diaperConsistNormal: string
  kids_logForm_diaperConsistHard: string
  kids_logForm_sleepQualityGreat: string
  kids_logForm_sleepQualityGood: string
  kids_logForm_sleepQualityRestless: string
  kids_logForm_sleepQualityPoor: string
  kids_logForm_placeholderFood: string
  kids_logForm_placeholderAddFood: string
  kids_logForm_placeholderNotes: string
  kids_logForm_placeholderDuration: string
  kids_logForm_placeholderAmount: string
  kids_logForm_placeholderCaption: string
  kids_logForm_placeholderWhatHappened: string
  kids_logForm_placeholderActivityName: string
  kids_logForm_placeholderTemp: string
  kids_logForm_placeholderDetails: string
  kids_logForm_placeholderNewFood: string
  kids_logForm_placeholderAllergyFood: string
  kids_logForm_placeholderAllergyReaction: string
  kids_logForm_placeholderRoutineName: string
  kids_logForm_placeholderRoutineNameEdit: string
  kids_logForm_scanPlate: string
  kids_logForm_readingPlate: string
  kids_logForm_unknownFood: string
  kids_logForm_skip: string
  kids_logForm_newFood: string
  kids_logForm_reaction: string
  kids_logForm_whatNewFood: string
  kids_logForm_reactionDetails: string
  kids_logForm_tapToStart: string
  kids_logForm_switchSide: string
  kids_logForm_alertToSwitch: string
  kids_logForm_orLogManually: string
  kids_logForm_left: string
  kids_logForm_right: string
  kids_logForm_bothSides: string
  kids_logForm_leftSide: string
  kids_logForm_rightSide: string
  kids_logForm_sleepSession: string
  kids_logForm_duration: string
  kids_logForm_color: string
  kids_logForm_consistency: string
  kids_logForm_start: string
  kids_logForm_end: string
  kids_logForm_time: string
  kids_logForm_wakeUp: string
  kids_logForm_totalSleep: string
  kids_logForm_noBedtimeFound: string
  kids_logForm_logBedtimeFirst: string
  kids_logForm_skipThisTime: string
  kids_logForm_alertPermNeeded: string
  kids_logForm_alertCameraAccess: string
  kids_logForm_alertCameraUnavail: string
  kids_logForm_alertCameraUnavailMsg: string
  kids_logForm_alertScanPlate: string
  kids_logForm_alertError: string
  kids_logForm_alertCouldNotOpenLibrary: string
  kids_logForm_alertCouldNotDelete: string
  kids_logForm_addPhoto: string
  kids_logForm_alertPickChild: string
  kids_logForm_alertNoFoodDetected: string
  kids_logForm_alertGrandmaNoticed: string
  kids_logForm_alertCouldNotReadPhoto: string
  kids_logForm_alertAllergyWarning: string
  kids_logForm_alertAllergyWarnings: string
  kids_logForm_alertLogAnyway: string
  kids_logForm_alertPhotosPartialUpload: string
  kids_logForm_alertPhotosFailedAll: string
  kids_logForm_alertTakePhoto: string
  kids_logForm_alertFromLibrary: string
  kids_logForm_kcalEstimated: string
  kids_logForm_notFoundInDb: string
  kids_logForm_alternating: string
  kids_logForm_switchAlert: string
  kids_logForm_labelNext: string
  kids_logForm_addRoutine: string
  kids_logForm_newRoutine: string
  kids_logForm_routines: string
  kids_logForm_recurringActivities: string
  kids_logForm_activeRoutines: string
  kids_logForm_editRoutine: string
  kids_logForm_update: string
  kids_logForm_deleteRoutine: string
  kids_logForm_cancel: string
  kids_logForm_delete: string
  kids_logForm_anytime: string
  kids_logForm_daily: string

  // ─── Kids Calendar (Wave B2) ────────────────────────────────────────────
  kids_calendar_logActivity: string
  kids_calendar_manageRoutines: string
  kids_calendar_labelFeeding: string
  kids_calendar_labelFood: string
  kids_calendar_labelSleep: string
  kids_calendar_labelWakeUp: string
  kids_calendar_labelHealth: string
  kids_calendar_labelTemperature: string
  kids_calendar_labelMedicine: string
  kids_calendar_labelVaccine: string
  kids_calendar_labelMood: string
  kids_calendar_labelMemory: string
  kids_calendar_labelPhoto: string
  kids_calendar_labelDiaper: string
  kids_calendar_labelGrowth: string
  kids_calendar_labelMilestone: string
  kids_calendar_labelActivity: string
  kids_calendar_labelNote: string
  kids_calendar_labelSkipped: string
  kids_calendar_labelExam: string
  kids_calendar_tomorrow: string
  kids_calendar_allKids: string
  kids_calendar_pickAKid: string
  kids_calendar_tabTimeline: string
  kids_calendar_tabJourney: string
  kids_calendar_tabVisits: string
  kids_calendar_nothingPlanned: string
  kids_calendar_tapToLog: string
  kids_calendar_tapToLogRoutine: string
  kids_calendar_addChildToSeeJourney: string
  kids_calendar_noVisitsYet: string
  kids_calendar_visitHint: string
  kids_calendar_addVisit: string
  kids_calendar_visits: string
  kids_calendar_nothingSummary: string
  kids_calendar_logSheet_feeding: string
  kids_calendar_logSheet_sleep: string
  kids_calendar_logSheet_wakeUp: string
  kids_calendar_logSheet_health: string
  kids_calendar_logSheet_mood: string
  kids_calendar_logSheet_activity: string
  kids_calendar_logSheet_memory: string
  kids_calendar_logSheet_diaper: string
  kids_calendar_logSheet_editDiaper: string
  kids_calendar_logSheet_exam: string
  kids_calendar_logSheet_editEntry: string
  kids_calendar_alertPickChild: string
  kids_calendar_alertPickChildMsg: string
  kids_calendar_alertCouldNotDelete: string
  kids_calendar_alertCouldNotUpdate: string
  kids_calendar_detail_loggedBy: string
  kids_calendar_detail_nothing: string
  kids_calendar_detail_details: string
  kids_calendar_detail_notes: string
  kids_calendar_detail_photos: string
  kids_calendar_detail_edit: string
  kids_calendar_detail_delete: string
  kids_calendar_detail_detailsPlaceholder: string
  kids_calendar_detail_notesPlaceholder: string
  kids_calendar_detail_whatTheyAte: string
  kids_calendar_detail_estimatedCals: string
  kids_calendar_detail_newFoodIntro: string
  kids_calendar_detail_reactionNoted: string
  kids_calendar_detail_sleepLogged: string
  kids_calendar_detail_sleepSession: string
  kids_calendar_detail_activity: string
  kids_calendar_detail_diaperChange: string
  kids_calendar_detail_todaysMood: string
  kids_calendar_detail_breastfeeding: string
  kids_calendar_detail_bottleFeeding: string
  kids_calendar_detail_notes2: string
  kids_calendar_detail_minutesUnit: string
  kids_calendar_detail_mlUnit: string
  kids_calendar_unlogConfirm: string
  kids_calendar_unlogBtn: string
  kids_calendar_congrats_title: string
  kids_calendar_congrats_btn: string
  kids_calendar_congrats_activities: string
  kids_calendar_congrats_routines: string
  kids_calendar_congrats_kcal: string
  kids_calendar_selected: string
  kids_calendar_deleteRoutineConfirm: string
  kids_calendar_deleteRoutineConfirmMsg: string
  kids_calendar_routineSkipToday: string
  kids_calendar_routineDeleteAll: string
  kids_calendar_routineWhatToDo: string
  kids_calendar_routineDeleteConfirmTitle: string
  kids_calendar_recurringLabel: string
  kids_calendar_moreKids: string
  kids_calendar_alertCouldNotRemove: string
  kids_calendar_visitsStats: string
  kids_calendar_nKids: string
  kids_calendar_routines: string
  kids_calendar_routinesSubtitle: string
  kids_calendar_newRoutine: string
  kids_calendar_addRoutine: string
  kids_calendar_editRoutine: string
  kids_calendar_congrats_allLogged: string
  kids_calendar_detail_colorLabel: string

  // ─── Kids Nanny Notes (Wave B2) ─────────────────────────────────────────
  kids_nannyNotes_topicFood: string
  kids_nannyNotes_topicVaccine: string
  kids_nannyNotes_topicActivity: string
  kids_nannyNotes_topicHealth: string
  kids_nannyNotes_topicReminder: string
  kids_nannyNotes_topicGeneral: string
  kids_nannyNotes_addNote: string
  kids_nannyNotes_emptyTitle: string
  kids_nannyNotes_newNote: string
  kids_nannyNotes_subtitle: string
  kids_nannyNotes_topicLabel: string
  kids_nannyNotes_noteLabel: string
  kids_nannyNotes_placeholder: string
  // ─── B7c: agenda/NannyNotesPanel.tsx residual strings ──────────────────────
  kids_nannyNotes_authorRole: string             // "{{author}} · {{role}}"

  // ─── Kids Food Dashboard (Wave B2) ──────────────────────────────────────
  kids_foodDash_mealBreakfast: string
  kids_foodDash_mealLunch: string
  kids_foodDash_mealDinner: string
  kids_foodDash_mealSnack: string
  kids_foodDash_todaysMeals: string
  kids_foodDash_noMealsToday: string
  kids_foodDash_photoAI: string
  kids_foodDash_gallery: string
  kids_foodDash_manual: string
  kids_foodDash_logMeal: string
  // ─── B7c: agenda/FoodDashboard.tsx residual strings ────────────────────────
  kids_foodDash_actionDesc: string
  kids_foodDash_emptyDesc: string

  // ─── Kids Nanny Feed (Wave B2) ───────────────────────────────────────────
  kids_nannyFeed_title: string
  kids_nannyFeed_viewHistory: string
  kids_nannyFeed_emptyText: string
  kids_nannyFeed_emptySubtext: string

  // ─── Kids Journey Ring (Wave B2) ─────────────────────────────────────────
  kids_journeyRing_growthLeap: string
  kids_journeyRing_statusNow: string
  kids_journeyRing_statusDone: string
  kids_journeyRing_statusUpcoming: string
  kids_journeyRing_tapForGuide: string
  kids_journeyRing_allLeaps: string
  kids_journeyRing_whatsHappening: string
  kids_journeyRing_threePhases: string
  kids_journeyRing_signsYouMayNotice: string
  kids_journeyRing_newSkillsEmerging: string
  kids_journeyRing_tryTheseActivities: string

  // ─── Cycle Log Forms (Wave B4) ────────────────────────────────────────────
  cycleLogForm_periodStarted: string
  cycleLogForm_periodEnded: string
  cycleLogForm_symptoms: string
  cycleLogForm_moodQuestion: string
  cycleLogForm_bbtTitle: string
  cycleLogForm_bbtSubline: string
  cycleLogForm_lhTitle: string
  cycleLogForm_cmTitle: string
  cycleLogForm_intimacyTitle: string
  cycleLogForm_ovulationTitle: string
  cycleLogForm_flow_label: string
  cycleLogForm_notesPlaceholder: string
  cycleLogForm_noteOptional: string
  cycleLogForm_showMore: string
  cycleLogForm_ovulationConfirm: string
  cycleLogForm_unprotected: string
  cycleLogForm_protected: string
  cycleLogForm_flow_light: string
  cycleLogForm_flow_medium: string
  cycleLogForm_flow_heavy: string
  cycleLogForm_lh_negative: string
  cycleLogForm_lh_faint: string
  cycleLogForm_lh_positive: string
  cycleLogForm_lh_peak: string
  cycleLogForm_cm_dry: string
  cycleLogForm_cm_sticky: string
  cycleLogForm_cm_creamy: string
  cycleLogForm_cm_watery: string
  cycleLogForm_cm_eggwhite: string
  cycleLogForm_mood_low: string
  cycleLogForm_mood_down: string
  cycleLogForm_mood_okay: string
  cycleLogForm_mood_good: string
  cycleLogForm_mood_great: string

  // ─── Cycle Calendar (Wave B4) ─────────────────────────────────────────────
  cycleCalendar_tabCycle: string
  cycleCalendar_tabChecklist: string
  cycleCalendar_tabHealth: string
  cycleCalendar_tabVisits: string
  cycleCalendar_logActivity: string
  cycleCalendar_checklist_title: string
  cycleCalendar_checklist_body: string
  cycleCalendar_visits_title: string
  cycleCalendar_visits_body: string
  cycleCalendar_checklistLoading: string
  cycleCalendar_checklistTitle: string
  cycleCalendar_examsLabs: string
  cycleCalendar_noExams: string
  cycleCalendar_logExam: string
  cycleCalendar_logEntry_temperature: string
  cycleCalendar_logEntry_temperatureSub: string
  cycleCalendar_logEntry_symptoms: string
  cycleCalendar_logEntry_symptomsSub: string
  cycleCalendar_logEntry_mood: string
  cycleCalendar_logEntry_moodSub: string
  cycleCalendar_logEntry_intimacy: string
  cycleCalendar_logEntry_intimacySub: string
  cycleCalendar_logEntry_periodStart: string
  cycleCalendar_logEntry_periodStartSub: string
  cycleCalendar_logEntry_periodEnd: string
  cycleCalendar_logEntry_periodEndSub: string
  cycleCalendar_logEntry_exam: string
  cycleCalendar_logEntry_examSub: string
  cycleCalendar_logSheet_periodStart: string
  cycleCalendar_logSheet_periodEnd: string
  cycleCalendar_logSheet_symptoms: string
  cycleCalendar_logSheet_mood: string
  cycleCalendar_logSheet_temperature: string
  cycleCalendar_logSheet_intimacy: string
  cycleCalendar_logSheet_exam: string

  // ─── Pre-Preg Health Dashboard (Wave B4) ─────────────────────────────────
  prepreg_healthDash_hydration: string
  prepreg_healthDash_glassesToday: string
  prepreg_healthDash_addGlass: string
  prepreg_healthDash_hours: string
  prepreg_healthDash_sleep: string
  prepreg_healthDash_folic: string
  prepreg_healthDash_folicDose: string
  prepreg_healthDash_prenatal: string
  prepreg_healthDash_min: string
  prepreg_healthDash_exercise: string
  prepreg_healthDash_nutritionTip: string

  // ─── Pre-Preg Daily Insights (Wave B4) ───────────────────────────────────
  prepreg_dailyInsights_myDailyInsights: string
  prepreg_dailyInsights_logSymptoms: string
  prepreg_dailyInsights_phaseTips: string
  prepreg_dailyInsights_activities: string
  prepreg_dailyInsights_nutrition: string

  // ─── Pre-Preg Partner View (Wave B4) ──────────────────────────────────────
  prepreg_partnerView_connected: string
  prepreg_partnerView_connectedSub: string
  prepreg_partnerView_invite: string
  prepreg_partnerView_inviteSub: string
  prepreg_partnerView_sendInvite: string

  // ─── Pre-Preg Phase Ring (Wave B4) ────────────────────────────────────────
  prepreg_phaseRing_periodIn: string
  prepreg_phaseRing_days: string
  prepreg_phaseRing_addPeriod: string
  prepreg_phaseRing_startTracking: string
  prepreg_phaseRing_period: string
  prepreg_phaseRing_follicular: string
  prepreg_phaseRing_ovulation: string
  prepreg_phaseRing_luteal: string
  prepreg_phaseRing_editPeriodDates: string

  // ─── Pre-Preg Checklist Card (Wave B4) ───────────────────────────────────
  prepreg_checklist_title: string

  // ─── Cycle Tracker (Wave B4) ──────────────────────────────────────────────
  cycleTracker_quickLog: string
  cycleTracker_symptomsLabel: string
  cycleTracker_todaysTips: string
  cycleTracker_nutritionFor: string
  cycleTracker_day: string
  cycleTracker_fertileWindow: string
  cycleTracker_log_periodStarted: string
  cycleTracker_log_periodEnded: string
  cycleTracker_log_ovulationSign: string
  cycleTracker_log_symptom: string
  cycleTracker_log_basalTemp: string
  cycleTracker_log_intercourse: string
  cycleTracker_symptom_cramps: string
  cycleTracker_symptom_bloating: string
  cycleTracker_symptom_headache: string
  cycleTracker_symptom_fatigue: string
  cycleTracker_symptom_moodSwings: string
  cycleTracker_symptom_breastPain: string
  cycleTracker_symptom_acne: string
  cycleTracker_symptom_nausea: string
  cycleTracker_symptom_cmEggWhite: string
  cycleTracker_symptom_cmCreamy: string
  cycleTracker_symptom_cmSticky: string
  cycleTracker_symptom_cmDry: string

  // ─── Pre-Preg Checklist / PrePregChecklist (Wave B4) ─────────────────────
  prepreg_checklistProgress_complete: string
  prepreg_checklistProgress_tasksDone: string
  prepreg_checklistProgress_empty: string

  // ─── Cycle Analytics (Wave B4) ────────────────────────────────────────────
  cycleAnalytics_yourCycleToday: string
  cycleAnalytics_fertileFlow: string
  cycleAnalytics_noWindowYet: string
  cycleAnalytics_viewFertileDetail: string
  cycleAnalytics_viewLengthDetail: string
  cycleAnalytics_daysAvg: string
  cycleAnalytics_lastNCycles: string
  cycleAnalytics_recentCycles: string
  cycleAnalytics_current: string
  cycleAnalytics_startedDate: string
  cycleAnalytics_dayNumber: string
  cycleAnalytics_regularSub_rhythm: string
  cycleAnalytics_regularSub_steady: string
  cycleAnalytics_regularSub_mostly: string
  cycleAnalytics_regularSub_unpredictable: string
  cycleAnalytics_pmsSub_none: string
  cycleAnalytics_pmsSub_symptomDays: string
  cycleAnalytics_moodSub_log: string
  cycleAnalytics_moodSub_avg: string
  cycleAnalytics_fertileSub_opensIn: string
  cycleAnalytics_fertileSub_open: string
  cycleAnalytics_fertileSub_passed: string
  // ─── B7b: CycleAnalytics residual strings ─────────────────────────────────
  cycleAnalytics_day_voiceline: string
  cycleAnalytics_seed_hint: string
  cycleAnalytics_cycle_n: string
  cycleAnalytics_log_cycles_hint: string
  cycleDetail_lastNCycles: string
  cycleDetail_history: string
  cycleDetail_regular: string
  cycleDetail_legend: string
  cycleDetail_perCycleDeviation: string
  cycleDetail_cycleN: string
  cycleDetail_onAvg: string
  cycleDetail_daysOfSymptomsPerCycle: string
  cycleDetail_topSymptoms: string
  cycleDetail_thisCycle: string
  cycleDetail_windowClosed: string
  cycleDetail_pastWindows: string
  cycleDetail_fiveAvg: string
  cycleDetail_distribution: string
  cycleDetail_lastNEntries: string
  cycleDetail_nDaysLeft: string
  cycleDetail_oneDayLeft: string
  cycleDetail_titleCycleLength: string
  cycleDetail_titleRegularity: string
  cycleDetail_titlePMS: string
  cycleDetail_titleFertile: string
  cycleDetail_titleMood: string
  cycleDetail_statMin: string
  cycleDetail_statMax: string
  cycleDetail_statCycles: string

  // ─── Fertility Signals Card (Wave B4) ─────────────────────────────────────
  cycleSignals_title: string
  cycleSignals_startTracking: string
  cycleSignals_peakToday: string
  cycleSignals_filledCount: string
  cycleSignals_logTile: string
  cycleSignals_logging30s: string
  cycleSignals_logFirstSignal: string

  // ─── Cycle Today Dashboard Modal (Wave B4) ────────────────────────────────
  cycleDash_today: string
  cycleDash_mood: string
  cycleDash_bbt: string
  cycleDash_lh: string
  cycleDash_cm: string
  cycleDash_intimacy: string
  cycleDash_period: string
  cycleDash_symptoms: string
  cycleDash_notLoggedYet: string
  cycleDash_tapChipToLog: string
  cycleDash_howYouFelt: string
  cycleDash_basalTemp: string
  cycleDash_notLogged: string
  cycleDash_ovulationTest: string
  cycleDash_cervicalMucus: string
  cycleDash_loggedToday: string
  cycleDash_flowToday: string
  cycleDash_noSymptoms: string
  cycleDash_bbtLast7: string
  cycleDash_bbtNeedMore: string
  cycleDash_mood_low: string
  cycleDash_mood_down: string
  cycleDash_mood_okay: string
  cycleDash_mood_good: string
  cycleDash_mood_great: string
  cycleDash_cm_dry: string
  cycleDash_cm_sticky: string
  cycleDash_cm_creamy: string
  cycleDash_cm_watery: string
  cycleDash_cm_eggwhite: string
  cycleDash_lh_negative: string
  cycleDash_lh_faint: string
  cycleDash_lh_positive: string
  cycleDash_lh_peak: string
  cycleDash_period_light: string
  cycleDash_period_medium: string
  cycleDash_period_heavy: string

  // ─── Mood/Symptom Picker Sheet (Wave B4) ─────────────────────────────────
  cycleSignals_pickerTitle: string
  cycleSignals_saving: string
  cycleSignals_saveSymptoms: string

  // ─── Cycle Onboarding (Wave B4) ───────────────────────────────────────────
  cycleOnboarding_q_lastPeriod: string
  cycleOnboarding_datePlaceholder: string
  cycleOnboarding_modalLastPeriod: string
  cycleOnboarding_q_cycleLength: string
  cycleOnboarding_days: string
  cycleOnboarding_iDontKnow: string
  cycleOnboarding_q_ttc: string
  cycleOnboarding_q_periodDuration: string
  cycleOnboarding_q_conditions: string
  cycleOnboarding_condition_pcos: string
  cycleOnboarding_condition_endometriosis: string
  cycleOnboarding_condition_other: string
  cycleOnboarding_condition_preferNotToSay: string
  cycleOnboarding_conditionOtherPlaceholder: string
  cycleOnboarding_q_tempUnit: string
  cycleOnboarding_tempCelsius: string
  cycleOnboarding_tempFahrenheit: string
  cycleOnboarding_q_ttcDuration: string
  cycleOnboarding_ttc_justStarting: string
  cycleOnboarding_ttc_fewMonths: string
  cycleOnboarding_ttc_overAYear: string
  cycleOnboarding_q_trackingTemp: string
  cycleOnboarding_notYet: string
  cycleOnboarding_q_supplements: string
  cycleOnboarding_supplementsPlaceholder: string
  cycleOnboarding_complete_title: string
  cycleOnboarding_complete_message: string
  cycleOnboarding_complete_btn: string

  // ─── Cycle Pillars Screen (Wave B4) ──────────────────────────────────────
  cyclePillars_title: string
  cyclePillars_subtitle: string
  cyclePillars_back: string

  // ─── Auth / Onboarding / Paywall / Tabs (Wave B5) ────────────────────────

  // Auth — welcome screen
  auth_welcome_intro: string
  auth_welcome_tagline: string
  auth_welcome_body: string
  auth_signInError: string

  // Auth — sign-in screen
  auth_welcome_back: string
  auth_welcome_waiting: string
  auth_orSignInEmail: string
  auth_emailLabel: string
  auth_passwordLabel: string
  auth_signingIn: string
  auth_signInArrow: string
  auth_newHere: string
  auth_createAccount: string
  auth_missingInfo: string
  auth_missingEmailPassword: string
  auth_invalidEmail: string
  auth_invalidEmailMsg: string
  auth_signInFailed: string

  // Auth — sign-up screen
  auth_signUp_heading1: string
  auth_signUp_heading2: string
  auth_signUp_heading3: string
  auth_signUp_subtitle: string
  auth_emailPlaceholder: string
  auth_passwordPlaceholder: string
  auth_creating: string
  auth_continue: string
  auth_missingEmailPasswordSignUp: string
  auth_passwordTooShort: string
  auth_passwordTooShortMsg: string
  auth_signUpFailed: string
  auth_welcomeAboard: string
  auth_confirmEmail: string

  // Auth — forgot password screen
  auth_forgot_heading: string
  auth_forgot_heading2: string
  auth_forgot_sent: string
  auth_forgot_prompt: string
  auth_sending: string
  auth_sendResetLink: string
  auth_backToSignIn: string
  auth_missingEmailOnly: string
  auth_couldntSendReset: string

  // Auth — reset password screen
  auth_reset_heading: string
  auth_reset_heading2: string
  auth_reset_subtitle: string
  auth_newPasswordLabel: string
  auth_confirmPasswordLabel: string
  auth_updating: string
  auth_updatePassword: string
  auth_passwordTooShortN: string
  auth_passwordsNoMatch: string
  auth_passwordsNoMatchMsg: string
  auth_couldntUpdatePassword: string
  auth_passwordUpdated: string
  auth_passwordUpdatedMsg: string

  // Onboarding — journey screen
  onboardingJourney_trying: string
  onboardingJourney_cycleSubtitle: string
  onboardingJourney_pregnant: string
  onboardingJourney_pregnantSubtitle: string
  onboardingJourney_parenting: string
  onboardingJourney_parentingSubtitle: string
  onboardingJourney_allEnrolled1: string
  onboardingJourney_allEnrolled2: string
  onboardingJourney_allEnrolledBody: string
  onboardingJourney_backToProfile: string
  onboardingJourney_addTitle: string
  onboardingJourney_addHeading1: string
  onboardingJourney_addHeading2: string
  onboardingJourney_heading1: string
  onboardingJourney_heading2: string
  onboardingJourney_addSubtitle: string
  onboardingJourney_subtitle: string
  onboardingJourney_activeBadge: string
  onboardingJourney_addCta: string

  // Onboarding — transition screen
  onboardingTransition_pregnancy_heading: string
  onboardingTransition_pregnancy_subtext: string
  onboardingTransition_kids_heading: string
  onboardingTransition_kids_subtext: string
  onboardingTransition_cycle_heading: string
  onboardingTransition_cycle_subtext: string
  onboardingTransition_cta: string
  onboardingTransition_skip: string

  // Paywall — tier copy
  paywall_tierSolo: string
  paywall_tierSoloSeats: string
  paywall_featureSoloCaregiver: string
  paywall_featureUnlimitedScansDetail: string
  paywall_featureUnlimitedChat: string
  paywall_featureVaccineReminders: string
  paywall_featurePriorityResponses: string
  paywall_soloHighlight: string
  paywall_tierFamily: string
  paywall_tierFamilySeats: string
  paywall_featureFamilyAccounts: string
  paywall_featureFamilyScans: string
  paywall_featureSharedChat: string
  paywall_featureSyncedVaccines: string
  paywall_featurePriorityEarly: string
  paywall_familyHighlight: string
  paywall_unlockTitle: string
  paywall_heroTagline: string
  paywall_bestValue: string
  paywall_annual: string
  paywall_restorePurchases: string
  paywall_unavailableTitle: string
  paywall_unavailableItalic: string
  paywall_unavailableMsg: string
  paywall_welcomePremiumTitle: string
  paywall_welcomePremiumItalic: string
  paywall_welcomePremiumMsg: string
  paywall_errorTitle: string
  paywall_restoredTitle: string
  paywall_restoredItalic: string
  paywall_restoredMsg: string
  paywall_noPurchasesTitle: string
  paywall_noPurchasesItalic: string
  paywall_noPurchasesMsg: string
  paywall_selectPlan: string

  // Home tab — empty state (no mode enrolled)
  tabsHome_journeyStarts1: string
  tabsHome_journeyStarts2: string
  tabsHome_journeyBody: string
  tabsHome_chooseJourney: string

  // Library tab
  library_subtitleCycle: string
  library_subtitlePreg: string
  library_subtitleKids: string
  library_title: string
  library_emptySubtitle: string
  library_knowledgePillars: string
  library_communityChannels: string
  library_comingSoon: string
  library_channelDescCycle: string
  library_channelDescPreg: string
  library_channelDescKids: string
  library_askPlaceholder: string
  library_pickChildWarning: string
  library_noSaveWarning: string
  library_sendA11y: string
  library_titleHeader: string
  library_titleAccent: string

  // ─── B6: Profile — Account & Security ─────────────────────────────────────
  account_title: string
  account_subtitle: string
  account_sectionEmail: string
  account_sectionPassword: string
  account_sectionSessions: string
  account_sectionDanger: string
  account_emailPlaceholder: string
  account_newPasswordPlaceholder: string
  account_minChars: string
  account_saving: string
  account_updateEmail: string
  account_changePassword: string
  account_signOutAllDevices: string
  account_deleteAccount: string
  account_deleteHint: string
  account_signOutEverywhereTitle: string
  account_signOutEverywhereMsg: string
  account_signOutAll: string
  account_deleteTitle: string
  account_deleteMsg: string
  account_deleteConfirmBtn: string
  account_contactSupport: string
  account_contactSupportMsg: string

  // ─── B6: Profile — Personal ───────────────────────────────────────────────
  personal_headerTitle: string
  personal_nameFallback: string
  personal_avatarHint: string
  personal_sectionAbout: string
  personal_sectionHealth: string
  personal_fieldName: string
  personal_fieldLocation: string
  personal_fieldLanguage: string
  personal_fieldHealthNotes: string
  personal_fieldAllergies: string
  personal_locationPlaceholder: string
  personal_allergyPlaceholder: string
  personal_languageModalTitle: string
  personal_languageSearchPlaceholder: string
  personal_saving: string
  personal_saveChanges: string
  // ─── B7c: profile/personal.tsx residual strings ────────────────────────────
  personal_addCustomAllergy: string             // "+ Add \"{{query}}\""

  // ─── B6: Profile — Emergency & Insurance ──────────────────────────────────
  emergencyInsurance_title: string
  emergencyInsurance_subtitle: string
  emergencyInsurance_sectionContacts: string
  emergencyInsurance_sectionPlans: string
  emergencyInsurance_add: string
  emergencyInsurance_emptyContacts: string
  emergencyInsurance_emptyPlans: string
  emergencyInsurance_editContact: string
  emergencyInsurance_addContact: string
  emergencyInsurance_editPlan: string
  emergencyInsurance_addPlan: string
  emergencyInsurance_fieldName: string
  emergencyInsurance_fieldRelationship: string
  emergencyInsurance_fieldPhone: string
  emergencyInsurance_fieldEmailOptional: string
  emergencyInsurance_fieldNotesOptional: string
  emergencyInsurance_fieldType: string
  emergencyInsurance_fieldProvider: string
  emergencyInsurance_fieldPlanNameOptional: string
  emergencyInsurance_fieldPolicyNumber: string
  emergencyInsurance_fieldGroupNumber: string
  emergencyInsurance_fieldMemberId: string
  emergencyInsurance_fieldInsurancePhone: string
  emergencyInsurance_contactNamePlaceholder: string
  emergencyInsurance_phonePlaceholder: string
  emergencyInsurance_emailPlaceholder: string
  emergencyInsurance_notesPlaceholder: string
  emergencyInsurance_providerPlaceholder: string
  emergencyInsurance_planNamePlaceholder: string
  emergencyInsurance_policyPlaceholder: string
  emergencyInsurance_groupPlaceholder: string
  emergencyInsurance_memberIdPlaceholder: string
  emergencyInsurance_insPhonePlaceholder: string
  emergencyInsurance_coveragePlaceholder: string
  emergencyInsurance_primaryContact: string
  emergencyInsurance_scanBannerTitle: string
  emergencyInsurance_scanBannerDesc: string
  emergencyInsurance_scanCamera: string
  emergencyInsurance_scanGallery: string
  emergencyInsurance_scanReading: string
  emergencyInsurance_saving: string
  emergencyInsurance_saveChanges: string
  emergencyInsurance_addContactBtn: string
  emergencyInsurance_addPlanBtn: string
  emergencyInsurance_removeContactTitle: string
  emergencyInsurance_removePlanTitle: string
  emergencyInsurance_nameRequired: string
  emergencyInsurance_phoneRequired: string
  emergencyInsurance_providerRequired: string
  emergencyInsurance_cardScanned: string

  // ─── B6: Profile — Memories ───────────────────────────────────────────────
  memories_headerTitle: string
  memories_searchPlaceholder: string
  memories_filterAllKids: string
  memories_filterAllTime: string
  memories_countOne: string
  memories_countMany: string
  memories_photos: string
  memories_emptyTitle: string
  memories_emptySubtitle: string
  memories_addFirst: string
  memories_sheetTitle: string
  memories_labelCaption: string
  memories_labelDate: string
  memories_labelWhichChild: string
  memories_captionPlaceholder: string
  memories_addBtn: string
  memories_uploading: string
  memories_saveMemory: string
  memories_editCaptionPlaceholder: string
  memories_deleteTitle: string
  memories_noChildren: string
  memories_noChildrenMsg: string
  memories_selectChild: string
  memories_deleteMemory: string
  memories_deletePhoto: string

  // ─── B6: Profile — Data & Privacy ─────────────────────────────────────────
  privacy_title: string
  privacy_subtitle: string
  privacy_sectionDataSharing: string
  privacy_sectionAI: string
  privacy_sectionYourData: string
  privacy_sectionLegal: string
  privacy_toggleShareCareCircle: string
  privacy_toggleShareCareCircleDesc: string
  privacy_toggleShareHealth: string
  privacy_toggleShareHealthDesc: string
  privacy_toggleSharePhotos: string
  privacy_toggleSharePhotosDesc: string
  privacy_toggleAI: string
  privacy_toggleAIDesc: string
  privacy_toggleAnalytics: string
  privacy_toggleAnalyticsDesc: string
  privacy_exportData: string
  privacy_exportDataDesc: string
  privacy_clearLogs: string
  privacy_clearLogsDesc: string
  privacy_clearChat: string
  privacy_clearChatDesc: string
  privacy_clearMemories: string
  privacy_clearMemoriesDesc: string
  privacy_clearHealth: string
  privacy_clearHealthDesc: string
  privacy_privacyPolicy: string
  privacy_privacyPolicyDesc: string
  privacy_termsOfService: string
  privacy_termsOfServiceDesc: string
  privacy_footer: string
  privacy_exportTitle: string
  privacy_exportMsg: string
  privacy_exportNow: string
  privacy_clearLogsTitle: string
  privacy_clearChatTitle: string
  privacy_clearMemoriesTitle: string
  privacy_clearHealthTitle: string
  privacy_clearLogsBtn: string
  privacy_clearChatBtn: string
  privacy_clearMemoriesBtn: string
  privacy_clearHealthBtn: string
  privacy_noData: string

  // ─── B6: Profile — Badge Wallet ───────────────────────────────────────────
  badgeWallet_title: string
  badgeWallet_earned: string
  badgeWallet_locked: string
  badgeWallet_points: string
  badgeWallet_sectionStreaks: string
  badgeWallet_sectionDaily: string
  badgeWallet_sectionNutrition: string
  badgeWallet_sectionSleep: string
  badgeWallet_sectionMood: string
  badgeWallet_sectionHealth: string
  badgeWallet_sectionGrowth: string
  badgeWallet_sectionCommunity: string
  badgeWallet_sectionMilestones: string

  // ─── B6: Community — channel/[id] ─────────────────────────────────────────
  channelScreen_nameFallback: string
  channelScreen_host: string
  channelScreen_leave: string
  channelScreen_requested: string
  channelScreen_request: string
  channelScreen_join: string
  channelScreen_noRatingsYet: string
  channelScreen_rateChannel: string
  channelScreen_editRating: string
  channelScreen_messagePlaceholder: string
  channelScreen_joinPromptText: string
  channelScreen_joinPromptBtn: string
  channelScreen_replyingTo: string
  channelScreen_replyInThread: string
  channelScreen_replyCountOne: string
  channelScreen_replyCountMany: string
  channelScreen_viewThread: string
  channelScreen_emptyTitle: string
  channelScreen_emptySubtitle: string
  channelScreen_ratingModalTitle: string
  channelScreen_ratingHeading: string             // "How was #{{channel}}?"
  channelScreen_reviewPlaceholder: string
  channelScreen_ratingCancel: string
  channelScreen_ratingSubmit: string
  channelScreen_shareTitle: string
  channelScreen_copyLink: string
  channelScreen_shareAction: string
  channelScreen_leaveTitle: string
  channelScreen_leaveBodyPrefix: string           // "You'll stop receiving updates from "
  channelScreen_leaveBodySuffix: string           // ". You can rejoin any time."
  channelScreen_leaveBtn: string
  channelScreen_stayBtn: string
  channelScreen_errorTitle: string
  channelScreen_errorSubtitle: string
  channelScreen_sharedFromGarage: string
  channelScreen_byAuthor: string                  // "by {{author}}"
  channelScreen_tapToView: string
  channelScreen_memberFallback: string
  channelScreen_pinned: string
  channelScreen_noMembersTitle: string
  channelScreen_noMembersMsg: string
  channelScreen_transferTitle: string
  channelScreen_transferBtn: string
  channelScreen_joinTitle: string
  channelScreen_requestTitle: string
  channelScreen_requestPending: string
  channelScreen_requestSent: string
  channelScreen_deleteChannelTitle: string
  channelScreen_deleteMsgTitle: string
  channelScreen_copiedTitle: string
  channelScreen_copiedMsg: string
  channelScreen_privateShareTitle: string
  channelScreen_privateShareMsg: string
  channelScreen_joinFailedMsg: string
  channelScreen_leaveFailedMsg: string
  channelScreen_ratingThanksTitle: string
  channelScreen_ratingThanksMsg: string
  channelScreen_errorLoadTitle: string
  channelScreen_errorLoadSubtitle: string
  channelScreen_tryAgain: string

  // ─── B6: Community — channel/create ───────────────────────────────────────
  channelCreate_header: string
  channelCreate_labelName: string
  channelCreate_labelDescription: string
  channelCreate_labelType: string
  channelCreate_labelCategory: string
  channelCreate_labelYourCategory: string
  channelCreate_namePlaceholder: string
  channelCreate_descriptionPlaceholder: string
  channelCreate_categoryPlaceholder: string
  channelCreate_typePublic: string
  channelCreate_typePrivate: string
  channelCreate_privateHint: string
  channelCreate_creating: string
  channelCreate_create: string
  channelCreate_successTitle: string
  channelCreate_successMsg: string
  channelCreate_goToChannel: string
  channelCreate_nameRequired: string
  channelCreate_categoryRequired: string

  // ─── B6: Community — channel/info/[id] ────────────────────────────────────
  channelInfo_header: string
  channelInfo_statMembers: string
  channelInfo_statRating: string
  channelInfo_statMedia: string
  channelInfo_sectionCreatedBy: string
  channelInfo_sectionMembers: string
  channelInfo_sectionMedia: string
  channelInfo_sectionAdmin: string
  channelInfo_ownerFallback: string
  channelInfo_memberFallback: string
  channelInfo_editInfo: string
  channelInfo_transferOwnership: string
  channelInfo_manageMessages: string
  channelInfo_deleteChannel: string
  channelInfo_leaveChannel: string
  channelInfo_pendingRequests: string
  channelInfo_shareChannel: string
  channelInfo_deleteTitle: string
  channelInfo_deleteForever: string
  channelInfo_keepChannel: string
  channelInfo_namePlaceholder: string
  channelInfo_descriptionPlaceholder: string
  channelInfo_editCancel: string
  channelInfo_editSave: string
  channelInfo_youAreHost: string
  channelInfo_noMembersTitle: string
  channelInfo_approved: string
  channelInfo_denyRequest: string
  channelInfo_privateShareTitle: string
  channelInfo_privateShareMsg: string

  // ─── B6: Community — channel/thread/[id] ──────────────────────────────────
  channelThread_header: string
  channelThread_memberFallback: string
  channelThread_replyCountOne: string
  channelThread_replyCountMany: string
  channelThread_emptyTitle: string
  channelThread_emptySubtitle: string
  channelThread_replyPlaceholder: string

  // ─── B6: Community — channels/index ───────────────────────────────────────
  channelBrowser_title: string
  channelBrowser_subtitle: string
  channelBrowser_emptyTitle: string
  channelBrowser_emptySubtitle: string
  channelBrowser_createCta: string
  channelBrowser_emptyIcon: string

  // ─── B6: Community — channels/[id] ────────────────────────────────────────
  channelDetail_title: string
  channelDetail_emptyTitle: string
  channelDetail_emptySubtitle: string
  channelDetail_emptyIcon: string

  // ─── B6: Community — channels/thread/[id] ─────────────────────────────────
  channelThreadDetail_title: string
  channelThreadDetail_memberFallback: string
  channelThreadDetail_emptyText: string
  channelThreadDetail_replyPlaceholder: string
  channelThreadDetail_avatarIcon: string

  // ─── B6: Garage — create ──────────────────────────────────────────────────
  garage_create_safetyTitle: string
  garage_create_safetyDecline: string
  garage_create_safetyAgree: string
  garage_create_errorLoadPhoto: string
  garage_create_errorCamera: string
  garage_create_errorCapturePhoto: string
  garage_create_noPhotosTitle: string
  garage_create_noPhotosMsg: string
  garage_create_uploadError: string
  garage_create_stepN: string
  garage_create_preview: string
  garage_create_step1Title: string
  garage_create_step1Hint: string
  garage_create_mediaCount: string
  garage_create_gallery: string
  garage_create_galleryPhotosVideos: string
  garage_create_cameraTakePhoto: string
  garage_create_step2Title: string
  garage_create_fieldTitle: string
  garage_create_fieldTitleTip: string
  garage_create_fieldCaption: string
  garage_create_step3Title: string
  garage_create_step3Hint: string
  garage_create_fieldYourCategory: string
  garage_create_step4Title: string
  garage_create_fieldCondition: string
  garage_create_fieldAgeRange: string
  garage_create_fieldSize: string
  garage_create_publish: string
  garage_create_preparing: string
  garage_create_published: string
  garage_create_next: string
  garage_create_coverBadge: string
  garage_create_step4Hint: string
  garage_create_ageFirstHint: string
  garage_create_previewTitle: string
  garage_create_moreMediaOne: string               // "+{{count}} more photo"
  garage_create_moreMediaMany: string              // "+{{count}} more photos/videos"
  // ─── B6: Garage — profile ─────────────────────────────────────────────────
  garage_profile_myVillage: string
  garage_profile_posts: string
  garage_profile_saved: string
  garage_profile_memberSince: string
  garage_profile_myProfile: string
  garage_profile_emptyPostsTitle: string
  garage_profile_emptyPostsBody: string
  garage_profile_createFirst: string
  garage_profile_emptySavedTitle: string
  garage_profile_emptySavedBody: string
  garage_profile_postOptions: string
  garage_profile_savedPost: string
  garage_profile_deletePost: string
  garage_profile_unsave: string
  garage_profile_deleteTitle: string
  garage_profile_deleteMsg: string
  garage_profile_errorTitle: string
  garage_profile_errorDeletePost: string
  garage_profile_errorUnsave: string
  // ─── B7c: garage/profile.tsx residual strings ──────────────────────────────
  garage_profile_thumbPlaceholderIcon: string
  // ─── B7c: profile/notifications.tsx residual strings ───────────────────────
  notificationsSettings_subtitle: string
  // ─── B6: Garage — share ───────────────────────────────────────────────────
  garage_share_header: string
  garage_share_noMessageTitle: string
  garage_share_noMessageBody: string
  garage_share_addMessage: string
  garage_share_shareAnyway: string
  garage_share_sharedTitle: string
  garage_share_sharedMsg: string
  garage_share_goToChannel: string
  garage_share_shareMore: string
  garage_share_errorTitle: string
  garage_share_joinFirstTitle: string
  garage_share_joinFirstMsg: string
  garage_share_myChannels: string
  garage_share_otherChannels: string
  garage_share_notJoined: string
  garage_share_shareBtn: string
  garage_share_noChannels: string
  garage_share_messagePlaceholder: string
  garage_share_postBy: string
  garage_share_postFallback: string
  // ─── B6: Garage — [id] ────────────────────────────────────────────────────
  garage_detail_shareTitle: string
  garage_detail_shareToChannel: string
  garage_detail_copyLink: string
  garage_detail_shareExternal: string
  garage_detail_postNotFound: string
  garage_detail_comments: string
  garage_detail_noComments: string
  garage_detail_commentPlaceholder: string
  garage_detail_postCommentA11y: string
  garage_detail_likeCount: string
  garage_detail_likesCount: string
  garage_detail_unlike: string
  garage_detail_like: string
  garage_detail_commentsA11y: string
  garage_detail_shareA11y: string
  garage_detail_saved: string
  garage_detail_save: string
  garage_detail_communityMember: string
  garage_detail_member: string
  garage_detail_justNow: string
  garage_detail_checkOutPost: string
  // ─── B7c: garage/[id].tsx residual strings ─────────────────────────────────
  garage_detail_mentionHandle: string           // "@{{handle}}"
  // ─── B6: Leaderboard ──────────────────────────────────────────────────────
  leaderboard_tabAll: string
  leaderboard_tabMoms: string
  leaderboard_tabCaregivers: string
  leaderboard_tabPartners: string
  leaderboard_pts: string
  leaderboard_youSuffix: string
  leaderboard_you: string
  leaderboard_yourSpot: string
  leaderboard_rankHero: string
  leaderboard_pointsSeason: string
  leaderboard_aloneTop: string
  leaderboard_aloneTopBody: string
  leaderboard_justYou: string
  leaderboard_justYouBody: string
  leaderboard_roleCaregiver: string
  leaderboard_roleFamilyMember: string
  leaderboard_roleParent: string
  leaderboard_statChildLogs: string
  leaderboard_statPosts: string
  leaderboard_statReactions: string
  leaderboard_statChannels: string
  leaderboard_statPoints: string
  leaderboard_anonymous: string
  // ─── B6: Daily Rewards ────────────────────────────────────────────────────
  dailyRewards_grandmaProud: string
  dailyRewards_checkedIn: string
  dailyRewards_claimReward: string
  dailyRewards_pointsReveal: string
  dailyRewards_greatJob: string
  dailyRewards_thisWeek: string
  dailyRewards_weekProgress: string
  dailyRewards_todaysQuest: string
  dailyRewards_badgeCollection: string
  dailyRewards_viewAllBadges: string
  dailyRewards_categories: string
  dailyRewards_communityLeaderboard: string
  dailyRewards_rankDesc: string
  dailyRewards_competeDesc: string
  dailyRewards_howPointsWork: string
  dailyRewards_howPointsBody: string
  dailyRewards_dayStreak: string
  dailyRewards_statLongest: string
  dailyRewards_statTotalDays: string
  dailyRewards_statBadges: string
  dailyRewards_achieved: string
  dailyRewards_toUnlock: string
  dailyRewards_earnedOf: string
  dailyRewards_catStreaks: string
  dailyRewards_catNutrition: string
  dailyRewards_catSleep: string
  dailyRewards_catMood: string
  dailyRewards_catHealth: string
  dailyRewards_catGrowth: string
  dailyRewards_catCommunity: string
  dailyRewards_catMilestones: string
  dailyRewards_catDaily: string
  dailyRewards_rowGaragePost: string
  dailyRewards_rowChannelMsg: string
  dailyRewards_rowReactionReceived: string
  dailyRewards_rowCommentReceived: string
  dailyRewards_rowChannelJoined: string
  dailyRewards_rowChildLog: string
  dailyRewards_rowStreakDay: string
  dailyRewards_rowDailyCheckin: string
  // ─── B6: Scan ─────────────────────────────────────────────────────────────
  scan_screenTitle: string
  scan_placeholderText: string
  scan_grandmaLooking: string
  scan_cameraBtn: string
  scan_libraryBtn: string
  scan_permissionNeeded: string
  scan_permissionMsg: string
  scan_failed: string
  scan_typeMedicine: string
  scan_typeFood: string
  scan_typeNutrition: string
  scan_typeGeneral: string
  // ─── B6: Accept Invite ────────────────────────────────────────────────────
  acceptInvite_errorNoToken: string
  acceptInvite_errorTitle: string
  acceptInvite_successTitle: string
  acceptInvite_successBody: string
  acceptInvite_goHome: string
  acceptInvite_title: string
  acceptInvite_subtitle: string
  acceptInvite_permissionsTitle: string
  acceptInvite_permView: string
  acceptInvite_permLog: string
  acceptInvite_permChat: string
  acceptInvite_acceptBtn: string
  acceptInvite_declineBtn: string
  // ─── B7c: accept-invite.tsx residual strings ───────────────────────────────
  acceptInvite_successEmoji: string
  acceptInvite_headerEmoji: string
  // ─── B7c: child-picker.tsx residual strings ────────────────────────────────
  childPicker_title: string
  childPicker_avatarIcon: string
  // ─── B6: Exams list ───────────────────────────────────────────────────────
  exams_title: string
  exams_tabPrePreg: string
  exams_tabPregnancy: string
  exams_tabKids: string
  exams_allKids: string
  exams_statTotal: string
  exams_statFlagged: string
  exams_statThisYear: string
  exams_loading: string
  exams_emptyTitle: string
  exams_emptyTagline: string
  exams_emptyBody: string
  exams_openCalendar: string
  exams_photoCount: string
  exams_photosCount: string
  exams_flaggedCount: string
  // ─── B6: Exam detail ──────────────────────────────────────────────────────
  examDetail_shareFailed: string
  examDetail_deleteFailed: string
  examDetail_flaggedTitle: string
  examDetail_flaggedNote: string
  examDetail_notesLabel: string
  examDetail_aiExtracted: string
  examDetail_referenceRange: string
  examDetail_examDateParsed: string
  examDetail_providerLabel: string
  examDetail_deleteBtn: string
  examDetail_deleteTitle: string
  examDetail_deleteMsg: string
  // ─── B7c: exams/[id].tsx residual strings ──────────────────────────────────
  examDetail_flaggedBullet: string             // "• {{item}}"
  // ─── B6: Pillar detail ────────────────────────────────────────────────────
  pillarDetail_notFound: string
  pillarDetail_forYouNow: string
  pillarDetail_allTips: string
  pillarDetail_tips: string
  pillarDetail_askGrandma: string
  // ─── B6: Connections ──────────────────────────────────────────────────────
  connections_title: string
  connections_tabVillage: string
  connections_tabChannels: string
  // ─── B6: ChannelsScreen (discovery) ──────────────────────────────────────
  channelsDiscover_heading: string
  channelsDiscover_subheading: string
  channelsDiscover_searchPlaceholder: string
  channelsDiscover_results: string
  channelsDiscover_noChannels: string
  channelsDiscover_noChannelsBody: string
  channelsDiscover_suggestedForYou: string
  channelsDiscover_trending: string
  channelsDiscover_favorites: string
  channelsDiscover_myChannels: string
  channelsDiscover_joinBtn: string
  channelsDiscover_joinedBadge: string
  channelsDiscover_joinConversation: string
  // ─── B6: Vault components ─────────────────────────────────────────────────
  vault_secureNewDoc: string
  vault_secureNewDocBody: string
  vault_scanBtn: string
  vault_uploadBtn: string
  vault_addRecord: string
  vault_vaccineRecords: string
  vault_vaccineRecorded: string
  vault_noVaccinesYet: string
  vault_vaccineDose: string
  vault_vaccineGiven: string
  vault_vaccineDue: string
  vault_vaccineNotScheduled: string
  vault_filesCount: string
  vault_noDocuments2: string
  vault_addDocument: string
  // ─── B6: InsightsScreen ───────────────────────────────────────────────────
  insights_screenTitle: string
  insights_subtitle: string
  insights_tabToday: string
  insights_tabReads: string
  insights_tabHistory: string
  insights_todaysTip: string
  insights_thisWeek: string
  insights_grandmaThinking: string
  insights_analyzingData: string
  insights_retry: string
  insights_noAiTitle: string
  insights_noAiBody: string
  insights_generateBtn: string
  insights_grandmasInsights: string
  insights_askGrandma: string
  insights_reads_intro: string
  insights_reads_all: string
  insights_reads_minRead: string
  insights_history_noHistory: string
  insights_history_restoreBtn: string
  insights_history_archiveBtn: string
  insights_askGrandmaAbout: string
  insights_greetingMorning: string
  insights_greetingWeek: string
  insights_quotedText: string
  insights_callProviderIf: string
  insights_featuredThisWeek: string
  insights_quoteAuthor: string
  insights_readsIntroBase: string
  insights_readsIntroFiltered: string
  insights_reads_ageMonths: string
  insights_reads_ageYears: string
  insights_noArticlesAge: string
  insights_historyEmptyBody: string
  insights_tapForDetails: string
  insights_archived: string
  insights_grandmasTip: string
  insights_modeLabel: string
  // ─── B7a-2: HealthHistory ─────────────────────────────────────────────────
  healthHistory_noVaccinesYet: string
  healthHistory_recommendedSchedule: string
  healthHistory_noMedicationsLogged: string
  healthHistory_currentMedications: string
  healthHistory_weightKg: string
  healthHistory_heightCm: string
  healthHistory_noGrowthEntries: string
  healthHistory_noMilestones: string
  healthHistory_totalEntries: string
  healthHistory_noEntries: string
  healthHistory_fieldChild: string
  healthHistory_nMore: string

  // ─── B6: ExamForm ─────────────────────────────────────────────────────────
  examForm_snapOrUpload: string
  examForm_reading: string
  examForm_scan: string
  examForm_upload: string
  examForm_uploading: string
  examForm_extracting: string
  examForm_aiPrefilled: string
  examForm_titlePlaceholder: string
  examForm_resultPlaceholder: string
  examForm_providerPlaceholder: string
  examForm_datePlaceholder: string
  examForm_notesPlaceholder: string
  examForm_referenceRange: string
  examForm_flaggedTitle: string
  examForm_flaggedNote: string
  examForm_saveExam: string
  examForm_cancel: string
  examForm_missingTitle: string
  examForm_missingTitleMsg: string
  examForm_saveFailed: string
  examForm_uploadFailed: string
  examForm_permNeeded: string
  examForm_allowPhoto: string
  examForm_allowCamera: string
  // ─── B6: PregnancyCalendar alerts ─────────────────────────────────────────
  pregCal_alertNameRequired: string
  pregCal_alertNameRequiredMsg: string
  pregCal_alertSaveError: string
  pregCal_alertDeleteError: string
  pregCal_alertDeleteLog: string
  pregCal_alertDeleteLogTitle: string
  // ─── B7a-1: KidsHome residual strings ──────────────────────────────────────
  kids_home_range_more: string
  kids_home_mood_label: string
  kids_home_mood_this_period: string
  kids_home_sleep_modal_title: string
  kids_home_sleep_modal_pct_target: string
  kids_home_feeding_modal_left: string
  kids_home_feeding_modal_right: string
  kids_home_feeding_modal_feedings: string
  kids_home_feeding_modal_avg_ml: string
  kids_home_feeding_modal_pct_breast: string
  kids_home_activities_modal_days: string
  kids_home_activities_modal_per_active_day: string
  kids_home_goals_subtitle: string
  kids_home_reminder_done_date: string
  kids_home_leaps_path_number: string
  // ─── B7a-1: PregnancyAnalytics residual strings ────────────────────────────
  preg_analytics_times_prefix: string
  preg_analytics_overall_last7: string
  preg_analytics_nutrition_movement_hydration: string
  preg_analytics_stat_value_pct: string
  preg_analytics_no_moods: string
  preg_analytics_no_symptoms: string
  preg_analytics_511_rule: string
  preg_analytics_loading_birth: string
  preg_analytics_birth_readiness_5buckets: string
  preg_analytics_your_score_last7: string
  // ─── B7a-1: KidsAnalytics residual strings ─────────────────────────────────
  kids_analytics_pillar_activity: string
  kids_analytics_how_score_works: string
  kids_analytics_most_logged_foods: string
  kids_analytics_times_prefix: string
  kids_analytics_breast_sessions: string
  kids_analytics_bottles: string
  kids_analytics_personalized_for_today: string
  kids_analytics_confirm_share_body: string
  // ─── B7b: GarageScreen residual strings ───────────────────────────────────
  garage_screen_header_title: string
  garage_screen_header_subtitle: string
  garage_screen_stamp_keep: string
  garage_screen_stamp_pass: string
  garage_screen_error_title: string
  garage_screen_error_body: string
  // ─── B7b: AvatarPicker residual strings ───────────────────────────────────
  avatarPicker_title: string
  avatarPicker_subtitle: string
  avatarPicker_upload_title: string
  avatarPicker_upload_subtitle: string
  avatarPicker_remove: string
  avatarPicker_or_icon: string
  // ─── B7b: GrandmaTalk residual strings ────────────────────────────────────
  grandmaTalk_history_title: string
  grandmaTalk_history_empty_title: string
  grandmaTalk_history_empty_body: string
  grandmaTalk_history_start_convo: string
  grandmaTalk_history_new_convo: string
  grandmaTalk_header_grandma: string
  grandmaTalk_header_talk: string
  // ─── B7b: FertileWindowModal residual strings ─────────────────────────────
  fertileModal_peak_in: string
  fertileModal_days_suffix: string
  fertileModal_projected_ovulation: string
  fertileModal_7day_forecast: string
  fertileModal_log_signal_today: string
  fertileModal_confidence: string
  // ─── B7b: daily-rewards.tsx residual strings ──────────────────────────────
  dailyRewards_n_day: string
  dailyRewards_streak_label: string
  dailyRewards_quest_points: string
  dailyRewards_unlock_badge: string
  // ─── B7b: PregnancyMealForm residual strings ──────────────────────────────
  pregMeal_scan_again: string
  pregMeal_save_meal: string
  pregMeal_kcal_count: string
  pregMeal_approx_kcal: string
  // ─── B7b: airtag-setup.tsx residual strings ───────────────────────────────
  airtag_title: string
  airtag_subtitle: string
  airtag_step1_title: string
  airtag_step1_text: string
  airtag_step2_title: string
  airtag_step2_text: string
  airtag_step3_title: string
  airtag_step3_text: string
  airtag_note: string
  // ─── B7b: invite-caregiver.tsx residual strings ───────────────────────────
  careInvite_title: string
  careInvite_subtitle: string
  careInvite_field_email: string
  careInvite_field_role: string
  careInvite_footer_secured: string
  careInvite_sent_title: string
  careInvite_share_with: string
  careInvite_yourChild: string
  // ─── B7b: CycleJourneyRingFull residual strings ───────────────────────────
  cycle_ring_label_day: string
  cycle_ring_of_n: string
  cycle_ring_drag_hint: string
  cycle_ring_phase_prefix: string
  cycle_ring_date_phase: string
  cycle_ring_label_fertility: string
  cycle_ring_label_next_period: string
  cycle_ring_unit_d: string
  cycle_ring_label_this_day: string
  // ─── B7b: KidsAnalytics chart/detail residual strings ─────────────────────
  kids_analytics_log_every_feed_hint: string
  kids_analytics_mood_score_weights_hint: string
  kids_analytics_growth_track_hint: string
  kids_analytics_add_measurements_hint: string
  kids_analytics_log_meals_eat_quality: string
  kids_analytics_no_entries_window: string
  kids_analytics_log_sleep_quality_hint: string
  kids_analytics_no_moods_window: string
  // ─── B7a-1: care-circle residual strings ───────────────────────────────────
  careCircle_tagline: string
  careCircle_members_tab: string
  careCircle_activity_tab: string
  careCircle_no_caregivers: string
  careCircle_invite_village: string
  careCircle_invite_partner_desc: string
  careCircle_no_activity_title: string
  careCircle_quiet_day: string
  careCircle_activity_log_desc: string
  careCircle_resend_invite: string
  careCircle_remove: string
  careCircle_step1_who: string
  careCircle_step1_tagline: string
  careCircle_field_name: string
  careCircle_field_role: string
  careCircle_step2_which_children: string
  careCircle_step3_what_can: string
  careCircle_step4_how_invite: string
  careCircle_field_email_address: string
  careCircle_field_phone_number: string
  careCircle_link_share_desc: string
  careCircle_field_email: string
  careCircle_field_permission_level: string
  // ─── B7a-1: PregnancyCalendar residual strings ─────────────────────────────
  pregCal_log_something: string
  pregCal_manage_routines: string
  pregCal_recurring_desc: string
  pregCal_new_routine: string
  pregCal_add_routine: string
  pregCal_active_routines: string
  pregCal_edit_routine: string
  pregCal_update: string
  pregCal_delete_routine_title: string
  pregCal_delete_routine_desc: string
  pregCal_pending_count: string
  pregCal_tap_to_log: string
  pregCal_logged_count: string
  pregCal_date_at_time: string
  pregCal_no_logs_day: string
  pregCal_nothing_planned: string
  pregCal_tap_to_add: string
  pregCal_pregnancy_path: string
  pregCal_milestones_40w: string
  pregCal_trimester: string
  pregCal_week_label: string
  pregCal_status_soon: string
  pregCal_status_upcoming: string
  pregCal_appointment_btn: string
  pregCal_upload_exam_btn: string
  // ─── B7a-3: PregnancyAnalytics residual strings ───────────────────────────
  preg_analytics_noWeightTrend: string
  preg_analytics_noKickSessions: string
  preg_analytics_sessionsHittingTarget: string
  preg_analytics_noSleepLogs: string
  preg_analytics_noHydrationLogs: string
  preg_analytics_nutritionLoading: string
  preg_analytics_noExerciseLogs: string
  preg_analytics_noContractionsYet: string
  // ─── B7a-3: channel/info/[id].tsx residual strings ────────────────────────
  channelInfo_channelNotFound: string
  channelInfo_typeChannel: string
  channelInfo_createdDate: string
  channelInfo_youBadge: string
  channelInfo_moreMembers: string
  channelInfo_metricsTitle: string
  channelInfo_metricMembers: string
  channelInfo_metricMessages: string
  channelInfo_metricMedia: string
  channelInfo_metricActiveToday: string
  channelInfo_msgsToday: string
  channelInfo_thisWeek: string
  channelInfo_deleteBodyBefore: string
  channelInfo_deleteBodyAfter: string
  // ─── B7a-3: KidsJourneyRing residual strings ─────────────────────────────
  kids_journeyRing_title: string
  kids_journeyRing_hint: string
  kids_journeyRing_subtitle: string
  kids_journeyRing_weekLabel: string
  kids_journeyRing_leapOf: string
  kids_journeyRing_leapOfWithAge: string
  // ─── B7a-3: TodayDashboardModal residual strings ──────────────────────────
  pregnancy_todayDash_labelMood: string
  pregnancy_todayDash_labelHydration: string
  pregnancy_todayDash_labelSleep: string
  pregnancy_todayDash_labelMeals: string
  pregnancy_todayDash_labelExercise: string
  pregnancy_todayDash_labelKicks: string
  pregnancy_todayDash_labelWeight: string
  pregnancy_todayDash_unitKg: string
  pregnancy_todayDash_labelWeightLast7: string
  pregnancy_todayDash_weightNeedMore: string
  pregnancy_todayDash_labelHydrationLast7: string
  // ─── B7a-3: KidsLogForms residual strings ────────────────────────────────
  kids_logForm_removeTag: string
  kids_logForm_timerLabelL: string
  kids_logForm_timerLabelR: string
  kids_logForm_calUnit: string
  kids_logForm_minUnit: string
  kids_logForm_lastSidePre: string
  kids_logForm_lastSideMid: string
  kids_logForm_lastSidePost: string
  kids_logForm_separator: string
  // ─── B7a-3: profile/pregnancy.tsx residual strings ────────────────────────
  profPreg_openBirthPlan: string
  profPreg_birthPlanSubLabel: string
  profPreg_manageBirthTeam: string
  profPreg_careCircle: string
  profPreg_emergencyCard: string
  profPreg_manageArrow: string
  profPreg_pickOneThatFits: string
  profPreg_taglineExpecting: string
  profPreg_chipWeek: string
  profPreg_chipTrimester: string
  profPreg_daysToGo: string
  // ─── B7a-3: profile/kids.tsx residual strings ─────────────────────────────
  profKids_labelSex: string
  profKids_labelBirthDate: string
  profKids_labelCountryVaccine: string
  profKids_noChildren: string
  profKids_noChildrenSub: string
  profKids_addCustomPrefix: string
  // ─── B7b: WeekCard.tsx residual strings ───────────────────────────────────
  preg_weekCard_tapForDetails: string
  preg_weekCard_unitCm: string
  // ─── B7b: SymptomLogger.tsx residual strings ──────────────────────────────
  agendaSymptom_tapToLog: string
  agendaSymptom_howSevere: string                // "How severe is your {{symptom}}?"
  agendaSymptom_loggedToday: string
  agendaSymptom_emptyTitle: string
  agendaSymptom_emptyDesc: string
  // ─── B7b: onboarding/kids/index.tsx residual strings ──────────────────────
  kidsOnboard_tunedForAges: string
  kidsOnboard_noCountriesFound: string
  kidsOnboard_photoHint: string
  kidsOnboard_partnerHint: string
  kidsOnboard_completionTitle: string
  kidsOnboard_completionMessage: string
  // ─── B7b: manage-caregivers.tsx residual strings ──────────────────────────
  manageCaregivers_subtitle: string               // "People who can help care for {{name}}"
  manageCaregivers_upgradeForSeats: string        // "Upgrade to {{tier}} for more seats"
  manageCaregivers_readOnly: string
  // ─── B7b: DevModeBanner.tsx residual strings ──────────────────────────────
  devMode_dot: string
  devMode_label: string
  devMode_sub: string
  devMode_panel: string
  devMode_exit: string
  // ─── B7b: GrowthPercentileChart.tsx residual strings ──────────────────────
  growthChart_noReferenceData: string
  growthChart_pctChipLabel: string                // "{{name}} · P{{pct}}" (name optional)
  growthChart_legendTypical: string
  growthChart_measurementOne: string              // "{{count}} measurement · {{unit}}"
  growthChart_measurementMany: string             // "{{count}} measurements · {{unit}}"
  growthChart_disclaimer: string
  // ─── B7b: PhaseFlowChart.tsx residual strings ─────────────────────────────
  phaseFlowChart_emptyHint: string
  phaseFlowChart_fertileOvulation: string
  phaseFlowChart_nextPeriod: string
  // ─── B7b: ActivityTimeline.tsx residual strings ───────────────────────────
  activityTimeline_emptyIcon: string
  activityTimeline_emptyTitle: string
  activityTimeline_emptyText: string
  // ─── B7b: emergency-insurance.tsx residual strings ────────────────────────
  emergencyInsurance_emptyContactsHint: string
  emergencyInsurance_primaryBadge: string
  emergencyInsurance_emptyPlansHint: string
  emergencyInsurance_someoneToCall: string
  emergencyInsurance_keepCardOnHand: string
}
