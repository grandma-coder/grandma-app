/**
 * Demo graph seed — synthetic users + care-circle + channel co-membership so the
 * Population graph has real structure to render before the real user base grows.
 *
 * EVERYTHING it creates is namespaced with the email suffix `@demo.grandma.invalid`
 * (an unroutable TLD), so it is unmistakable and trivially wipeable. It never
 * touches real rows.
 *
 * Usage (from grandma-command-center):
 *   node scripts/demo-graph-seed.mjs seed [count]   # default 40 users
 *   node scripts/demo-graph-seed.mjs wipe           # remove ALL demo rows
 *   node scripts/demo-graph-seed.mjs count          # how many demo rows exist
 *
 * Reads DATABASE_URL from .env.local. Dev-only — do not run against a DB whose
 * profiles/metrics you need pristine without wiping after.
 */
import { readFileSync } from "node:fs"
import postgres from "postgres"

const DEMO_SUFFIX = "@demo.grandma.invalid"
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const DATABASE_URL = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local")
  process.exit(1)
}
const sql = postgres(DATABASE_URL, { prepare: false })

// Deterministic pseudo-random (seeded) so re-seeds are stable without Date/Math.random surprises.
let _s = 1234567
function rnd() {
  _s = (_s * 1103515245 + 12345) & 0x7fffffff
  return _s / 0x7fffffff
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

const BEHAVIORS = ["cycle", "pregnancy", "kids"]
const TIERS = ["free", "free", "free", "premium_solo", "premium_family"]
const FIRST = ["Ana", "Bea", "Cara", "Dora", "Eve", "Fay", "Gia", "Hana", "Isa", "Jo", "Kim", "Lia", "Mae", "Nia", "Ola", "Pia", "Quin", "Rae", "Sol", "Tia"]
const LAST = ["R.", "M.", "S.", "L.", "K.", "P.", "B.", "T."]

async function currentDemoIds() {
  const rows = await sql`select id from profiles where email like ${"%" + DEMO_SUFFIX}`
  return Array.from(rows).map((r) => r.id)
}

async function wipe() {
  const ids = await currentDemoIds()
  if (ids.length === 0) {
    console.log("No demo rows to wipe.")
    return
  }
  // Order matters: dependent rows first.
  await sql`delete from channel_posts where author_id = any(${ids})`
  await sql`delete from channel_members where user_id = any(${ids})`
  await sql`delete from care_circle where owner_id = any(${ids}) or member_user_id = any(${ids})`
  await sql`delete from children where parent_id = any(${ids})`
  await sql`delete from behaviors where user_id = any(${ids})`
  await sql`delete from profiles where id = any(${ids})`
  // profiles.id → auth.users(id): remove the backing auth rows too.
  await sql`delete from auth.users where id = any(${ids})`
  console.log(`Wiped ${ids.length} demo users and all their linked rows.`)
}

async function seed(count) {
  await wipe() // idempotent — clear prior demo rows first
  const channels = Array.from(await sql`select id, name from channels`)
  if (channels.length === 0) {
    console.log("No channels exist — seed channels first; skipping channel links.")
  }

  // 1. Create users + a behavior each (some multi-behavior).
  const users = []
  for (let i = 0; i < count; i++) {
    const email = `demo${i}${DEMO_SUFFIX}`
    // profiles.id → auth.users(id): create the backing auth row first (only `id`
    // is strictly required; email included for readability).
    const [auth] = await sql`
      insert into auth.users (id, email, is_sso_user, is_anonymous)
      values (gen_random_uuid(), ${email}, false, false)
      returning id
    `
    const uid = auth.id
    await sql`
      insert into profiles (id, email, name, subscription_tier, journey_mode, created_at)
      values (${uid}, ${email}, ${pick(FIRST) + " " + pick(LAST)},
              ${pick(TIERS)}, ${pick(BEHAVIORS) === "cycle" ? "pre_pregnancy" : pick(BEHAVIORS)}, now())
    `
    users.push(uid)
    const primary = pick(BEHAVIORS)
    await sql`insert into behaviors (id, user_id, type, active, created_at) values (gen_random_uuid(), ${uid}, ${primary}, true, now())`
    if (rnd() < 0.3) {
      const second = pick(BEHAVIORS.filter((b) => b !== primary))
      await sql`insert into behaviors (id, user_id, type, active, created_at) values (gen_random_uuid(), ${uid}, ${second}, true, now())`
    }
  }

  // 2. Care-circle links between demo users (owner -> member), ~1.2 per user.
  let ccLinks = 0
  for (const owner of users) {
    const n = rnd() < 0.5 ? 1 : rnd() < 0.5 ? 2 : 0
    for (let k = 0; k < n; k++) {
      const member = pick(users)
      if (member === owner) continue
      await sql`
        insert into care_circle (id, owner_id, member_user_id, role, status, permissions, created_at)
        values (gen_random_uuid(), ${owner}, ${member}, ${pick(["partner", "nanny", "family"])},
                ${pick(["accepted", "accepted", "pending"])}, ${sql.array(pick([["view"], ["view", "log_activity"], ["view", "log_activity", "emergency"]]))}, now())
      `
      ccLinks++
    }
  }

  // 3. Channel co-membership + a post or two (co-membership = shared-channel edge).
  let members = 0
  if (channels.length) {
    for (const uid of users) {
      const joinN = 1 + Math.floor(rnd() * 3)
      const joined = new Set()
      for (let k = 0; k < joinN; k++) {
        const ch = pick(channels)
        if (joined.has(ch.id)) continue
        joined.add(ch.id)
        await sql`insert into channel_members (id, channel_id, user_id, created_at) values (gen_random_uuid(), ${ch.id}, ${uid}, now())`
        members++
        if (rnd() < 0.5) {
          await sql`insert into channel_posts (id, channel_id, author_id, content, created_at)
                    values (gen_random_uuid(), ${ch.id}, ${uid}, ${"Demo post from " + uid.slice(0, 6)}, now())`
        }
      }
    }
  }

  console.log(`Seeded ${users.length} demo users · ${ccLinks} care-circle links · ${members} channel memberships.`)
  console.log(`All tagged ${DEMO_SUFFIX} — run \`node scripts/demo-graph-seed.mjs wipe\` to remove.`)
}

const cmd = process.argv[2] ?? "count"
try {
  if (cmd === "seed") await seed(parseInt(process.argv[3] ?? "40", 10))
  else if (cmd === "wipe") await wipe()
  else {
    const ids = await currentDemoIds()
    console.log(`${ids.length} demo users currently in the DB (email like %${DEMO_SUFFIX}).`)
  }
} catch (e) {
  console.error("ERROR:", e.message)
} finally {
  await sql.end()
}
