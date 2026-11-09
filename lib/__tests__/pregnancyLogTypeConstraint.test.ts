import fs from 'node:fs'
import path from 'node:path'

// Every pregnancy log form saves its PregnancyLogType as pregnancy_logs.log_type. If the
// database CHECK constraint doesn't list a type, that form fails to save for every user
// (nesting, birth_prep and exam_result did). This keeps the union and the latest
// constraint in the migrations in step.
const root = path.join(__dirname, '..', '..')

function unionMembers(): string[] {
  const src = fs.readFileSync(path.join(root, 'components/calendar/PregnancyLogRouter.tsx'), 'utf8')
  const m = src.match(/export type PregnancyLogType\s*=([^]*?)\n\n/)
  if (!m) throw new Error('PregnancyLogType union not found')
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
}

function latestConstraint(): string[] {
  const dir = path.join(root, 'supabase/migrations')
  let last: string | null = null
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8')
    for (const m of sql.matchAll(/ADD CONSTRAINT pregnancy_logs_log_type_check\s+CHECK\s*\(\s*log_type IN\s*\(([^)]*)\)/g)) last = m[1]
  }
  if (!last) throw new Error('pregnancy_logs_log_type_check not found in migrations')
  return [...last.matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
}

test('every pregnancy log type the app saves is allowed by the database', () => {
  const allowed = new Set(latestConstraint())
  expect(unionMembers().filter((t) => !allowed.has(t))).toEqual([])
})
