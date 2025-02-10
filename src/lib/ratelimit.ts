import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "./redis";

export const ratelimit = new Ratelimit({
  redis,
  //limiting to 1000 for dev, cause i like to spam refresh :))
  limiter: Ratelimit.slidingWindow(1000, "10s")
})
