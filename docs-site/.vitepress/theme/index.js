import DefaultTheme from 'vitepress/theme'
import DocCards from './DocCard.vue'
import KbBadge from './KbBadge.vue'
import LeverageCalc from './LeverageCalc.vue'
import MarginCalc from './MarginCalc.vue'
import ExpectancyCalc from './ExpectancyCalc.vue'
import LearnPath from './LearnPath.vue'
import OptionCalc from './OptionCalc.vue'
import './custom.css'

export default {
  ...DefaultTheme,
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