import { AlertTriangle } from 'lucide-react'
import type { RiskItem } from '@/types'

const LEVEL_LABELS = { high: '高风险', medium: '中风险', low: '低风险' }

export default function RiskRadar({ items }: { items?: RiskItem[] }) {
    const risks = items ?? []
    return (
        <section className="min-w-0 rounded-lg border border-[#DFE5E9] bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <header className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#172D40] dark:text-slate-100">主要风险事项</h3>
                <AlertTriangle className="h-4 w-4 text-[#657582] dark:text-slate-400" />
            </header>
            {risks.length === 0 ? <p className="py-5 text-sm leading-6 text-[#657582] dark:text-slate-400">本次报告尚未提供结构化风险事项。</p> : (
                <ul className="divide-y divide-[#DFE5E9] dark:divide-slate-700">
                    {risks.map((risk, i) => (
                        <li key={i} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <h4 className="min-w-0 flex-1 break-words text-sm font-medium leading-6 text-[#243746] dark:text-slate-200">{risk.name}</h4>
                                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] ${risk.level === 'high' ? 'border-[#AF423F]/30 text-[#AF423F] dark:text-red-300' : 'border-[#DFE5E9] text-[#657582] dark:border-slate-600 dark:text-slate-400'}`}>{LEVEL_LABELS[risk.level] || '等级未提供'}</span>
                            </div>
                            {risk.description && <p className="mt-1 break-words text-xs leading-6 text-[#657582] dark:text-slate-400">{risk.description}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
