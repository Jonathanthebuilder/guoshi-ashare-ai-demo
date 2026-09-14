import { FileText, Download, Trash2, Search, ChevronLeft, ChevronRight, Loader2, History, Clock3 } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import type { Report, ReportDetail } from '@/types'
import DecisionCard from '@/components/DecisionCard'
import ReportViewer from '@/components/ReportViewer'
import RiskRadar from '@/components/RiskRadar'
import KeyMetrics from '@/components/KeyMetrics'
import { useAuthStore } from '@/stores/authStore'
import { parseDecisionPresentation as parseDecision } from '@/utils/decisionPresentation'

const getDecisionColor = (decision?: string) => {
    const { action } = parseDecision(decision)
    if (action === 'buy' || action === 'add') return 'text-[#AF423F] dark:text-[#E1A3A0]'
    if (action === 'sell' || action === 'reduce') return 'text-[#287461] dark:text-[#98C8B5]'
    return 'text-slate-600 dark:text-slate-400'
}

function getQueueHint(report: Pick<Report, 'status' | 'waiting_ahead_count' | 'scheduled_running_count' | 'scheduled_concurrency_limit'>): string | null {
    if (report.status !== 'pending') return null

    const waitingAhead = report.waiting_ahead_count
    const runningCount = report.scheduled_running_count
    const limit = report.scheduled_concurrency_limit

    if (runningCount != null && limit != null) {
        return `${waitingAhead != null ? `前方还有 ${waitingAhead} 项等待，` : ''}当前 ${runningCount}/${limit} 个任务执行中`
    }

    return waitingAhead != null ? `前方还有 ${waitingAhead} 项等待` : null
}

function ActiveReportStatus({ report }: { report: Report }) {
    const queueHint = getQueueHint(report)
    return (
        <div className="min-w-[120px] text-sm text-[#657582] dark:text-[#A4B2BE]">
            <span>{report.status === 'pending' ? '排队中' : '研究进行中'}</span>
            {queueHint && <p className="mt-1 max-w-[200px] text-xs leading-5">{queueHint}</p>}
        </div>
    )
}

function ActiveDetailStatusCard({ report }: { report: ReportDetail }) {
    const isPending = report.status === 'pending'
    return (
        <div className="card min-h-[240px]">
            <Clock3 className="mb-5 h-5 w-5 text-[#657582] dark:text-[#A4B2BE]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[#243746] dark:text-[#E8EDF1]">{isPending ? '研究等待执行' : '研究正在进行'}</h3>
            <p className="mt-3 text-sm leading-6 text-[#657582] dark:text-[#A4B2BE]">
                {isPending ? (getQueueHint(report) || '任务已进入队列，等待研究资源。') : '正在整理分析依据与研究结论。'}
            </p>
            <p className="mt-5 text-xs leading-6 text-[#657582] dark:text-[#A4B2BE]">任务状态会自动更新，完成后可在这里查看研究结果。</p>
        </div>
    )
}

const renderStatusBadge = (report: Report) => {
    switch (report.status) {
        case 'pending':
            return <ActiveReportStatus report={report} />
        case 'running':
            return <ActiveReportStatus report={report} />
        case 'failed':
            return (
                <div className="group relative flex items-center gap-1.5 text-[#AF423F] dark:text-[#E1A3A0]" title={report.error?.split('\n')[0]}>
                    <div className="w-1.5 h-1.5 rounded-sm bg-[#AF423F]" />
                    <span className="text-xs font-medium">任务失败</span>
                </div>
            )
        default:
            const label = report.decision ? parseDecision(report.decision).label : '建议未提供'
            return (
                <span className={`font-medium ${getDecisionColor(report.decision)}`}>
                    {label}
                </span>
            )
    }
}

