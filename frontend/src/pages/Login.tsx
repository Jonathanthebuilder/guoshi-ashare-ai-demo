import { FormEvent, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail, Sparkles, Rocket, ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function Login() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [step, setStep] = useState<'email' | 'code'>('email')
    const [loading, setLoading] = useState(false)
    const [demoLoading, setDemoLoading] = useState(false)
    const [masterLoading, setMasterLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const submitLabel = useMemo(() => step === 'email' ? '发送验证码' : '登录工作台', [step])

    const handleDemoLogin = async () => {
        setDemoLoading(true)
        setError(null)
        try {
            const res = await api.demoLogin()
            setAuth(res.access_token, res.user)
            navigate('/analysis', { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Demo 登录失败，请稍后重试')
        } finally {
            setDemoLoading(false)
        }
    }

    const handleMasterLogin = async () => {
        setMasterLoading(true)
        setError(null)
        try {
            const res = await api.masterLogin()
            setAuth(res.access_token, res.user)
            navigate('/analysis', { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : '老 K 主账号登录失败')
        } finally {
            setMasterLoading(false)
        }
    }

    const handleRequestCode = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)
        try {
            const res = await api.requestLoginCode(email)
            setStep('code')
            setMessage(res.dev_code ? `开发环境验证码：${res.dev_code}` : '验证码已发送，请查收邮箱。')
        } catch (err) {
            setError(err instanceof Error ? err.message : '发送验证码失败')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await api.verifyLoginCode(email, code)
            setAuth(res.access_token, res.user)
            navigate('/analysis', { replace: true })
        } catch (err) {
            setError(err instanceof Error ? err.message : '登录失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#F4F6F8] px-3 py-2 text-[#243746] dark:bg-[#111B24] dark:text-[#E8EDF1] sm:px-10 sm:py-10">
            <div className="mx-auto flex w-full max-w-[1120px] flex-1 items-center py-2 lg:py-10">
                <main className="grid w-full overflow-hidden rounded-xl border border-[#DFE5E9] bg-white shadow-sm dark:border-[#31424F] dark:bg-[#172530] lg:min-h-[660px] lg:grid-cols-[1fr_1fr]">
                    {/* 桌面端左侧品牌大图 (移动端隐藏以保证首屏直接操作) */}
                    <section className="hidden lg:flex flex-col justify-between bg-[#172D40] px-6 py-6 text-white sm:px-10 lg:p-12">
                        <div className="flex items-center gap-4">
                            <span className="h-8 w-0.5 bg-[#92764E]" aria-hidden="true" />
                            <div>
                                <p className="text-xl font-semibold tracking-[0.12em]">老 K 自建</p>
                                <p className="mt-1 text-xs tracking-[0.16em] text-[#BECAD4]">投研工作台</p>
                            </div>
                        </div>
                        <div className="pt-5 lg:py-16">
                            <p className="mb-5 hidden text-xs tracking-[0.18em] text-[#BECAD4] lg:block">研究 · 跟踪 · 复盘</p>
                            <h1 className="text-2xl font-medium leading-[1.6] lg:text-4xl lg:tracking-wide">
                                从研究依据，<br className="hidden lg:block" />到清晰判断。
                            </h1>
                            <p className="mt-6 hidden max-w-sm text-sm leading-7 text-[#BECAD4] lg:block">
                                查阅标的研究、关注关键分歧，<br />在持续跟踪中回看每一次判断。
                            </p>
                        </div>
                        <div className="border-t border-white/15 pt-6 text-xs leading-6 text-[#BECAD4]">
                            老 K 自建 · 投研工作台
                        </div>
                    </section>

                    <section className="flex items-center px-4 py-6 sm:px-10 lg:p-12" aria-label="账户登录">
                        <div className="w-full">
                            {/* 移动端专用轻量顶部品牌栏 */}
                            <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-[#DFE5E9] dark:border-[#31424F]">
                                <div className="flex items-center gap-2.5">
                                    <span className="h-5 w-1 rounded-full bg-[#c0a47c]" />
                                    <span className="text-base font-bold tracking-wider text-[#172D40] dark:text-white">老 K 投研工作台</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-semibold">
                                    现场 Demo 专版
                                </span>
                            </div>

                            <p className="text-xs font-medium tracking-[0.14em] text-[#657582] dark:text-[#A4B2BE]">账户登录</p>
                            <h2 className="mt-1 text-xl sm:text-2xl font-semibold">欢迎使用</h2>
                            <p className="mt-1 text-xs sm:text-sm leading-5 text-[#657582] dark:text-[#A4B2BE]">现场扫码体验或使用账号登录工作台。</p>

                            {/* 现场观众 / Demo 试用一键免密通道 (首屏核心视觉焦点) */}
                            <div className="mt-4 rounded-xl border-2 border-blue-400/70 dark:border-blue-700/80 bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-50 dark:from-blue-950/50 dark:via-slate-900 dark:to-slate-900 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                                现场演示 · 观众免密体验通道
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-300">
                                                    已锁死 Gemini 算力
                                                </span>
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                已预置专属 Google Gemini 3.8 算力，扫码直接体验
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3.5 flex flex-col gap-2.5">
                                    <button
                                        type="button"
                                        disabled={demoLoading || loading}
                                        onClick={handleDemoLogin}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 px-4 text-sm font-bold shadow-md shadow-blue-600/20 transition-all duration-150 disabled:opacity-50"
                                    >
                                        {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                                        <span>一键进入 Demo 体验</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={masterLoading || loading}
                                        onClick={handleMasterLogin}
                                        title="演示主持人免密直达管理主账号"
                                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {masterLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                                        <span>老 K 主持人通道登录</span>
                                    </button>
                                </div>
                            </div>

                            {/* 分割线 */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#DFE5E9] dark:border-[#31424F]" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white dark:bg-[#172530] px-3 text-[#657582] dark:text-[#A4B2BE]">
                                        或使用邮箱验证码登录
                                    </span>
                                </div>
                            </div>

                            <ol className="flex gap-6 border-b border-[#DFE5E9] text-sm dark:border-[#31424F]" aria-label="登录步骤">
                                <li aria-current={step === 'email' ? 'step' : undefined} className={`border-b-2 pb-3 ${step === 'email' ? 'border-[#172D40] font-medium dark:border-[#E8EDF1]' : 'border-transparent text-[#657582] dark:text-[#A4B2BE]'}`}>1. 邮箱地址</li>
                                <li aria-current={step === 'code' ? 'step' : undefined} className={`border-b-2 pb-3 ${step === 'code' ? 'border-[#172D40] font-medium dark:border-[#E8EDF1]' : 'border-transparent text-[#657582] dark:text-[#A4B2BE]'}`}>2. 验证码</li>
                            </ol>


                            <form onSubmit={step === 'email' ? handleRequestCode : handleVerify} className="mt-7 space-y-5">
                                <div>
                                    <label htmlFor="login-email" className="mb-2 block text-sm font-medium">邮箱地址</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#657582] dark:text-[#A4B2BE]" aria-hidden="true" />
                                        <input
                                            id="login-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input h-12 w-full pl-10"
                                            placeholder="you@example.com"
                                            disabled={loading || step === 'code'}
                                            required
                                        />
                                    </div>
                                </div>

                                {step === 'code' && (
                                    <div>
                                        <label htmlFor="login-code" className="mb-2 block text-sm font-medium">验证码</label>
                                        <div className="relative">
                                            <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#657582] dark:text-[#A4B2BE]" aria-hidden="true" />
                                            <input
                                                id="login-code"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                className="input h-12 w-full pl-10 tabular-nums tracking-[0.2em]"
                                                placeholder="输入 6 位验证码"
                                                maxLength={6}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {message && (
                                    <div role="status" className="flex items-start gap-2 rounded border border-[#C3D8D0] bg-[#F0F6F3] px-3 py-3 text-sm leading-6 text-[#287461] dark:border-[#355E50] dark:bg-[#1C332B] dark:text-[#98C8B5]">
                                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span>{message}</span>
                                    </div>
                                )}
                                {error && (
                                    <div role="alert" className="rounded border border-[#E5C9C7] bg-[#FBF2F1] px-3 py-3 text-sm leading-6 text-[#AF423F] dark:border-[#63403E] dark:bg-[#372827] dark:text-[#E1A3A0]">{error}</div>
                                )}

                                <button type="submit" disabled={loading} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                    {submitLabel}
                                    {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                                </button>

                                {step === 'code' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCode('')
                                            setStep('email')
                                            setMessage(null)
                                            setError(null)
                                        }}
                                        className="btn-secondary flex min-h-11 w-full items-center justify-center"
                                    >
                                        重新获取验证码
                                    </button>
                                )}
                            </form>

                            <p className="mt-7 border-t border-[#DFE5E9] pt-5 text-xs leading-6 text-[#657582] dark:border-[#31424F] dark:text-[#A4B2BE]">登录后可查看当前账户保存的研究报告与跟踪标的。</p>
                        </div>
                    </section>
                </main>
            </div>
            <footer className="pb-2 text-center text-xs text-[#657582] dark:text-[#A4B2BE]">
                &copy; {new Date().getFullYear()} 老 K 自建 · 投研工作台
            </footer>
        </div>
    )
}
