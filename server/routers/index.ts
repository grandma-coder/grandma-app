import { router, publicProcedure } from "../trpc"

/**
 * Root app router. Feature routers (users, metrics, push, sentry) are added in
 * their respective phases. `ping` is a health check for the tRPC wiring itself.
 */
export const appRouter = router({
  ping: publicProcedure.query(() => "pong"),
})

export type AppRouter = typeof appRouter
