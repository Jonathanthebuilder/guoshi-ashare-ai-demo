import type { KeyMetric } from '@/types'

const STATUS_LABELS = { good: '有利', neutral: '中性', bad: '不利' }

export default function KeyMetrics({ items }: { items?: KeyMetric[] }) {
    const metrics = items ?? []
    return (
        <section className="min-w-0 rounded-lg border border-[#DFE5E9] bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-1 text-sm font-semibold text-[#172D40] dark:text-slate-100">关键指标</h3>
            <p className="mb-4 text-[11px] text-[#657582] dark:text-slate-400">报告提取值 · 时点与出处见原文</p>
            {metrics.length === 0 ? <p className="py-5 text-sm leading-6 text-[#657582] dark:text-slate-400">本次报告尚未提供关键指标。</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-[#DFE5E9] text-[11px] text-[#657582] dark:border-slate-700 dark:text-slate-400"><th className="pb-2 text-left font-normal">指标</th><th className="pb-2 text-right font-normal">数值</th><th className="pb-2 pl-3 text-right font-normal">模型判断</th></tr></thead>
                        <tbody>{metrics.map((metric, i) => (
                            <tr key={`${metric.name}-${i}`} className="border-b border-[#DFE5E9] last:border-0 dark:border-slate-700">
                                <td className="py-3 pr-3 text-[#657582] dark:text-slate-400">{metric.name}</td>
                                <td className="py-3 text-right font-medium tabular-nums text-[#243746] dark:text-slate-200">{metric.value}</td>
                                <td className="py-3 pl-3 text-right text-xs text-[#657582] dark:text-slate-400">{STATUS_LABELS[metric.status] || '未提供'}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
