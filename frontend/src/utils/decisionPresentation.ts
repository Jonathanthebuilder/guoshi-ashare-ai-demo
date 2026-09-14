export type DecisionAction = 'buy' | 'sell' | 'add' | 'reduce' | 'hold' | 'watch'

const ACTION_LABELS: Record<DecisionAction, string> = {
    buy: '买入', sell: '卖出', add: '增持', reduce: '减持', hold: '持有', watch: '观望',
}
const ACTION_ALIASES: Record<string, DecisionAction> = {
    BUY: 'buy', SELL: 'sell', ADD: 'add', REDUCE: 'reduce', HOLD: 'hold', WATCH: 'watch',
    买入: 'buy', 买进: 'buy', 建仓: 'buy', 卖出: 'sell', 清仓: 'sell',
    增持: 'add', 加仓: 'add', 减持: 'reduce', 减仓: 'reduce',
    持有: 'hold', 继续持有: 'hold', 观望: 'watch', 持币观望: 'watch', 继续观望: 'watch',
}
const ACTION_TOKENS = Object.keys(ACTION_ALIASES).sort((a, b) => b.length - a.length).join('|')
const LEADING_ACTION = new RegExp(`^(${ACTION_TOKENS})(?=$|[\\s，,。.;；:：（(])`)
const ALTERNATIVE_ACTION = new RegExp(`(?:[/／]|\\bOR\\b|或者|或)\\s*(?:${ACTION_TOKENS})`)

/** Parse action fields conservatively; a research direction is not an action. */
export function parseDecisionPresentation(decisionText?: string | null): { action: DecisionAction | undefined; label: string } {
    const original = decisionText?.trim() || ''
    if (!original) return { action: undefined, label: '建议未提供' }
    const text = original.replace(/<!--[\s\S]*?-->/g, '').replace(/\*\*|`/g, '').trim().toUpperCase()
    const exactAction = ACTION_ALIASES[text]
    if (exactAction) return { action: exactAction, label: ACTION_LABELS[exactAction] }

    // Old reports sometimes saved a labelled decision sentence instead of an
    // enum. Read only the explicitly identified action, never the whole essay.
    const directive = text.match(/(?:最终交易建议|最终交易决策|最终建议|FINAL TRANSACTION PROPOSAL|FINAL ACTION)\s*[:：]\s*([^\n]+)/)?.[1]
        ?? text.match(/(?:建议动作|执行动作|交易建议|ACTION|DECISION)\s*[:：]\s*([^\n]+)/)?.[1]
    if (directive && !ALTERNATIVE_ACTION.test(directive)) {
        const match = directive.match(LEADING_ACTION)
        const action = match ? ACTION_ALIASES[match[1]] : undefined
        if (action) return { action, label: ACTION_LABELS[action] }
    }
    return { action: undefined, label: original }
}
