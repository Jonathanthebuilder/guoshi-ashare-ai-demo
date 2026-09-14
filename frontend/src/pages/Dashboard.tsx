import { ArrowRight, FileText, Loader2, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '@/services/api'
import { useAnalysisStore } from '@/stores/analysisStore'
import { useAuthStore } from '@/stores/authStore'
import type { Report, TrackingBoardResponse } from '@/types'
import PromoBanner from '@/components/PromoBanner'
import { parseDecisionPresentation } from '@/utils/decisionPresentation'

const secondaryText = 'text-[#657582] dark:text-[#A4B2BE]'

export default function Dashboard() {
    const { user } = useAuthStore()
    return <DashboardContent key={user?.id ?? 'signed-out'} userId={user?.id} />
}

function DashboardContent({ userId }: { userId?: string }) {
    const { agents, isAnalyzing, currentSymbol, analysisRunState, analysisRunError } = useAnalysisStore()
    const [reportTotal, setReportTotal] = useState<number | null>(null)
    const [recentReports, setRecentReports] = useState<Report[]>([])
    const [trackingBoard, setTrackingBoard] = useState<TrackingBoardResponse | null>(null)
    const [reportsLoading, setReportsLoading] = useState(true)
    const [trackingLoading, setTrackingLoading] = useState(true)
    const [reportsError, setReportsError] = useState<string | null>(null)
    const [trackingError, setTrackingError] = useState<string | null>(null)
    const navigate = useNavigate()

    const completedAgents = agents.filter(a => a.status === 'completed').length
    const activeAgents = agents.filter(a => a.status === 'in_progress')
    const trackedCount = trackingBoard?.items.length
    const quotedCount = trackingBoard?.items.filter(item => item.quote_source).length

    useEffect(() => {
        if (!userId) return
        let cancelled = false

        api.getReports(undefined, 0, 5)
            .then(res => {
                if (cancelled) return
                setReportTotal(res.total)
                setRecentReports(res.reports)
            })
            .catch(error => {
                if (cancelled) return
                console.error('Failed to load recent reports:', error)
                setReportsError(error instanceof Error ? error.message : '最近研究暂时无法读取')
            })
            .finally(() => { if (!cancelled) setReportsLoading(false) })

        api.getDashboardTrackingBoard()
            .then(res => {
                if (cancelled) return
                setTrackingBoard(res)
            })
            .catch(error => {
                if (cancelled) return
                console.error('Failed to load tracking board summary:', error)
                setTrackingError(error instanceof Error ? error.message : '跟踪标的暂时无法读取')
            })
            .finally(() => { if (!cancelled) setTrackingLoading(false) })

        return () => { cancelled = true }
    }, [userId])

    return (
        <div className="space-y-6 text-[#243746] dark:text-[#E8EDF1]">
            <PromoBanner />
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className={`mb-2 text-xs tracking-wide ${secondaryText}`}>
                        {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                    </p>
                    <h1 className="text-2xl font-semibold">今日工作</h1>
                    <p className={`mt-2 text-sm ${secondaryText}`}>从关注标的开始，回看最新研究与当前任务。</p>
                </div>
                <button type="button" onClick={() => navigate('/analysis')} className="btn-primary flex min-h-11 items-center gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />新建研究
                </button>
            </header>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-[#DFE5E9] py-4 text-sm dark:border-[#31424F]">
                <div className="flex items-baseline gap-3">
                    <dt className={secondaryText}>跟踪标的</dt>
                    <dd className="font-semibold tabular-nums">{trackingLoading ? '读取中' : trackedCount != null ? `${trackedCount} 只` : '—'}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                    <dt className={secondaryText}>研究记录</dt>
                    <dd className="font-semibold tabular-nums">{reportsLoading ? '读取中' : reportTotal != null ? `${reportTotal} 份` : '—'}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                    <dt className={secondaryText}>当前会话</dt>
                    <dd>{isAnalyzing ? '研究进行中' : analysisRunState === 'failed' ? '上次研究失败' : '无进行中的研究'}</dd>
                </div>
            </dl>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
                <section className="card min-w-0 !p-0" aria-labelledby="tracked-heading">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5 sm:px-6">
                        <div>
                            <h2 id="tracked-heading" className="text-base font-semibold">关注标的</h2>
                            <p className={`mt-1.5 text-xs ${secondaryText}`}>已导入持仓的跟踪摘要</p>
                        </div>
                        <button type="button" onClick={() => navigate('/tracking-board')} className={`flex min-h-8 items-center gap-1 text-sm hover:underline ${secondaryText}`}>
                            完整看板<ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    {trackingLoading ? (
                        <LoadingNote label="正在读取跟踪标的…" />
                    ) : trackingError ? (
                        <div role="alert" className="border-t border-[#DFE5E9] px-6 py-8 dark:border-[#31424F]">
                            <p className="text-sm text-[#AF423F] dark:text-[#E1A3A0]">跟踪摘要暂不可用</p>
                            <p className={`mt-2 break-words text-sm leading-6 ${secondaryText}`}>{trackingError}</p>
                        </div>
                    ) : !trackedCount ? (
                        <div className="border-t border-[#DFE5E9] px-6 py-12 dark:border-[#31424F]">
                            <h3 className="text-base font-medium">开始持续跟踪一个标的</h3>
                            <p className={`mt-2 text-sm leading-6 ${secondaryText}`}>在跟踪看板导入持仓后，这里会显示最新行情和关联研究。</p>
                            <button type="button" onClick={() => navigate('/tracking-board')} className="btn-secondary mt-5 min-h-11">打开跟踪看板</button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[470px] text-left text-sm">
                                    <thead className="border-y border-[#DFE5E9] bg-[#F4F6F8] dark:border-[#31424F] dark:bg-[#111B24]">
                                        <tr>
                                            <th scope="col" className={`px-6 py-3 font-medium ${secondaryText}`}>标的</th>
                                            <th scope="col" className={`px-4 py-3 font-medium ${secondaryText}`}>最新行情</th>
                                            <th scope="col" className={`px-6 py-3 text-right font-medium ${secondaryText}`}>关联研究日期</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#DFE5E9] dark:divide-[#31424F]">
                                        {trackingBoard?.items.slice(0, 8).map(item => (
                                            <tr key={item.symbol} className="hover:bg-[#F4F6F8] dark:hover:bg-[#1D303E]">
                                                <td className="px-6 py-4">
                                                    <button type="button" onClick={() => navigate('/tracking-board')} className="text-left hover:underline">
                                                        <span className="block font-medium">{item.name || item.symbol}</span>
                                                        {item.name && <span className={`mt-1 block text-xs tabular-nums ${secondaryText}`}>{item.symbol}</span>}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4 tabular-nums">
                                                    <div className="flex items-baseline gap-2 whitespace-nowrap">
                                                        <span className="font-medium">{formatLivePrice(item.live_price)}</span>
                                                        {item.price_change_pct != null && Number.isFinite(item.price_change_pct) && (
                                                            <span className={`text-xs ${item.price_change_pct > 0 ? 'text-[#AF423F] dark:text-[#E1A3A0]' : item.price_change_pct < 0 ? 'text-[#287461] dark:text-[#98C8B5]' : secondaryText}`} aria-label={`日涨跌幅 ${formatPriceChange(item.price_change_pct)}`}>
                                                                {formatPriceChange(item.price_change_pct)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`mt-1 block whitespace-nowrap text-xs ${secondaryText}`}>
                                                        {item.quote_time ? formatDashboardTime(item.quote_time) : item.live_price != null ? '时间未提供' : '行情暂缺'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right tabular-nums">
                                                    {item.analysis ? (
                                                        <button type="button" onClick={() => navigate(`/reports?report=${item.analysis?.report_id}`)} className="hover:underline">{item.analysis.trade_date}</button>
                                                    ) : <span className={secondaryText}>暂无研究</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={`flex flex-wrap justify-between gap-2 border-t border-[#DFE5E9] px-6 py-4 text-xs dark:border-[#31424F] ${secondaryText}`}>
                                <span>行情覆盖 {quotedCount}/{trackedCount} 只{trackedCount > 8 ? ' · 展示前 8 只' : ''}</span>
                                <span>持仓明细与区间行情请查看完整看板</span>
                            </div>
                        </>
                    )}
                </section>

                <div className="min-w-0 space-y-6">
                    <section className="card !p-0" aria-labelledby="recent-heading">
                        <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                            <h2 id="recent-heading" className="text-base font-semibold">最近研究</h2>
                            <button type="button" onClick={() => navigate('/reports')} className={`flex min-h-8 items-center gap-1 text-sm hover:underline ${secondaryText}`}>全部报告<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                        </div>
                        {reportsLoading ? <LoadingNote label="正在读取最近研究…" /> : reportsError ? (
                            <div role="alert" className="border-t border-[#DFE5E9] px-6 py-8 dark:border-[#31424F]">
                                <p className="text-sm text-[#AF423F] dark:text-[#E1A3A0]">最近研究暂不可用</p>
                                <p className={`mt-2 break-words text-sm leading-6 ${secondaryText}`}>{reportsError}</p>
                            </div>
                        ) : recentReports.length === 0 ? (
                            <div className="border-t border-[#DFE5E9] px-6 py-10 dark:border-[#31424F]">
                                <FileText className={`mb-4 h-5 w-5 ${secondaryText}`} aria-hidden="true" />
                                <h3 className="text-base font-medium">还没有研究记录</h3>
                                <p className={`mt-2 text-sm leading-6 ${secondaryText}`}>新建研究后，可在这里继续阅读和回看。</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#DFE5E9] border-t border-[#DFE5E9] dark:divide-[#31424F] dark:border-[#31424F]">
                                {recentReports.map(report => (
                                    <button key={report.id} type="button" onClick={() => navigate(`/reports?report=${report.id}`)} className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F4F6F8] dark:hover:bg-[#1D303E] sm:px-6">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium">{report.name || report.symbol}</p>
                                            <p className={`mt-1 text-xs leading-5 tabular-nums ${secondaryText}`}>{report.symbol} · 研究日 {report.trade_date}</p>
                                            <p className={`mt-1 text-xs tabular-nums ${secondaryText}`}>记录时间 {formatDashboardTime(report.created_at)}</p>
                                        </div>
                                        <span className={`shrink-0 pt-0.5 text-sm ${reportDecisionTone(report)}`}>{reportStatusLabel(report)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="card" aria-labelledby="current-task-heading">
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="current-task-heading" className="text-base font-semibold">当前研究</h2>
                            {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        </div>
                        {isAnalyzing ? (
                            <>
                                <p className="mt-4 text-sm font-medium tabular-nums">{currentSymbol}</p>
                                <p className={`mt-2 text-sm leading-6 ${secondaryText}`}>{activeAgents.length ? activeAgents.map(agent => agent.name).join('、') : '等待下一阶段更新'}</p>
                                <p className={`mt-2 text-xs ${secondaryText}`}>已完成 {completedAgents} 项研究步骤</p>
                                <button type="button" onClick={() => navigate('/analysis')} className="btn-secondary mt-4 min-h-11">查看研究进展</button>
                            </>
                        ) : analysisRunState === 'failed' ? (
                            <>
                                <p className="mt-4 text-sm text-[#AF423F] dark:text-[#E1A3A0]">{currentSymbol} · 上次研究失败</p>
                                <p className={`mt-2 break-words text-sm leading-6 ${secondaryText}`}>{analysisRunError || '请进入标的研究查看任务详情。'}</p>
                                <button type="button" onClick={() => navigate('/analysis')} className="btn-secondary mt-4 min-h-11">查看任务</button>
                            </>
                        ) : <p className={`mt-4 text-sm leading-6 ${secondaryText}`}>当前会话没有进行中的研究。你可以新建研究，或从最近报告继续阅读。</p>}
                    </section>
                </div>
            </div>
        </div>
    )
}

function LoadingNote({ label }: { label: string }) {
    return <p role="status" className={`border-t border-[#DFE5E9] px-6 py-12 text-sm dark:border-[#31424F] ${secondaryText}`}>{label}</p>
}

function reportStatusLabel(report: Report): string {
    if (report.status === 'pending') return '排队中'
    if (report.status === 'running') return '研究中'
    if (report.status === 'failed') return '研究失败'
    return parseDecisionPresentation(report.decision).label
}

function reportDecisionTone(report: Report): string {
    if (report.status !== 'completed') return secondaryText
    const { action } = parseDecisionPresentation(report.decision)
    if (action === 'buy' || action === 'add') return 'text-[#AF423F] dark:text-[#E1A3A0]'
    if (action === 'sell' || action === 'reduce') return 'text-[#287461] dark:text-[#98C8B5]'
    return secondaryText
}

function formatDashboardTime(value?: string | null): string {
    if (!value) return '时间未提供'
    const parsed = new Date(value.replace(' ', 'T'))
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatLivePrice(value?: number | null): string {
    if (value == null || !Number.isFinite(value)) return '—'
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 20 })
}

function formatPriceChange(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}
