// Jest setup — runs before each test file.
// Silence noisy native-module warnings and stub things that don't run in Node.

// Dummy Supabase env so modules that import lib/supabase at load time (e.g.
// lib/examData) don't throw. Tests never hit the network — they exercise pure
// helpers; the client just needs to construct.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key'

// Suppress reanimated warning
jest.mock('react-native-reanimated', () => {
  try {
    return require('react-native-reanimated/mock')
  } catch {
    return {}
  }
})

// Stub haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// Stub AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)
