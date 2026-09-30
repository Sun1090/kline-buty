import { describe, expect, it } from 'vitest'
import { calcWR, calcOBV, calcATR, calcCCI, calcPSY, calcDMI, calcTR, calcSTOCH, calcROC, calcMOM } from '../extras'
import type { Candle } from '../../chart/types'

function c(time: number, o: number, h: number, l: number, cl: number, v: number): Candle {
  return { time, open: o, high: h, low: l, close: cl, volume: v, isClosed: true }
}

const candles: Candle[] = [
  c(1, 10, 12, 9, 11, 100),
  c(2, 11, 13, 10, 12, 150),
  c(3, 12, 14, 11, 13, 200),
  c(4, 13, 15, 12, 14, 250),
  c(5, 14, 16, 13, 15, 300),
]

describe('calcWR', () => {
  it('收盘贴近最高 → WR 趋近 0', () => {
    const wr = calcWR(candles, 3)
    for (const p of wr) expect(p.value).toBeLessThan(25)
  })
  it('窗口长度 = n-1 起点', () => {
    expect(calcWR(candles, 3)).toHaveLength(candles.length - 2)
  })
  it('close 触及最高 → WR = 0', () => {
    const peak = [c(1, 10, 12, 9, 12, 1), c(2, 12, 14, 11, 14, 1), c(3, 14, 16, 13, 16, 1)]
    for (const p of calcWR(peak, 3)) expect(p.value).toBe(0)
  })
})

describe('calcOBV', () => {
  it('全程上涨 → OBV 累加', () => {
    const obv = calcOBV(candles)
    expect(obv[0].value).toBe(0)
    expect(obv[4].value).toBeCloseTo(100 + 150 + 200 + 250 + 300 - 100) // 第一根不计
  })
  it('下跌累计为负', () => {
    const down = [c(1, 10, 11, 9, 10, 100), c(2, 10, 10, 8, 9, 50)]
    const obv = calcOBV(down)
    expect(obv[1].value).toBe(-50)
  })
  it('n=1（默认）与 n>1 平滑：输出长度一致、平滑后为窗口均值', () => {
    // 构造 5 根持续上涨，OBV 原始值依次 0,150,350,600,900（成交量 100/150/200/250/300）
    const up = candles.map((x) => ({ ...x }))
    const raw = calcOBV(up, 1)
    expect(raw.map((p) => p.value)).toEqual([0, 150, 350, 600, 900])
    // n=3：SMA 窗口均值，前 2 根无值
    const sm = calcOBV(up, 3)
    expect(sm).toHaveLength(raw.length - 2)
    expect(sm[0].value).toBeCloseTo((0 + 150 + 350) / 3)
    expect(sm[1].value).toBeCloseTo((150 + 350 + 600) / 3)
    expect(sm[2].value).toBeCloseTo((350 + 600 + 900) / 3)
  })
})

describe('calcATR', () => {
  it('单根波动：ATR = TR', () => {
    const atr = calcATR(candles, 3)
    // 前 3 根 TR 平均：(3 + 3 + 3)/3 = 3
    expect(atr[0].value).toBe(3)
  })
  it('窗口起点正确', () => {
    expect(calcATR(candles, 3)).toHaveLength(candles.length - 2)
  })
  it('Wilder 种子与递推逐拍正确（#240 同族缺陷的牙齿：种子漏一根、递推错系数都会红）', () => {
    // 手工可验的序列：首根 TR = H−L = 20；此后 TR 恒为 5
    // c0: H−L=20（无前收盘）；ci (i≥1): H−pc = 2, L−pc 无关 → max(2,2,...)=… 取宽幅使 TR 可手算
    const seq: Candle[] = [
      c(1, 100, 110, 90, 100, 10), // TR0 = 110−90 = 20
      c(2, 100, 106, 95, 102, 10), // pc=100: max(11, 6, 5) = 11
      c(3, 102, 108, 97, 104, 10), // pc=102: max(11, 6, 5) = 11
      c(4, 104, 110, 99, 106, 10), // pc=104: max(11, 6, 5) = 11
      c(5, 106, 112, 101, 108, 10), // pc=106: max(11, 6, 5) = 11
      c(6, 108, 114, 103, 110, 10), // pc=108: max(11, 6, 5) = 11
      c(7, 110, 116, 105, 112, 10), // pc=110: max(11, 6, 5) = 11
    ]
    const trs = calcTR(seq)
    expect(trs[0]).toBe(20)
    for (let i = 1; i <= 6; i++) expect(trs[i]).toBe(11)
    const atr = calcATR(seq, 5)
    // 种子 = 前 5 根 TR 均值（含首根）：(20 + 11×4)/5 = 12.8 —— 第一根 TR 一根都不能少
    const seed = (20 + 11 * 4) / 5
    expect(atr[0].value).toBeCloseTo(seed, 10)
    expect(atr[0].time).toBe(seq[4].time)
    // 递推 = (prev×(n−1) + TR)/n
    expect(atr[1].value).toBeCloseTo((seed * 4 + 11) / 5, 10)
    expect(atr[2].value).toBeCloseTo(((seed * 4 + 11) / 5 * 4 + 11) / 5, 10)
  })
})

