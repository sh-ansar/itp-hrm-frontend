<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from './BaseButton.vue'
import { useUiFormatters } from '../../composables/useUiFormatters'
import { useWorkspaceI18n } from '../../composables/useWorkspaceI18n'

const fmt = useUiFormatters()
const { tr } = useWorkspaceI18n()

const props = withDefaults(defineProps<{
  page: number
  lastPage: number
  loading?: boolean
  caption?: string
  total?: number
  pageSize?: number
  pageSizes?: number[]
}>(), {
  loading: false,
  caption: 'Страницы реестра',
  pageSizes: () => [10, 15, 25, 50],
})
const emit = defineEmits<{
  previous: []
  next: []
  selectPage: [page: number]
  changePageSize: [size: number]
}>()
const withStats = computed(() => props.total !== undefined && props.pageSize !== undefined)
const numberedPages = computed(() => {
  const values = new Set<number>([1, props.lastPage, props.page - 1, props.page, props.page + 1])
  const pages = [...values].filter(n => n >= 1 && n <= props.lastPage).sort((a,b) => a-b)
  const list: Array<number | '…'> = []
  let previous = 0
  for (const current of pages) {
    if (previous && current - previous > 1) list.push('…')
    list.push(current)
    previous = current
  }
  return list
})
function changeSize(event: Event) {
  const size = Number((event.target as HTMLSelectElement).value)
  if (props.pageSizes.includes(size) && size !== props.pageSize) emit('changePageSize', size)
}
</script>

<template>
  <nav v-if="lastPage > 1 || withStats" class="base-pagination" :aria-label="caption">
    <div v-if="withStats" class="pagination-summary">
      <span>{{ tr('Всего') }} {{ fmt.number(total, 0) }} {{ tr('строк, показать') }}</span>
      <label>
        <span class="sr-only">{{ tr('Строк на странице') }}</span>
        <select :value="pageSize" :aria-label="tr('Строк на странице')" :disabled="loading" @change="changeSize">
          <option v-for="size in pageSizes" :key="size" :value="size">{{ fmt.number(size, 0) }} {{ tr('на странице') }}</option>
        </select>
      </label>
    </div>
    <div class="pagination-pages">
      <BaseButton variant="secondary" :disabled="loading || page <= 1" @click="emit('previous')">{{ tr('Назад') }}</BaseButton>
      <template v-if="withStats">
        <template v-for="(item,index) in numberedPages" :key="index">
          <span v-if="item === '…'" class="pagination-ellipsis">…</span>
          <button v-else type="button" class="pagination-page"
            :class="{ 'pagination-page--active': item === page }"
            :disabled="loading || item === page" :aria-current="item === page ? 'page' : undefined"
            :aria-label="tr('Страница')+' '+item" @click="emit('selectPage', item)">{{ item }}</button>
        </template>
      </template>
      <span v-else class="base-pagination__label" aria-live="polite">{{ tr('Страница') }} {{ fmt.number(page, 0) }} {{ tr('из') }} {{ fmt.number(lastPage, 0) }}</span>
      <BaseButton variant="secondary" :disabled="loading || page >= lastPage" @click="emit('next')">{{ tr('Далее') }}</BaseButton>
    </div>
  </nav>
</template>

<style scoped>
.base-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;min-width:0}
.pagination-summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;color:var(--color-muted);font-size:12px;line-height:18px}
.pagination-summary label{display:inline-flex}
.pagination-summary select{
  min-height:34px;padding:6px 28px 6px 10px;border:1px solid var(--color-stroke);
  border-radius:7px;background:var(--color-surface);color:var(--color-text);
  font:inherit;font-size:12px;box-shadow:var(--shadow-control)
}
.pagination-pages{display:flex;align-items:center;justify-content:flex-end;gap:3px;flex-wrap:wrap;margin-left:auto}
.pagination-pages :deep(.base-button){min-height:34px;padding:5px 10px;font-size:12px}
.pagination-page{display:grid;place-items:center;min-width:32px;height:34px;padding:4px 8px;border:1px solid var(--color-stroke);background:var(--color-surface);color:var(--color-text);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.pagination-page--active{background:var(--color-accent-soft);color:var(--color-primary);border-color:var(--color-primary-stroke);cursor:default}
.pagination-ellipsis{display:grid;place-items:center;min-width:22px;font-size:12px;color:var(--color-muted)}
.base-pagination__label{font-size:var(--font-caption-size);line-height:var(--line-caption);color:var(--color-muted)}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media(max-width:600px){.base-pagination{align-items:start}.pagination-pages{margin:0;justify-content:start}.pagination-summary{width:100%}}
</style>