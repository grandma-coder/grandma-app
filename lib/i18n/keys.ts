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
  cycle_pillar_fertility: string
  cycle_pillar_nutrition_prep: string
  cycle_pillar_emotional_readiness: string
  cycle_pillar_financial_planning: string
  cycle_pillar_partner_journey: string
  cycle_pillar_health_checkups: string

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
}
