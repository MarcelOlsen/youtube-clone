'use client'

import { trpc } from "@/trpc/client"

export const PageClient = () => {
  const [{ greeting }] = trpc.hello.useSuspenseQuery({
    text: "skibidi"
  })
  return (
    <div>
      Page client says: {greeting}
    </div>
  )
}
