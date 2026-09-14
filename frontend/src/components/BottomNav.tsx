import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Activity, FileText, Wallet, Settings } from 'lucide-react'

const mobileNavItems = [
    { path: '/', label: '今日工作', icon: LayoutDashboard },
    { path: '/analysis', label: '标的研究', icon: Activity },
    { path: '/reports', label: '研究报告', icon: FileText },
    { path: '/tracking-board', label: '跟踪看板', icon: Wallet },
    { path: '/settings', label: '设置', icon: Settings },
]

export default function BottomNav() {
    return (
        <nav
            aria-label="移动端底部导航"
            className="fixed bottom-0 left-0 right-0 z-40 block border-t border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#15232d]/95 md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex h-14 items-stretch justify-around px-1">
                {mobileNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-center transition-colors active:scale-95 ${
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="absolute top-0 h-0.5 w-6 rounded-full bg-blue-600 dark:bg-blue-400" />
                                    )}
                                    <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.7} />
                                    <span className="text-[10px] tracking-tight">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
