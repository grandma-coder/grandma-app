/**
 * ScribbleUnderline — hand-drawn wavy underline under a word.
 *
 * Wrap inline text like: <ScribbleUnderline><Text>cycle</Text></ScribbleUnderline>
 * The SVG underline sits just below, sized to the child measured width.
 */

import { ReactNode, useState } from 'react'
import { View, LayoutChangeEvent, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '../../constants/theme'

interface ScribbleUnderlineProps {
  children: ReactNode
  color?: string
  strokeWidth?: number
  gap?: number
}

export function ScribbleUnderline({
  children,
  color,
  strokeWidth = 2,
  gap = 2,
}: ScribbleUnderlineProps) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w !== width) setWidth(w)
  }

  const stroke = color ?? colors.text

  return (
    <View style={styles.wrap}>
      <View onLayout={onLayout}>{children}</View>
      {width > 0 && (
        <Svg
          width={width}
          height={8}
          viewBox="0 0 120 10"
          preserveAspectRatio="none"
          style={{ marginTop: gap }}
        >
          <Path
            d="M2 6 Q 30 2 60 5 T 118 4"
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
})
