<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowRight, Check, RotateCcw } from 'lucide-vue-next'
import { publicModules } from '../../config/publicCatalog'
import { usePublicSiteText } from '../../i18n/publicSite'
const {tr}=usePublicSiteText()
const activeFilter=ref('all')
const checked=reactive<Record<string,boolean>>(Object.fromEntries(publicModules.map(item=>[item.id,true])))
const selected=computed(()=>publicModules.filter(item=>checked[item.id]).length)
const filters=computed(()=>[
 {id:'all',label:tr('all')},{id:'people',label:tr('demoPeople')},
 {id:'time',label:tr('demoTime')},{id:'workflow',label:tr('documents')},
])
const visible=computed(()=>publicModules.filter(item=>activeFilter.value==='all'||item.category===activeFilter.value))
function reset(){for(const item of publicModules)checked[item.id]=true;activeFilter.value='all'}
</script>
<template>
<div class="hrm-explorer">
 <div class="hrm-explorer-intro">
  <span class="eyebrow">{{tr('showcaseTag')}}</span>
  <h2>{{tr('showcaseTitle')}}</h2>
  <p>{{tr('showcaseDescription')}}</p>
  <div class="hrm-explorer-metrics"><span>{{selected}} / {{publicModules.length}}</span><small>{{tr('showcaseSelection')}}</small></div>
 </div>
 <div class="hrm-explorer-panel">
  <div class="explorer-filters" role="tablist" :aria-label="tr('navModules')">
   <button v-for="filter in filters" :key="filter.id" type="button" role="tab"
    :aria-selected="activeFilter===filter.id" :class="{selected:activeFilter===filter.id}"
    @click="activeFilter=filter.id">{{filter.label}}</button>
  </div>
  <div class="panel-caption"><strong>{{tr('showcaseSelection')}}</strong>
   <button type="button" @click="reset"><RotateCcw :size="13"/>{{tr('reset')}}</button></div>
  <div class="explorer-list">
   <label v-for="item in visible" :key="item.id" class="explorer-row" :class="{off:!checked[item.id]}">
    <span class="explorer-icon"><component :is="item.icon" :size="17"/></span>
    <span class="explorer-name">{{tr(item.label)}}</span>
    <input v-model="checked[item.id]" type="checkbox" :aria-label="tr(item.label)" />
    <span class="explorer-switch"><span><Check v-if="checked[item.id]" :size="11"/></span></span>
   </label>
  </div>
  <a class="explorer-preview" href="#interactive-demo">{{tr('showcasePreview')}} <ArrowRight :size="17"/></a>
 </div>
</div>
</template>
<style scoped>
.hrm-explorer{display:grid;grid-template-columns:.85fr 1.15fr;gap:22px;align-items:start;min-width:0}
.hrm-explorer-intro{min-width:0;padding:8px 3px}
.eyebrow{display:inline-flex;padding:7px 12px;border-radius:25px;background:#e6f6ff;color:#007db4;font-size:12px;font-weight:650}
.hrm-explorer-intro h2{font-size:clamp(24px,2.7vw,34px);line-height:1.12;letter-spacing:-.04em;color:#102b36;margin:16px 0}
.hrm-explorer-intro p{font-size:14px;line-height:1.65;color:#657e8b;margin:0}
.hrm-explorer-metrics{display:flex;align-items:center;gap:12px;margin-top:24px}
.hrm-explorer-metrics span{font-size:24px;color:#009cde;font-weight:700}.hrm-explorer-metrics small{color:#698995;font-size:12px}
.hrm-explorer-panel{background:#fff;border:1px solid #e3edf1;border-radius:13px;padding:16px;box-shadow:0 10px 25px #1547610b;min-width:0}
.explorer-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.explorer-filters button{font:inherit;font-size:11px;background:#f3f8fa;color:#537688;border:1px solid #e2eaf0;border-radius:30px;min-height:34px;padding:7px 11px;cursor:pointer}
.explorer-filters button.selected{background:#009cde;color:#fff;border-color:#009cde}
.panel-caption{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.panel-caption strong{font-size:13px}.panel-caption button{display:flex;align-items:center;gap:5px;background:none;border:0;color:#0089c2;font-size:12px;cursor:pointer}
.explorer-list{display:grid;max-height:250px;overflow-y:auto;scrollbar-color:#bddce8 transparent}
.explorer-row{position:relative;display:flex;align-items:center;gap:11px;min-height:49px;border-top:1px solid #ecf3f6;cursor:pointer}
.explorer-row.off{opacity:.6}.explorer-icon{width:29px;height:29px;display:grid;place-items:center;background:#effaff;color:#049adb;border-radius:8px}
.explorer-name{flex:1;font-size:12px;font-weight:550}
.explorer-row input{position:absolute;right:0;opacity:0;width:40px;height:30px;cursor:pointer}
.explorer-switch{width:33px;height:19px;padding:3px;display:flex;align-items:center;background:#cad9df;border-radius:20px}
.explorer-switch>span{width:13px;height:13px;display:grid;place-items:center;color:#009cde;background:#fff;border-radius:50%;transition:transform .15s}
.explorer-row:has(input:checked) .explorer-switch{background:#009cde}
.explorer-row:has(input:checked) .explorer-switch>span{transform:translateX(14px)}
.explorer-row:has(input:focus-visible){outline:2px solid #009cde;outline-offset:-2px}
.explorer-preview{display:flex;align-items:center;justify-content:center;gap:9px;min-height:41px;margin-top:13px;background:#e6f6ff;color:#007fbc;
 border:1px solid #b9eafc;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600}
.explorer-preview:hover{background:#d5f1ff}
@media(max-width:1080px){.hrm-explorer{grid-template-columns:1fr;gap:14px}.hrm-explorer-intro h2{font-size:27px}}
@media(max-width:600px){.hrm-explorer-panel{padding:12px}}
@media(prefers-reduced-motion:reduce){.explorer-switch>span{transition:none}}
</style>
