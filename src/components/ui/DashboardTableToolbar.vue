<script setup lang="ts">
import { publicAsset } from '../../utils/publicAsset'
import { nextTick,ref } from 'vue'
type FilterOption={id:string;label:string}
const props=withDefaults(defineProps<{query:string;filter:string;searchLabel:string;filterLabel:string;options:FilterOption[];loading?:boolean}>(),{loading:false})
const emit=defineEmits<{'update:query':[value:string];'update:filter':[value:string];search:[]}>()
const searchOpen=ref(false),filtersOpen=ref(false),searchField=ref<HTMLInputElement|null>(null)
async function toggleSearch(){searchOpen.value=!searchOpen.value;if(searchOpen.value){await nextTick();searchField.value?.focus()}else if(props.query){emit('update:query','');emit('search')}}
function input(e:Event){emit('update:query',(e.target as HTMLInputElement).value)}
function filter(e:Event){emit('update:filter',(e.target as HTMLSelectElement).value)}
</script>
<template>
  <div class="dashboard-toolbar">
    <button type="button" class="toolbar-button" :aria-expanded="searchOpen" :aria-label="searchOpen?'Скрыть поиск: '+searchLabel:'Открыть поиск: '+searchLabel" @click="toggleSearch">
      <img :src="publicAsset('prototype-icons/Search.svg')" alt="" aria-hidden="true" />Поиск
    </button>
    <button type="button" class="toolbar-button" :aria-expanded="filtersOpen" :aria-label="filtersOpen?'Скрыть фильтры: '+searchLabel:'Открыть фильтры: '+searchLabel" @click="filtersOpen=!filtersOpen">
      <img :src="publicAsset('prototype-icons/Filter.svg')" alt="" aria-hidden="true" />Фильтры
    </button>
    <form v-if="searchOpen" class="toolbar-popover toolbar-search" role="search" @submit.prevent="emit('search')">
      <input ref="searchField" type="search" :value="query" :aria-label="searchLabel" :placeholder="searchLabel" @input="input" />
      <button type="submit" :disabled="loading">Найти</button>
    </form>
    <div v-if="filtersOpen" class="toolbar-popover toolbar-filter">
      <label><span>{{ filterLabel }}</span><select :value="filter" :aria-label="filterLabel" @change="filter">
        <option v-for="option in options" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select></label>
    </div>
  </div>
</template>
<style scoped>
.dashboard-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0}
.toolbar-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:7px 10px;border:1px solid var(--color-stroke);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font-size:12px;line-height:17px;font-weight:600;box-shadow:var(--shadow-control)}
.toolbar-button:hover,.toolbar-button[aria-expanded="true"]{border-color:var(--color-primary-stroke);background:var(--color-soft)}
.toolbar-button img{width:16px;height:16px}
.toolbar-popover{display:flex;align-items:center;gap:8px;min-height:36px;max-width:100%}
.toolbar-search{flex:1 1 200px}
.toolbar-search input,.toolbar-filter select{width:100%;min-width:0;min-height:34px;padding:6px 10px;border:1px solid var(--color-stroke-strong);border-radius:var(--radius-sm);background:var(--color-surface);color:var(--color-text);font-size:12px}
.toolbar-search button{min-height:34px;padding:6px 11px;border:0;border-radius:var(--radius-sm);background:var(--color-primary);color:var(--color-on-primary);font-size:12px;font-weight:600}
.toolbar-filter label{display:flex;align-items:center;gap:7px}
.toolbar-filter label>span{color:var(--color-muted);font-size:11px}
.toolbar-filter select{max-width:190px}
@media(max-width:650px){.dashboard-toolbar{gap:5px}.toolbar-button{padding:6px 9px}.toolbar-search{order:3;flex-basis:100%}.toolbar-filter{order:4;flex-basis:100%}.toolbar-filter label{width:100%}.toolbar-filter select{max-width:none;flex:1}}
</style>
