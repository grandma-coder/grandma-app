/**
 * Legacy "Guru Grandma / Knowledge Pillars" chat screen — REMOVED.
 *
 * The live Grandma chat is `app/grandma-talk.tsx` (components/chat/GrandmaTalk),
 * reached from the center burst menu's "Grandma · voice·live" corner. This tab
 * slot is kept only to anchor that center button's position in the collage
 * strip (see app/(tabs)/_layout.tsx → `if (route.name === 'library')`). Anyone
 * who lands here directly is redirected to the live screen.
 */

import { Redirect } from 'expo-router'

export default function LibraryRedirect() {
  return <Redirect href="/grandma-talk" />
}
