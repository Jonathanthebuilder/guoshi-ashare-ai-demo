import type { AnalysisReport } from '@/types'

/** A route change must never relabel another security's report. */
export function getVisibleResearchReport(report: AnalysisReport | null, selectedSymbol: string, jobSymbol: string): AnalysisReport | null {
    if (!report) return null
    const normalize = (symbol: string) => symbol.trim().toUpperCase()
    const reportSymbol = report.symbol || report.instrument_context?.symbol || jobSymbol
    return normalize(reportSymbol) === normalize(selectedSymbol) ? report : null
}

export function getResearchExcerpt(content?: string, limit = 220): string {
    if (!content) return ''
    const text = content.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '')
        .replace(/^\s*\|.*$/gm, '').replace(/^\s*#{1,6}\s+/gm, '').replace(/\*\*/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
    return text.length > limit ? `${text.slice(0, limit)}…` : text
}

export function reconcileResearchDraft(current: string, previousPrefill: string | undefined, nextPrefill: string | undefined): string {
    return !current.trim() || current === previousPrefill ? nextPrefill || '' : current
}

/** Backward compatibility for reports carrying only explicit text fields. */
export function extractExplicitConfidence(text?: string): number | undefined {
    if (!text) return undefined
    const match = text.match(/置信度[:：]\s*(\d+)%/i) ?? text.match(/confidence[:：]\s*(\d+)%/i)
    if (!match) return undefined
    const value = Number(match[1])
    return value >= 0 && value <= 100 ? value : undefined
}

export function extractExplicitPrice(text: string | undefined, type: 'target' | 'stop'): number | undefined {
    if (!text) return undefined
    const patterns = type === 'target'
        ? [/目标价[:：]\s*[¥$]?\s*([\d.]+)/, /目标价格[:：]\s*[¥$]?\s*([\d.]+)/, /target[:：]\s*[¥$]?\s*([\d.]+)/i]
        : [/止损价[:：]\s*[¥$]?\s*([\d.]+)/, /止损价格[:：]\s*[¥$]?\s*([\d.]+)/, /stop[-\s_]?loss[:：]\s*[¥$]?\s*([\d.]+)/i]
    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) return parseFloat(match[1])
    }
    return undefined
}
