// Jest setup — runs before each test file.
// Silence noisy native-module warnings and stub things that don't run in Node.

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
