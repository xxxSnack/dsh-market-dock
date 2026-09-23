// URL 工具 + TTL 缓存 + in-flight 去重。缓存容器挂在 core 上（每次 apply 一份）。

import { CACHE_MAX_KEYS } from './constants.js'

export function enc(s) {
  try { return encodeURIComponent(String(s)) } catch (e) { return String(s) }
}

export function toQuery(params) {
  const parts = []
  for (const k in params) {
    const v = params[k]
    if (v === undefined || v === null || v === '') continue
    parts.push(enc(k) + '=' + enc(v))
  }
  return parts.length ? '?' + parts.join('&') : ''
}

// ---- TTL 缓存 + in-flight 去重：同一 URL 在途请求共享同一个 Promise ----
export function installCache(core) {
  core.cache = new Map()   // key -> { at, value }
  core.inflight = new Map() // key -> Promise

  function cacheGet(key, ttl) {
    const e = core.cache.get(key)
    if (e && ttl > 0 && Date.now() - e.at < ttl) return e.value
    return undefined
  }

  // 淘汰：kline 的 begin 参数按分钟取整，每分钟产生新 URL → 新条目；不清理则无界泄漏。
  // 写入时顺手清一轮过期条目（O(n) 但 n 被 200 上限钳住），再按容量兜底删最旧。
  function cachePut(key, value) {
    core.cache.set(key, { at: Date.now(), value: value })
    if (core.cache.size > CACHE_MAX_KEYS) {
      const now = Date.now()
      for (const k of Array.from(core.cache.keys())) {
        const e = core.cache.get(k)
        // 无 TTL 元信息（各调用点 ttl 不同）：超过 24h 的条目一律可清
        if (now - e.at > 86400000) core.cache.delete(k)
      }
    }
    while (core.cache.size > CACHE_MAX_KEYS) {
      const oldest = core.cache.keys().next().value   // Map 保插入序，最旧在最前
      core.cache.delete(oldest)
    }
  }

  core.cacheGet = cacheGet
  core.cachePut = cachePut
}
