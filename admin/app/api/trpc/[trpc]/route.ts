import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/server/routers"
import { createContext } from "@/server/context"

// A stuck query should fail fast with an error the page can show, not hold the
// request (and a pooler connection) until Vercel kills it at 300 s.
export const maxDuration = 60

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  })

export { handler as GET, handler as POST }
