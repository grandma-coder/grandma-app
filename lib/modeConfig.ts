import type { JourneyMode, Pillar } from '../types'
import { pillars as kidsPillars } from './pillars'
import { pregnancyPillars } from './pregnancyPillars'
import { prePregPillars } from './prePregPillars'

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
    agenda: { visible: true, label: 'Planner', icon: 'calendar-outline' },
    library: { visible: true, label: 'Library', icon: 'book-outline' },
    vault: { visible: true, label: 'Analytics', icon: 'bar-chart-outline' },
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
    vault: { visible: true, label: 'Documents', icon: 'document-outline' },
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
    { key: 'ultrasound', title: 'Ultrasound Images', description: 'Upload your ultrasound photos by week', icon: 'image-outline', color: '#F9A8D4' },
    { key: 'test_results', title: 'Test Results', description: 'Blood work, glucose test, screenings', icon: 'flask-outline', color: '#86EFAC' },
    { key: 'birth_plan', title: 'Birth Plan', description: 'Your birth preferences and hospital bag', icon: 'document-text-outline', color: '#C4B5FD' },
    { key: 'insurance', title: 'Insurance & Coverage', description: 'Maternity coverage and claims', icon: 'card-outline', color: '#FDBA74' },
  ],
  exchangeFilters: ['All', 'Maternity Wear', 'Nursery Setup', 'Baby Gear', 'Books', 'Other'],
  aiContextLabel: 'pregnancy',
}

const KIDS_CONFIG: ModeConfig = {
  tabs: {
    index: { visible: true, label: 'Home', icon: 'home-outline' },
    agenda: { visible: true, label: 'Agenda', icon: 'calendar-outline' },
    library: { visible: true, label: 'Library', icon: 'book-outline' },
    vault: { visible: true, label: 'Vault', icon: 'shield-outline' },
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
    { key: 'exams', title: 'Exams & Lab Results', description: 'Blood work, checkups, and screenings', icon: 'flask-outline', color: '#FF8AD8' },
    { key: 'hospital', title: 'Hospital Records', description: 'Birth records and hospital stays', icon: 'medkit-outline', color: '#A2FF86' },
    { key: 'insurance', title: 'Insurance', description: 'Health insurance and claims', icon: 'card-outline', color: '#FF6B35' },
    { key: 'vaccines', title: 'Vaccine Records', description: 'Vaccination history and schedule', icon: 'shield-checkmark-outline', color: '#4D96FF' },
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