describe('calcCCI', () => {
  it('等幅波动 CCI 收敛', () => {
    const cci = calcCCI(candles, 3)
    expect(cci).toHaveLength(candles.length - 2)
    expect(Number.isFinite(cci[cci.length - 1].value)).toBe(true)
  })
})

describe('calcPSY', () => {
  it('全程上涨 → PSY = 100', () => {
    const psy = calcPSY(candles, 3)
    for (const p of psy) expect(p.value).toBe(100)
  })
})

describe('calcDMI', () => {
  it('单边上涨：+DI 高于 -DI，ADX 有限', () => {
    const dmi = calcDMI(candles, 3)
    for (const p of dmi) {
      expect(p.pdi).toBeGreaterThan(0)
      expect(p.mdi).toBe(0)
      expect(p.adx).toBeGreaterThan(0)
    }
  })
  it('窗口起点', () => {
    expect(calcDMI(candles, 3)).toHaveLength(candles.length - 2)
  })
  it('Wilder 种子逐拍对照独立参考实现（#240 同族缺陷的牙齿）', () => {
    // 测试内自带一份与实现无共享代码的 Wilder 参考推导：种子 = 前 n 根（含 TR0=H−L、DM0=0），
    // 之后递减式滚动；ADX 种子 = 首个 DX，之后 (prev×(n−1)+DX)/n。种子的任何 off-by-one 都会红。
    const dmiRef = (cs: Candle[], n: number) => {
      const tr: number[] = []
      const pdm: number[] = []
      const mdm: number[] = []
      for (let i = 0; i < cs.length; i++) {
        const pc = i > 0 ? cs[i - 1].close : cs[i].close
        tr.push(Math.max(cs[i].high - cs[i].low, Math.abs(cs[i].high - pc), Math.abs(cs[i].low - pc)))
        const up = i > 0 ? cs[i].high - cs[i - 1].high : 0
        const down = i > 0 ? cs[i - 1].low - cs[i].low : 0
        pdm.push(up > down && up > 0 ? up : 0)
        mdm.push(down > up && down > 0 ? down : 0)
      }
      let sp = 0
      let sm = 0
      let st = 0
      let prevAdx = 0
      const out: { time: number; pdi: number; mdi: number; adx: number }[] = []
      for (let i = 0; i < cs.length; i++) {
        if (i === n - 1) {
          for (let j = 0; j < n; j++) {
            sp += pdm[j]
            sm += mdm[j]
            st += tr[j]
          }
        } else if (i > n - 1) {
          sp = sp - sp / n + pdm[i]
          sm = sm - sm / n + mdm[i]
          st = st - st / n + tr[i]
        } else continue
        const pdi = st === 0 ? 0 : (sp / st) * 100
        const mdi = st === 0 ? 0 : (sm / st) * 100
        const dx = pdi + mdi === 0 ? 0 : (Math.abs(pdi - mdi) / (pdi + mdi)) * 100
        prevAdx = i === n - 1 ? dx : (prevAdx * (n - 1) + dx) / n
        out.push({ time: cs[i].time, pdi, mdi, adx: prevAdx })
      }
      return out
    }
    // 混合涨跌+跳空的序列，保证 +DM/−DM/TR 三路都有非零输入
    const seq: Candle[] = [
      c(1, 100, 110, 90, 100, 10),
      c(2, 100, 120, 98, 118, 10),
      c(3, 118, 121, 100, 104, 10),
      c(4, 104, 118, 95, 116, 10),
      c(5, 116, 117, 94, 96, 10),
      c(6, 96, 112, 94, 110, 10),
      c(7, 110, 126, 108, 124, 10),
      c(8, 124, 128, 105, 108, 10),
      c(9, 108, 122, 106, 120, 10),
      c(10, 120, 130, 118, 128, 10),
    ]
    const got = calcDMI(seq, 5)
    const want = dmiRef(seq, 5)
    expect(got).toHaveLength(want.length)
    for (let k = 0; k < want.length; k++) {
      expect(got[k].time).toBe(want[k].time)
      expect(got[k].pdi, `第 ${k} 拍 +DI`).toBeCloseTo(want[k].pdi, 10)
      expect(got[k].mdi, `第 ${k} 拍 -DI`).toBeCloseTo(want[k].mdi, 10)
      expect(got[k].adx, `第 ${k} 拍 ADX`).toBeCloseTo(want[k].adx, 10)
    }
  })
})

