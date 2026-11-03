import { describe, it, expect } from "vitest"
import { isTerminalTokenError } from "../types"
import { isOptedIn } from "../resolve-tokens"

describe("isTerminalTokenError", () => {
  it("flags permanently-dead tokens", () => {
    expect(isTerminalTokenError("DeviceNotRegistered")).toBe(true)
    expect(isTerminalTokenError("InvalidPushToken")).toBe(true)
  })
  it("does not flag transient errors or empties", () => {
    expect(isTerminalTokenError("MessageRateExceeded")).toBe(false)
    expect(isTerminalTokenError(null)).toBe(false)
    expect(isTerminalTokenError(undefined)).toBe(false)
  })
})

describe("isOptedIn (consent choke point)", () => {
  const prefsAllOn = { insights: true, appointments: true, cycle_predictions: true, milestones: true, care_circle: true, daily_reminder: true }
  const privacyMarketingOff = { marketing: false }
  const privacyMarketingOn = { marketing: true }

  it("broadcast requires explicit privacy_settings.marketing === true", () => {
    expect(isOptedIn("broadcast", prefsAllOn, privacyMarketingOff)).toBe(false)
    expect(isOptedIn("broadcast", prefsAllOn, privacyMarketingOn)).toBe(true)
    expect(isOptedIn("broadcast", prefsAllOn, null)).toBe(false)
  })

  it("content categories map to their notification_prefs toggle", () => {
    expect(isOptedIn("insights", { insights: true }, null)).toBe(true)
    expect(isOptedIn("insights", { insights: false }, null)).toBe(false)
    expect(isOptedIn("cycle", { cycle_predictions: false }, null)).toBe(false)
    expect(isOptedIn("milestones", { milestones: false }, null)).toBe(false)
  })

  it("defaults content categories to opted-IN when the toggle is missing", () => {
    expect(isOptedIn("insights", {}, null)).toBe(true)
    expect(isOptedIn("reminder", null, null)).toBe(true)
  })
})
