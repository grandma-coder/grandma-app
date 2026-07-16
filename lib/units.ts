/**
 * Unit conversion + formatting helpers (Phase 0 / B4).
 *
 * Canonical storage is ALWAYS metric: weight in kg, temperature in °C, volume
 * in mL. These helpers convert to/from the user's chosen display units
 * (useUnitsStore) at the input/display boundary only — never change what's
 * written to the DB.
 */

import type { WeightUnit, TempUnit, VolumeUnit } from '../store/useUnitsStore'

// ─── Weight (canonical: kg) ────────────────────────────────────────────────

export const KG_PER_LB = 0.45359237

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lb' ? kg / KG_PER_LB : kg
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? value * KG_PER_LB : value
}

export function weightLabel(unit: WeightUnit): string {
  return unit === 'lb' ? 'lb' : 'kg'
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  return `${kgToDisplay(kg, unit).toFixed(decimals)} ${weightLabel(unit)}`
}

// ─── Temperature (canonical: °C) ───────────────────────────────────────────

export function cToDisplay(c: number, unit: TempUnit): number {
  return unit === 'f' ? c * 9 / 5 + 32 : c
}

export function displayToC(value: number, unit: TempUnit): number {
  return unit === 'f' ? (value - 32) * 5 / 9 : value
}

export function tempLabel(unit: TempUnit): string {
  return unit === 'f' ? '°F' : '°C'
}

export function formatTemp(c: number, unit: TempUnit, decimals = 1): string {
  return `${cToDisplay(c, unit).toFixed(decimals)}${tempLabel(unit)}`
}

// ─── Volume (canonical: mL) ────────────────────────────────────────────────

export const ML_PER_FLOZ = 29.5735

export function mlToDisplay(ml: number, unit: VolumeUnit): number {
  return unit === 'floz' ? ml / ML_PER_FLOZ : ml
}

export function displayToMl(value: number, unit: VolumeUnit): number {
  return unit === 'floz' ? value * ML_PER_FLOZ : value
}

export function volumeLabel(unit: VolumeUnit): string {
  return unit === 'floz' ? 'fl oz' : 'mL'
}

export function formatVolume(ml: number, unit: VolumeUnit, decimals = 0): string {
  return `${mlToDisplay(ml, unit).toFixed(decimals)} ${volumeLabel(unit)}`
}