describe('calcTR', () => {
  it('与收盘的跳空也计入', () => {
    const trs = calcTR([c(1, 10, 10, 10, 10, 1), c(2, 15, 16, 14, 15, 1)])
    expect(trs[1]).toBe(Math.max(2, Math.abs(16 - 10), Math.abs(14 - 10))) // 6
  })
})

describe('calcSTOCH', () => {
  // 5 根单调上涨：close 始终贴近窗口最高 → rawK=100，K=D=100
  const up = [c(1, 10, 12, 9, 11, 100), c(2, 11, 13, 10, 12, 150), c(3, 12, 14, 11, 13, 200), c(4, 13, 15, 12, 14, 250), c(5, 14, 16, 13, 15, 300)]
  it('单调上涨（high>close）→ rawK=(C-LL)/(HH-LL)=80，K/D=80', () => {
    const { k, d } = calcSTOCH(up, 3, 2, 2)
    expect(k.length).toBeGreaterThan(0)
    for (const p of k) expect(p.value).toBeCloseTo(80, 5)
    for (const p of d) expect(p.value).toBeCloseTo(80, 5)
  })
  it('收盘贴窗口最高（close=high）→ %K=100', () => {
    const peak = [c(1, 10, 12, 9, 12, 1), c(2, 12, 14, 11, 14, 1), c(3, 14, 16, 13, 16, 1)]
    const { k } = calcSTOCH(peak, 3, 1, 1)
    for (const p of k) expect(p.value).toBe(100)
  })
  it('起点正确：K 从 kPeriod+kSmooth-2 开始，D 更晚', () => {
    const { k, d } = calcSTOCH(up, 3, 2, 2)
    expect(k[0].time).toBe(up[3].time) // 3+2-2=3
    expect(d[0].time).toBe(up[4].time) // 3+2+2-3=4
  })
  it('高低区间为 0 → rawK=50', () => {
    const flat = [c(1, 10, 10, 10, 10, 1), c(2, 10, 10, 10, 10, 1), c(3, 10, 10, 10, 10, 1)]
    const { k } = calcSTOCH(flat, 3, 1, 1)
    expect(k[0].value).toBe(50)
  })
})

describe('calcROC', () => {
  it('n=1：逐根变动率', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const roc = calcROC(closes, 1)
    expect(roc.map((p) => p.value)).toEqual([10, 10]) // 110/100-1, 121/110-1
  })
  it('n=2：跨两根变动率', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const roc = calcROC(closes, 2)
    expect(roc[0].value).toBeCloseTo(21, 5)
  })
})

describe('calcMOM', () => {
  it('n=1：逐根差值', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    const mom = calcMOM(closes, 1)
    expect(mom.map((p) => p.value)).toEqual([10, 11])
  })
  it('n=2：跨两根差值', () => {
    const closes = [c(1, 0, 0, 0, 100, 1), c(2, 0, 0, 0, 110, 1), c(3, 0, 0, 0, 121, 1)]
    expect(calcMOM(closes, 2)[0].value).toBe(21)
  })
})
