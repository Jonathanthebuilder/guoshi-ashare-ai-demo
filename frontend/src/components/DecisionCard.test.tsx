import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import DecisionCard from './DecisionCard'
import type { AnalysisReport, RiskFeedbackState } from '@/types'

const report: AnalysisReport = {
    symbol: '600519.SH', trade_date: '2026-09-10', decision: 'BUY', direction: '看多',
    final_trade_decision: '关键条件：只有新增现金足够且价格回到计划区间才允许下单。',
}
const feedback: RiskFeedbackState = {
    retry_count: 0, max_retries: 1, revision_required: false, latest_risk_verdict: 'reject',
    hard_constraints: ['本方案超过最大亏损限制。'], soft_constraints: [], execution_preconditions: [],
    de_risk_triggers: [], revision_reason: '仓位需要重新计算。',
}

describe('DecisionCard separates research from execution', () => {
    it('reports missing risk status even when the recommendation is BUY', () => {
        const html = renderToStaticMarkup(<DecisionCard symbol={report.symbol} report={report} />)
        expect(html).toContain('风控状态未提供')
        expect(html).not.toContain('已通过')
    })

    it('keeps a real rejection and its hard constraint visible alongside bullish research', () => {
        const html = renderToStaticMarkup(<DecisionCard symbol={report.symbol} report={{ ...report, risk_feedback_state: feedback }} />)
        expect(html).toContain('不通过')
        expect(html).toContain('本方案超过最大亏损限制。')
        expect(html).toContain('看多')
    })

    it('shows the complete source conclusion without relying on a truncated preview prop', () => {
        const html = renderToStaticMarkup(<DecisionCard symbol={report.symbol} report={report} reasoning="关键条件：" />)
        expect(html).toContain('只有新增现金足够且价格回到计划区间才允许下单。')
    })
})
