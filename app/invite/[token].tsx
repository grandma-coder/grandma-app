/**
 * Legacy invite links (`grandma-app://invite/<token>`, sent by the old invite screen) — forward
 * to the accept flow so an already-sent link never lands on "page not found".
 */
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function LegacyInviteLink() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <Redirect href={`/accept-invite?token=${encodeURIComponent(String(token ?? ''))}` as never} />
}
