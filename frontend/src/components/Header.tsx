import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BellOff, ChevronDown, FileText, Info, LogOut, Menu, Monitor, Moon, Settings, Sun, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import GithubIcon from './GithubIcon'

type ThemeMode = 'system' | 'light' | 'dark'

function getInitials(email?: string | null): string {
    if (!email) return 'K'
    return email.slice(0, 2).toUpperCase()
}

interface HeaderProps {
    mobileOpen: boolean
    onToggleMobile: () => void
}

export default function Header({ mobileOpen, onToggleMobile }: HeaderProps) {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const [themeMode, setThemeMode] = useState<ThemeMode>('system')
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const saved = (localStorage.getItem('ta-theme') || 'system') as ThemeMode
        const mode: ThemeMode = ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
        setThemeMode(mode)
        applyTheme(mode)
        if ('Notification' in window) setNotifPermission(Notification.permission)
    }, [])

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false)
            }
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            if (menuRef.current?.contains(document.activeElement)) menuRef.current.querySelector('button')?.focus()
            setMenuOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onClick)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    const applyTheme = (mode: ThemeMode) => {
        const root = document.documentElement
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const shouldBeDark = mode === 'system' ? systemDark : mode === 'dark'
        root.classList.toggle('dark', shouldBeDark)
    }

    useEffect(() => {
        if (themeMode !== 'system') return
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => applyTheme('system')
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [themeMode])

    const cycleTheme = () => {
        const next: ThemeMode =
            themeMode === 'system' ? 'light' : themeMode === 'light' ? 'dark' : 'system'
        setThemeMode(next)
        localStorage.setItem('ta-theme', next)
        applyTheme(next)
    }

    const toggleNotifications = async () => {
        if (!('Notification' in window)) return
        if (Notification.permission === 'denied') {
            alert('通知权限已被浏览器拒绝，请在浏览器设置中手动开启')
            return
        }
        const perm = await Notification.requestPermission()
        setNotifPermission(perm)
    }

    const themeLabel = themeMode === 'system' ? '跟随系统' : themeMode === 'light' ? '浅色' : '深色'
    const ThemeIcon = themeMode === 'system' ? Monitor : themeMode === 'light' ? Sun : Moon
    const accountTone = useMemo(() => getInitials(user?.email), [user?.email])

    return (
        <header className="workspace-header sticky top-0 z-40 h-16">
            <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-7">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button onClick={onToggleMobile} className="workspace-icon-button md:hidden" aria-label={mobileOpen ? '关闭导航' : '打开导航'} aria-expanded={mobileOpen} aria-controls="primary-navigation"><Menu className="h-5 w-5" /></button>
                    <div className="truncate text-sm font-medium tracking-[.02em]">
                        <span className="hidden sm:inline">老 K 自建 · </span>投研工作台
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {user && (
                        <div className="relative" ref={menuRef}>
                            <button onClick={() => setMenuOpen((open) => !open)} className="flex items-center gap-2 rounded p-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800" aria-label="账户与偏好设置" aria-expanded={menuOpen} aria-controls="workspace-account">
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#172d40] text-[11px] font-medium text-white dark:bg-slate-700">{accountTone}</div>
                                <span className="hidden text-xs workspace-muted lg:inline">我的工作台</span>
                                <ChevronDown className={`h-3.5 w-3.5 workspace-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {menuOpen && (
                                <div id="workspace-account" className="workspace-menu fixed left-4 right-4 top-[72px] z-50 max-h-[calc(100dvh-88px)] overflow-y-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
                                    <div className="border-b px-5 py-4"><div className="text-xs workspace-muted">当前账户</div><div className="mt-1.5 break-all text-sm">{user.email}</div></div>
                                    <div className="space-y-0.5 p-2">
                                        <button onClick={cycleTheme} className="workspace-menu-item"><ThemeIcon className="h-4 w-4 workspace-muted" /><span className="flex-1">界面主题</span><span className="text-xs workspace-muted">{themeLabel}</span></button>
                                        <button onClick={toggleNotifications} className="workspace-menu-item">
                                            {notifPermission === 'denied' ? <BellOff className="h-4 w-4 workspace-muted" /> : <Bell className="h-4 w-4 workspace-muted" />}
                                            <span className="flex-1">通知提醒</span><span className="text-xs workspace-muted">{notifPermission === 'granted' ? '已启用' : notifPermission === 'denied' ? '已拒绝' : '未设置'}</span>
                                        </button>
                                        <button onClick={() => { setMenuOpen(false); navigate('/reports') }} className="workspace-menu-item"><FileText className="h-4 w-4 workspace-muted" />我的研究报告</button>
                                        <button onClick={() => { setMenuOpen(false); navigate('/settings') }} className="workspace-menu-item"><Settings className="h-4 w-4 workspace-muted" />工作台设置</button>
                                        <details className="group">
                                            <summary className="workspace-menu-item list-none [&::-webkit-details-marker]:hidden"><Info className="h-4 w-4 workspace-muted" /><span className="flex-1">关于工作台</span><ChevronDown className="h-3.5 w-3.5 workspace-muted transition-transform group-open:rotate-180" /></summary>
                                            <div className="mx-3 mb-2 border-l pl-3">
                                                <Link to="/thanks" onClick={() => setMenuOpen(false)} className="workspace-menu-item"><Users className="h-4 w-4 workspace-muted" />致谢名单</Link>
                                                <a href="https://github.com/KylinMountain/TradingAgents-AShare" target="_blank" rel="noopener noreferrer" className="workspace-menu-item"><GithubIcon className="h-4 w-4 workspace-muted" />项目源码</a>
                                                <div className="px-3 pb-2 pt-1 text-[11px] leading-5 workspace-muted"><div>版本 {__APP_BUILD_VERSION__}</div><div>{__APP_BUILD_DATE__} · {__APP_BUILD_COMMIT__}</div></div>
                                            </div>
                                        </details>
                                    </div>
                                    <div className="border-t p-2"><button onClick={() => { setMenuOpen(false); logout() }} className="workspace-menu-item text-[#af423f] dark:text-red-300"><LogOut className="h-4 w-4" />退出登录</button></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