function exportReport(report: ReportDetail) {
    const sections = [
        { key: 'market_report', title: '市场分析报告' },
        { key: 'sentiment_report', title: '舆情分析报告' },
        { key: 'news_report', title: '新闻分析报告' },
        { key: 'fundamentals_report', title: '基本面分析报告' },
        { key: 'investment_plan', title: '研究团队决策' },
        { key: 'trader_investment_plan', title: '交易团队计划' },
        { key: 'final_trade_decision', title: '最终交易决策' },
    ]
    const text = sections
        .filter(s => report[s.key as keyof ReportDetail])
        .map(s => `## ${s.title}\n\n${report[s.key as keyof ReportDetail]}`)
        .join('\n\n---\n\n')
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analysis-${report.symbol}-${report.trade_date}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export default function Reports() {
    const { user } = useAuthStore()
    const [searchParams, setSearchParams] = useSearchParams()
    const setSearchParamsRef = useRef(setSearchParams)
    setSearchParamsRef.current = setSearchParams
    const PAGE_SIZE = 20
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(0)
    const [reports, setReports] = useState<Report[]>([])
    const [total, setTotal] = useState(0)
    const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [symbolHistory, setSymbolHistory] = useState<Report[]>([])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    const fetchReports = useCallback(async (targetPage: number, options?: { silent?: boolean }) => {
        const silent = options?.silent === true
        if (!silent) {
            setLoading(true)
            setError(null)
        }
        try {
            const response = await api.getReports(undefined, targetPage * PAGE_SIZE, PAGE_SIZE)
            setReports(response.reports)
            setTotal(response.total)
        } catch (err) {
            const message = err instanceof Error ? err.message : '获取报告失败'
            if (!silent) {
                setError(message)
            }
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }, [])

    useEffect(() => { fetchReports(page) }, [fetchReports, page])

    const handleDelete = async (e: React.MouseEvent, reportId: string) => {
        e.stopPropagation()
        if (!confirm('确定要删除这份报告吗？')) return
        setDeleting(reportId)
        try {
            await api.deleteReport(reportId)
            setReports(prev => prev.filter(r => r.id !== reportId))
            setTotal(prev => {
                const newTotal = prev - 1
                // Go to prev page if current page is now empty
                if (reports.length === 1 && page > 0) setPage(p => p - 1)
                return newTotal
            })
        } catch (err) {
            alert(err instanceof Error ? err.message : '删除失败')
        } finally {
            setDeleting(null)
        }
    }

    const loadReportDetail = useCallback(async (
        reportId: string,
        options?: { silent?: boolean; preserveHistory?: boolean },
    ) => {
        const silent = options?.silent === true
        const preserveHistory = options?.preserveHistory === true

        if (!silent) {
            setDetailLoading(true)
            if (!preserveHistory) {
                setSymbolHistory([])
            }
        }

        try {
            const detail = await api.getReport(reportId)
            setSelectedReport(detail)
            setReports(prev => prev.map(report => report.id === detail.id ? { ...report, ...detail } : report))

            if (!silent || !preserveHistory) {
                const history = await api.getReports(detail.symbol, 0, 20)
                setSymbolHistory(history.reports)
            } else {
                setSymbolHistory(prev => prev.map(report => report.id === detail.id ? { ...report, ...detail } : report))
            }

            if (!silent) {
                setSearchParamsRef.current({ report: reportId })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : '获取报告详情失败'
            if (!silent) {
                alert(message)
            }
            throw err
        } finally {
            if (!silent) {
                setDetailLoading(false)
            }
        }
    }, [])

    const handleSelectReport = async (report: Pick<Report, 'id' | 'symbol'>) => {
        try {
            await loadReportDetail(report.id)
        } catch {}
    }

    // Only on mount: restore report from URL
    const initialReportId = useRef(searchParams.get('report'))
    useEffect(() => {
        const reportId = initialReportId.current
        if (reportId) {
            void loadReportDetail(reportId, { preserveHistory: true })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const filteredReports = reports.filter(r => {
        const q = searchQuery.toLowerCase()
        return r.symbol.toLowerCase().includes(q) || (r.name?.toLowerCase().includes(q) ?? false)
    })
    const hasActiveReport = reports.some(report => report.status === 'pending' || report.status === 'running')

    useEffect(() => {
        if (loading || detailLoading || selectedReport || !hasActiveReport) return

        const timer = window.setInterval(() => {
            void fetchReports(page, { silent: true })
        }, 4000)

        return () => window.clearInterval(timer)
    }, [detailLoading, fetchReports, hasActiveReport, loading, page, selectedReport])

    const selectedReportRef = useRef(selectedReport)
    selectedReportRef.current = selectedReport

    useEffect(() => {
        if (!selectedReport || detailLoading) return
        if (selectedReport.status !== 'pending' && selectedReport.status !== 'running') return

        const timer = window.setInterval(() => {
            const current = selectedReportRef.current
            if (!current || (current.status !== 'pending' && current.status !== 'running')) return
            void loadReportDetail(current.id, { silent: true, preserveHistory: true })
        }, 4000)

        return () => window.clearInterval(timer)
    }, [detailLoading, loadReportDetail, selectedReport?.id, selectedReport?.status])

    // ─── 详情视图 ────────────────────────────────────────────────────────────
    if (detailLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#172D40] dark:text-[#A4B2BE]" />
            </div>
        )
    }

    if (selectedReport) {
        const { action } = parseDecision(selectedReport.decision)
        return (
            <div className="space-y-6">
                {/* 返回按钮 + 标题 */}
                <div className="flex flex-wrap items-center gap-3">

                    <button
                        onClick={() => {
                            setSelectedReport(null)
                            setSearchParams({})
                        }}
                        className="btn-secondary flex min-h-11 items-center gap-2 text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        返回列表
                    </button>
                    <h1 className="text-xl font-semibold text-[#243746] dark:text-[#E8EDF1]">
                        {selectedReport.name || selectedReport.symbol} 研究报告
                        {selectedReport.name && selectedReport.name !== selectedReport.symbol && (
                            <span className="ml-2 text-base font-normal text-slate-400">{selectedReport.symbol}</span>
                        )}
                    </h1>
                    <button
                        onClick={() => exportReport(selectedReport)}
                        className="btn-secondary ml-auto flex min-h-11 items-center gap-2 text-sm"
                    >
                        <Download className="w-4 h-4" />
                        导出 Markdown
                    </button>
                </div>

                {/* 元信息 */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#DFE5E9] pb-5 text-sm text-[#657582] dark:border-[#31424F] dark:text-[#A4B2BE]">
                    <span>研究日期：{selectedReport.trade_date}</span>
                    <span>记录创建：{selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString('zh-CN') : '-'}</span>
                </div>

                {/* 历史决策时间线 */}
                {symbolHistory.length > 1 && (
                    <div className="card">
                        <div className="flex items-center gap-2 mb-3">
                            <History className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{selectedReport.name || selectedReport.symbol} 历史决策</h3>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {symbolHistory.slice().reverse().map(r => {
                                const label = r.status === 'completed' ? (r.decision ? parseDecision(r.decision).label : '建议未提供') : r.status === 'failed' ? '研究失败' : r.status === 'pending' ? '排队中' : '研究中'
                                const color = r.status === 'completed' ? getDecisionColor(r.decision) : 'text-[#657582] dark:text-[#A4B2BE]'
                                const isCurrent = r.id === selectedReport.id
                                return (
                                    <button
                                        key={r.id}
                                        onClick={() => !isCurrent && handleSelectReport(r)}
                                        aria-current={isCurrent ? "true" : undefined}
                                        className={`flex min-h-16 shrink-0 flex-col items-start justify-center gap-1 rounded border px-3 py-2 transition-colors ${isCurrent ? 'border-[#172D40] bg-[#F4F6F8] dark:border-[#A4B2BE] dark:bg-[#1D303E]' : 'border-[#DFE5E9] hover:bg-[#F4F6F8] dark:border-[#31424F] dark:hover:bg-[#1D303E]'}`}
                                    >
                                        <span className={`text-sm font-medium ${color}`}>{label}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.trade_date}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 主体：概要卡片 + 报告全文 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    {selectedReport.status === 'completed' ? (
                        <DecisionCard
                            symbol={selectedReport.symbol}
                            name={selectedReport.name}
                            report={selectedReport.result_data}
                            decision={action}
                            direction={selectedReport.direction}
                            confidence={selectedReport.confidence ?? undefined}
                            targetPrice={selectedReport.target_price ?? undefined}
                            stopLoss={selectedReport.stop_loss_price ?? undefined}
                            reasoning={selectedReport.final_trade_decision ?? undefined}
                        />
                    ) : selectedReport.status === 'failed' ? (
                        <div className="card h-full flex flex-col items-center justify-center p-8 text-center min-h-[320px]">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">分析失败</h3>
                            <p className="mt-2 max-w-full break-words text-sm leading-6 text-[#657582] dark:text-[#A4B2BE]">
                                {selectedReport.error || '未知错误'}
                            </p>
                        </div>
                    ) : (
                        <ActiveDetailStatusCard report={selectedReport} />
                    )}
                    <RiskRadar items={selectedReport.risk_items ?? undefined} />
                    <KeyMetrics items={selectedReport.key_metrics ?? undefined} />
                </div>

                <div className="card">
                    <ReportViewer reportData={selectedReport} />
                </div>
            </div>
        )
    }

    // ─── 列表视图 ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[#243746] dark:text-[#E8EDF1]">研究报告</h1>
                    <p className="mt-2 text-sm text-[#657582] dark:text-[#A4B2BE]">
                        {user?.email ? `${user.email} · 共 ${total} 份研究记录` : `共 ${total} 份研究记录`}
                    </p>
                </div>
            </div>

            {/* 搜索 */}
            <div className="card">
                <div className="flex flex-col gap-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label="搜索当前页报告的股票代码或名称"
                            placeholder="搜索当前页代码或名称"
                            className="input w-full pl-10"
                        />
                    </div>

                </div>
            </div>

            {/* 加载中 */}
            {loading && (
                <div className="card py-12">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-[#172D40] dark:text-[#A4B2BE] animate-spin" />
                        <p className="text-slate-500">加载报告中...</p>
                    </div>
                </div>
            )}

            {/* 错误 */}
            {error && !loading && (
                <div className="card py-12 text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => fetchReports(page)}
                        className="btn-primary min-h-11"
                    >
                        重试
                    </button>
                </div>
            )}

            {/* 报告呈现：移动端为原生金融卡片流，桌面端为高密度数据表格 */}
            {!loading && !error && (
                <div>
                    {filteredReports.length === 0 ? (
                        <div className="card text-center py-12">
                            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">
                                {searchQuery ? '没有匹配的报告' : '暂无报告'}
                            </p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                在分析页面生成新的报告
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 移动端卡片流列表 (md:hidden) */}
                            <div className="md:hidden space-y-3">
                                {filteredReports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => handleSelectReport(report)}
                                        className="card p-4 transition-all active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-800/80 cursor-pointer border border-slate-200 dark:border-slate-800 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline gap-2">
                                                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                                        {report.name || report.symbol}
                                                    </h3>
                                                    {report.name && report.name !== report.symbol && (
                                                        <span className="font-mono text-xs text-slate-400">{report.symbol}</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    研究日期：{report.trade_date}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {renderStatusBadge(report)}
                                            </div>
                                        </div>

                                        {report.status === 'completed' && (
                                            <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center text-xs">
                                                <div>
                                                    <span className="block text-[10px] text-slate-400">模型自评</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                                        {report.confidence != null ? `${report.confidence}%` : '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-slate-400">目标价</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                                        {report.target_price != null ? Number(report.target_price).toFixed(2) : '—'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-slate-400">止损价</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                                        {report.stop_loss_price != null ? Number(report.stop_loss_price).toFixed(2) : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                            <span>{report.created_at ? new Date(report.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium text-xs">
                                                查看完整研报 <ChevronRight className="w-3.5 h-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 桌面端完整数据表格 (hidden md:block) */}
                            <div className="hidden md:block card overflow-hidden !p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[920px] text-sm">
                                        <thead className="bg-[#F4F6F8] dark:bg-[#111B24]">
                                            <tr className="border-b border-[#DFE5E9] dark:border-[#31424F]">
                                                {['标的', '研究日期', '研究建议 / 状态', '模型自评', '目标价 / 止损价', '记录创建时间', '操作'].map(h => (
                                                    <th scope="col" key={h} className={`whitespace-nowrap px-4 py-3.5 text-xs font-medium text-[#657582] dark:text-[#A4B2BE] ${['操作', '模型自评', '目标价 / 止损价'].includes(h) ? 'text-right' : 'text-left'}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#DFE5E9] dark:divide-[#31424F]">
                                            {filteredReports.map((report) => {
                                                return (
                                                    <tr
                                                        key={report.id}
                                                        className="cursor-pointer transition-colors hover:bg-[#F4F6F8] dark:hover:bg-[#1D303E]"
                                                        onClick={() => handleSelectReport(report)}
                                                    >
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div>
                                                                    <p className="font-medium text-slate-900 dark:text-slate-100">{report.name || report.symbol}</p>
                                                                    {report.name && report.name !== report.symbol && (
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500">{report.symbol}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-[#657582] tabular-nums dark:text-[#A4B2BE]">{report.trade_date}</td>
                                                        <td className="py-3 px-4">
                                                            {renderStatusBadge(report)}
                                                        </td>
                                                        <td className="px-4 py-4 text-right tabular-nums text-[#657582] dark:text-[#A4B2BE]">
                                                            {report.confidence != null ? `${report.confidence}%` : '—'}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-[#243746] dark:text-[#E8EDF1]">
                                                            {report.target_price != null ? report.target_price : '—'} / {report.stop_loss_price != null ? report.stop_loss_price : '—'}
                                                        </td>
                                                        <td className="whitespace-nowrap px-4 py-4 tabular-nums text-[#657582] dark:text-[#A4B2BE]">
                                                            {report.created_at ? new Date(report.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    className="flex h-11 w-11 items-center justify-center rounded text-[#657582] transition-colors hover:bg-[#DFE5E9] hover:text-[#172D40] dark:text-[#A4B2BE] dark:hover:bg-[#31424F] dark:hover:text-[#E8EDF1]"
                                                                    onClick={e => { e.stopPropagation(); handleSelectReport(report) }}
                                                                    title="查看详情"
                                                                    aria-label={`查看 ${report.name || report.symbol} 的研究报告`}
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="flex h-11 w-11 items-center justify-center rounded text-[#657582] transition-colors hover:bg-[#FBF2F1] hover:text-[#AF423F] disabled:opacity-50 dark:text-[#A4B2BE] dark:hover:bg-[#372827] dark:hover:text-[#E1A3A0]"
                                                                    onClick={e => handleDelete(e, report.id)}
                                                                    disabled={deleting === report.id}
                                                                    title="删除"
                                                                    aria-label={`删除 ${report.name || report.symbol} 的研究报告`}
                                                                >
                                                                    {deleting === report.id
                                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                        : <Trash2 className="w-4 h-4" />
                                                                    }
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    <p className="mt-3 px-2 text-xs leading-6 text-[#657582] dark:text-[#A4B2BE]">模型自评为原报告输出，并非经过校准的成功概率。目标价、止损价的币种与适用条件请查阅原报告。</p>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 card mt-3">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                第 {page + 1} / {totalPages} 页，共 {total} 条
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    aria-label="上一页"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 0}
                                    className="flex h-11 w-11 items-center justify-center rounded text-[#657582] hover:bg-[#F4F6F8] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#A4B2BE] dark:hover:bg-[#1D303E]"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    aria-label="下一页"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages - 1}
                                    className="flex h-11 w-11 items-center justify-center rounded text-[#657582] hover:bg-[#F4F6F8] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#A4B2BE] dark:hover:bg-[#1D303E]"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
