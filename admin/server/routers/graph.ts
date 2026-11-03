import { z } from "zod"
import { sql } from "drizzle-orm"
import { router, piiProcedure } from "../trpc"
import { db } from "@/db"
import { writeAudit } from "@/lib/audit"

/**
 * Relationship Explorer — assembles an EGO graph for one user: the user at the
 * center, then their children, care-circle (both directions — circles they own
 * and circles they're a member of), enrolled behaviors, subscription, and
 * community activity. Nodes + typed edges the client renders as a radial graph.
 *
 * This exposes a user's full relationship web (PII) → piiProcedure (admin) +
 * audited at the call site, same gate as users.detail.
 */

export type NodeKind = "user" | "child" | "caregiver" | "owner" | "behavior" | "subscription" | "community"
export type EdgeKind = "parent_of" | "caregiver_of" | "member_of" | "enrolled_in" | "subscribes" | "posts_in"

export interface GraphNode {
  id: string // stable within the graph
  kind: NodeKind
  label: string
  sublabel?: string | null
  /** For nodes that map to a console pillar, a link to jump there. */
  href?: string | null
  /** Extra facts shown on click. */
  meta?: Record<string, string | number | null>
}

export interface GraphEdge {
  source: string
  target: string
  kind: EdgeKind
  label?: string | null
}

export interface EgoGraph {
  centerId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface PopNode {
  id: string
  label: string
  behavior: string // primary behavior (pre_pregnancy | pregnancy | kids | none)
  tier: string
  degree: number // connection count → node size + god-node ranking
}
export interface PopEdge {
  source: string
  target: string
  kind: "care_circle" | "shared_channel"
  weight: number
}
export interface PopulationGraph {
  nodes: PopNode[]
  edges: PopEdge[]
  totalUsers: number
  shown: number
  capped: boolean
}

export const graphRouter = router({
  /**
   * Population graph — many users at once. Nodes are users (colored by primary
   * behavior, sized by connection degree); edges connect users who share a
   * care-circle link or co-occur in a channel. Capped at the top-N most-connected
   * users so the view stays readable + the query bounded — `capped`/`shown`/
   * `totalUsers` report exactly what's included (never a silent truncation).
   * PII (the whole social graph) → piiProcedure (admin) + audited.
   */
  population: piiProcedure
    .input(z.object({ limit: z.number().int().min(10).max(400).default(150) }))
    .query(async ({ ctx, input }): Promise<PopulationGraph> => {
      // 1. Undirected user↔user edges from two sources, de-duped + weighted.
      //    (a) care-circle: owner ↔ member
      //    (b) shared channel: two authors/members in the same channel
      const edgeRows = await db.execute<{ a: string; b: string; kind: string; weight: number }>(sql`
        with cc as (
          select least(owner_id, member_user_id) as a, greatest(owner_id, member_user_id) as b
          from care_circle
          where member_user_id is not null and owner_id <> member_user_id
        ),
        chan_users as (
          select distinct channel_id, user_id from channel_members where user_id is not null
          union
          select distinct channel_id, author_id as user_id from channel_posts where author_id is not null
        ),
        shared as (
          select least(u1.user_id, u2.user_id) as a, greatest(u1.user_id, u2.user_id) as b, count(*)::int as w
          from chan_users u1
          join chan_users u2 on u1.channel_id = u2.channel_id and u1.user_id < u2.user_id
          group by 1, 2
        )
        select a, b, 'care_circle' as kind, count(*)::int as weight from cc group by a, b
        union all
        select a, b, 'shared_channel' as kind, w as weight from shared
      `)
      const rawEdges = Array.from(edgeRows)

      // 2. Degree per user (weighted by edge count, care+channel combined).
      const degree = new Map<string, number>()
      for (const e of rawEdges) {
        degree.set(e.a, (degree.get(e.a) ?? 0) + 1)
        degree.set(e.b, (degree.get(e.b) ?? 0) + 1)
      }

      // 3. Total user count + the top-N connected users to actually render.
      const totalRes = await db.execute<{ n: number }>(sql`select count(*)::int as n from profiles`)
      const totalUsers = Number(Array.from(totalRes)[0]?.n ?? 0)

      const topIds = Array.from(degree.entries())
        .sort((x, y) => y[1] - x[1])
        .slice(0, input.limit)
        .map(([id]) => id)
      const keep = new Set(topIds)

      if (keep.size === 0) {
        return { nodes: [], edges: [], totalUsers, shown: 0, capped: false }
      }

      // 4. Hydrate the kept nodes with label + behavior + tier.
      // Build the id array explicitly (array[...]::uuid[]) — Drizzle's sql
      // template doesn't serialize a raw JS array into a Postgres array, so
      // `any(${jsArray})` throws. Mirrors lib/expo/resolve-tokens.ts.
      const idArray = sql`array[${sql.join(topIds.map((id) => sql`${id}::uuid`), sql`, `)}]`
      const profRows = await db.execute<{
        id: string
        email: string | null
        name: string | null
        subscription_tier: string | null
        behavior: string | null
      }>(sql`
        select p.id, p.email, p.name, p.subscription_tier,
               (select b.type from behaviors b where b.user_id = p.id and b.active order by b.created_at limit 1) as behavior
        from profiles p
        where p.id = any(${idArray})
      `)
      const nodes: PopNode[] = Array.from(profRows).map((p) => ({
        id: p.id,
        label: p.name ?? p.email ?? p.id.slice(0, 8),
        behavior: (p.behavior === "cycle" ? "pre_pregnancy" : p.behavior) ?? "none",
        tier: p.subscription_tier ?? "free",
        degree: degree.get(p.id) ?? 0,
      }))

      // 5. Keep only edges between two kept nodes.
      const edges: PopEdge[] = rawEdges
        .filter((e) => keep.has(e.a) && keep.has(e.b))
        .map((e) => ({ source: e.a, target: e.b, kind: e.kind as PopEdge["kind"], weight: Number(e.weight) }))

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "graph.population.view",
        meta: { totalUsers, shown: nodes.length, edges: edges.length, limit: input.limit },
      })

      return {
        nodes,
        edges,
        totalUsers,
        shown: nodes.length,
        capped: degree.size > input.limit,
      }
    }),

