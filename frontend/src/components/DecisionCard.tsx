import { Shield, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AnalysisReport } from '@/types'
import { extractVerdict, sanitizeReportMarkdown } from '@/utils/reportText'
import { getResearchExcerpt } from '@/utils/researchView'

interface DecisionCardProps {
    symbol: string
    name?: string
    decision?: 'buy' | 'sell' | 'hold' | 'add' | 'reduce' | 'watch'
    direction?: string
    confidence?: number
    targetPrice?: number
    targetChange?: number
    stopLoss?: number
    stopLossChange?: number
    reasoning?: string
    riskLevel?: 'low' | 'medium' | 'high'
    report?: AnalysisReport
    onReadReport?: () => void
    compact?: boolean
}

const ACTION_LABELS: Record<string, string> = {
    BUY: '买入', SELL: '卖出', HOLD: '持有', ADD: '增持', REDUCE: '减持', WATCH: '观望',
    买入: '买入', 卖出: '卖出', 持有: '持有', 增持: '增持', 减持: '减持', 观望: '观望',
}
const DIRECTION_LABELS: Record<string, string> = {
    BULLISH: '看多', LEAN_BULLISH: '偏多', BEARISH: '看空', LEAN_BEARISH: '偏空', NEUTRAL: '中性', CAUTIOUS: '谨慎',
}
const RISK_LABELS: Record<string, string> = { pass: '已通过', revise: '需修订', reject: '不通过' }

