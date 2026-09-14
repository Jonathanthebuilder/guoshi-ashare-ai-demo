import type { LucideIcon } from 'lucide-react'
import {
    Activity,
    Briefcase,
    FileText,
    LayoutDashboard,
    Settings,
    Wallet,
} from 'lucide-react'

export interface SidebarNavItem {
    path: string
    icon: LucideIcon
    label: string
}

export const navItems: SidebarNavItem[] = [
    { path: '/', icon: LayoutDashboard, label: '今日工作' },
    { path: '/analysis', icon: Activity, label: '标的研究' },
    { path: '/reports', icon: FileText, label: '研究报告' },
    { path: '/portfolio', icon: Briefcase, label: '自选与定时研究' },
    { path: '/tracking-board', icon: Wallet, label: '跟踪看板' },
    { path: '/settings', icon: Settings, label: '设置' },
]
