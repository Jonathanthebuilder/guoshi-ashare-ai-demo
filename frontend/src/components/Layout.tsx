import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <Sidebar />
            <div className="ml-16 min-h-screen flex flex-col">
                <Header />
                <div
                    role="note"
                    className="sticky top-16 z-30 border-b border-amber-200/80 bg-amber-50/95 px-6 py-2 text-center text-xs leading-5 text-amber-900/90 backdrop-blur-sm dark:border-amber-900/40 dark:bg-amber-950/70 dark:text-amber-200/90"
                >
                    仅供教学研究，不构成投资建议；不连接实盘
                </div>
                <main className="flex-1 p-6 bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-800">
                    {children}
                </main>
            </div>
        </div>
    )
}
