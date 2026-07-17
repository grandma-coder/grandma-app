import { router, publicProcedure } from "../trpc"
import { usersRouter } from "./users"
import { metricsRouter } from "./metrics"
import { pushRouter } from "./push"

/**
 * Root app router. Feature routers are added per phase.
 * `ping` is a health check for the tRPC wiring itself.
 */
export const appRouter = router({
  ping: publicProcedure.query(() => "pong"),
  users: usersRouter,
  metrics: metricsRouter,
  push: pushRouter,
})

export type AppRouter = typeof appRouter
