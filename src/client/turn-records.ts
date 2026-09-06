/**
 * Reading-view adapters for turn-scoped record kinds the native chat renders
 * with its own components (system-prompt, turn-process, turn-tail). Pure
 * helpers live here for unit coverage; the React components live in
 * TurnRecords.tsx. The payload types are structural subsets of the native
 * nodes, so the reading view keeps working when DSH adds fields to them.
 */

/** Structural subset of the native turn-process node payload. */
export interface TurnProcessData {
  readonly messageCount: number
  readonly toolCallCount: number
  readonly subagentCount: number
}

/** Structural subset of the native turn-tail node payload. */
export interface TurnTailData {
  readonly tokenUsage?: { readonly totalTokens: number } | null
  readonly tokensPerSecond?: number
  readonly ttftMs?: number
}

/** One-line summary for a turn-process record, mirroring the native label. */
export function turnProcessLabel(data: TurnProcessData): string {
  const labels: string[] = []
  if (data.toolCallCount > 0) labels.push(`${data.toolCallCount} 次工具调用`)
  if (data.messageCount > 0) labels.push(`${data.messageCount} 条消息`)
  if (data.subagentCount > 0) labels.push(`${data.subagentCount} 个 subagent`)
  return labels.length === 0 ? '已思考' : labels.join(' · ')
}

/** Compact token count, e.g. 1234 -> "1.2k", 123456 -> "123k". */
export function formatTokens(value: number): string {
  if (value >= 1000) {
    const k = value / 1000
    return `${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`
  }
  return String(value)
}

/** Compact one-line turn stats; null when the record carries no measurable data. */
export function turnTailStats(data: TurnTailData): string | null {
  const parts: string[] = []
  if (data.tokenUsage) parts.push(`约 ${formatTokens(data.tokenUsage.totalTokens)} tokens`)
  if (data.tokensPerSecond !== undefined && data.tokensPerSecond > 0) {
    parts.push(`${Math.round(data.tokensPerSecond * 10) / 10} tok/s`)
  }
  if (data.ttftMs !== undefined && data.ttftMs > 0) {
    parts.push(`首字 ${Math.round(data.ttftMs / 10) / 100}s`)
  }
  return parts.length === 0 ? null : parts.join(' · ')
}
