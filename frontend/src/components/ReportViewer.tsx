import { FileText, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { ReportDetail } from '@/types'
import { sanitizeReportMarkdown } from '@/utils/reportText'

const REPORT_SECTIONS = [
    { key: 'final_trade_decision', title: '研究结论', team: '风险复核与最终判断' },
    { key: 'investment_plan', title: '综合研判', team: '研究团队' },
    { key: 'trader_investment_plan', title: '操作计划', team: '交易团队' },
    { key: 'market_report', title: '市场与技术', team: '分项研究' },
    { key: 'fundamentals_report', title: '基本面', team: '分项研究' },
    { key: 'news_report', title: '新闻与事件', team: '分项研究' },
    { key: 'sentiment_report', title: '市场情绪', team: '分项研究' },
    { key: 'macro_report', title: '宏观与板块', team: '分项研究' },
    { key: 'smart_money_report', title: '主力资金', team: '分项研究' },
    { key: 'volume_price_report', title: '量价关系', team: '分项研究' },
    { key: 'game_theory_report', title: '博弈分析', team: '分项研究' },
]

const SOURCE_NOTE = '本报告由模型依据本次可用数据生成。具体来源与日期以各章节列示为准；未附出处的陈述尚无可追溯来源。'

const MD_COMPONENTS = {
    table: ({ children }: { children?: React.ReactNode }) => (
        <div className="my-5 max-w-full overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-[#F4F6F8] dark:bg-slate-800">{children}</thead>,
    th: ({ children }: { children?: React.ReactNode }) => <th className="border-b border-[#DFE5E9] px-3 py-2 text-left font-semibold dark:border-slate-700">{children}</th>,
    td: ({ children }: { children?: React.ReactNode }) => <td className="border-b border-[#DFE5E9] px-3 py-2 align-top dark:border-slate-700">{children}</td>,
}

interface ReportViewerProps {
    /** Historical report; live mode reads the analysis store. */
    reportData?: ReportDetail
    /** A chapter requested by another part of the workspace. */
    activeSection?: string
    /** Increment on each external navigation request, including repeated links. */
    selectionRequestId?: number
}

export default function ReportViewer({ reportData, activeSection, selectionRequestId = 0 }: ReportViewerProps = {}) {
    const { report, streamingSections, isAnalyzing, currentJobId } = useAnalysisStore()
    const source = reportData ?? report
    const scope = reportData ? reportData.id : `${currentJobId ?? ''}:${report?.symbol ?? ''}:${report?.trade_date ?? ''}`
    const [selection, setSelection] = useState<{ scope: string; external?: string; requestId: number; key: string } | null>(null)
    const isRunning = reportData ? ['pending', 'running'].includes(reportData.status) : isAnalyzing
    const isFailed = reportData?.status === 'failed'
    const sections = REPORT_SECTIONS.map(section => {
        const raw = source?.[section.key as keyof typeof source]
        const nested = reportData?.result_data?.[section.key as keyof NonNullable<ReportDetail['result_data']>]
        const sourceContent = sanitizeReportMarkdown((typeof raw === 'string' && raw.trim() ? raw : '') || (typeof nested === 'string' ? nested : ''))
        const stream = reportData ? undefined : streamingSections[section.key]
        const streamedContent = sanitizeReportMarkdown(stream?.displayed)
        return {
            ...section,
            content: isRunning ? streamedContent || sourceContent : sourceContent || streamedContent,
            exportContent: sourceContent || streamedContent,
            isStreaming: isRunning && !!stream?.isTyping,
        }
    })
    const availableSections = sections.filter(section => section.content.trim())
    const requestedKey = selection?.scope === scope && selection.external === activeSection && selection.requestId === selectionRequestId ? selection.key : activeSection
    const active = sections.find(section => section.key === requestedKey) ?? availableSections[0] ?? sections[0]
    const hasAnyContent = availableSections.length > 0
    const marketContext = reportData?.result_data?.market_context ?? (!reportData ? report?.market_context : undefined)

    const handleExport = () => {
        if (!hasAnyContent) return
        const text = `# ${source?.symbol || '标的'} · 研究报告\n\n分析日期：${source?.trade_date || '未提供'}\n\n`
            + availableSections.map(section => `## ${section.title}\n\n${section.exportContent}`).join('\n\n---\n\n')
            + `\n\n---\n\n${SOURCE_NOTE}\n`
        const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `analysis-${source?.symbol || 'report'}.md`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
    }

    return (
        <section className="min-w-0 overflow-hidden rounded-lg border border-[#DFE5E9] bg-white text-[#243746] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DFE5E9] px-5 py-5 dark:border-slate-700 sm:px-6">
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#92764E]" />
                        <h2 className="text-base font-semibold text-[#172D40] dark:text-slate-100">完整研究报告</h2>
                        {isRunning && <span className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">生成中</span>}
                        {isFailed && <span className="text-xs text-[#AF423F] dark:text-red-300">本次研究未完成</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-5 text-[#657582] dark:text-slate-400">
                        {source?.symbol && <span>{source.symbol}</span>}
                        {source?.trade_date && <span>分析日期 {source.trade_date}</span>}
                        {marketContext?.data_as_of && <span>数据截至 {marketContext.data_as_of}</span>}
                        {reportData?.created_at && <span>生成于 {new Date(reportData.created_at).toLocaleString('zh-CN')}</span>}
                        {(() => {
                            const modelLabel = reportData?.profile_name || reportData?.model_name || (reportData?.result_data as Record<string, any> | undefined)?.profile_name || (reportData?.result_data as Record<string, any> | undefined)?.model_name || report?.profile_name || report?.model_name
                            return modelLabel ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                    🤖 驱动模型：{modelLabel}
                                </span>
                            ) : null
                        })()}
                    </div>
                </div>
                <button type="button" onClick={handleExport} disabled={!hasAnyContent} className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                    <Download className="h-3.5 w-3.5" />导出 Markdown
                </button>
            </header>
            <div className="grid min-w-0 md:grid-cols-[172px_minmax(0,1fr)]">
                <nav aria-label="报告目录" className="border-b border-[#DFE5E9] bg-[#F8FAFB] p-3 dark:border-slate-700 dark:bg-slate-900 md:border-b-0 md:border-r">
                    <p className="mb-2 px-2 text-[11px] tracking-wider text-[#657582] dark:text-slate-400">报告目录</p>
                    <div className="flex gap-1 overflow-x-auto md:sticky md:top-4 md:flex-col">
                        {sections.map(section => (
                            <button key={section.key} type="button" aria-current={active.key === section.key ? 'page' : undefined}
                                disabled={!section.content && !isRunning}
                                onClick={() => setSelection({ scope, external: activeSection, requestId: selectionRequestId, key: section.key })}
                                className={`flex shrink-0 items-center justify-between gap-2 rounded px-2 py-2 text-left text-[13px] transition-colors disabled:opacity-40 md:shrink ${active.key === section.key ? 'bg-[#172D40] font-medium text-white dark:bg-slate-700' : 'text-[#657582] hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                                {section.title}
                                {section.isStreaming && <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-label="正在生成" />}
                            </button>
                        ))}
                    </div>
                </nav>
                <div className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
                    <article className="mx-auto max-w-[760px]" aria-label={active.title}>
                        <div className="mb-6 border-b border-[#DFE5E9] pb-5 dark:border-slate-700">
                            <p className="mb-2 text-xs text-[#657582] dark:text-slate-400">{active.team}</p>
                            <h3 className="font-serif text-2xl font-semibold tracking-wide text-[#172D40] dark:text-slate-100">{active.title}</h3>
                        </div>
                        {active.content ? (
                            <div className="prose max-w-none break-words text-[15px] leading-[1.8] dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{active.content}</ReactMarkdown>
                                {active.isStreaming && <p className="mt-4 flex items-center gap-2 text-xs text-[#657582]"><Loader2 className="h-3 w-3 animate-spin" />章节持续生成中</p>}
                            </div>
                        ) : (
                            <div className="py-14 text-center text-sm leading-7 text-[#657582] dark:text-slate-400">
                                {isRunning ? <><Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />此章节尚在生成，可从目录阅读已有内容。</> : isFailed ? '研究已中断，当前章节未生成。可从目录阅读已保留的内容。' : hasAnyContent ? '本次报告未提供此章节。' : '暂无研究内容。发起研究后，已有章节会显示在这里。'}
                            </div>
                        )}
                        {active.content && <footer className="mt-10 border-t border-[#DFE5E9] pt-4 text-xs leading-6 text-[#657582] dark:border-slate-700 dark:text-slate-400">{SOURCE_NOTE}</footer>}
                    </article>
                </div>
            </div>
        </section>
    )
}
