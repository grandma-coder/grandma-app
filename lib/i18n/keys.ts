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

  // ─── Pregnancy-specific ────────────────────────────────────────────────
  pregnancy_week: string
  pregnancy_dueDate: string
  pregnancy_babySize: string
  pregnancy_symptoms: string
  pregnancy_kicks: string
  pregnancy_contractions: string
  pregnancy_weightGain: string
  pregnancy_birthPlan: string

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
