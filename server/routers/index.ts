import { router, publicProcedure } from "../trpc"
import { usersRouter } from "./users"
import { metricsRouter } from "./metrics"
import { pushRouter } from "./push"
import { sentryRouter } from "./sentry"
import { communityRouter } from "./community"
import { teamRouter } from "./team"
import { notificationTemplatesRouter } from "./notificationTemplates"
import { notificationCopyRouter } from "./notificationCopy"
import { betaRouter } from "./beta"

/**
 * Root app router. Feature routers are added per phase.
 * `ping` is a health check for the tRPC wiring itself.
 */
export const appRouter = router({
  ping: publicProcedure.query(() => "pong"),
  users: usersRouter,
  metrics: metricsRouter,
  push: pushRouter,
  sentry: sentryRouter,
  community: communityRouter,
  team: teamRouter,
  notificationTemplates: notificationTemplatesRouter,
  notificationCopy: notificationCopyRouter,
  beta: betaRouter,
})

export type AppRouter = typeof appRouter
