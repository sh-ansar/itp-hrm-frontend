import '../../../src/styles/tokens.css'
import '../../../src/styles/global.css'
import { createApp, defineComponent, h, ref } from 'vue'
import BaseFormField from '../../../src/components/ui/BaseFormField.vue'
import BaseDialog from '../../../src/components/ui/BaseDialog.vue'
import BaseDataTable from '../../../src/components/ui/BaseDataTable.vue'

const Fixture = defineComponent({
  setup() {
    const value = ref('')
    const dialogOpen = ref(false)
    return () => h('main', [
      h('h1', 'A11 test components'),
      h(BaseFormField, {
        label: 'Тестовое поле', modelValue: value.value, required: true,
        error: value.value === 'invalid' ? 'Неверное значение' : '',
        'onUpdate:modelValue': (next: string) => { value.value = next },
      }),
      h('p', { id: 'field-value' }, value.value),
      h('button', { onClick: () => { dialogOpen.value = true } }, 'Открыть диалог'),
      h(BaseDialog, {
        open: dialogOpen.value, title: 'Проверка диалога',
        onClose: () => { dialogOpen.value = false },
      }, { default: () => h('p', 'Содержимое модального окна') }),
      h(BaseDataTable, {
        rowKey: 'id',
        columns: [{ key: 'name', label: 'Имя' }],
        rows: [{ id: 1, name: 'Тестовая запись' }],
        caption: 'Тестовый реестр',
      }),
    ])
  },
})

createApp(Fixture).mount('#app')
