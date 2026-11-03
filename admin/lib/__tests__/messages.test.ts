import { describe, expect, it } from "vitest"
import { pt } from "@/messages/pt"
import { en } from "@/messages/en"

type Tree = { [k: string]: string | Tree }
const leaves = (t: Tree, pre = ""): [string, string][] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [[pre + k, v] as [string, string]] : leaves(v, `${pre}${k}.`)))

describe("admin messages", () => {
  for (const ns of Object.keys(en) as (keyof typeof en)[]) {
    it(`${ns}: pt and en have the same keys`, () => {
      const a = leaves(en[ns] as Tree).map(([k]) => k).sort()
      const b = leaves(pt[ns] as Tree).map(([k]) => k).sort()
      expect(b).toEqual(a)
    })
    it(`${ns}: no empty strings`, () => {
      for (const [k, v] of [...leaves(en[ns] as Tree), ...leaves(pt[ns] as Tree)]) expect(v.trim(), k).not.toBe("")
    })
  }
  it("covers the same namespaces", () => expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort()))
})
