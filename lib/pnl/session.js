/**
 * dsh-ths-pnl — A 股交易时段判定（纯函数，可测试，无依赖）
 *
 * 一切以**北京时间**（UTC+8）为准，不依赖机器本地时区。
 * 中国 1991 年后无夏令时，所以固定偏移即可；读取时用 UTC getter 拿到"北京墙上时间"。
 *
 * 时段划分：
 *   09:30–11:30  上午盘（含 09:30 边界）
 *   11:31–12:59  午间休市
 *   13:00–15:00  下午盘（含 15:00 边界）
 *   其余         盘前 / 收盘后 / 周末
 *
 * 已知边界：**法定节假日无法离线判断** —— 节假日按交易日处理，会照常轮询，
 * 但账本返回的是上一个交易日的收盘值（数值不变，因此界面不会"持续跳动"）。
 */

/** 中国标准时间 UTC+8（毫秒）。 */
export const CS_OFFSET_MS = 8 * 60 * 60 * 1000

/** 09:30 开盘。 */
export const OPEN_MIN = 9 * 60 + 30
/** 11:30 上午收盘。 */
export const MORNING_END_MIN = 11 * 60 + 30
/** 13:00 下午开盘。 */
export const AFTERNOON_START_MIN = 13 * 60
/** 15:00 收盘。 */
export const CLOSE_MIN = 15 * 60

/**
 * 调度边界（北京时间，必须按时间升序）：定时器与客户端都只在这些时刻醒来。
 *
 * **13:00 必须在这里** —— 它不算"每天必须拉一次"的硬边界，但它是午休的出口：
 * 11:31 起客户端会睡到"下一个边界"，若边界表里没有 13:00，这一觉直接睡到 15:00，
 * 整个下午盘不会发出任何请求，角标就一路冻结在「午间」。
 */
export const BOUNDARIES = [
  [9, 30],
  [13, 0],
  [15, 0],
]

function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

/** 把瞬时时间平移到"北京墙上时间"，随后用 getUTC* 读取即可。 */
export function beijing(now = new Date()) {
  return new Date(now.getTime() + CS_OFFSET_MS)
}

/** 由北京墙上时间的年月日构造真实瞬时（UTC Date）。 */
export function beijingInstant(year, month /* 1-12 */, day, hour, minute) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - CS_OFFSET_MS)
}

/**
 * 当前所处时段。
 * @returns {{date:string, minutes:number, weekday:number, weekend:boolean,
 *            state:'pre'|'morning'|'lunch'|'afternoon'|'after'|'weekend',
 *            inSession:boolean, isTradingDay:boolean}}
 */
export function sessionInfo(now = new Date()) {
  const b = beijing(now)
  const year = b.getUTCFullYear()
  const month = b.getUTCMonth() + 1
  const day = b.getUTCDate()
  const weekday = b.getUTCDay() // 0=周日
  const minutes = b.getUTCHours() * 60 + b.getUTCMinutes()
  const weekend = weekday === 0 || weekday === 6

  let state
  if (weekend) state = 'weekend'
  else if (minutes < OPEN_MIN) state = 'pre'
  else if (minutes <= MORNING_END_MIN) state = 'morning'
  else if (minutes < AFTERNOON_START_MIN) state = 'lunch'
  else if (minutes <= CLOSE_MIN) state = 'afternoon'
  else state = 'after'

  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    minutes,
    weekday,
    weekend,
    state,
    inSession: state === 'morning' || state === 'afternoon',
    isTradingDay: !weekend,
  }
}

/**
 * 边界容差：**刚过去不到这么久的边界仍算作"下一个"**。
 *
 * 为什么需要：宿主定时器若比边界早 1 毫秒触发，严格"只取未来"的实现会把这次
 * 边界整个跳过、直接排到下一个（明天 09:30），于是 15:00 的收盘拉取就丢了 ——
 * 而"每天 09:30 / 15:00 必须各拉一次"是硬需求。给一点回看窗口即可消除这个竞态。
 */
export const BOUNDARY_TOLERANCE_MS = 1500

/**
 * 下一个边界时刻（09:30 / 13:00 / 15:00，跳过周末）。
 * @returns {Date|null} 真实瞬时；找不到（异常）时返回 null。
 */
export function nextBoundary(now = new Date()) {
  const b = beijing(now)
  const base = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  for (let i = 0; i < 10; i++) {
    const d = new Date(base + i * 24 * 60 * 60 * 1000)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) continue
    for (const [hour, minute] of BOUNDARIES) {
      const instant = beijingInstant(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute)
      if (instant.getTime() > now.getTime() - BOUNDARY_TOLERANCE_MS) return instant
    }
  }
  return null
}

/** 距下一个边界的毫秒数（找不到时给一个保守的 1 小时）。 */
export function msUntilNextBoundary(now = new Date()) {
  const next = nextBoundary(now)
  if (next === null) return 60 * 60 * 1000
  return Math.max(1000, next.getTime() - now.getTime())
}

/**
 * 该不该去账本拉一次？
 *
 * 规则（按优先级）：
 *   1. 从未有过快照 → 拉一次（否则非交易时段首次安装会一直空白）；
 *   2. 盘中（含 09:30 与 15:00 两个边界）→ 拉；
 *   3. 收盘后且**今天还没拉过收盘值** → 拉一次（保证 15:00 那次落到收盘价）；
 *   4. 开盘后且**今天还没拉过** → 拉一次（保证 09:30 那次，比如服务刚启动）；
 *   5. 其余（盘前 / 午间 / 收盘后已拉过 / 周末已有快照）→ 不拉，用缓存值。
 *
 * @param {object} info - sessionInfo(now)
 * @param {object|null} snap - 已缓存的快照（含 sessionDate / closeDate）
 * @returns {boolean}
 */
export function shouldFetch(info, snap) {
  if (snap === null || snap === undefined) return true
  if (info.inSession) return true
  if (!info.isTradingDay) return false
  if (info.minutes >= CLOSE_MIN && snap.closeDate !== info.date) return true
  if (info.minutes >= OPEN_MIN && snap.sessionDate !== info.date) return true
  return false
}

/** 客户端下次轮询间隔：盘中按心跳；盘外直接睡到下一个边界。 */
export function nextPollMs(info, now = new Date(), heartbeatMs = 60_000) {
  if (info.inSession) return heartbeatMs
  return Math.max(30_000, msUntilNextBoundary(now) + 1500)
}
