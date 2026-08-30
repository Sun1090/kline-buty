import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import DocCards from './DocCard.vue'
import KbBadge from './KbBadge.vue'
import LeverageCalc from './LeverageCalc.vue'
import MarginCalc from './MarginCalc.vue'
import ExpectancyCalc from './ExpectancyCalc.vue'
import LearnPath from './LearnPath.vue'
import OptionCalc from './OptionCalc.vue'
import ReadingProgress from './ReadingProgress.vue'
import './custom.css'

export default {
  ...DefaultTheme,
  // T26：布局底部挂阅读进度条 + 返回顶部
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(ReadingProgress),
    })
  },
  enhanceApp({ app }) {
    app.component('DocCards', DocCards)
    app.component('KbBadge', KbBadge)
    app.component('LeverageCalc', LeverageCalc)
    app.component('MarginCalc', MarginCalc)
    app.component('ExpectancyCalc', ExpectancyCalc)
    app.component('LearnPath', LearnPath)
    app.component('OptionCalc', OptionCalc)
  },
}
