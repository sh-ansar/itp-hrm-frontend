import '../../../src/styles/tokens.css'
import '../../../src/styles/global.css'
import { createApp, defineComponent, h, ref } from 'vue'
import { createPinia } from 'pinia'
import WorktimeMatrixPanel from '../../../src/components/WorktimeMatrixPanel.vue'

const Fixture = defineComponent({
  setup() {
    const saved = ref(0)
    return () => h('main', [
      h('p', { id: 'saved' }, String(saved.value)),
      h(WorktimeMatrixPanel, {
        companyId: '11111111-1111-4111-8111-111111111111', month: '2026-10',
        onUpdated: () => { saved.value += 1 },
      }),
    ])
  },
})
createApp(Fixture).use(createPinia()).mount('#app')
