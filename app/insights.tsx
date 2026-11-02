/**
 * Insights Route — standalone screen accessible from Grandma wheel.
 *
 * This screen auto-generates AI insights (generate-insights edge function → Claude), so it sits
 * behind the same remote `grandma_chat` flag as the chat: off = no AI calls, the user lands on
 * the rule-based Insights tab instead.
 */

import { Redirect } from 'expo-router'
import { InsightsScreen } from '../components/insights/InsightsScreen'
import { useGrandmaChatEnabled } from '../store/useFeatureFlags'

export default function InsightsRoute() {
  if (!useGrandmaChatEnabled()) return <Redirect href="/(tabs)/vault" />
  return <InsightsScreen />
}
