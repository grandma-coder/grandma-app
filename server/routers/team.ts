import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { clerkClient } from "@clerk/nextjs/server"
import { router, protectedProcedure, adminProcedure } from "../trpc"
import { writeAudit } from "@/lib/audit"
import type { Role } from "../context"

export interface TeamMember {
  id: string
  email: string | null
  name: string | null
  role: Role
  imageUrl: string | null
  lastActiveAt: string | null
  createdAt: string | null
  isSelf: boolean
}

export interface PendingInvite {
  id: string
  email: string
  role: Role
  createdAt: string | null
  status: string
}

const roleSchema = z.enum(["admin", "viewer"])

/**
 * Team / Admin panel — manages who can reach the command center and at what
 * level. Clerk is the source of truth: a person is on the team if they're a
 * Clerk user of this app with a role in publicMetadata, or they hold a pending
 * invitation. There is no separate DB table and no env-var editing to add
 * someone — an admin sends an invite from the UI and the person is in.
 *
 * Every mutation is admin-only AND written to admin_audit_log with the actor.
 */
export const teamRouter = router({
  /**
   * Current team roster + pending invitations. Admin-only: the whole panel is
   * an admin surface, so even reading the roster is gated (matches "should be
   * an admin panel").
   */
  roster: adminProcedure.query(async ({ ctx }) => {
    const client = await clerkClient()

    const [userList, inviteList] = await Promise.all([
      client.users.getUserList({ limit: 100, orderBy: "-created_at" }),
      client.invitations.getInvitationList({ status: "pending", limit: 100 }),
    ])

    const members: TeamMember[] = userList.data.map((u) => {
      const email =
        u.primaryEmailAddress?.emailAddress ??
        u.emailAddresses[0]?.emailAddress ??
        null
      const role = ((u.publicMetadata as { role?: Role } | undefined)?.role ?? "viewer") as Role
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null
      return {
        id: u.id,
        email,
        name,
        role,
        imageUrl: u.imageUrl ?? null,
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt).toISOString() : null,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        isSelf: u.id === ctx.userId,
      }
    })

    const invites: PendingInvite[] = inviteList.data.map((i) => ({
      id: i.id,
      email: i.emailAddress,
      role: ((i.publicMetadata as { role?: Role } | undefined)?.role ?? "viewer") as Role,
      createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : null,
      status: i.status,
    }))

    return { members, invites }
  }),

  /**
   * Send a Clerk invitation. The invited role is stamped onto the invitation's
   * publicMetadata; Clerk copies it onto the user record when they accept, so
   * the new teammate lands with the right role on first sign-in. Idempotent-ish:
   * Clerk rejects a duplicate pending invite with a clear error we surface.
   */
  invite: adminProcedure
    .input(z.object({ email: z.string().email(), role: roleSchema.default("viewer") }))
    .mutation(async ({ ctx, input }) => {
      const client = await clerkClient()
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? undefined

      try {
        const invite = await client.invitations.createInvitation({
          emailAddress: input.email,
          publicMetadata: { role: input.role },
          redirectUrl: appUrl ? `${appUrl}/sign-in` : undefined,
          ignoreExisting: false,
        })

        await writeAudit({
          actorEmail: ctx.userEmail ?? "unknown",
          action: "team.invite.send",
          target: input.email,
          meta: { role: input.role },
        })

        return { id: invite.id, email: invite.emailAddress, role: input.role }
      } catch (err) {
        const message =
          err instanceof Error && /already/i.test(err.message)
            ? "That email already has a pending invite or an account."
            : "Could not send the invite. Check the email and try again."
        throw new TRPCError({ code: "BAD_REQUEST", message })
      }
    }),

  /** Revoke a pending invitation (before it's accepted). */
  revokeInvite: adminProcedure
    .input(z.object({ invitationId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const client = await clerkClient()
      await client.invitations.revokeInvitation(input.invitationId)
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "team.invite.revoke",
        target: input.email,
      })
      return { ok: true }
    }),

  /**
   * Change a member's role. Guards against an admin removing their own admin
   * rights (would lock them out of the panel) and requires at least one admin
   * to remain, so the team can never end up with zero admins.
   */
  setRole: adminProcedure
    .input(z.object({ userId: z.string(), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.userId && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can't remove your own admin role.",
        })
      }

      const client = await clerkClient()

      if (input.role !== "admin") {
        // Don't allow demoting the last remaining admin.
        const list = await client.users.getUserList({ limit: 100 })
        const admins = list.data.filter(
          (u) => (u.publicMetadata as { role?: Role } | undefined)?.role === "admin",
        )
        if (admins.length <= 1 && admins.some((u) => u.id === input.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This is the last admin — promote someone else first.",
          })
        }
      }

      const target = await client.users.getUser(input.userId).catch(() => null)
      await client.users.updateUserMetadata(input.userId, {
        publicMetadata: { role: input.role },
      })

      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "team.role.set",
        target: target?.primaryEmailAddress?.emailAddress ?? input.userId,
        meta: { role: input.role },
      })

      return { ok: true }
    }),

  /**
   * Remove a member entirely (deletes the Clerk user for this app). Can't remove
   * yourself. This fully revokes access on the next request.
   */
  remove: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't remove yourself." })
      }
      const client = await clerkClient()
      const target = await client.users.getUser(input.userId).catch(() => null)
      await client.users.deleteUser(input.userId)
      await writeAudit({
        actorEmail: ctx.userEmail ?? "unknown",
        action: "team.member.remove",
        target: target?.primaryEmailAddress?.emailAddress ?? input.userId,
      })
      return { ok: true }
    }),

  /** Lightweight self-check used by the panel to show the current actor. viewer+ */
  whoami: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
    email: ctx.userEmail,
    role: ctx.role,
  })),
})
