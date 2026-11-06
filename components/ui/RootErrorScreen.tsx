/**
 * Shown by the root ErrorBoundary when a screen throws while rendering — instead of a blank or
 * frozen app. Reports the error once and offers a retry. Deliberately dependency-light (no theme
 * provider, no queries): it must render even when the providers are what broke.
 */
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../lib/i18n'
import { reportError } from '../../lib/sentry'

const INK = '#141313'
const PAPER = '#FBF6EA'

export function RootErrorScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  useEffect(() => { reportError(error, { where: 'root-error-boundary' }) }, [error])
  return (
    <View style={styles.root} accessibilityRole="alert">
      <Text style={styles.title}>{t('rootError_title')}</Text>
      <Text style={styles.body}>{t('rootError_body')}</Text>
      <Pressable onPress={() => { void retry() }} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
        <Text style={styles.btnText}>{t('rootError_retry')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: INK, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 22, color: '#4A4744', textAlign: 'center' },
  btn: { marginTop: 8, borderWidth: 2, borderColor: INK, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: '#F9C846' },
  btnText: { fontSize: 16, fontWeight: '700', color: INK },
})
