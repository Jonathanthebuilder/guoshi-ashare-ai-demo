import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { navItems } from '@/components/sidebarNav'

interface SidebarProps {
    collapsed: boolean
    onToggleCollapsed: () => void
    mobileOpen: boolean
    onCloseMobile: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
    const sidebarRef = useRef<HTMLElement>(null)
    const showLabels = mobileOpen || !collapsed
    useEffect(() => {
        if (!mobileOpen) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const elements = () => Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button') || [])
            .filter((element) => element.offsetParent !== null)
        elements()[0]?.focus()
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); onCloseMobile() }
            if (event.key !== 'Tab') return
            const items = elements()
            const first = items[0]
            const last = items[items.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = originalOverflow
            document.removeEventListener('keydown', onKeyDown)
            previouslyFocused?.focus()
        }
    }, [mobileOpen, onCloseMobile])
    return (
        <>
            {mobileOpen && <div className="fixed inset-0 z-50 bg-slate-950/40 md:hidden" aria-hidden="true" onClick={onCloseMobile} />}
            <aside id="primary-navigation" ref={sidebarRef} className={`workspace-sidebar fixed inset-y-0 left-0 z-[60] flex-col ${mobileOpen ? 'flex' : 'hidden'} md:flex`} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label="工作台导航">
                <div className={`flex h-16 shrink-0 items-center border-b border-white/10 ${showLabels ? 'justify-between px-5' : 'justify-center'}`}>
                    <NavLink to="/" onClick={onCloseMobile} className="flex items-center gap-2.5" aria-label="老 K 自建 · 投研工作台首页">
                        {showLabels ? <div><div className="font-serif text-lg font-semibold tracking-[.14em] text-white">老 K 自建</div><div className="mt-0.5 text-[9px] tracking-[.14em] text-slate-300">QUANT & RESEARCH</div></div> : <span className="font-serif text-lg text-[#c0a47c]">K</span>}
                    </NavLink>
                    <button className="rounded p-1.5 text-slate-300 hover:bg-white/10 md:hidden" onClick={onCloseMobile} aria-label="关闭导航"><X className="h-5 w-5" /></button>
                </div>
                <div className={`pt-7 pb-3 text-[10px] tracking-[.12em] text-slate-400 ${showLabels ? 'px-5' : 'px-2 text-center'}`}>{showLabels ? '投研工作台' : '投研'}</div>
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label="主要导航">
                    {navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={onCloseMobile} title={showLabels ? undefined : item.label} aria-label={item.label}
                        className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded border-l-2 text-sm transition-colors duration-150 ${showLabels ? 'px-3' : 'justify-center px-0'} ${isActive ? 'border-[#c0a47c] bg-white/[.09] font-medium text-white' : 'border-transparent text-slate-300 hover:bg-white/[.05] hover:text-white'}`}>
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                        {showLabels && <span className="whitespace-nowrap">{item.label}</span>}
                    </NavLink>)}
                </nav>
                <div className="hidden border-t border-white/10 p-2 md:block">
                    <button onClick={onToggleCollapsed} aria-label={collapsed ? '展开导航' : '收起导航'} aria-expanded={!collapsed} className={`flex min-h-10 w-full items-center gap-3 rounded text-xs text-slate-300 hover:bg-white/[.05] hover:text-white ${collapsed ? 'justify-center' : 'px-3'}`}>
                        {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
                        {!collapsed && <span>收起导航</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}
