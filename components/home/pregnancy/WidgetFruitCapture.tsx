/**
 * Draws this week's fruit off-screen once and saves it as a PNG for the pregnancy home-screen
 * widget (stored in useWidgetAssetStore; publishing picks it up). Renders nothing once captured.
 */
import { useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { BabyIllustration } from './babyIllustrations'
import { needsFruitCapture, useWidgetAssetStore } from '../../../store/useWidgetAssetStore'
import { reportError } from '../../../lib/sentry'

const SIZE = 160

export function WidgetFruitCapture({ week }: { week: number }) {
  const ref = useRef<View>(null)
  const needed = useWidgetAssetStore((s) => needsFruitCapture(week, s))
  const busy = useRef(false)
  if (!needed) return null

  const capture = async () => {
    if (busy.current || !ref.current) return
    busy.current = true
    try {
      const png = await captureRef(ref, { format: 'png', result: 'base64', width: SIZE, height: SIZE })
      useWidgetAssetStore.getState().setFruit(week, png)
    } catch (e) {
      reportError(e, { area: 'widgets', step: 'fruit-capture' })
    } finally {
      busy.current = false
    }
  }

  return (
    <View ref={ref} collapsable={false} style={styles.offscreen} onLayout={() => setTimeout(capture, 300)} pointerEvents="none">
      <BabyIllustration week={week} size={SIZE} />
    </View>
  )
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -1000, top: 0, width: SIZE, height: SIZE, backgroundColor: 'transparent' },
})
