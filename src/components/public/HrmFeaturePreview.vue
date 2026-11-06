<script setup lang="ts">
import { computed } from 'vue'
import { UsersRound, Network, CalendarDays, Clock3, CheckCircle2, FileText, ShieldCheck } from 'lucide-vue-next'
import { usePublicSiteText } from '../../i18n/publicSite'
const props=defineProps<{kind:'staffing'|'leave'|'personnel'|'access'}>()
const {tr}=usePublicSiteText()
const title=computed(()=>({
 staffing:'staffing',leave:'vacations',personnel:'personnel',access:'roles',
} as const)[props.kind])
</script>
<template>
<div class="feature-preview">
 <header><span class="feature-mark">itp</span><strong>{{tr(title)}}</strong><span class="ellipsis">···</span></header>
 <div v-if="kind==='staffing'" class="preview-tree">
  <div class="tree-root"><Network :size="17"/>{{tr('company')}}</div>
  <div class="tree-children">
   <div><UsersRound :size="17"/>IT <small>8</small></div>
   <div><Network :size="17"/>HR <small>4</small></div>
   <div><UsersRound :size="17"/>Operations <small>12</small></div>
  </div>
  <div class="preview-foot"><CheckCircle2 :size="15"/>{{tr('featureStaffingTitle')}}</div>
 </div>
 <div v-else-if="kind==='leave'" class="preview-leave">
  <div v-for="(label,index) in [tr('demoLeavePlan'),tr('demoLeaveActual'),tr('demoLeaveBalance')]" :key="label" class="leave-metric">
   <span>{{label}}</span><b>{{[24,16,8][index]}}</b>
   <div class="leave-progress"><i :style="{width:([100,67,33][index])+'%'}"/></div>
  </div>
  <div class="preview-calendar"><span v-for="day in 21" :key="day" :class="{booked:day>=6&&day<=12}">{{day}}</span></div>
 </div>
 <div v-else-if="kind==='personnel'" class="preview-records">
  <div v-for="(label,index) in [tr('employees'),tr('personnel'),tr('documents')]" :key="label">
   <span class="record-icon"><component :is="[UsersRound,FileText,CheckCircle2][index]" :size="16"/></span>
   <strong>{{label}}</strong><small><CheckCircle2 :size="14"/></small>
  </div>
 </div>
 <div v-else class="preview-roles">
  <div v-for="(label,index) in [tr('roles'),'HR',tr('employees')]" :key="label">
   <span class="role-icon"><ShieldCheck :size="18"/></span><strong>{{label}}</strong>
   <span class="role-check"><CheckCircle2 :size="16"/></span>
  </div>
 </div>
</div>
</template>
<style scoped>
.feature-preview{background:#fff;color:#173744;min-height:285px;overflow:hidden;border-radius:9px;border:1px solid #e5eff3}
.feature-preview header{display:flex;align-items:center;gap:9px;padding:0 16px;height:48px;background:#f8fbfd;border-bottom:1px solid #e6eef1}
.feature-mark{padding:4px 6px;background:#009cde;color:#fff;border-radius:5px;font-size:10px;font-weight:750}
.feature-preview header strong{flex:1;font-size:13px}.ellipsis{color:#829ba7}
.preview-tree,.preview-leave,.preview-records,.preview-roles{padding:18px}
.tree-root{display:flex;align-items:center;gap:8px;width:max-content;max-width:100%;padding:12px 16px;background:#e2f5fc;border-radius:8px;margin:auto;font-size:13px;font-weight:650}
.tree-root svg,.tree-children svg{color:#009cde}
.tree-children{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:24px 0}
.tree-children>div{display:flex;align-items:center;gap:5px;padding:10px 8px;background:#f2f8fb;border:1px solid #e6eff3;border-radius:7px;font-size:10px;white-space:nowrap}
.tree-children small{margin-left:auto;color:#7392a0}
.preview-foot{display:flex;align-items:center;gap:7px;font-size:11px;color:#43826b;margin-top:28px}
.preview-leave{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.leave-metric{padding:12px;background:#f5f9fb;border-radius:8px;font-size:10px;color:#628090}
.leave-metric b{display:block;font-size:25px;color:#183a49;margin:5px 0}
.leave-progress{height:5px;background:#d7e7ee;border-radius:9px;overflow:hidden}.leave-progress i{display:block;background:#009cde;height:100%}
.preview-calendar{grid-column:1/-1;display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:13px}
.preview-calendar span{display:grid;place-items:center;padding:7px 0;background:#f4f9fb;border-radius:4px;font-size:10px;color:#71909d}
.preview-calendar span.booked{background:#bdeafa;color:#0478af}
.preview-records>div,.preview-roles>div{display:flex;align-items:center;gap:12px;padding:15px 5px;border-bottom:1px solid #edf2f5;font-size:12px}
.record-icon,.role-icon{width:31px;height:31px;display:grid;place-items:center;background:#edf8fd;color:#009cde;border-radius:8px}
.preview-records strong,.preview-roles strong{flex:1}.preview-records small,.role-check{color:#1e9f75}
@media(max-width:540px){.feature-preview{min-height:250px}.preview-tree,.preview-leave,.preview-records,.preview-roles{padding:12px}.tree-children{gap:4px}.tree-children>div{padding:7px 4px}}
</style>
