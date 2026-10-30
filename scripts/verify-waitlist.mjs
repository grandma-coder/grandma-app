// Throwaway live check for migrations/0018_waitlist.sql. Uses unique test
// emails and deletes everything it creates. Run: node scripts/verify-waitlist.mjs
import postgres from "postgres"

const sql = postgres(process.env.DATABASE_URL, { prepare: false })
const tag = `verify-${Date.now()}`
const email = `${tag}@example.com`
const ip = `iphash-${tag}`
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1 } else console.log("ok:", m) }
const join = (e, name, mode, country, ipHash = ip) =>
  sql`select public.waitlist_join(${e}, ${name}, ${mode}, 'pt', ${country}, true, 'ig', 'social', 'launch', null, ${ipHash}) as r`

try {
  const [a] = await join(`  ${email.toUpperCase()} `, "Ana", "preg", "BR")
  assert(a.r === "ok", "first join ok")
  const [row1] = await sql`select * from public.waitlist where email = ${email}`
  assert(row1?.country === "BR", "country stored")

  await new Promise((r) => setTimeout(r, 1100))
  const [b] = await join(email, null, "kids", "US")
  assert(b.r === "ok", "repeat join ok")
  const rows = await sql`select * from public.waitlist where email = ${email}`
  assert(rows.length === 1, "one row")
  assert(rows[0].created_at.getTime() === row1.created_at.getTime(), "created_at unchanged")
  assert(rows[0].mode === "kids" && rows[0].country === "US", "mode + country updated")
  assert(rows[0].name === "Ana", "name kept when new name is null")
  assert(rows[0].utm_source === "ig", "first-touch utm kept")

  for (let i = 0; i < 4; i++) await join(`${tag}-${i}@example.com`, null, "pre", "BR")
  const [c] = await join(`${tag}-x@example.com`, null, "pre", "BR")
  assert(c.r === "rate_limited", "6th signup from same ip_hash in 1h is rate_limited")
  const [d] = await join(`${tag}-y@example.com`, null, "pre", "OTHER", null)
  assert(d.r === "ok", "null ip_hash not rate limited")

  let threw = false
  try { await join(`${tag}-z@example.com`, null, "pre", "DE", null) } catch { threw = true }
  assert(threw, "unknown country rejected by CHECK")

  const [{ has }] = await sql`select has_function_privilege('anon', 'public.waitlist_join(text,text,text,text,text,boolean,text,text,text,text,text)', 'execute') as has`
  assert(has === false, "anon cannot execute waitlist_join")
} finally {
  await sql`delete from public.beta_testers where email like ${tag + "%"}`
  await sql`delete from public.waitlist where email like ${tag + "%"}`
  await sql.end()
}
