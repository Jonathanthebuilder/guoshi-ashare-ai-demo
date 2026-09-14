import { describe, expect, it } from 'vitest'
import { getVisibleResearchReport, getResearchExcerpt, reconcileResearchDraft } from './researchView'

describe('research subject association', () => {
    it('does not show a saved security conclusion under a different requested security', () => {
        expect(getVisibleResearchReport({ symbol: '600519.SH', trade_date: '2026-09-10', decision: 'BUY' }, '300750.SZ', '600519.SH')).toBeNull()
    })
    it('accepts matching security codes regardless of case and surrounding whitespace', () => {
        const report = { symbol: '600519.SH', trade_date: '2026-09-10' }
        expect(getVisibleResearchReport(report, ' 600519.sh ', '600519.SH')).toBe(report)
    })
    it('associates partial streamed reports with the active job and never another security', () => {
        const partial = { market_report: '价格波动扩大' } as Parameters<typeof getVisibleResearchReport>[0]
        expect(getVisibleResearchReport(partial, '300750.SZ', '300750.SZ')).toBe(partial)
        expect(getVisibleResearchReport(partial, '600519.SH', '300750.SZ')).toBeNull()
    })
})

describe('research excerpt', () => {
    it('keeps raw table markup out of the prose preview', () => {
        expect(getResearchExcerpt('经营改善。\n| 指标 | 数值 |\n| --- | --- |\n| 盈利 | 10 |\n仍需观察。')).toBe('经营改善。 仍需观察。')
    })
    it('omits model protocol blocks and markdown syntax from the visible summary', () => {
        expect(getResearchExcerpt('<!-- VERDICT: {"direction":"看多"} -->\n## 核心判断\n**盈利改善**，仍需观察订单。')).toBe('核心判断 盈利改善，仍需观察订单。')
    })
    it('does not invent a conclusion for missing content', () => {
        expect(getResearchExcerpt(undefined)).toBe('')
    })
})

describe('research request draft', () => {
    it('updates an untouched symbol prefill when the requested security changes', () => {
        expect(reconcileResearchDraft('分析 600519.SH', '分析 600519.SH', '分析 300750.SZ')).toBe('分析 300750.SZ')
    })
    it('preserves a user-edited research question', () => {
        expect(reconcileResearchDraft('对比两家公司估值', '分析 600519.SH', '分析 300750.SZ')).toBe('对比两家公司估值')
    })
})
