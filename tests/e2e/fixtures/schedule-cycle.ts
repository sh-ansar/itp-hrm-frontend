import '../../../src/styles/tokens.css'
import '../../../src/styles/global.css'
import { createApp, defineComponent, h, ref } from 'vue'
import { createPinia } from 'pinia'
import ScheduleCyclePlannerPanel from '../../../src/components/ScheduleCyclePlannerPanel.vue'

const people = [
  { employee_id: '22222222-2222-4222-8222-222222222221', full_name: 'Сотрудник 001', department: 'Разработка' },
  { employee_id: '22222222-2222-4222-8222-222222222222', full_name: 'Сотрудник 002', department: 'Разработка' },
  { employee_id: '22222222-2222-4222-8222-222222222223', full_name: 'Сотрудник 003', department: 'Производство' },
]
const Fixture = defineComponent({
  setup() {
    const isOpen = ref(false)
    const saved = ref(0)
    return () => h('main', [
      h('button', { id: 'open-planner', onClick: () => { isOpen.value = true } }, 'Открыть планирование'),
      h('p', { id: 'saved-count' }, String(saved.value)),
      h(ScheduleCyclePlannerPanel, {
        open: isOpen.value,
        companyId: '11111111-1111-4111-8111-111111111111',
        employees: people,
        onClose: () => { isOpen.value = false },
        onSaved: () => { saved.value++ },
      }),
    ])
  },
})
createApp(Fixture).use(createPinia()).mount('#app')
