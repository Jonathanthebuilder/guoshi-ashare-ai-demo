import { useState, useEffect } from 'react'
import {
    Save, Key, Database, Loader2, Trash2, Copy, Plus, CheckCircle2,
    Mail, Flame, Webhook, Star, Edit3, X, ShieldCheck,
    Cpu
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { LLMProfile, UserToken } from '@/types'

interface QuickPreset {
    id: string
    name: string
    provider: string
    baseUrl: string
    quickThinkLlm: string
    deepThinkLlm: string
    protocol: string
    description: string
}

const QUICK_PRESETS: QuickPreset[] = [
    {
        id: 'deepseek',
        name: 'DeepSeek 官方',
        provider: 'openai',
        baseUrl: 'https://api.deepseek.com',
        quickThinkLlm: 'deepseek-flash',
        deepThinkLlm: 'deepseek-v4-pro',
        protocol: 'OpenAI 兼容',
        description: '官方直连，最新 V4.1 Flash 极速响应 + V4 Pro 深度分析',
    },
    {
        id: 'openai',
        name: 'OpenAI 官方',
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        quickThinkLlm: 'gpt-4o-mini',
        deepThinkLlm: 'gpt-4o',
        protocol: 'OpenAI 原生',
        description: 'OpenAI 官方旗舰模型，分析与逻辑兼顾',
    },
    {
        id: 'dashscope',
        name: '阿里云百炼 (通义千问)',
        provider: 'openai',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        quickThinkLlm: 'qwen-plus',
        deepThinkLlm: 'qwen-max',
        protocol: 'OpenAI 兼容',
        description: '阿里云国内网络直连，低延迟，金融中文理解力优异',
    },
    {
        id: 'siliconflow',
        name: '硅基流动 (DeepSeek R1)',
        provider: 'openai',
        baseUrl: 'https://api.siliconflow.cn/v1',
        quickThinkLlm: 'deepseek-ai/DeepSeek-V3',
        deepThinkLlm: 'deepseek-ai/DeepSeek-R1',
        protocol: 'OpenAI 兼容',
        description: '国内高可用满血 DeepSeek R1/V3 推理算力托管平台',
    },
    {
        id: 'moonshot',
        name: 'Moonshot AI (Kimi)',
        provider: 'openai',
        baseUrl: 'https://api.moonshot.cn/v1',
        quickThinkLlm: 'moonshot-v1-8k',
        deepThinkLlm: 'kimi-k2-0905-preview',
        protocol: 'OpenAI 兼容',
        description: '月之暗面长文本分析，擅长长篇研报与公告穿透',
    },
    {
        id: 'zhipu',
        name: '智谱 AI (GLM-4)',
        provider: 'openai',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        quickThinkLlm: 'glm-4-flash',
        deepThinkLlm: 'glm-4-plus',
        protocol: 'OpenAI 兼容',
        description: '清华系全自研国产大模型，中文投研语义理解强',
    },
    {
        id: 'custom',
        name: '自定义兼容端点',
        provider: 'openai',
        baseUrl: '',
        quickThinkLlm: '',
        deepThinkLlm: '',
        protocol: 'OpenAI 兼容',
        description: '任意兼容 OpenAI 规范的私有化网关、OneAPI 或中转服务',
    },
]

export default function Settings() {
    const { user } = useAuthStore()

    // LLM Profiles states
    const [profiles, setProfiles] = useState<LLMProfile[]>([])
    const [profilesLoading, setProfilesLoading] = useState(false)
    const [testingProfileId, setTestingProfileId] = useState<string | null>(null)
    const [cardTestResults, setCardTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})

    // Modal state for Add/Edit profile
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProfile, setEditingProfile] = useState<LLMProfile | null>(null)
    const [formName, setFormName] = useState('')
    const [formProvider, setFormProvider] = useState('openai')
    const [formBaseUrl, setFormBaseUrl] = useState('')
    const [formQuickModel, setFormQuickModel] = useState('')
    const [formDeepModel, setFormDeepModel] = useState('')
    const [formApiKey, setFormApiKey] = useState('')
    const [formIsDefault, setFormIsDefault] = useState(false)
    const [formTesting, setFormTesting] = useState(false)
    const [formTestResult, setFormTestResult] = useState<{ ok: boolean; message: string } | null>(null)
    const [formSaving, setFormSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // General settings
    const [defaultAnalysts, setDefaultAnalysts] = useState(['market', 'social', 'news', 'fundamentals', 'macro', 'smart_money', 'volume_price'])
    const [customPrompt, setCustomPrompt] = useState('')
    const [maxDebateRounds, setMaxDebateRounds] = useState(1)
    const [maxRiskRounds, setMaxRiskRounds] = useState(1)
    const [emailReportEnabled, setEmailReportEnabled] = useState(true)
    const [wecomReportEnabled, setWecomReportEnabled] = useState(true)
    const [wecomWebhook, setWecomWebhook] = useState('')
    const [hasStoredWebhook, setHasStoredWebhook] = useState(false)
    const [storedWebhookDisplay, setStoredWebhookDisplay] = useState('')

    const [configLoading, setConfigLoading] = useState(false)
    const [savingGeneral, setSavingGeneral] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveMessage, setSaveMessage] = useState('设置已保存')

    // Webhook testing
    const [wecomWarmingUp, setWecomWarmingUp] = useState(false)
    const [wecomWarmupMessage, setWecomWarmupMessage] = useState<string | null>(null)
    const [wecomWarmupError, setWecomWarmupError] = useState<string | null>(null)

    // Tokens
    const [tokens, setTokens] = useState<UserToken[]>([])
    const [tokensLoading, setTokensLoading] = useState(false)
    const [newTokenName, setNewTokenName] = useState('')
    const [isCreatingToken, setIsCreatingToken] = useState(false)
    const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
    const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null)

    const fetchProfiles = async () => {
        setProfilesLoading(true)
        try {
            const data = await api.getLLMProfiles()
            setProfiles(data)
        } catch (err) {
            console.error('Failed to fetch LLM profiles:', err)
        } finally {
            setProfilesLoading(false)
        }
    }

    const fetchGeneralConfig = async () => {
        setConfigLoading(true)
        try {
            const cfg = await api.getConfig()
            setMaxDebateRounds(cfg.max_debate_rounds)
            setMaxRiskRounds(cfg.max_risk_discuss_rounds)
            setHasStoredWebhook(!!cfg.has_wecom_webhook)
            setStoredWebhookDisplay(cfg.wecom_webhook_display || '')
            setEmailReportEnabled(cfg.email_report_enabled !== false)
            setWecomReportEnabled(cfg.wecom_report_enabled !== false)
            if (Array.isArray(cfg.default_analysts) && cfg.default_analysts.length > 0) {
                setDefaultAnalysts(cfg.default_analysts)
            }
        } catch (err) {
            console.error('Failed to fetch general config:', err)
        } finally {
            setConfigLoading(false)
        }
    }

    const fetchTokens = async () => {
        setTokensLoading(true)
        try {
            const data = await api.getTokens()
            setTokens(data)
        } catch (err) {
            console.error('Failed to fetch tokens:', err)
        } finally {
            setTokensLoading(false)
        }
    }

    useEffect(() => {
        try {
            const stored = localStorage.getItem('tradingagents-settings')
            if (stored) {
                const s = JSON.parse(stored) as Record<string, unknown> & {
                    defaultAnalysts?: string[]
                }
                if (s.defaultAnalysts) setDefaultAnalysts(s.defaultAnalysts)
                if (typeof s.customPrompt === 'string') setCustomPrompt(s.customPrompt)
            }
        } catch {}

        fetchProfiles()
        fetchGeneralConfig()
        fetchTokens()
    }, [])

    const openCreateModal = () => {
        setEditingProfile(null)
        const defaultPreset = QUICK_PRESETS[0]
        setFormName(defaultPreset.name)
        setFormProvider(defaultPreset.provider)
        setFormBaseUrl(defaultPreset.baseUrl)
        setFormQuickModel(defaultPreset.quickThinkLlm)
        setFormDeepModel(defaultPreset.deepThinkLlm)
        setFormApiKey('')
        setFormIsDefault(profiles.length === 0)
        setFormTestResult(null)
        setFormError(null)
        setModalOpen(true)
    }

    const openEditModal = (profile: LLMProfile) => {
        setEditingProfile(profile)
        setFormName(profile.name)
        setFormProvider(profile.provider)
        setFormBaseUrl(profile.backend_url || '')
        setFormQuickModel(profile.quick_think_llm || '')
        setFormDeepModel(profile.deep_think_llm || '')
        setFormApiKey('')
        setFormIsDefault(profile.is_default)
        setFormTestResult(null)
        setFormError(null)
        setModalOpen(true)
    }

    const handleApplyPreset = (preset: QuickPreset) => {
        setFormName(preset.name)
        setFormProvider(preset.provider)
        setFormBaseUrl(preset.baseUrl)
        setFormQuickModel(preset.quickThinkLlm)
        setFormDeepModel(preset.deepThinkLlm)
        setFormTestResult(null)
    }

    const handleTestInModal = async () => {
        setFormTesting(true)
        setFormTestResult(null)
        setFormError(null)
        try {
            const res = await api.testLLMProfile({
                provider: formProvider,
                backend_url: formBaseUrl.trim() || undefined,
                quick_think_llm: formQuickModel.trim() || undefined,
                deep_think_llm: formDeepModel.trim() || undefined,
                api_key: formApiKey.trim() || undefined,
                profile_id: editingProfile?.id,
            })
            setFormTestResult({ ok: true, message: res.message || '连接成功！' })
        } catch (err) {
            setFormTestResult({
                ok: false,
                message: err instanceof Error ? err.message : '连接测试失败，请检查 Base URL 与 API Key',
            })
        } finally {
            setFormTesting(false)
        }
    }

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName.trim()) {
            setFormError('请输入配置名称')
            return
        }
        setFormSaving(true)
        setFormError(null)
        try {
            if (editingProfile) {
                await api.updateLLMProfile(editingProfile.id, {
                    name: formName.trim(),
                    provider: formProvider,
                    backend_url: formBaseUrl.trim() || undefined,
                    quick_think_llm: formQuickModel.trim() || undefined,
                    deep_think_llm: formDeepModel.trim() || undefined,
                    api_key: formApiKey.trim() || undefined,
                    is_default: formIsDefault,
                })
            } else {
                await api.createLLMProfile({
                    name: formName.trim(),
                    provider: formProvider,
                    backend_url: formBaseUrl.trim() || undefined,
                    quick_think_llm: formQuickModel.trim() || undefined,
                    deep_think_llm: formDeepModel.trim() || undefined,
                    api_key: formApiKey.trim() || undefined,
                    is_default: formIsDefault,
                })
            }
            setModalOpen(false)
            await fetchProfiles()
            showToast('模型配置已保存')
        } catch (err) {
            setFormError(err instanceof Error ? err.message : '保存失败')
        } finally {
            setFormSaving(false)
        }
    }

    const handleSetDefault = async (profileId: string) => {
        try {
            await api.setDefaultLLMProfile(profileId)
            await fetchProfiles()
            showToast('已更新默认大模型配置')
        } catch (err) {
            alert(err instanceof Error ? err.message : '设置默认失败')
        }
    }

    const handleDeleteProfile = async (profile: LLMProfile) => {
        if (!confirm(`确定要删除配置 "${profile.name}" 吗？`)) return
        try {
            await api.deleteLLMProfile(profile.id)
            await fetchProfiles()
            showToast('配置已删除')
        } catch (err) {
            alert(err instanceof Error ? err.message : '删除失败')
        }
    }

    const handleTestCardProfile = async (profile: LLMProfile) => {
        setTestingProfileId(profile.id)
        try {
            const res = await api.testLLMProfile({ profile_id: profile.id })
            setCardTestResults(prev => ({
                ...prev,
                [profile.id]: { ok: true, message: res.message || '连接成功！' },
            }))
        } catch (err) {
            setCardTestResults(prev => ({
                ...prev,
                [profile.id]: { ok: false, message: err instanceof Error ? err.message : '连接失败' },
            }))
        } finally {
            setTestingProfileId(null)
        }
    }

    const showToast = (msg: string) => {
        setSaveMessage(msg)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
    }

    const handleSaveGeneral = async () => {
        setSavingGeneral(true)
        try {
            localStorage.setItem('tradingagents-settings', JSON.stringify({
                defaultAnalysts,
                customPrompt,
            }))
            localStorage.setItem('ta-custom-prompt', customPrompt)

            await api.updateConfig({
                max_debate_rounds: maxDebateRounds,
                max_risk_discuss_rounds: maxRiskRounds,
                default_analysts: defaultAnalysts,
                email_report_enabled: emailReportEnabled,
                wecom_report_enabled: wecomReportEnabled,
                wecom_webhook_url: wecomWebhook.trim() || undefined,
            })
            setWecomWebhook('')
            await fetchGeneralConfig()
            showToast('通用配置已保存')
        } catch (err) {
            alert(err instanceof Error ? err.message : '保存通用配置失败')
        } finally {
            setSavingGeneral(false)
        }
    }

    // Token management
    const handleCreateToken = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTokenName.trim()) return
        setIsCreatingToken(true)
        try {
            const created = await api.createToken({ name: newTokenName.trim() })
            setNewTokenName('')
            setNewlyCreatedToken(created.token || null)
            await fetchTokens()
        } catch (err) {
            alert(err instanceof Error ? err.message : '创建 Token 失败')
        } finally {
            setIsCreatingToken(false)
        }
    }

    const handleDeleteToken = async (tokenId: string) => {
        if (!confirm('确定要吊销此 Token 吗？吊销后使用该 Token 的 API 请求将立即失效。')) return
        try {
            await api.deleteToken(tokenId)
            await fetchTokens()
        } catch (err) {
            alert(err instanceof Error ? err.message : '吊销 Token 失败')
        }
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedTokenId(id)
        setTimeout(() => setCopiedTokenId(null), 2000)
    }

    const handleWecomWarmup = async () => {
        setWecomWarmingUp(true)
        setWecomWarmupMessage(null)
        setWecomWarmupError(null)
        try {
            const response = await api.warmupWecom({
                wecom_webhook_url: wecomWebhook.trim() || undefined,
            })
            setWecomWarmupMessage(
                response.webhook_display
                    ? `${response.message}，目标：${response.webhook_display}`
                    : response.message
            )
        } catch (err) {
            setWecomWarmupError(err instanceof Error ? err.message : 'Webhook 测试发送失败')
        } finally {
            setWecomWarmingUp(false)
        }
    }

    const toggleAnalyst = (analyst: string) => {
        setDefaultAnalysts(prev =>
            prev.includes(analyst) ? prev.filter(a => a !== analyst) : [...prev, analyst]
        )
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">系统设置</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">管理多模型接入端点、分析师参数与推送渠道</p>
            </div>

            {/* 多模型接入管理 */}
            <div className="card space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-blue-500" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">大模型接入配置</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                配置多个大模型接入点（如 DeepSeek、OpenAI、通义千问等），分析时可在下拉菜单中自由挑选
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
                    >
                        <Plus className="w-4 h-4" />
                        添加模型接入点
                    </button>
                </div>

                {profilesLoading && (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        正在加载模型接入列表...
                    </div>
                )}

                {!profilesLoading && profiles.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Cpu className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">暂未配置任何大模型接入点</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">添加一个接入点以启动真实的 14-Agent 投研分析</p>
                        <button
                            onClick={openCreateModal}
                            className="btn-primary inline-flex items-center gap-1 text-xs py-1.5 px-3"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            立即添加
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {profiles.map((p) => {
                        const testRes = cardTestResults[p.id]
                        const isTesting = testingProfileId === p.id

                        return (
                            <div
                                key={p.id}
                                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                                    p.is_default
                                        ? 'border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20 dark:border-blue-500/30 shadow-sm'
                                        : 'border-slate-200/80 bg-white dark:bg-slate-900/40 dark:border-slate-800'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                                {p.name}
                                            </h3>
                                            {p.is_default && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500 text-white shadow-xs">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    默认模型
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                            {p.provider}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-3 font-mono">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 dark:text-slate-500 font-sans">深度推理:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{p.deep_think_llm || '未指定'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 dark:text-slate-500 font-sans">常规轻量:</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{p.quick_think_llm || '未指定'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 dark:text-slate-500 font-sans">接入地址:</span>
                                            <span className="truncate max-w-[220px]" title={p.backend_url || '官方默认'}>
                                                {p.backend_url || '官方默认'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 dark:text-slate-500 font-sans">API Key:</span>
                                            <span>
                                                {p.has_api_key ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        已配置 ({p.api_key_hint || '••••'})
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-500 dark:text-amber-400 font-sans">未设置 Key</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {testRes && (
                                        <div className={`mt-3 p-2 rounded-lg text-xs leading-relaxed ${
                                            testRes.ok
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                                        }`}>
                                            {testRes.message}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleTestCardProfile(p)}
                                            disabled={isTesting}
                                            className="btn-secondary inline-flex items-center gap-1 text-[11px] py-1 px-2.5"
                                            title="向该模型发送测试请求以验证连通性"
                                        >
                                            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flame className="w-3 h-3" />}
                                            {isTesting ? '测试中...' : '测试连接'}
                                        </button>
                                        {!p.is_default && (
                                            <button
                                                onClick={() => handleSetDefault(p.id)}
                                                className="btn-secondary inline-flex items-center gap-1 text-[11px] py-1 px-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-600"
                                                title="设为默认分析大模型"
                                            >
                                                设为默认
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEditModal(p)}
                                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors"
                                            title="编辑配置"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        {profiles.length > 1 && (
                                            <button
                                                onClick={() => handleDeleteProfile(p)}
                                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                title="删除配置"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 通用投研分析参数 */}
            <div className="card space-y-4">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">默认分析配置</h2>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        默认启用分析师
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { key: 'market', label: '市场分析' },
                            { key: 'social', label: '舆情分析' },
                            { key: 'news', label: '新闻分析' },
                            { key: 'fundamentals', label: '基本面' },
                            { key: 'macro', label: '宏观板块' },
                            { key: 'smart_money', label: '主力资金' },
                            { key: 'volume_price', label: '量价分析' },
                        ].map((analyst) => {
                            const active = defaultAnalysts.includes(analyst.key)
                            return (
                                <button
                                    key={analyst.key}
                                    type="button"
                                    onClick={() => toggleAnalyst(analyst.key)}
                                    className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
                                        active
                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {analyst.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                            多空辩论轮数上限
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={maxDebateRounds}
                            onChange={e => setMaxDebateRounds(Number(e.target.value))}
                            className="input w-full"
                            disabled={configLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                            风控讨论轮数上限
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={5}
                            value={maxRiskRounds}
                            onChange={e => setMaxRiskRounds(Number(e.target.value))}
                            className="input w-full"
                            disabled={configLoading}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        自定义分析提示
                    </label>
                    <textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        className="input w-full min-h-[80px] resize-y"
                        placeholder="例如：更关注估值安全边际、政策催化与机构资金行为。"
                    />
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveGeneral}
                        disabled={savingGeneral}
                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4"
                    >
                        {savingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        保存通用配置
                    </button>
                </div>
            </div>

            {/* API 访问令牌 */}
            <div className="card space-y-4">
                <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API 访问令牌</h2>
                    {tokensLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    使用 API Token 在外部脚本或自动化系统（如 Open Claw）中调用投研分析接口。请妥善保管您的 Token。
                </div>

                {newlyCreatedToken && (
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">Token 创建成功 — 请立即复制，关闭后无法再次查看</div>
                        <div className="flex items-center gap-2">
                            <code className="text-xs text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border font-mono tracking-tight break-all">
                                {newlyCreatedToken}
                            </code>
                            <button
                                onClick={() => copyToClipboard(newlyCreatedToken, '__new__')}
                                className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800 rounded transition-colors text-emerald-600"
                                title="复制 Token"
                            >
                                {copiedTokenId === '__new__' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <button onClick={() => setNewlyCreatedToken(null)} className="mt-2 text-xs text-emerald-600 hover:underline">我已复制，关闭提示</button>
                    </div>
                )}

                <div className="space-y-3">
                    {tokens.map((token) => (
                        <div key={token.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all group">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{token.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 font-mono tracking-tight">
                                        ta-sk-{'•'.repeat(16)}{token.token_hint || '****'}
                                    </code>
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                    创建于：{new Date(token.created_at).toLocaleDateString()}
                                    {token.last_used_at && ` • 最后使用：${new Date(token.last_used_at).toLocaleString()}`}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteToken(token.id)}
                                className="self-end sm:self-center p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                title="吊销 Token"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {tokens.length === 0 && !tokensLoading && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-400 text-sm font-medium">
                            暂无活跃的 API Token
                        </div>
                    )}
                </div>

                <form onSubmit={handleCreateToken} className="flex items-center gap-2 pt-2">
                    <input
                        type="text"
                        value={newTokenName}
                        onChange={e => setNewTokenName(e.target.value)}
                        placeholder="给新 Token 起个名字，如：Open Claw"
                        className="input flex-1 h-10 text-sm"
                        disabled={isCreatingToken || tokens.length >= 10}
                    />
                    <button
                        type="submit"
                        disabled={isCreatingToken || !newTokenName.trim() || tokens.length >= 10}
                        className="btn-primary h-10 px-4 flex items-center gap-2 whitespace-nowrap text-sm"
                    >
                        {isCreatingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        生成 Token
                    </button>
                </form>
            </div>

            {/* 报告推送 */}
            <div className="card space-y-4">
                <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">报告推送</h2>
                </div>

                {/* 邮件推送 */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">邮件推送</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">定时分析完成时发送至 {user?.email || '-'}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setEmailReportEnabled(!emailReportEnabled)}
                            disabled={configLoading}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                emailReportEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailReportEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                {/* 企业微信 Webhook */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 space-y-3 dark:border-slate-700/80 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">企业微信 Webhook</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                定时分析完成时向机器人推送摘要
                                {storedWebhookDisplay && <span className="ml-2 font-mono">({storedWebhookDisplay})</span>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWecomReportEnabled(!wecomReportEnabled)}
                            disabled={configLoading}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                                wecomReportEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wecomReportEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={wecomWebhook}
                                onChange={e => setWecomWebhook(e.target.value)}
                                className="input w-full pl-10"
                                placeholder={hasStoredWebhook ? '已保存，留空则保持不变' : 'Webhook 地址'}
                                disabled={configLoading}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleWecomWarmup}
                            disabled={configLoading || wecomWarmingUp || (!wecomWebhook.trim() && !hasStoredWebhook)}
                            className="btn-secondary inline-flex items-center gap-1.5 text-xs shrink-0"
                        >
                            {wecomWarmingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                            {wecomWarmingUp ? '发送中...' : '测试连接'}
                        </button>
                    </div>

                    {wecomWarmupMessage && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {wecomWarmupMessage}
                        </div>
                    )}
                    {wecomWarmupError && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                            {wecomWarmupError}
                        </div>
                    )}
                </div>
            </div>

            {/* Toast 提示 */}
            {saved && (
                <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 text-white px-4 py-2.5 shadow-lg flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveMessage}</span>
                </div>
            )}

            {/* 添加 / 编辑模型配置弹窗 */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Cpu className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                                    {editingProfile ? '编辑模型接入点' : '添加大模型接入点'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                            {/* 模版快捷填入 */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                                    快捷套用预设模版
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => handleApplyPreset(preset)}
                                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    配置名称 *
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="例如：DeepSeek 官方推理版 / GPT-4o 旗舰"
                                    className="input w-full text-sm"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        接入协议
                                    </label>
                                    <select
                                        value={formProvider}
                                        onChange={(e) => setFormProvider(e.target.value)}
                                        className="input w-full text-sm"
                                    >
                                        <option value="openai">OpenAI / 兼容格式</option>
                                        <option value="anthropic">Anthropic Claude</option>
                                        <option value="google">Google Gemini</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        接入 Base URL
                                    </label>
                                    <input
                                        type="text"
                                        value={formBaseUrl}
                                        onChange={(e) => setFormBaseUrl(e.target.value)}
                                        placeholder="留空为官方默认地址"
                                        className="input w-full text-sm font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        深度推理模型 (Deep Think)
                                    </label>
                                    <input
                                        type="text"
                                        value={formDeepModel}
                                        onChange={(e) => setFormDeepModel(e.target.value)}
                                        placeholder="例如：deepseek-reasoner / gpt-4o"
                                        className="input w-full text-sm font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        常规轻量模型 (Quick Think)
                                    </label>
                                    <input
                                        type="text"
                                        value={formQuickModel}
                                        onChange={(e) => setFormQuickModel(e.target.value)}
                                        placeholder="例如：deepseek-flash / gpt-4o-mini"
                                        className="input w-full text-sm font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                💡 提示：DeepSeek 官方模型标识符全小写且无小数点（推荐快速模型填 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">deepseek-flash</code>，深度推理填 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">deepseek-v4-pro</code> 或 <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">deepseek-reasoner</code>）。
                            </p>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    API Key
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        value={formApiKey}
                                        onChange={(e) => setFormApiKey(e.target.value)}
                                        placeholder={editingProfile?.has_api_key ? '已保存，留空则保持不变' : '输入该模型的 API Key'}
                                        className="input w-full pl-9 text-sm font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="profile-default"
                                    checked={formIsDefault}
                                    onChange={(e) => setFormIsDefault(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 dark:border-slate-700"
                                />
                                <label htmlFor="profile-default" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                    设为默认模型接入点（投研分析时自动首选）
                                </label>
                            </div>

                            {formTestResult && (
                                <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                                    formTestResult.ok
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                                }`}>
                                    {formTestResult.message}
                                </div>
                            )}

                            {formError && (
                                <div className="p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                                    {formError}
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handleTestInModal}
                                    disabled={formTesting || formSaving}
                                    className="btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
                                >
                                    {formTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                                    {formTesting ? '正在验证连接...' : '测试当前配置'}
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="btn-secondary text-xs py-2 px-3"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formSaving || formTesting}
                                        className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4"
                                    >
                                        {formSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        保存接入点
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
