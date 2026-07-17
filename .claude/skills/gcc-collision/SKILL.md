---
name: gcc-collision
description: Check whether a teammate is already working on <slug> before you pick it up. Surfaces open/draft GitHub PRs and remote branches matching the work, plus assignee + status when a tracker exists. Triggered by /gcc-collision, "is anyone working on this", or "check before I start".
argument-hint: "[<slug> or empty to auto-detect from current branch]"
---

# gcc-collision

Reports who (if anyone) is already working on <slug>. The point: avoid two people building the same thing in parallel, and avoid forgetting work *you* already started.

All steps are read-only. No Ask → Confirm → Execute handshake is needed; just run the checks and report.

> **Recommended model:** `haiku` — collision checks are read-only lookups (git,
> PRs); a small model is plenty.

## Step 1 — Resolve the work id

Order:

1. If `$ARGUMENTS` is non-empty, use it as the topic/slug to search for.
2. Otherwise resolve the **topic/slug** from the current branch name — take the `<slug>` part of the `<type>/<slug>` shape (`git branch --show-current`).
3. Otherwise ask: "Which topic/keyword should I check?" and wait for one. Halt if the user can't supply a keyword.

## Step 2 — Identify the current user

Used to tag "you" vs teammates in the output.

```bash
gh api user --jq .login
```

Cache the GitHub login. If `gh` is unauthenticated or fails, continue without self-tagging — note `(could not resolve current user)` once at the top of the output and proceed.

## Step 3 — Gather signals (in parallel)

Run all three in parallel; handle failures independently — one tool being unavailable must not block the others.


### 3b. GitHub pull requests

Open + draft (drafts are included in `--state open`):

```bash
gh pr list --state open --search "<slug>" \
  --json number,title,author,isDraft,headRefName,url --limit 20
```

The `--search` query hits title and body. Branch-name-only matches (PRs whose title doesn't mention the work id) are caught by step 3c. Also check abandoned/closed-unmerged PRs:

```bash
gh pr list --state closed --search "<slug> is:unmerged" \
  --json number,title,author,headRefName,url --limit 5
```

For each PR, capture: `number`, `title`, `author.login`, `isDraft`, `headRefName`, `url`.

### 3c. Remote branches

Refresh remote-tracking refs first so we don't report stale state:

```bash
git fetch --prune origin --quiet
```

Then list every remote branch whose name contains the work id, with last-commit metadata:

```bash
git for-each-ref \
  --format='%(refname:short)|%(committerdate:iso-strict)|%(authorname)|%(authoremail)' \
  refs/remotes/origin/ \
  | grep -i "<slug>"
```

(The `for-each-ref` glob `*<slug>*` doesn't match dirs in refnames reliably; piping through `grep -i` is robust to any branch shape — `feature/<slug>-foo`, `matias/<slug>`, `<slug>-hotfix`, etc.)

For each match, compute age in days from `committerdate`. Tag branches with no commits in the last 30 days as `(stale, last commit Nd ago)`; otherwise `(last commit Nd ago)`.

If the user is offline / `git fetch` fails, fall back to the cached refs — and add a one-line note `(remote fetch failed, branch list may be stale)`.

## Step 4 — Synthesize the verdict

Determine the current-user collision state from the gathered signals:

- **You have code in flight** = current GitHub login authored at least one open PR on the work OR appears as the committer on a remote branch matching the work id.


Pick exactly one top-line verdict:

| Condition | Top line |
|-----------|----------|
| No signals at all (no PRs + no branches) | `✅ Clear — <slug> has no signals` |
| Current user has any branch or PR on the work | `⚠️ You're already working on this — <slug> (<your branch / your PR url>)` |
| Anything else (someone else has signals) | `⚠️ Taken — <slug>` |

Then list every signal as bullets, grouped under headers. Omit a header whose section is empty.

```text
⚠️ Taken — <slug>

PRs:
  #456 (draft) "feat: card animations" — alice
  https://github.com/le-zoo/aura/pull/456

Branches:
  origin/feature/<slug>-cards — bob, last commit 3d ago
  origin/matias/<slug>-prototype — you (stale, last commit 47d ago)
```

## Output rules

- One verdict per call. No follow-up questions on the happy path. No trailing summary.
- Always include URLs for PRs.
- Tag the current user as `you` in bullets so self-collisions stand out.
- If a signal source was skipped (e.g. `gh` unauthenticated, fetch failed), state it once in the relevant section; do not silently drop a check.
- If *every* signal source failed to run, surface that prominently and stop — a green ✅ from zero data would be misleading.
