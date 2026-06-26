import { CAPABILITY, hasCapability, isCaregiver } from '../caregiverPermissions'
import type { CaregiverPermissions, CaregiverRole, ChildWithRole } from '../../types'

// Minimal ChildWithRole fixture — only the fields the helper reads matter.
function child(
  caregiverRole: CaregiverRole,
  permissions: Partial<CaregiverPermissions>,
): ChildWithRole {
  return {
    id: 'child-1',
    name: 'Test',
    caregiverRole,
    permissions: permissions as CaregiverPermissions,
  } as ChildWithRole
}

describe('hasCapability', () => {
  it('returns true for every flag for an owner, even flags absent from the JSONB', () => {
    const owner = child('parent', {})
    expect(hasCapability(owner, CAPABILITY.VIEW)).toBe(true)
    expect(hasCapability(owner, CAPABILITY.LOG_ACTIVITY)).toBe(true)
    expect(hasCapability(owner, CAPABILITY.CHAT)).toBe(true)
    expect(hasCapability(owner, CAPABILITY.EMERGENCY)).toBe(true)
    expect(hasCapability(owner, CAPABILITY.EDIT_CHILD)).toBe(true)
  })

  it('reflects granted flags for a caregiver and withholds the rest', () => {
    const nanny = child('nanny', { view: true, log_activity: true })
    expect(hasCapability(nanny, CAPABILITY.VIEW)).toBe(true)
    expect(hasCapability(nanny, CAPABILITY.LOG_ACTIVITY)).toBe(true)
    expect(hasCapability(nanny, CAPABILITY.EMERGENCY)).toBe(false)
    expect(hasCapability(nanny, CAPABILITY.EDIT_CHILD)).toBe(false)
    expect(hasCapability(nanny, CAPABILITY.CHAT)).toBe(false)
  })

  it('returns false for all flags when a caregiver is paused, even ones granted', () => {
    const paused = child('nanny', {
      view: true,
      log_activity: true,
      emergency: true,
      _paused: true,
    })
    expect(hasCapability(paused, CAPABILITY.VIEW)).toBe(false)
    expect(hasCapability(paused, CAPABILITY.LOG_ACTIVITY)).toBe(false)
    expect(hasCapability(paused, CAPABILITY.EMERGENCY)).toBe(false)
  })

  it('returns false for a null or undefined child without throwing', () => {
    expect(hasCapability(null, CAPABILITY.VIEW)).toBe(false)
    expect(hasCapability(undefined, CAPABILITY.LOG_ACTIVITY)).toBe(false)
  })

  it('treats a missing permissions object as no access', () => {
    const broken = { id: 'x', name: 'X', caregiverRole: 'nanny' } as ChildWithRole
    expect(hasCapability(broken, CAPABILITY.VIEW)).toBe(false)
  })
})

describe('isCaregiver', () => {
  it('is false for a parent', () => {
    expect(isCaregiver(child('parent', {}))).toBe(false)
  })

  it('is true for a nanny and a family caregiver', () => {
    expect(isCaregiver(child('nanny', {}))).toBe(true)
    expect(isCaregiver(child('family', {}))).toBe(true)
  })

  it('is false for a null child', () => {
    expect(isCaregiver(null)).toBe(false)
  })
})
