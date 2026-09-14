import { describe, expect, it } from 'vitest'
import { parseDecisionPresentation } from './decisionPresentation'

describe('decision action presentation', () => {
    it.each([
        ['BUY', 'buy', '买入'], ['SELL', 'sell', '卖出'], ['HOLD', 'hold', '持有'],
        ['ADD', 'add', '增持'], ['REDUCE', 'reduce', '减持'], ['WATCH', 'watch', '观望'],
        ['买入', 'buy', '买入'], ['卖出', 'sell', '卖出'], ['持有', 'hold', '持有'],
        ['增持', 'add', '增持'], ['减持', 'reduce', '减持'], ['观望', 'watch', '观望'],
        ['加仓', 'add', '增持'], ['减仓', 'reduce', '减持'], ['继续持有', 'hold', '持有'],
        ['持币观望', 'watch', '观望'], [' buy ', 'buy', '买入'],
    ])('keeps %s distinct instead of changing the recommended action', (input, action, label) => {
        expect(parseDecisionPresentation(input)).toEqual({ action, label })
    })

    it.each([undefined, null, '', '  '])('does not turn missing input %s into a holding recommendation', input => {
        expect(parseDecisionPresentation(input)).toEqual({ action: undefined, label: '建议未提供' })
    })

    it.each(['UNKNOWN', '看多', '不建议买入', 'BUY / SELL', '目前存在上涨可能，但仍需确认'])('keeps unrecognized or ambiguous input %s without inventing an action', input => {
        expect(parseDecisionPresentation(input)).toEqual({ action: undefined, label: input })
    })

    it.each([
        ['最终建议：观望', 'watch', '观望'],
        ['FINAL TRANSACTION PROPOSAL: **BUY**', 'buy', '买入'],
        ['建议动作：HOLD\n长期条件改善后考虑买入。', 'hold', '持有'],
        ['最终建议：减仓，控制风险敞口。', 'reduce', '减持'],
    ])('reads the explicit action from legacy decision text %s', (input, action, label) => {
        expect(parseDecisionPresentation(input)).toEqual({ action, label })
    })
})
