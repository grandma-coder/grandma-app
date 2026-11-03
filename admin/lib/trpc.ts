"use client"
import { createTRPCReact } from "@trpc/react-query"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/routers"

export const trpc = createTRPCReact<AppRouter>()

/** Inferred input/output types for every procedure — e.g. RouterOutputs["push"]["list"]. */
export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>
