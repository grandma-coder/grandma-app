import type { CaregiverPermissions, JourneyMode, Pillar } from '../types'
import { pillars as kidsPillars } from './pillars'
import { pregnancyPillars } from './pregnancyPillars'
import { prePregPillars } from './prePregPillars'
import { stickers } from '../constants/theme'

interface TabConfig {
  visible: boolean
  label: string
  icon: string
}

interface AgendaTab {
  id: string
  label: string
  icon: string
}

interface VaultSection {
  key: string
  title: string
  description: string
  icon: string
  color: string
}

export interface ModeConfig {
  tabs: {
    index: TabConfig
    agenda: TabConfig
    library: TabConfig
    vault: TabConfig
    exchange: TabConfig
    settings: TabConfig
  }
  agendaTabs: AgendaTab[]
  pillars: Pillar[]
  vaultSections: VaultSection[]
  exchangeFilters: string[]
  aiContextLabel: string
}

const PRE_PREGNANCY_CONFIG: ModeConfig = {
  tabs: {
    index: { visible: true, label: 'Home', icon: 'home-outline' },
    agenda: { visible: true, label: 'Calendar', icon: 'calendar-outline' },
    library: { visible: true, label: 'Library', icon: 'book-outline' },
    // Re-purposed for pre-pregnancy: the "vault" slot surfaces cycle/hormone
    // analytics instead of documents. CLAUDE.md said "hidden in pre-pregnancy"
    // because pre-preg has no medical vault — but parents want the insights.
    vault: { visible: true, label: 'Insights', icon: 'bar-chart-outline' },
    exchange: { visible: true, label: 'Garage', icon: 'pricetag-outline' },
    settings: { visible: true, label: 'Settings', icon: 'settings-outline' },
  },
  agendaTabs: [
    { id: 'cycle', label: 'Cycle', icon: 'flower-outline' },
    { id: 'checklist', label: 'Checklist', icon: 'checkbox-outline' },
    { id: 'appointments', label: 'Appointments', icon: 'medical-outline' },
  ],
  pillars: prePregPillars,
  vaultSections: [],
  exchangeFilters: ['All', 'Maternity Wear', 'Prenatal Supplies', 'Books', 'Other'],
  aiContextLabel: 'pre-pregnancy',
}

const PREGNANCY_CONFIG: ModeConfig = {
  tabs: {
    index: { visible: true, label: 'Home', icon: 'home-outline' },
    agenda: { visible: true, label: 'Calendar', icon: 'calendar-outline' },
    library: { visible: true, label: 'Library', icon: 'book-outline' },
    vault: { visible: true, label: 'Insights', icon: 'bar-chart-outline' },
    exchange: { visible: true, label: 'Garage', icon: 'pricetag-outline' },
    settings: { visible: true, label: 'Settings', icon: 'settings-outline' },
  },
  agendaTabs: [
    { id: 'timeline', label: 'Timeline', icon: 'time-outline' },
    { id: 'symptoms', label: 'Symptoms', icon: 'pulse-outline' },
    { id: 'kicks', label: 'Kick Counter', icon: 'hand-left-outline' },
  ],
  pillars: pregnancyPillars,
  vaultSections: [
    { key: 'ultrasound', title: 'Ultrasound Images', description: 'Upload your ultrasound photos by week', icon: 'image-outline', color: stickers.pink },
    { key: 'test_results', title: 'Test Results', description: 'Blood work, glucose test, screenings', icon: 'flask-outline', color: stickers.green },
    { key: 'birth_plan', title: 'Birth Plan', description: 'Your birth preferences and hospital bag', icon: 'document-text-outline', color: stickers.lilac },
    { key: 'insurance', title: 'Insurance & Coverage', description: 'Maternity coverage and claims', icon: 'card-outline', color: stickers.peach },
  ],
  exchangeFilters: ['All', 'Maternity Wear', 'Nursery Setup', 'Baby Gear', 'Books', 'Other'],
  aiContextLabel: 'pregnancy',
}

const KIDS_CONFIG: ModeConfig = {
  tabs: {
    index: { visible: true, label: 'Home', icon: 'home-outline' },
    agenda: { visible: true, label: 'Calendar', icon: 'calendar-outline' },
    library: { visible: true, label: 'Library', icon: 'book-outline' },
    vault: { visible: true, label: 'Insights', icon: 'bar-chart-outline' },
    exchange: { visible: true, label: 'Garage', icon: 'pricetag-outline' },
    settings: { visible: true, label: 'Settings', icon: 'settings-outline' },
  },
  agendaTabs: [
    { id: 'timeline', label: 'Timeline', icon: 'time-outline' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
  ],
  pillars: kidsPillars,
  vaultSections: [
    { key: 'exams', title: 'Exams & Lab Results', description: 'Blood work, checkups, and screenings', icon: 'flask-outline', color: stickers.pink },
    { key: 'hospital', title: 'Hospital Records', description: 'Birth records and hospital stays', icon: 'medkit-outline', color: stickers.green },
    { key: 'insurance', title: 'Insurance', description: 'Health insurance and claims', icon: 'card-outline', color: stickers.coral },
    { key: 'vaccines', title: 'Vaccine Records', description: 'Vaccination history and schedule', icon: 'shield-checkmark-outline', color: stickers.blue },
  ],
  exchangeFilters: ['All', 'Clothing', 'Toys', 'Gear', 'Furniture', 'Books', 'Other'],
  aiContextLabel: 'kids',
}

const MODE_CONFIGS: Record<JourneyMode, ModeConfig> = {
  'pre-pregnancy': PRE_PREGNANCY_CONFIG,
  'pregnancy': PREGNANCY_CONFIG,
  'kids': KIDS_CONFIG,
}

export function getModeConfig(mode: JourneyMode): ModeConfig {
  return MODE_CONFIGS[mode]
}

/**
 * Per-route tab visibility for a caregiver, applied on top of the existing
 * 5-route tab bar via each route's `href` (href:null hides a tab). Caregivers
 * get a decluttered bar: Home + You always; the calendar only if they can log;
 * education (library) and analytics (vault) are hidden. Grandma + the essentials
 * Card are home affordances, not tabs. UX-only; RLS is the boundary.
 */
export function getCaregiverTabVisibility(permissions: CaregiverPermissions) {
  // A paused caregiver has all capabilities revoked (mirrors hasCapability's
  // _paused gate), so the calendar tab hides too — logging is inert anyway.
  const canLog = permissions._paused !== true && permissions.log_activity === true
  return {
    index: true,
    agenda: canLog,
    library: false,
    vault: false,
    settings: true,
  }
}
