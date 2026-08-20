import DefaultTheme from 'vitepress/theme'
import DocCards from './DocCard.vue'
import KbBadge from './KbBadge.vue'
import LeverageCalc from './LeverageCalc.vue'
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    app.component('DocCards', DocCards)
    app.component('KbBadge', KbBadge)
    app.component('LeverageCalc', LeverageCalc)
  },
}