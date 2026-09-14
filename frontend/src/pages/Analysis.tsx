import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, FileText, Loader2, MessageSquare, PanelRightClose, ShieldCheck } from 'lucide-react'
import AgentCollaboration from '@/components/AgentCollaboration'
import DebateDrawer from '@/components/DebateDrawer'
import ReportViewer from '@/components/ReportViewer'
import ChatCopilotPanel from '@/components/ChatCopilotPanel'
import KlinePanel from '@/components/KlinePanel'
import DecisionCard from '@/components/DecisionCard'
import RiskRadar from '@/components/RiskRadar'
import KeyMetrics from '@/components/KeyMetrics'
import { useAnalysisStore } from '@/stores/analysisStore'
import { getVisibleResearchReport, getResearchExcerpt } from '@/utils/researchView'
import type { AnalysisReport } from '@/types'
import { extractExplicitConfidence, extractExplicitPrice } from '@/utils/researchView'
import { parseDecisionPresentation } from '@/utils/decisionPresentation'

const TABS = [{ id: 'overview', label: '研究概览' }, { id: 'evidence', label: '依据与分歧' }, { id: 'report', label: '完整报告' }, { id: 'process', label: '研究过程' }] as const
type ResearchTab = typeof TABS[number]['id']
const SOURCES: { key: keyof AnalysisReport; title: string; detail: string }[] = [
    { key: 'fundamentals_report', title: '基本面', detail: '盈利、财务与估值' },
    { key: 'market_report', title: '技术面', detail: '价格结构与技术指标' },
    { key: 'smart_money_report', title: '资金面', detail: '资金行为与持仓变化' },
    { key: 'volume_price_report', title: '量价关系', detail: '成交量与价格形态' },
    { key: 'macro_report', title: '宏观环境', detail: '政策与市场环境' },
    { key: 'news_report', title: '新闻事件', detail: '公司与行业动态' },
    { key: 'sentiment_report', title: '市场情绪', detail: '舆情与分歧' },
]

