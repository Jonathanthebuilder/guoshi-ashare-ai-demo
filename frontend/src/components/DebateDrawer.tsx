import { useCallback, useEffect, useRef } from 'react'
import { X, MessageSquareText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAnalysisStore } from '@/stores/analysisStore'
import { sanitizeReportMarkdown } from '@/utils/reportText'

const DEBATE_TITLES = { research: '多空论证记录', risk: '风险复核记录' }
const PARTICIPANT_LABELS: Record<string, string> = {
    'Bull Researcher': '多头研究员', 'Bear Researcher': '空头研究员', 'Research Manager': '研究总监',
    'Aggressive Analyst': '激进研究员', 'Neutral Analyst': '中性研究员', 'Conservative Analyst': '稳健研究员',
    'Portfolio Manager': '风控裁决',
}
const PARTICIPANTS = { research: ['多头', '空头', '研究总监'], risk: ['激进', '中性', '稳健', '风控'] }

interface DebateDrawerProps {
    debate: 'research' | 'risk' | null
    onClose: () => void
}

export default function DebateDrawer({ debate, onClose }: DebateDrawerProps) {
    const debateMessages = useAnalysisStore(s => s.debateMessages)
    const scrollTick = useAnalysisStore(s => s.debateScrollTick)
    const scrollRef = useRef<HTMLDivElement>(null)
    const drawerRef = useRef<HTMLDivElement>(null)
    const closeRef = useRef<HTMLButtonElement>(null)
    const onCloseRef = useRef(onClose)
    const userScrolledUp = useRef(false)
    const messages = debate ? (debateMessages[debate] || []) : []

    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    useEffect(() => {
        if (!debate) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeRef.current?.focus()
        userScrolledUp.current = false
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseRef.current()
            if (event.key !== 'Tab') return
            const elements = drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
            if (!elements?.length) return
            const first = elements[0]
            const last = elements[elements.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousOverflow
            previouslyFocused?.focus()
        }
    }, [debate])

    const handleScroll = useCallback(() => {
        const element = scrollRef.current
        if (element) userScrolledUp.current = element.scrollHeight - element.scrollTop - element.clientHeight > 80
    }, [])

    useEffect(() => {
        const element = scrollRef.current
        if (element && !userScrolledUp.current) element.scrollTop = element.scrollHeight
    }, [scrollTick, messages.length, debate])

    if (!debate) return null

    return (
        <>
            <div className="fixed inset-0 z-40 bg-[#172D40]/35" onClick={onClose} aria-hidden="true" />
            <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="debate-drawer-title" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[720px] flex-col border-l border-[#DFE5E9] bg-white text-[#243746] shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <header className="border-b border-[#DFE5E9] px-5 py-5 dark:border-slate-700 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="debate-drawer-title" className="text-lg font-semibold text-[#172D40] dark:text-slate-100">{DEBATE_TITLES[debate]}</h2>
                        <button ref={closeRef} type="button" onClick={onClose} aria-label="关闭论证记录" className="rounded p-2 text-[#657582] transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
                    </div>
                    <p className="mt-2 text-xs text-[#657582] dark:text-slate-400">参与角色：{PARTICIPANTS[debate].join(' / ')}</p>
                </header>
                <div className="border-b border-[#DFE5E9] bg-[#F4F6F8] px-5 py-3 text-xs leading-6 text-[#657582] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 sm:px-6">
                    以下为模型的论证过程。文中的“已解决”或“已回应”属于参与者自报，尚未经独立证据核验；具体出处以各条记录为准。
                </div>
                <div ref={scrollRef} onScroll={handleScroll} tabIndex={0} aria-label="论证记录内容" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    {messages.length === 0 ? (
                        <div className="py-20 text-center text-sm leading-7 text-[#657582] dark:text-slate-400"><MessageSquareText className="mx-auto mb-3 h-6 w-6" />暂无论证记录。<p className="text-xs">本次论证开始后，将按发言顺序显示。</p></div>
                    ) : (
                        <ol className="space-y-5">
                            {messages.map((message, index) => (
                                <li key={`${message.round}-${message.agent}-${index}`} className={`min-w-0 border-l-2 pl-4 ${message.isVerdict ? 'border-[#92764E]' : 'border-[#DFE5E9] dark:border-slate-700'}`}>
                                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold text-[#172D40] dark:text-slate-100">{PARTICIPANT_LABELS[message.agent] || message.agent}</h3>
                                        <span className="text-[11px] text-[#657582] dark:text-slate-400">{message.isVerdict ? '模型裁决' : `第 ${message.round} 轮`}{message.horizon ? ` · ${message.horizon === 'short' ? '短线' : '中线'}` : ''}</span>
                                    </div>
                                    <div className="prose max-w-none break-words text-sm leading-7 dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizeReportMarkdown(message.content)}</ReactMarkdown>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </>
    )
}
