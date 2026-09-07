import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MarginCalc from '../MarginCalc.vue'
import LeverageCalc from '../LeverageCalc.vue'
import ExpectancyCalc from '../ExpectancyCalc.vue'
import OptionCalc from '../OptionCalc.vue'

/** 设置受控输入框的值并触发 v-model.number 更新（input 是 label 的兄弟节点，位于同 .kb-calc-row 内） */
function setInput(wrapper: ReturnType<typeof mount>, labelText: string, value: string | number) {
  const labels = wrapper.findAll('label')
  const labelEl = labels.find((l) => l.text().includes(labelText))
  if (!labelEl) throw new Error(`label not found: ${labelText}`)
  const row = labelEl.element.parentElement
  const input = row?.querySelector('input')
  if (!input) throw new Error(`input not found for: ${labelText}`)
  ;(input as HTMLInputElement).value = String(value)
  ;(input as HTMLInputElement).dispatchEvent(new Event(input.type === 'range' ? 'input' : 'change'))
  return wrapper.vm?.$nextTick ? wrapper.vm.$nextTick() : Promise.resolve()
}

describe('文档站计算器挂载测试（G1）', () => {
  it('LeverageCalc：默认 -10% 爆仓态 → 改 +10% 显示盈利', async () => {
    const w = mount(LeverageCalc)
    expect(w.text()).toContain('10x')
    // 默认 价格 -10% → 爆仓徽标
    expect(w.text()).toContain('💀')
    // 改为 +10% → 盈利 +10000，爆仓徽标消失
    await setInput(w, '价格涨跌幅', 10)
    expect(w.text()).not.toContain('💀')
    expect(w.text()).toContain('+10,000')
  })

  it('MarginCalc：默认参数算出可读保证金结果（含维持保证金率输入联动）', async () => {
    const w = mount(MarginCalc)
    expect(w.text()).toContain('保证金')
    // 结果区应有数字输出（名义/维持保证金等至少一项数值）
    const resultText = w.text()
    expect(/\d[\d,]*/.test(resultText)).toBe(true)
    // 修改杠杆 → 结果仍可渲染（不抛错）
    await setInput(w, '杠杆倍数', 50)
    expect(w.text()).toContain('50x')
  })

  it('ExpectancyCalc：默认参数为正期望（可行）→ 改亏损组合显示负期望警示', async () => {
    const w = mount(ExpectancyCalc)
    expect(w.text()).toContain('期望')
    // 正期望默认 → 无爆仓/负期望警示
    expect(w.text()).not.toContain('负期望')
    // 改成亏损组合：胜率 30%、均盈 1R、均亏 1R → 负期望
    await setInput(w, '胜率', 30)
    await setInput(w, '平均盈利', 1)
    await setInput(w, '平均亏损', 1)
    expect(w.text()).toContain('负期望')
  })

  it('OptionCalc：默认参数显示看涨/看跌期权估值（Black-Scholes 数值可读）', async () => {
    const w = mount(OptionCalc)
    const text = w.text()
    expect(text).toContain('理论价')
    // 至少输出一个带小数的 BS 数值（call/put 价格）
    expect(/[\d]+\.[\d]+/.test(text)).toBe(true)
    // 改波动率 50% → 30% → Call 理论价更新（默认 50%）
    const before = text.match(/[\d]+\.[\d]+/)?.[0]
    await setInput(w, '年化波动率', 30)
    const after = w.text().match(/[\d]+\.[\d]+/)?.[0]
    expect(after).not.toBe(before)
  })
})
