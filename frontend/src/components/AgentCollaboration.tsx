import { useMemo, useCallback, useEffect, useRef, useState, memo } from 'react'
import {
    ReactFlow,
    Handle,
    Position,
    MarkerType,
    Background,
    type Node,
    type Edge,
    type NodeProps,
    type NodeTypes,
    type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAnalysisStore } from '@/stores/analysisStore'
import type { AgentStatus } from '@/types'
import {
    TrendingUp, MessageCircle, Newspaper, Calculator,
    BarChart2, DollarSign, ArrowBigUp, ArrowBigDown,
    Brain, Briefcase, Flame, Scale, Shield, CheckCircle2, Loader2,
    Activity, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut,
    Network, List, Sparkles, ArrowRight
} from 'lucide-react'
import { extractVerdict, type Verdict } from '@/utils/reportText'

// ── Agent 元数据 ──────────────────────────────────────────────────────────────

interface AgentMeta {
    name: string
    label: string
    goal: string
    section?: string
    debate?: 'research' | 'risk'
    Icon: React.FC<{ className?: string }>
    badgeBg: string
    badgeText: string
}

const META: AgentMeta[] = [
    { name: 'Market Analyst', label: '技术面分析', goal: '技术指标与形态趋势研判', section: 'market_report', Icon: TrendingUp, badgeBg: 'bg-blue-50 dark:bg-blue-950/50', badgeText: 'text-blue-600 dark:text-blue-400' },
    { name: 'Social Analyst', label: '舆情社交', goal: '网络声量与社交媒体情绪', section: 'sentiment_report', Icon: MessageCircle, badgeBg: 'bg-indigo-50 dark:bg-indigo-950/50', badgeText: 'text-indigo-600 dark:text-indigo-400' },
    { name: 'News Analyst', label: '新闻政策', goal: '监管政策资讯与行业动态', section: 'news_report', Icon: Newspaper, badgeBg: 'bg-amber-50 dark:bg-amber-950/50', badgeText: 'text-amber-600 dark:text-amber-400' },
    { name: 'Fundamentals Analyst', label: '基本面价值', goal: '财务健康度与企业内在估值', section: 'fundamentals_report', Icon: Calculator, badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50', badgeText: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'Macro Analyst', label: '宏观轮动', goal: '宏观经济指标与板块轮动', section: 'macro_report', Icon: BarChart2, badgeBg: 'bg-purple-50 dark:bg-purple-950/50', badgeText: 'text-purple-600 dark:text-purple-400' },
    { name: 'Smart Money Analyst', label: '主力资金', goal: '机构席位行为与龙虎榜追踪', section: 'smart_money_report', Icon: DollarSign, badgeBg: 'bg-rose-50 dark:bg-rose-950/50', badgeText: 'text-rose-600 dark:text-rose-400' },
    { name: 'Volume Price Analyst', label: '量价博弈', goal: '成交量能突变与量价背离', section: 'volume_price_report', Icon: Activity, badgeBg: 'bg-teal-50 dark:bg-teal-950/50', badgeText: 'text-teal-600 dark:text-teal-400' },
    { name: 'Bull Researcher', label: '多头研究员', goal: '构建多头投资逻辑与上行潜力', section: 'investment_plan', debate: 'research', Icon: ArrowBigUp, badgeBg: 'bg-red-50 dark:bg-red-950/50', badgeText: 'text-red-600 dark:text-red-400' },
    { name: 'Bear Researcher', label: '空头研究员', goal: '挖掘下行风险隐患与利空压力', section: 'investment_plan', debate: 'research', Icon: ArrowBigDown, badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50', badgeText: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'Research Manager', label: '研究总监', goal: '综合多空辩论制定投资计划', section: 'investment_plan', debate: 'research', Icon: Brain, badgeBg: 'bg-violet-50 dark:bg-violet-950/50', badgeText: 'text-violet-600 dark:text-violet-400' },
    { name: 'Trader', label: '策略交易员', goal: '转化投资方案为具体执行指令', section: 'trader_investment_plan', Icon: Briefcase, badgeBg: 'bg-sky-50 dark:bg-sky-950/50', badgeText: 'text-sky-600 dark:text-sky-400' },
    { name: 'Aggressive Analyst', label: '激进风控', goal: '高波动进攻性容忍边界约束', section: 'final_trade_decision', debate: 'risk', Icon: Flame, badgeBg: 'bg-orange-50 dark:bg-orange-950/50', badgeText: 'text-orange-600 dark:text-orange-400' },
    { name: 'Neutral Analyst', label: '中性风控', goal: '基准组合夏普比率均衡测算', section: 'final_trade_decision', debate: 'risk', Icon: Scale, badgeBg: 'bg-blue-50 dark:bg-blue-950/50', badgeText: 'text-blue-600 dark:text-blue-400' },
    { name: 'Conservative Analyst', label: '稳健风控', goal: '最大回撤刚性防线与底线守护', section: 'final_trade_decision', debate: 'risk', Icon: Shield, badgeBg: 'bg-cyan-50 dark:bg-cyan-950/50', badgeText: 'text-cyan-600 dark:text-cyan-400' },
    { name: 'Portfolio Manager', label: '投资组合经理', goal: '统筹风控委员会做出终审裁决', section: 'final_trade_decision', debate: 'risk', Icon: CheckCircle2, badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50', badgeText: 'text-emerald-600 dark:text-emerald-400' },
]

const STATUS_LABEL: Record<AgentStatus, string> = {
    pending: '待命', in_progress: '推演中', completed: '已就绪', skipped: '未启用', error: '异常',
}

const VERDICT_COLORS: Record<string, string> = {
    '看多': 'bg-red-500 text-white font-bold shadow-xs',
    '偏多': 'bg-red-500/90 text-white font-bold shadow-xs',
    '中性': 'bg-slate-500 text-white font-bold shadow-xs',
    '偏空': 'bg-emerald-600 text-white font-bold shadow-xs',
    '看空': 'bg-emerald-600 text-white font-bold shadow-xs',
    '谨慎': 'bg-amber-600 text-white font-bold shadow-xs',
    _default: 'bg-slate-600 text-white font-bold shadow-xs',
}

// ── 流程图布局 (紧凑中心对齐，大幅改善视口缩放比) ───────────────────────────

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
    // 阶段1：全维度数据分析师（垂直间距优化为 90px，高度控制在 555px+）
    'Market Analyst':       { x: 0, y: 15 },
    'Social Analyst':       { x: 0, y: 105 },
    'News Analyst':         { x: 0, y: 195 },
    'Fundamentals Analyst': { x: 0, y: 285 },
    'Macro Analyst':        { x: 0, y: 375 },
    'Smart Money Analyst':  { x: 0, y: 465 },
    'Volume Price Analyst': { x: 0, y: 555 },

    // 阶段2：多空博弈研究部（中心线与 y=285 对齐）
    'Bull Researcher':      { x: 440, y: 130 },
    'Research Manager':     { x: 670, y: 285 },
    'Bear Researcher':      { x: 440, y: 440 },

    // 阶段3：策略指令转化
    'Trader':               { x: 950, y: 285 },

    // 阶段4：风险控制委员会（三层防线）
    'Aggressive Analyst':   { x: 1220, y: 130 },
    'Neutral Analyst':      { x: 1220, y: 285 },
    'Conservative Analyst': { x: 1220, y: 440 },

    // 阶段5：最终组合裁决
    'Portfolio Manager':    { x: 1500, y: 285 },
}

// 需要额外 handle 的节点（用于辩论连线）
const BOTTOM_HANDLE_NODES = new Set(['Bull Researcher'])
const TOP_HANDLE_NODES = new Set(['Bear Researcher'])

// 边定义
interface EdgeDef {
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    label?: string
    bidirectional?: boolean
    thin?: boolean
    debate?: boolean
}

const EDGE_DEFS: EdgeDef[] = [
    // 数据源 → 多空研究员
    ...['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst', 'Macro Analyst', 'Smart Money Analyst', 'Volume Price Analyst']
        .map(s => ({ source: s, target: 'Bull Researcher', thin: true } as EdgeDef)),
    ...['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst', 'Macro Analyst', 'Smart Money Analyst', 'Volume Price Analyst']
        .map(s => ({ source: s, target: 'Bear Researcher', thin: true } as EdgeDef)),

    // 多空辩论（双向对抗激战）
    {
        source: 'Bull Researcher',
        target: 'Bear Researcher',
        sourceHandle: 'bottom',
        targetHandle: 'top',
        label: '多空博弈辩论',
        bidirectional: true,
        debate: true,
    },

    // 研究员 → 研究总监
    { source: 'Bull Researcher', target: 'Research Manager' },
    { source: 'Bear Researcher', target: 'Research Manager' },

    // 研究总监 → 交易员
    { source: 'Research Manager', target: 'Trader', label: '投资方案计划' },

    // 交易员 → 风控三层防线
    { source: 'Trader', target: 'Aggressive Analyst' },
    { source: 'Trader', target: 'Neutral Analyst', label: '执行方案审查' },
    { source: 'Trader', target: 'Conservative Analyst' },

    // 风控 → 组合经理
    { source: 'Aggressive Analyst', target: 'Portfolio Manager' },
    { source: 'Neutral Analyst', target: 'Portfolio Manager', label: '合规裁决' },
    { source: 'Conservative Analyst', target: 'Portfolio Manager' },
]

// ── 分组背景标签节点 ──────────────────────────────────────────────────────────

interface GroupLabelDef {
    id: string
    label: string
    position: { x: number; y: number }
    width: number
    height: number
    color: string
}

const GROUP_LABELS: GroupLabelDef[] = [
    { id: 'group-sources', label: '全维数据采集', position: { x: -18, y: -18 }, width: 260, height: 670, color: 'bg-blue-500' },
    { id: 'group-research', label: '多空博弈研究部', position: { x: 418, y: 70 }, width: 480, height: 470, color: 'bg-violet-500' },
    { id: 'group-risk', label: '风险控制委员会', position: { x: 1198, y: 70 }, width: 264, height: 470, color: 'bg-amber-500' },
]

const FIT_VIEW_OPTIONS = {
    padding: 0.04,
    minZoom: 0.3,
    maxZoom: 1.5,
} as const

// ── 自定义节点组件 ────────────────────────────────────────────────────────────

interface AgentNodeData {
    meta: AgentMeta
    status: AgentStatus
    verdict: Verdict | null
    isParticipating: boolean
    selected: boolean
    [key: string]: unknown
}

type AgentFlowNode = Node<AgentNodeData, 'agent'>
type GroupLabelNodeData = {
    label: string
    width: number
    height: number
    color: string
    [key: string]: unknown
}
type GroupLabelFlowNode = Node<GroupLabelNodeData, 'groupLabel'>
type CollaborationNode = AgentFlowNode | GroupLabelFlowNode

function AgentNodeComponent({ data }: NodeProps<AgentFlowNode>) {
    const { meta, status, verdict, isParticipating, selected } = data
    const active = status === 'in_progress'
    const done = status === 'completed'
    const error = status === 'error'
    const skipped = status === 'skipped'
    const { Icon } = meta

    return (
        <div
            className={[
                'relative group px-4 py-3.5 rounded-xl border-[1.5px] transition-all duration-300 min-w-[224px] max-w-[232px] cursor-pointer select-none',
                !isParticipating ? 'opacity-35 grayscale' : '',
                selected
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50/90 dark:bg-blue-950/40 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/15'
                    : active
                    ? 'border-blue-500 bg-white dark:bg-slate-900 node-active-glow ring-2 ring-blue-500/30'
                    : done
                    ? 'border-emerald-400/90 dark:border-emerald-500/70 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-emerald-500'
                    : error
                    ? 'border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/30'
                    : skipped
                    ? 'border-slate-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 opacity-40'
                    : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md',
            ].join(' ')}
        >
            {/* 连线 Handles */}
            <Handle
                type="target"
                position={Position.Left}
                id="left"
                className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full !-left-1.5"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full !-right-1.5"
            />

            {BOTTOM_HANDLE_NODES.has(meta.name) && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full !-bottom-1.5"
                />
            )}
            {TOP_HANDLE_NODES.has(meta.name) && (
                <Handle
                    type="target"
                    position={Position.Top}
                    id="top"
                    className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full !-top-1.5"
                />
            )}

            {/* 卡片头部：状态图标 + 名称 + 状态徽章 */}
            <div className="flex items-center gap-2.5">
                {active ? (
                    <div className="relative shrink-0">
                        <span className="absolute -inset-1 rounded-lg bg-blue-500/30 radar-wave" />
                        <div className="relative w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/40">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    </div>
                ) : done ? (
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shadow-xs">
                        <Icon className="w-5 h-5" />
                    </div>
                ) : (
                    <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 ${meta.badgeBg}`}>
                        <Icon className={`w-5 h-5 ${meta.badgeText}`} />
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                        <h4 className={`text-[15px] font-bold tracking-tight leading-tight ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {meta.label}
                        </h4>
                        <span className={[
                            'shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full leading-tight',
                            active ? 'bg-blue-600 text-white shadow-xs animate-pulse'
                                : done ? 'bg-emerald-600 text-white shadow-xs'
                                : error ? 'bg-red-600 text-white'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        ].join(' ')}>
                            {STATUS_LABEL[status]}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={meta.goal}>
                        {meta.goal}
                    </p>
                </div>
            </div>

            {/* 卡片下半区：推演状态或研判结论 */}
            {active && (
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                    </span>
                    <span>正在进行全维深度推演...</span>
                </div>
            )}

            {done && verdict && (
                <div className="flex items-start gap-2 mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-950/40 min-w-0">
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded shadow-xs leading-none ${VERDICT_COLORS[verdict.direction] ?? VERDICT_COLORS._default}`}>
                        {verdict.direction}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2" title={verdict.reason}>
                        {verdict.reason}
                    </span>
                </div>
            )}

            {done && !verdict && (
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-emerald-100 dark:border-emerald-950/40 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>研判数据已就绪 · 点击阅览</span>
                </div>
            )}
        </div>
    )
}

// 分组背景标签节点
function GroupLabelNode({ data }: NodeProps<GroupLabelFlowNode>) {
    return (
        <div
            className="rounded-2xl border-2 border-dashed border-slate-300/80 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-900/30 pointer-events-none transition-colors"
            style={{ width: data.width, height: data.height }}
        >
            <div className="absolute -top-3.5 left-5 px-3 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${data.color}`} />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {data.label}
                </span>
            </div>
        </div>
    )
}

const nodeTypes: NodeTypes = {
    agent: memo(AgentNodeComponent),
    groupLabel: memo(GroupLabelNode),
}

// ── 流水线阶段定义 ────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
    {
        id: 'sources',
        title: '1. 全维数据采集',
        desc: '7维多源分析师',
        agents: ['Market Analyst', 'Social Analyst', 'News Analyst', 'Fundamentals Analyst', 'Macro Analyst', 'Smart Money Analyst', 'Volume Price Analyst'],
    },
    {
        id: 'research',
        title: '2. 多空博弈研究',
        desc: '多空辩论与总监综合',
        agents: ['Bull Researcher', 'Bear Researcher', 'Research Manager'],
    },
    {
        id: 'strategy',
        title: '3. 策略指令转化',
        desc: '投资方案指令化',
        agents: ['Trader'],
    },
    {
        id: 'risk',
        title: '4. 风控三层审查',
        desc: '激进/中性/稳健防线',
        agents: ['Aggressive Analyst', 'Neutral Analyst', 'Conservative Analyst'],
    },
    {
        id: 'decision',
        title: '5. 终审组合裁决',
        desc: '投资组合经理裁定',
        agents: ['Portfolio Manager'],
    },
]

// ── 主组件 ────────────────────────────────────────────────────────────────────

interface AgentCollaborationProps {
    onSelectSection: (section?: string) => void
    onOpenDebate: (debate: 'research' | 'risk') => void
    selectedSection?: string
}

export default function AgentCollaboration({ onSelectSection, onOpenDebate, selectedSection }: AgentCollaborationProps) {
    const { agents, isAnalyzing, streamingSections, report } = useAnalysisStore()
    const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')
    const [isFullscreen, setIsFullscreen] = useState(false)
    const flowInstanceRef = useRef<ReactFlowInstance<CollaborationNode, Edge> | null>(null)

    const fitGraph = useCallback((duration = 350) => {
        void flowInstanceRef.current?.fitView({
            ...FIT_VIEW_OPTIONS,
            duration,
        })
    }, [])

    // 分析完成后重新自适应画布
    useEffect(() => {
        if (isAnalyzing) return
        const frameId = window.requestAnimationFrame(() => fitGraph(400))
        return () => window.cancelAnimationFrame(frameId)
    }, [isAnalyzing, fitGraph])

    // 全屏与窗口 resize 时自适应
    useEffect(() => {
        let timeoutId: ReturnType<typeof window.setTimeout> | undefined
        const handleResize = () => {
            if (timeoutId !== undefined) window.clearTimeout(timeoutId)
            timeoutId = window.setTimeout(() => fitGraph(0), 150)
        }
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            if (timeoutId !== undefined) window.clearTimeout(timeoutId)
        }
    }, [fitGraph])

    // ESC 键退出全屏
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isFullscreen])

    // 全屏切换后重新自适应
    useEffect(() => {
        const timer = setTimeout(() => {
            fitGraph(300)
        }, 120)
        return () => clearTimeout(timer)
    }, [isFullscreen, fitGraph])

    const cards = useMemo(() => META.map((meta) => {
        const agent = agents.find(a => a.name === meta.name)
        const streamState = meta.section ? streamingSections[meta.section] : undefined
        const stored = meta.section ? (report?.[meta.section as keyof typeof report] as string | undefined) : undefined
        const src = streamState?.displayed || stored || ''
        const isParticipating = isAnalyzing ? (agent ? agent.status !== 'skipped' : false) : true

        return {
            meta,
            status: (agent?.status ?? 'pending') as AgentStatus,
            isStreaming: !!streamState?.isTyping,
            verdict: extractVerdict(src),
            isParticipating,
        }
    }), [agents, report, streamingSections, isAnalyzing])

    const cardMap = useMemo(() => new Map(cards.map(c => [c.meta.name, c])), [cards])
    const doneN = cards.filter(c => c.status === 'completed').length
    const participatingCount = cards.filter(c => c.status !== 'skipped').length

    // 计算流水线阶段进度
    const stageStatuses = useMemo(() => {
        return PIPELINE_STAGES.map((stage) => {
            const stageCards = cards.filter(c => stage.agents.includes(c.meta.name))
            const hasActive = stageCards.some(c => c.status === 'in_progress')
            const allDone = stageCards.length > 0 && stageCards.every(c => c.status === 'completed' || c.status === 'skipped')
            const hasDone = stageCards.some(c => c.status === 'completed')
            const doneCount = stageCards.filter(c => c.status === 'completed').length
            const total = stageCards.length

            return {
                ...stage,
                status: hasActive ? 'in_progress' : allDone ? 'completed' : hasDone ? 'partial' : 'pending',
                doneCount,
                total,
            }
        })
    }, [cards])

    // 构建 React Flow 节点
    const nodes: CollaborationNode[] = useMemo(() => {
        const agentNodes: AgentFlowNode[] = cards.map(card => ({
            id: card.meta.name,
            type: 'agent',
            position: NODE_POSITIONS[card.meta.name] ?? { x: 0, y: 0 },
            data: {
                meta: card.meta,
                status: card.status,
                verdict: card.verdict,
                isParticipating: card.isParticipating,
                selected: !!card.meta.section && card.meta.section === selectedSection,
            } satisfies AgentNodeData,
        }))

        const labelNodes: GroupLabelFlowNode[] = GROUP_LABELS.map(g => ({
            id: g.id,
            type: 'groupLabel',
            position: g.position,
            data: { label: g.label, width: g.width, height: g.height, color: g.color },
            selectable: false,
            draggable: false,
            zIndex: -1,
        }))

        return [...labelNodes, ...agentNodes]
    }, [cards, selectedSection])

    // 构建 React Flow 边（增强动效与多空对抗激光）
    const edges: Edge[] = useMemo(() => {
        return EDGE_DEFS.map((def, i) => {
            const sourceCard = cardMap.get(def.source)
            const targetCard = cardMap.get(def.target)
            const sourceDone = sourceCard?.status === 'completed'
            const targetActive = targetCard?.status === 'in_progress'
            const isClash = !!def.debate && (sourceCard?.status === 'in_progress' || targetCard?.status === 'in_progress' || sourceDone)

            let strokeColor = '#cbd5e1'
            let edgeClass = ''

            if (def.debate) {
                strokeColor = '#ef4444'
                edgeClass = 'debate-clash-edge'
            } else if (targetActive) {
                strokeColor = '#3b82f6'
                edgeClass = 'laser-flow'
            } else if (sourceDone) {
                strokeColor = '#10b981'
            }

            return {
                id: `e-${i}`,
                source: def.source,
                target: def.target,
                sourceHandle: def.sourceHandle ?? 'right',
                targetHandle: def.targetHandle ?? 'left',
                type: 'default',
                animated: targetActive || isClash,
                className: edgeClass,
                label: def.label,
                labelStyle: { fontSize: 11, fontWeight: 700, fill: '#475569' },
                labelBgStyle: { fill: 'white', fillOpacity: 0.95 },
                labelBgPadding: [6, 3] as [number, number],
                labelBgBorderRadius: 4,
                style: {
                    stroke: strokeColor,
                    strokeWidth: def.debate ? 2.5 : def.thin ? 1.2 : 2,
                    opacity: def.thin && !targetActive && !sourceDone ? 0.35 : 1,
                    transition: 'stroke 0.4s ease, stroke-width 0.4s ease',
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: strokeColor,
                    width: 16,
                    height: 16,
                },
                ...(def.bidirectional && {
                    markerStart: {
                        type: MarkerType.ArrowClosed,
                        color: strokeColor,
                        width: 16,
                        height: 16,
                    },
                }),
            } satisfies Edge
        })
    }, [cardMap])

    // 节点点击
    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        const card = cardMap.get(node.id)
        if (!card) return
        if (card.status !== 'completed' && card.status !== 'in_progress') return

        if (card.meta.debate) {
            onOpenDebate(card.meta.debate)
            if (card.meta.section) onSelectSection(card.meta.section)
        } else if (card.meta.section) {
            onSelectSection(card.meta.section === selectedSection ? undefined : card.meta.section)
        }
    }, [cardMap, selectedSection, onSelectSection, onOpenDebate])

    return (
        <section className={[
            'transition-all duration-300',
            isFullscreen
                ? 'fixed inset-0 z-50 p-6 bg-slate-900/95 backdrop-blur-xl flex flex-col'
                : 'card relative overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
        ].join(' ')}>
            {/* 顶栏：标题 + 流水线状态 + 视图切换/全屏控制 */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
                        <Network className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h3 className={`font-bold tracking-tight ${isFullscreen ? 'text-xl text-white' : 'text-lg text-slate-900 dark:text-white'}`}>
                                智能体群体协同拓扑
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                <Sparkles className="w-3 h-3" />
                                14 智能体集群
                            </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isFullscreen ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            多角色流水线 · 实时推演 · 多空对抗博弈 · 委员会联席裁决
                        </p>
                    </div>
                </div>

                {/* 右侧操作区：进度指示 + 拓扑/列表切换 + 全屏 */}
                <div className="flex items-center gap-3">
                    {isAnalyzing ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>协同推演中 ({doneN} / {participatingCount})</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>14 环节已就绪</span>
                        </div>
                    )}

                    {/* 拓扑 / 清单 切换按钮组 */}
                    <div className="flex items-center rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setViewMode('graph')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                viewMode === 'graph'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Network className="w-3.5 h-3.5" />
                            <span>拓扑图谱</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>环节清单</span>
                        </button>
                    </div>

                    {/* 全屏切换按钮 */}
                    <button
                        type="button"
                        onClick={() => setIsFullscreen(prev => !prev)}
                        title={isFullscreen ? '退出全屏 (ESC)' : '进入沉浸全屏演示模式'}
                        className={`p-2 rounded-lg border transition-colors ${
                            isFullscreen
                                ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* 中部：5 阶段流水线横向指示条 */}
            <div className="py-3 px-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max text-xs">
                    {stageStatuses.map((stage, idx) => (
                        <div key={stage.id} className="flex items-center gap-2">
                            <div className={[
                                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
                                stage.status === 'completed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                                    : stage.status === 'in_progress'
                                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-1 ring-blue-400/40 font-semibold'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400'
                            ].join(' ')}>
                                {stage.status === 'completed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : stage.status === 'in_progress' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                )}
                                <span className="font-semibold">{stage.title}</span>
                                <span className="text-[10px] opacity-75">({stage.doneCount}/{stage.total})</span>
                            </div>
                            {idx < stageStatuses.length - 1 && (
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 下部主内容区：拓扑图谱 或 环节清单 */}
            {viewMode === 'graph' ? (
                <div className={[
                    'relative w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 mt-3',
                    isFullscreen ? 'flex-1 min-h-0' : 'h-[740px]'
                ].join(' ')}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodeClick={handleNodeClick}
                        onInit={(instance) => {
                            flowInstanceRef.current = instance
                        }}
                        fitView
                        minZoom={0.25}
                        maxZoom={2.0}
                        fitViewOptions={FIT_VIEW_OPTIONS}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        nodesFocusable={false}
                        edgesFocusable={false}
                        panOnDrag={true}
                        panOnScroll={false}
                        zoomOnScroll={true}
                        zoomOnPinch={true}
                        zoomOnDoubleClick={false}
                        preventScrolling={false}
                        translateExtent={[[-400, -200], [2200, 950]]}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background
                            gap={24}
                            size={1.2}
                            color="#94a3b8"
                            className="opacity-30 dark:opacity-15"
                        />
                    </ReactFlow>

                    {/* 悬浮工具条：放大 / 缩小 / 复位居中 / 全屏 */}
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-md">
                        <button
                            type="button"
                            onClick={() => flowInstanceRef.current?.zoomIn({ duration: 250 })}
                            title="放大"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => flowInstanceRef.current?.zoomOut({ duration: 250 })}
                            title="缩小"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => fitGraph(350)}
                            title="自适应全局视野"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(prev => !prev)}
                            title={isFullscreen ? '退出全屏' : '全屏沉浸演示'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-colors"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* 底部图例说明 */}
                    <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            <span>推演数据流</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>研判就绪</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span>多空能量对抗</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span>待命中</span>
                        </div>
                        <span className="text-slate-400">| 点击节点可穿透至研报</span>
                    </div>
                </div>
            ) : (
                /* 环节清单视图：14 智能体清晰卡片网格 */
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {cards.map(card => {
                        const { Icon } = card.meta
                        const active = card.status === 'in_progress'
                        const done = card.status === 'completed'
                        const error = card.status === 'error'

                        return (
                            <div
                                key={card.meta.name}
                                onClick={() => {
                                    if (card.meta.debate) {
                                        onOpenDebate(card.meta.debate)
                                        if (card.meta.section) onSelectSection(card.meta.section)
                                    } else if (card.meta.section) {
                                        onSelectSection(card.meta.section)
                                    }
                                }}
                                className={[
                                    'p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between',
                                    active
                                        ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-400/20'
                                        : done
                                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 shadow-xs'
                                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 opacity-75'
                                ].join(' ')}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg shrink-0 ${card.meta.badgeBg}`}>
                                        <Icon className={`w-4 h-4 ${card.meta.badgeText}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                {card.meta.label}
                                            </h4>
                                            <span className={[
                                                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                                active ? 'bg-blue-600 text-white animate-pulse'
                                                    : done ? 'bg-emerald-600 text-white'
                                                    : error ? 'bg-red-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                            ].join(' ')}>
                                                {STATUS_LABEL[card.status]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                            {card.meta.goal}
                                        </p>
                                    </div>
                                </div>

                                {done && card.verdict && (
                                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${VERDICT_COLORS[card.verdict.direction] ?? VERDICT_COLORS._default}`}>
                                            {card.verdict.direction}
                                        </span>
                                        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                            {card.verdict.reason}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

