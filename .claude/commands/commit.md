# /commit

Create a conventional commit for grandma.app.

## Steps

1. Run `git status` and `git diff --cached` to see what's staged. If nothing is staged, run `git diff` to see unstaged changes and ask the user which files to include.

2. Scan staged files for issues before committing:
   - `console.log` / `console.error` left in production code → warn and ask to remove
   - `.env` or files with API keys accidentally staged → block and warn
   - `// TODO` or `// FIXME` in newly added lines → mention but don't block

3. Draft the commit message using this format:
   ```
   <emoji> <type>(<scope>): <short description>
   ```

   **Emoji + type mapping:**
   | Emoji | Type | When |
   |-------|------|------|
   | ✨ | feat | new feature or screen |
   | 🐛 | fix | bug fix |
   | 💄 | style | UI/design changes, no logic change |
   | ♻️ | refactor | restructuring without behavior change |
   | 🗄️ | db | Supabase migration or schema change |
   | 🤖 | ai | edge function or prompt changes |
   | ⚡️ | perf | performance improvement |
   | 🔒 | security | security fix |
   | 📦 | deps | dependency updates |
   | 🧹 | chore | config, tooling, cleanup |
   | 📝 | docs | README, CLAUDE.md, comments |

   **Scope** = the main area changed (e.g. `home`, `agenda`, `vault`, `channels`, `garage`, `auth`, `db`, `nana-chat`)

   **Examples:**
   ```
   ✨ feat(home): add sleep circle to kids premium dashboard
   🐛 fix(agenda): fix calendar dot not showing on selected date
   🗄️ db: add child_goals table with RLS policies
   🤖 ai(nana-chat): improve pregnancy week-specific prompts
   💄 style(vault): match emergency card to neon blue design system
   ```

4. Show the proposed commit message and ask for confirmation or edits.

5. Once confirmed, run:
   ```bash
   git commit -m "<message>"
   ```

6. After commit succeeds, show the one-line git log entry to confirm.

Never use `git add -A` without asking — only commit what the user has staged or explicitly approves.