export default function Analysis() {
    const [searchParams] = useSearchParams()
    const querySymbol = (searchParams.get('symbol') || '').trim().toUpperCase()
    const store = useAnalysisStore()
    const { report: storedReport, currentSymbol, isAnalyzing, analysisRunState, analysisRunError, currentHorizon, jobStatus } = store
    const [subject, setSubject] = useState(() => ({ query: querySymbol, job: currentSymbol, symbol: querySymbol || currentSymbol || '000001.SH', chart: querySymbol || currentSymbol || '000001.SH' }))
    // Reconcile an external route/job change before committing a frame, so a
    // saved report can never appear under the next security's heading.
    if (subject.query !== querySymbol || subject.job !== currentSymbol) {
        const symbol = subject.query !== querySymbol ? querySymbol || currentSymbol : currentSymbol
        setSubject({ query: querySymbol, job: currentSymbol, symbol, chart: symbol })
    }
    const activeSymbol = subject.symbol
    const chartSymbol = subject.chart
    const setChartSymbol = (chart: string) => setSubject(current => ({ ...current, chart }))
    const [activeTab, setActiveTab] = useState<ResearchTab>('overview')
    const [activeSection, setActiveSection] = useState<string | undefined>()
    const [selectionRequestId, setSelectionRequestId] = useState(0)
    const [assistantOpen, setAssistantOpen] = useState(() => window.innerWidth >= 1280 && !getVisibleResearchReport(storedReport, querySymbol || currentSymbol, currentSymbol)?.final_trade_decision)
    const [debateDrawer, setDebateDrawer] = useState<'research' | 'risk' | null>(null)
    const assistantToggle = useRef<HTMLButtonElement>(null)
    const assistantPanel = useRef<HTMLElement>(null)
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
    const report = getVisibleResearchReport(storedReport, activeSymbol, currentSymbol)
    const isCurrentJob = activeSymbol === currentSymbol
    const hasResearch = Boolean(report && Object.entries(report).some(([key, value]) => (key.endsWith('_report') || key.endsWith('_plan') || key === 'final_trade_decision') && typeof value === 'string' && value.trim()))
    const isRunning = isCurrentJob && isAnalyzing

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1280px)')
        const onChange = () => setIsDesktop(media.matches)
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [])
    useEffect(() => {
        if (!assistantOpen) return
        const previousFocus = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        if (!isDesktop) {
            document.body.style.overflow = 'hidden'
            assistantPanel.current?.querySelector<HTMLButtonElement>('button')?.focus()
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { setAssistantOpen(false); assistantToggle.current?.focus() }
            if (event.key !== 'Tab' || isDesktop) return
            const focusable = Array.from(assistantPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]') || []).filter(element => element.getClientRects().length)
            const first = focusable[0], last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            if (!isDesktop) { document.body.style.overflow = previousOverflow; previousFocus?.focus() }
        }
    }, [assistantOpen, isDesktop])

    const handleShowReport = (section?: string) => {
        setActiveSection(section)
        setSelectionRequestId(value => value + 1)
        setActiveTab('report')
        if (window.innerWidth < 1280) setAssistantOpen(false)
    }
    const securityName = report?.instrument_context?.security_name
    const horizon = report?.user_context?.investment_horizon || (isCurrentJob ? currentHorizon : null)
    const horizonLabel = horizon === 'short' ? '短线视角' : horizon === 'medium' ? '中线视角' : horizon
    const availableSources = SOURCES.filter(source => typeof report?.[source.key] === 'string' && report[source.key])

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="workspace-eyebrow mb-2">标的研究</p>
                    <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="workspace-page-title">{securityName || activeSymbol}</h1>
                        {securityName && <span className="font-mono text-sm text-slate-500">{activeSymbol}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {report?.instrument_context?.exchange && <span>{report.instrument_context.exchange} · {report.instrument_context.currency}</span>}
                        {horizonLabel && <span>{horizonLabel}</span>}
                        <span>{report?.trade_date ? `研究日期 ${report.trade_date}` : '尚无该标的研究报告'}</span>
                        {report?.market_context?.data_as_of && <span>资料截至 {report.market_context.data_as_of}</span>}
                    </div>
                </div>
                <button ref={assistantToggle} type="button" className={assistantOpen ? 'btn-secondary inline-flex items-center gap-2' : 'btn-primary inline-flex items-center gap-2'} aria-expanded={assistantOpen} aria-controls="research-assistant" onClick={() => setAssistantOpen(open => !open)}>
                    <MessageSquare className="h-4 w-4" />研究助理
                </button>
            </header>
            {isRunning && <div role="status" className="workspace-panel flex flex-wrap items-center gap-3 px-4 py-3 text-sm"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /><span>正在研究 {currentSymbol}，已生成内容会持续更新。</span><button className="ml-auto text-sm underline underline-offset-4" onClick={() => setActiveTab('process')}>查看进度</button></div>}
            {isCurrentJob && analysisRunState === 'failed' && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">研究任务未完成：{analysisRunError || '请打开研究助理查看详情，或在报告库中查看任务状态。'}</div>}
            <div className={`grid min-w-0 items-start gap-5 ${assistantOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
                <div className="min-w-0 space-y-5">
                    <div role="tablist" aria-label="研究内容" className="flex gap-5 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
                        {TABS.map(tab => <button id={`tab-${tab.id}`} key={tab.id} role="tab" type="button" aria-selected={activeTab === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={event => {
                            const index = TABS.findIndex(item => item.id === tab.id)
                            const next = event.key === 'ArrowRight' ? (index + 1) % TABS.length : event.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1
                            if (next >= 0) { event.preventDefault(); setActiveTab(TABS[next].id); document.getElementById(`tab-${TABS[next].id}`)?.focus() }
                        }} className={`shrink-0 border-b-2 px-1 pb-3 pt-1 text-sm transition-colors ${activeTab === tab.id ? 'border-[var(--brand-primary)] font-semibold text-slate-900 dark:border-slate-300 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>{tab.label}</button>)}
                    </div>
                    {activeTab === 'overview' && <section role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" className="space-y-5">
                        {hasResearch ? <>
                            <DecisionCard compact onReadReport={() => handleShowReport()} symbol={activeSymbol} report={report || undefined} decision={parseDecisionPresentation(report?.decision).action} direction={report?.direction} confidence={store.jobConfidence ?? extractExplicitConfidence(report?.final_trade_decision)} targetPrice={store.jobTargetPrice ?? extractExplicitPrice(report?.final_trade_decision, 'target')} stopLoss={store.jobStopLoss ?? extractExplicitPrice(report?.final_trade_decision, 'stop')} reasoning={report?.final_trade_decision} />
                            <div className={`grid min-w-0 gap-5 ${assistantOpen ? '2xl:grid-cols-[minmax(0,1fr)_300px]' : 'xl:grid-cols-[minmax(0,1fr)_300px]'}`}>
                                <div className="h-[320px] sm:h-[380px] min-w-0"><KlinePanel symbol={chartSymbol} onSymbolChange={setChartSymbol} /></div>
                                <RiskRadar items={store.riskItems} />
                            </div>
                            <KeyMetrics items={store.keyMetrics} />
                            <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4 text-left text-sm dark:border-slate-700 dark:bg-slate-800" onClick={() => handleShowReport()}><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" />阅读研究报告与执行条件</span><ArrowRight className="h-4 w-4" /></button>
                        </> : <>
                            <div className="workspace-panel px-6 py-8 sm:px-8">
                                <p className="workspace-eyebrow mb-3">{isRunning ? '研究进行中' : '开始一份研究'}</p>
                                <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100">{isRunning ? '正在汇集依据，等待形成研究结论' : '从一个标的，到一份有据可查的判断'}</h2>
                                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">在研究助理中输入股票名称或代码，并说明持有期限、关注问题和风险约束。完成后可在此查看研究判断、关键依据与风险条件。</p>
                                {!isRunning && <button className="btn-primary mt-5 inline-flex items-center gap-2" onClick={() => setAssistantOpen(true)}>填写研究需求<ArrowRight className="h-4 w-4" /></button>}
                            </div>
                            <div className="h-[320px] sm:h-[400px] min-w-0"><KlinePanel symbol={chartSymbol} onSymbolChange={setChartSymbol} /></div>
                        </>}
                    </section>}
                    {activeTab === 'evidence' && <section role="tabpanel" id="panel-evidence" aria-labelledby="tab-evidence" className="space-y-5">
                        <div className="workspace-panel p-5 sm:p-6">
                            <h2 className="text-lg font-semibold">研究依据</h2><p className="mb-5 mt-1 text-sm text-slate-500">按分析维度阅读原始报告，核对其中的资料日期、来源和限制。</p>
                            {availableSources.length ? <div className="divide-y divide-slate-200 dark:divide-slate-700">{availableSources.map(source => <button key={source.key} className="group flex w-full items-start gap-4 py-4 text-left" onClick={() => handleShowReport(source.key)}><FileText className="mt-1 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-2"><h3 className="text-sm font-semibold">{source.title}</h3><span className="text-xs text-slate-500">{source.detail}</span></div><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{getResearchExcerpt(report?.[source.key] as string, 160)}</p></div><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" /></button>)}</div> : <p className="py-6 text-sm text-slate-500">当前尚无可阅读的分析依据。</p>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">{(['research', 'risk'] as const).map(debate => <div key={debate} className="workspace-panel p-5"><div className="mb-3 flex items-center gap-2">{debate === 'research' ? <MessageSquare className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}<h3 className="font-semibold">{debate === 'research' ? '多空分歧与研究裁决' : '风险讨论与执行条件'}</h3></div><p className="mb-4 text-sm leading-6 text-slate-500">{debate === 'research' ? '对照多空观点与研究计划，关注仍未解释的反证。' : '核对风控意见与方案条件，确认研究判断的适用边界。'}</p><button className="btn-secondary text-sm" onClick={() => setDebateDrawer(debate)} disabled={!isCurrentJob}>查看讨论记录</button>{report?.[debate === 'research' ? 'investment_plan' : 'final_trade_decision'] && <button className="ml-4 text-sm underline underline-offset-4" onClick={() => handleShowReport(debate === 'research' ? 'investment_plan' : 'final_trade_decision')}>阅读裁决</button>}</div>)}</div>
                    </section>}
                    {activeTab === 'report' && <section role="tabpanel" id="panel-report" aria-labelledby="tab-report">{hasResearch ? <ReportViewer activeSection={activeSection} selectionRequestId={selectionRequestId} /> : <div className="workspace-panel p-8 text-sm text-slate-500">当前标的尚无报告。研究完成后将在此呈现。</div>}</section>}
                    {activeTab === 'process' && <section role="tabpanel" id="panel-process" aria-labelledby="tab-process" className="space-y-4">
                        <div className="workspace-panel flex flex-wrap items-center gap-3 p-4 text-sm"><span>{isRunning ? '分析任务正在执行' : report?.final_trade_decision ? '已生成研究结果' : '等待研究任务'}</span>{isCurrentJob && jobStatus?.started_at && <span className="text-xs text-slate-500">开始于 {new Date(jobStatus.started_at).toLocaleString('zh-CN')}</span>}</div>
                        {isCurrentJob ? <AgentCollaboration onSelectSection={handleShowReport} onOpenDebate={setDebateDrawer} selectedSection={activeSection} /> : <p className="text-sm text-slate-500">该标的尚未启动研究任务。</p>}
                    </section>}
                </div>
                {assistantOpen && !isDesktop && <div aria-hidden="true" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs" onClick={() => setAssistantOpen(false)} />}
                {/* Keep the SSE connection owner mounted when its panel closes. */}
                <aside ref={assistantPanel} id="research-assistant" role={isDesktop ? "complementary" : "dialog"} aria-modal={!isDesktop && assistantOpen ? true : undefined} aria-label="研究助理" hidden={!assistantOpen} className="fixed inset-y-0 right-0 z-50 w-full max-w-[390px] border-l border-slate-200 bg-[var(--canvas)] p-3 shadow-xl xl:sticky xl:top-24 xl:z-auto xl:h-[calc(100dvh-8rem)] xl:w-auto xl:max-w-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none dark:border-slate-700">
                    <div className="flex h-full min-h-0 flex-col gap-2">
                        <button type="button" className="flex shrink-0 items-center justify-end gap-1 py-1 text-xs text-slate-500" onClick={() => { setAssistantOpen(false); assistantToggle.current?.focus() }}><PanelRightClose className="h-4 w-4" />收起助理</button>
                        <div className="min-h-0 flex-1"><ChatCopilotPanel onSymbolDetected={symbol => { setSubject({ query: querySymbol, job: symbol, symbol, chart: symbol }); store.setCurrentSymbol(symbol) }} onShowReport={handleShowReport} initialInput={querySymbol ? `分析 ${querySymbol} 今日走势` : undefined} /></div>
                    </div>
                </aside>
            </div>
            <DebateDrawer debate={debateDrawer} onClose={() => setDebateDrawer(null)} />
        </div>
    )
}
