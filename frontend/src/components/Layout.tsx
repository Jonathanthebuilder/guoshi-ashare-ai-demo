import { CSSProperties, ReactNode, useCallback, useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

interface LayoutProps { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ta-sidebar-collapsed') === '1')
    const [mobileOpen, setMobileOpen] = useState(false)
    const closeMobile = useCallback(() => setMobileOpen(false), [])
    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 768px)')
        const onResize = () => { if (desktop.matches) setMobileOpen(false) }
        desktop.addEventListener('change', onResize)
        return () => desktop.removeEventListener('change', onResize)
    }, [])
    const toggleCollapsed = () => {
        setCollapsed((current) => {
            localStorage.setItem('ta-sidebar-collapsed', current ? '0' : '1')
            return !current
        })
    }
    return (
        <div className="workspace-shell" style={{ '--sidebar-width': collapsed ? '64px' : '208px' } as CSSProperties}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900">跳转至主要内容</a>
            <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
            <div className="workspace-content">
                <Header mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((open) => !open)} />
                <main id="main-content" className="min-w-0 flex-1 px-3.5 py-4 pb-24 sm:p-6 sm:pb-6 lg:p-7">
                    <div className="mx-auto w-full max-w-[1600px] min-w-0">{children}</div>
                </main>
            </div>
            <BottomNav />
        </div>
    )
}