export default function DecisionCard({ symbol, name, decision, direction, confidence, targetPrice, targetChange, stopLoss, stopLossChange, reasoning, riskLevel, report, compact = false, onReadReport }: DecisionCardProps) {
    const sourceText = sanitizeReportMarkdown(report?.final_trade_decision || reasoning)
    const rawDirection = direction || report?.direction || extractVerdict(report?.final_trade_decision)?.direction
    const researchDirection = rawDirection ? (DIRECTION_LABELS[rawDirection.toUpperCase()] || rawDirection) : '未提供'
    const action = ACTION_LABELS[(decision || report?.decision || '').trim().toUpperCase()]
    const feedback = report?.risk_feedback_state
    const riskVerdict = feedback?.latest_risk_verdict?.toLowerCase()
    const riskStatus = riskVerdict ? (RISK_LABELS[riskVerdict] || '无法确认') : '风控状态未提供'
    const riskRequiresAttention = riskVerdict === 'reject' || riskVerdict === 'revise'
    const currency = report?.instrument_context?.currency
    const selfRating = confidence != null && Number.isFinite(confidence) && confidence >= 0 && confidence <= 100 ? confidence : undefined

    const modelLabel = report?.profile_name || report?.model_name || (report?.result_data as Record<string, any> | undefined)?.profile_name || (report?.result_data as Record<string, any> | undefined)?.model_name

    return (
        <section className="min-w-0 rounded-lg border border-[#DFE5E9] bg-white p-5 text-[#243746] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:p-6">
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#172D40] dark:text-slate-100">关键研判</h3>
                        {modelLabel && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                🤖 {modelLabel}
                            </span>
                        )}
                    </div>
                    {!compact && <p className="mt-1 text-xs text-[#657582] dark:text-slate-400">{name || report?.instrument_context?.security_name || symbol}{name && name !== symbol ? ` · ${symbol}` : ''}</p>}
                </div>
                {selfRating != null && <div className="text-right text-xs leading-5 text-[#657582] dark:text-slate-400"><p>模型自评 <span className="tabular-nums font-medium">{selfRating}%</span></p><p className="text-[11px]">未经历史结果校准</p></div>}
            </header>

            <dl className="grid grid-cols-1 gap-4 border-y border-[#DFE5E9] py-4 dark:border-slate-700 min-[460px]:grid-cols-3">
                <div><dt className="mb-1 text-xs text-[#657582] dark:text-slate-400">研究方向</dt><dd className={`text-base font-semibold ${/看多|偏多/.test(researchDirection) ? 'text-[#AF423F] dark:text-red-300' : /看空|偏空/.test(researchDirection) ? 'text-[#287461] dark:text-emerald-300' : 'text-[#172D40] dark:text-slate-100'}`}>{researchDirection}</dd></div>
                <div><dt className="mb-1 text-xs text-[#657582] dark:text-slate-400">建议动作</dt><dd className="text-base font-semibold text-[#172D40] dark:text-slate-100">{action || '未形成建议'}</dd></div>
                <div><dt className="mb-1 text-xs text-[#657582] dark:text-slate-400">风控状态</dt><dd className={`text-sm font-medium ${riskRequiresAttention ? 'text-[#AF423F] dark:text-red-300' : 'text-[#243746] dark:text-slate-200'}`}>{riskStatus}</dd>{riskVerdict && <p className="mt-1 text-[11px] text-[#657582] dark:text-slate-400">模型裁决</p>}</div>
            </dl>

            {feedback && (feedback.revision_reason || feedback.hard_constraints?.length > 0 || feedback.execution_preconditions?.length > 0) && (
                <div className="mt-4 border-l-2 border-[#92764E] bg-[#F8FAFB] px-3 py-3 text-sm leading-6 dark:bg-slate-800/60">
                    <p className="mb-1 flex items-center gap-1.5 font-medium"><Shield className="h-3.5 w-3.5" />适用条件与限制</p>
                    {feedback.revision_reason && <p>{feedback.revision_reason}</p>}
                    {feedback.hard_constraints?.length > 0 && <ul className="list-disc space-y-1 pl-4">{feedback.hard_constraints.map((item, i) => <li key={`hard-${i}`}>{item}</li>)}</ul>}
                    {feedback.execution_preconditions?.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-4">{feedback.execution_preconditions.map((item, i) => <li key={`condition-${i}`}>{item}</li>)}</ul>}
                </div>
            )}

            <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-[#657582] dark:text-slate-400"><FileText className="h-3.5 w-3.5" />来源：研究结论原文</p>
                {sourceText && compact ? <p className="text-sm leading-7">{getResearchExcerpt(sourceText.replace(/^#{1,6}[^\n]*(?:\n|$)/gm, '').trim().split(/\n\s*\n/)[0], 220)}</p> : sourceText ? <div tabIndex={0} aria-label="研究结论原文，可滚动阅读全文" className="prose max-h-64 max-w-none overflow-auto break-words pr-1 text-sm leading-7 dark:prose-invert [&_table]:block [&_table]:overflow-x-auto"><ReactMarkdown remarkPlugins={[remarkGfm]}>{sourceText}</ReactMarkdown></div> : <p className="py-3 text-sm leading-6 text-[#657582] dark:text-slate-400">结论尚未提供，已生成的依据可在完整报告中阅读。</p>}
            </div>

            {compact && onReadReport && <button type="button" onClick={onReadReport} className="mt-3 text-xs text-slate-500 underline underline-offset-4">阅读全文与执行条件</button>}
            <dl className="mt-5 grid grid-cols-2 gap-5 border-t border-[#DFE5E9] pt-4 dark:border-slate-700">
                <div><dt className="text-xs text-[#657582] dark:text-slate-400">报告目标价{currency ? ` · ${currency}` : ''}</dt><dd className="mt-1 text-xl font-medium tabular-nums">{targetPrice != null ? targetPrice.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—'}</dd>{targetChange != null && <p className="text-xs tabular-nums text-[#657582] dark:text-slate-400">{targetChange >= 0 ? '+' : ''}{targetChange.toFixed(1)}%</p>}</div>
                <div><dt className="text-xs text-[#657582] dark:text-slate-400">报告止损价{currency ? ` · ${currency}` : ''}</dt><dd className="mt-1 text-xl font-medium tabular-nums">{stopLoss != null ? stopLoss.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '—'}</dd>{stopLossChange != null && <p className="text-xs tabular-nums text-[#657582] dark:text-slate-400">{stopLossChange >= 0 ? '+' : ''}{stopLossChange.toFixed(1)}%</p>}</div>
            </dl>
            {riskLevel && <p className="mt-3 text-xs text-[#657582] dark:text-slate-400">报告风险等级：{{ low: '低', medium: '中', high: '高' }[riskLevel]}</p>}
        </section>
    )
}
