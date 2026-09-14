import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ReportViewer from './ReportViewer'
import type { ReportDetail } from '@/types'
import { useAnalysisStore } from '@/stores/analysisStore'

const seededSelection = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))
// SSR cannot click the directory. Seed the state resulting from that click;
// the component still uses real React state and renders the actual chapter.
vi.mock('react', async importOriginal => {
    const react = await importOriginal<typeof import('react')>()
    return { ...react, useState: (initial: unknown) => react.useState(initial === null && seededSelection.value ? seededSelection.value : initial) }
})

function renderLiveReport(overrides: Partial<ReturnType<typeof useAnalysisStore.getInitialState>>) {
    const snapshot = useAnalysisStore.getInitialState()
    const previous = { ...snapshot }
    try {
        Object.assign(snapshot, overrides)
        return renderToStaticMarkup(<ReportViewer />)
    } finally {
        Object.assign(snapshot, previous)
    }
}

const completeReport: ReportDetail = {
    id: 'report-fixture', symbol: '600519.SH', trade_date: '2026-09-10', status: 'completed',
    market_report: '市场章节的完整量价依据。',
    final_trade_decision: '研究结论：等待成交量确认，暂不加仓。',
}

describe('ReportViewer reading entry', () => {
    it('opens the conclusion immediately when no agent or chapter has been selected', () => {
        const html = renderToStaticMarkup(<ReportViewer reportData={completeReport} />)
        expect(html).toContain('等待成交量确认，暂不加仓。')
        expect(html).not.toContain('市场章节的完整量价依据。')
    })

    it('honors an explicit chapter link even when a final conclusion exists', () => {
        const html = renderToStaticMarkup(<ReportViewer reportData={completeReport} activeSection="market_report" />)
        expect(html).toContain('市场章节的完整量价依据。')
        expect(html).not.toContain('等待成交量确认，暂不加仓。')
    })

    it('makes an available research chapter readable before a conclusion arrives', () => {
        const html = renderToStaticMarkup(<ReportViewer reportData={{ ...completeReport, status: 'running', final_trade_decision: '' }} />)
        expect(html).toContain('市场章节的完整量价依据。')
    })

    it('offers an independent chapter navigation without requiring the workflow graph', () => {
        const html = renderToStaticMarkup(<ReportViewer reportData={completeReport} />)
        expect(html).toMatch(/<nav[^>]*aria-label="报告目录"/)
        expect(html).toContain('aria-current="page"')
    })

    it('shows the authoritative final report instead of a stale streamed draft after completion', () => {
        const html = renderLiveReport({
            report: { symbol: '600519.SH', trade_date: '2026-09-10', final_trade_decision: '最终结果：风险超限，停止新增仓位。' },
            isAnalyzing: false,
            streamingSections: { final_trade_decision: { buffer: '旧草稿：可以新增仓位。', displayed: '旧草稿：可以新增仓位。', isTyping: false, isComplete: true } },
        })
        expect(html).toContain('最终结果：风险超限，停止新增仓位。')
        expect(html).not.toContain('旧草稿：可以新增仓位。')
    })

    it('does not let an older internal selection swallow a repeated external chapter request', () => {
        seededSelection.value = { scope: 'report-fixture', external: 'market_report', key: 'final_trade_decision', requestId: 1 }
        try {
            const html = renderToStaticMarkup(<ReportViewer reportData={completeReport} activeSection="market_report" selectionRequestId={2} />)
            expect(html).toContain('市场章节的完整量价依据。')
            expect(html).not.toContain('等待成交量确认，暂不加仓。')
        } finally {
            seededSelection.value = null
        }
    })

    it('reads historical report content stored in result_data when top-level chapter fields are absent', () => {
        const html = renderToStaticMarkup(<ReportViewer reportData={{
            id: 'nested-report', symbol: '600519.SH', trade_date: '2026-09-10', status: 'completed',
            result_data: { symbol: '600519.SH', trade_date: '2026-09-10', final_trade_decision: '嵌套报告中的最终判断。' },
        }} />)
        expect(html).toContain('嵌套报告中的最终判断。')
    })
})