  ego: piiProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }): Promise<EgoGraph> => {
    const uid = input.userId
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const seen = new Set<string>()
    const add = (n: GraphNode) => {
      if (seen.has(n.id)) return
      seen.add(n.id)
      nodes.push(n)
    }

    // ── Center user ─────────────────────────────────────────────────────────
    const profRows = await db.execute<{
      id: string
      email: string | null
      subscription_tier: string | null
      subscription_status: string | null
      journey_mode: string | null
    }>(sql`
      select id, email, subscription_tier, subscription_status, journey_mode
      from profiles where id = ${uid} limit 1
    `)
    const prof = Array.from(profRows)[0]
    if (!prof) {
      return { centerId: uid, nodes: [], edges: [] }
    }
    add({
      id: uid,
      kind: "user",
      label: prof.email ?? uid.slice(0, 8),
      sublabel: "user",
      href: `/users/${uid}`,
      meta: { tier: prof.subscription_tier ?? "free", status: prof.subscription_status ?? "—" },
    })

    // Subscription node (only when paid — free is the default, no edge noise).
    if (prof.subscription_tier && prof.subscription_tier !== "free") {
      const subId = `sub:${uid}`
      add({
        id: subId,
        kind: "subscription",
        label: prof.subscription_tier,
        sublabel: prof.subscription_status ?? null,
        href: "/revenue",
      })
      edges.push({ source: uid, target: subId, kind: "subscribes" })
    }

    // ── Behaviors (enrolled journeys) ───────────────────────────────────────
    const behaviorRows = await db.execute<{ type: string; active: boolean }>(sql`
      select type, active from behaviors where user_id = ${uid}
    `)
    for (const b of Array.from(behaviorRows)) {
      const norm = b.type === "cycle" ? "pre_pregnancy" : b.type
      const bId = `behavior:${uid}:${b.type}`
      add({
        id: bId,
        kind: "behavior",
        label: norm.replace(/_/g, "-"),
        sublabel: b.active ? "active" : "inactive",
      })
      edges.push({ source: uid, target: bId, kind: "enrolled_in" })
    }

    // ── Children (this user is the parent) ──────────────────────────────────
    const childRows = await db.execute<{ id: string; name: string | null; birth_date: string | null }>(sql`
      select id, name, to_char(birth_date,'YYYY-MM-DD') as birth_date
      from children where parent_id = ${uid}
    `)
    const childIds: string[] = []
    for (const c of Array.from(childRows)) {
      childIds.push(c.id)
      add({
        id: `child:${c.id}`,
        kind: "child",
        label: c.name ?? "Child",
        sublabel: "child",
        meta: { born: c.birth_date ?? "—" },
      })
      edges.push({ source: uid, target: `child:${c.id}`, kind: "parent_of" })
    }

    // ── Care-circle the user OWNS (their caregivers) ────────────────────────
    const owned = await db.execute<{
      member_user_id: string | null
      role: string | null
      permissions: string[] | null
      status: string | null
      invite_email: string | null
      invite_name: string | null
      children_access: string[] | null
    }>(sql`
      select member_user_id, role, permissions, status, invite_email, invite_name, children_access
      from care_circle where owner_id = ${uid}
    `)
    for (const m of Array.from(owned)) {
      const label = m.invite_name ?? m.invite_email ?? (m.member_user_id ? m.member_user_id.slice(0, 8) : "invited")
      const cgId = `caregiver:${m.member_user_id ?? m.invite_email ?? label}`
      add({
        id: cgId,
        kind: "caregiver",
        label,
        sublabel: m.role ?? "caregiver",
        href: m.member_user_id ? `/users/${m.member_user_id}` : null,
        meta: {
          status: m.status ?? "—",
          permissions: (m.permissions ?? []).join(", ") || "—",
          children: (m.children_access ?? []).length || "all",
        },
      })
      edges.push({ source: uid, target: cgId, kind: "caregiver_of", label: m.role ?? null })
    }

    // ── Care-circles the user is a MEMBER of (whose child they help with) ────
    const memberOf = await db.execute<{ owner_id: string; role: string | null; owner_email: string | null; status: string | null }>(sql`
      select cc.owner_id, cc.role, cc.status, p.email as owner_email
      from care_circle cc
      left join profiles p on p.id = cc.owner_id
      where cc.member_user_id = ${uid}
    `)
    for (const o of Array.from(memberOf)) {
      const ownId = `owner:${o.owner_id}`
      add({
        id: ownId,
        kind: "owner",
        label: o.owner_email ?? o.owner_id.slice(0, 8),
        sublabel: `owner · ${o.role ?? "caregiver"}`,
        href: `/users/${o.owner_id}`,
        meta: { status: o.status ?? "—" },
      })
      edges.push({ source: ownId, target: uid, kind: "member_of", label: o.role ?? null })
    }

    // ── Community activity (channels the user posts in) ──────────────────────
    const channels = await db.execute<{ channel_id: string; name: string | null; posts: number }>(sql`
      select p.channel_id, c.name, count(*)::int as posts
      from channel_posts p
      left join channels c on c.id = p.channel_id
      where p.author_id = ${uid}
      group by p.channel_id, c.name
      order by posts desc
      limit 6
    `)
    for (const ch of Array.from(channels)) {
      const chId = `channel:${ch.channel_id}`
      add({
        id: chId,
        kind: "community",
        label: ch.name ?? "channel",
        sublabel: `${ch.posts} post${ch.posts === 1 ? "" : "s"}`,
        href: "/community",
      })
      edges.push({ source: uid, target: chId, kind: "posts_in", label: `${ch.posts}` })
    }

    await writeAudit({
      actorEmail: ctx.userEmail ?? "unknown",
      action: "graph.ego.view",
      target: uid,
      meta: { nodes: nodes.length, edges: edges.length, children: childIds.length },
    })

    return { centerId: uid, nodes, edges }
  }),
})
