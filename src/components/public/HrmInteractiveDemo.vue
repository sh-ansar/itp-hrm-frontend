<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDownUp, ArrowRight, CalendarDays, Clock3, Network, RefreshCw, Search, UsersRound } from 'lucide-vue-next'
import { usePublicSiteText } from '../../i18n/publicSite'
const {tr}=usePublicSiteText()
type Tab='people'|'leave'|'staffing'|'time'
const active=ref<Tab>('people')
const query=ref('')
const tabs=computed(()=>[
 {id:'people' as Tab,label:tr('demoPeople'),icon:UsersRound},
 {id:'leave' as Tab,label:tr('demoLeave'),icon:CalendarDays},
 {id:'staffing' as Tab,label:tr('demoStaffing'),icon:Network},
 {id:'time' as Tab,label:tr('demoTime'),icon:Clock3},
])
const people=[{name:'A. Ivanov',role:'Developer',department:'IT',letter:'A'},
 {name:'M. Dolidze',role:'HR',department:'People',letter:'M'},
 {name:'D. Tulubaev',role:'Director',department:'Management',letter:'D'},
 {name:'K. Kim',role:'Analyst',department:'Analytics',letter:'K'}]
const filtered=computed(()=>people.filter(x=>(x.name+' '+x.role+' '+x.department).toLowerCase().includes(query.value.trim().toLowerCase())))
function reset(){active.value='people';query.value=''}
function onTabKeydown(event:KeyboardEvent,index:number){
 let next=index
 if(event.key==='ArrowRight')next=(index+1)%tabs.value.length
 else if(event.key==='ArrowLeft')next=(index+tabs.value.length-1)%tabs.value.length
 else if(event.key==='Home')next=0
 else if(event.key==='End')next=tabs.value.length-1
 else return
 event.preventDefault()
 active.value=tabs.value[next].id
 ;(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
}
</script>
<template>
<section id="interactive-demo" class="landing-demo" aria-labelledby="hrm-interactive-title">
 <header class="landing-demo__heading">
  <div><span class="demo-label">{{tr('heroKicker')}}</span>
   <h2 id="hrm-interactive-title">{{tr('demoTitle')}}</h2><p>{{tr('demoText')}}</p>
  </div>
  <button type="button" class="demo-reset" @click="reset"><RefreshCw :size="16"/>{{tr('reset')}}</button>
 </header>
 <div class="landing-demo__shell">
  <div class="demo-tabs" role="tablist" :aria-label="tr('demoTitle')">
   <button v-for="(tab,index) in tabs" :id="'hrm-demo-tab-'+tab.id" :key="tab.id"
    type="button" role="tab" :aria-selected="active===tab.id" :tabindex="active===tab.id?0:-1"
    :class="{active:active===tab.id}" @click="active=tab.id" @keydown="onTabKeydown($event,index)">
    <component :is="tab.icon" :size="16"/>{{tab.label}}
   </button>
  </div>
  <div class="demo-body">
   <div class="demo-safe"><span></span>{{tr('demoText')}}</div>
   <div v-if="active==='people'" role="tabpanel" aria-labelledby="hrm-demo-tab-people">
    <div class="demo-toolbar"><h3>{{tr('demoPeople')}}</h3><label class="demo-search">
     <Search :size="16"/><input v-model="query" :aria-label="tr('demoEmployeeName')" :placeholder="tr('demoEmployeeName')"/></label>
    </div>
    <div class="demo-table-wrap">
     <table><thead><tr><th>{{tr('demoEmployeeName')}} <ArrowDownUp :size="12"/></th>
      <th>{{tr('demoPosition')}}</th><th>{{tr('demoDepartment')}}</th><th>{{tr('status')}}</th></tr></thead>
      <tbody><tr v-for="p in filtered" :key="p.name"><td><span class="demo-avatar">{{p.letter}}</span>{{p.name}}</td>
       <td>{{p.role}}</td><td>{{p.department}}</td><td><span class="demo-status">{{tr('heroActive')}}</span></td></tr>
      </tbody></table>
    </div>
   </div>
   <div v-else-if="active==='leave'" role="tabpanel" aria-labelledby="hrm-demo-tab-leave">
    <div class="demo-toolbar"><h3>{{tr('demoLeave')}}</h3><span class="demo-label">{{tr('demoCalendar')}}</span></div>
    <div class="demo-stats"><article v-for="(key,index) in ['demoLeavePlan','demoLeaveActual','demoLeaveBalance']" :key="key">
     <small>{{tr(key)}}</small><strong>{{[24,16,8][index]}}</strong>
     <div class="demo-progress"><span :style="{width:[100,67,33][index]+'%'}"/></div></article></div>
    <div class="demo-calendar"><div v-for="i in 35" :key="i" :class="{selected:i>=9&&i<=20}">{{((i-1)%31)+1}}</div></div>
   </div>
   <div v-else-if="active==='staffing'" role="tabpanel" aria-labelledby="hrm-demo-tab-staffing">
    <div class="demo-toolbar"><h3>{{tr('demoStaffing')}}</h3><span class="demo-label">{{tr('staffing')}}</span></div>
    <div class="demo-org"><div class="org-root"><Network :size="18"/>{{tr('company')}}</div>
     <div class="org-departments"><div v-for="(name,count) in ['IT','HR','Operations']" :key="name">
      <UsersRound :size="18"/><strong>{{name}}</strong><small>{{[8,4,12][Number(count)]}}</small></div></div></div>
   </div>
   <div v-else role="tabpanel" aria-labelledby="hrm-demo-tab-time">
    <div class="demo-toolbar"><h3>{{tr('demoTime')}}</h3><span class="demo-label">{{tr('demoSchedule')}}</span></div>
    <div class="demo-time"><div class="time-head"><span>{{tr('demoEmployeeName')}}</span>
      <span v-for="n in 7" :key="n">{{n}}</span></div>
     <div v-for="(p,row) in people.slice(0,3)" :key="p.name" class="time-row"><span>{{p.name}}</span>
      <span v-for="n in 7" :key="n" :class="{worked:(n+row)%7<5}">{{(n+row)%7<5?'8':'—'}}</span></div>
    </div>
   </div>
   <div class="demo-bottom"><span><span class="demo-online"></span>{{tr('heroActive')}}</span>
    <RouterLink to="/register">{{tr('heroFirst')}} <ArrowRight :size="15"/></RouterLink>
   </div>
  </div>
 </div>
</section>
</template>
<style scoped>
.landing-demo{max-width:1240px;margin:0 auto;padding:72px 24px;scroll-margin-top:100px}
.landing-demo__heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:25px}
.demo-label{color:#009cde;font-weight:650;font-size:12px}
.landing-demo__heading h2{font-size:clamp(29px,3.4vw,42px);line-height:1.1;letter-spacing:-.04em;margin:10px 0 0}
.landing-demo__heading p{color:#65818e;font-size:14px;margin:14px 0 0}
.demo-reset{display:flex;align-items:center;gap:8px;color:#466f82;background:transparent;border:1px solid #d8e7ec;padding:10px 13px;
 border-radius:8px;cursor:pointer;font:inherit;font-size:12px;white-space:nowrap}
.landing-demo__shell{background:#fff;border:1px solid #deebf0;box-shadow:0 17px 52px #123d5711;border-radius:14px;overflow:hidden}
.demo-tabs{display:flex;gap:3px;align-items:center;overflow-x:auto;scrollbar-color:#d3e7ef transparent;background:#f6fafc;border-bottom:1px solid #e4edf1;padding:10px 16px}
.demo-tabs button{display:flex;align-items:center;justify-content:center;gap:8px;flex:1;min-width:125px;border:1px solid transparent;border-radius:8px;
 background:transparent;min-height:45px;color:#658392;font:inherit;font-size:13px;font-weight:550;cursor:pointer}
.demo-tabs button:hover{background:#eef8fc}.demo-tabs button.active{background:#e1f4fd;color:#007eb6;border-color:#bce8f9}
.demo-body{padding:24px;color:#193745;min-height:360px}
.demo-safe{display:flex;align-items:center;gap:7px;color:#819da9;font-size:11px;margin-bottom:21px}
.demo-safe span{width:7px;height:7px;background:#17a569;border-radius:50%}
.demo-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:17px}
.demo-toolbar h3{font-size:20px;font-weight:650;margin:0}
.demo-search{display:flex;align-items:center;gap:6px;border:1px solid #dce9ef;border-radius:7px;padding:0 9px;min-height:38px;color:#7795a2}
.demo-search input{outline:none;border:0;font:inherit;font-size:12px;min-width:0;width:min(200px,25vw);background:transparent;color:#294553}
.demo-table-wrap{overflow-x:auto}
.demo-table-wrap table{width:100%;border-collapse:collapse;text-align:left;min-width:550px}
.demo-table-wrap th{font-size:11px;font-weight:650;color:#607f8d;background:#f1f7fa;padding:13px}
.demo-table-wrap th svg{vertical-align:middle;margin-left:5px}
.demo-table-wrap td{font-size:12px;padding:13px;border-bottom:1px solid #edf2f5}
.demo-table-wrap td:first-child{display:flex;align-items:center;gap:10px;font-weight:650}
.demo-avatar{width:31px;height:31px;display:grid;place-items:center;background:#e2f3fb;color:#0487c2;border-radius:50%;font-size:11px}
.demo-status{display:inline-flex;background:#e5f7ed;color:#1d8b62;border-radius:16px;padding:5px 9px;font-size:11px}
.demo-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}
.demo-stats article{padding:15px;background:#f4f9fb;border-radius:8px}.demo-stats small{color:#748d9d;font-size:12px}
.demo-stats strong{display:block;font-size:33px;margin:8px 0 12px}.demo-progress{height:5px;background:#dce9ef;border-radius:9px;overflow:hidden}
.demo-progress span{display:block;background:#009cde;height:100%}
.demo-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.demo-calendar div{padding:7px 0;text-align:center;border-radius:6px;background:#f2f7f9;color:#628493;font-size:11px}
.demo-calendar div.selected{background:#d6f1fb;color:#0085c5}
.demo-org{padding:24px 15px}.org-root{display:flex;align-items:center;gap:9px;width:max-content;max-width:100%;background:#e1f5fc;color:#007bb5;
 border:1px solid #bde7f6;padding:13px 19px;border-radius:9px;margin:0 auto;font-size:13px;font-weight:650}
.org-departments{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:40px 0 0}
.org-departments>div{display:flex;align-items:center;gap:8px;background:#f4f9fb;border:1px solid #e0eaf1;border-radius:9px;padding:20px 10px}
.org-departments svg{color:#008fc9}.org-departments strong{flex:1;font-size:13px}.org-departments small{color:#7795a0}
.demo-time{min-width:0;overflow-x:auto}.time-head,.time-row{display:grid;grid-template-columns:minmax(100px,2fr) repeat(7,minmax(30px,1fr));gap:5px;padding:7px 0;min-width:470px}
.time-head span{color:#78919d;font-size:11px}.time-row>span{background:#f3f8fa;border-radius:5px;padding:12px 5px;font-size:11px}
.time-row>span.worked{background:#e1f5fb;color:#0084be}
.demo-bottom{border-top:1px solid #ebf2f6;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:22px;padding-top:17px;font-size:12px;color:#64818c}
.demo-bottom>span{display:flex;align-items:center;gap:8px}.demo-online{width:8px;height:8px;border-radius:50%;background:#12a46b}
.demo-bottom a{display:flex;align-items:center;gap:5px;color:#0087c5;text-decoration:none;font-weight:650}
@media(max-width:700px){.landing-demo{padding:43px 16px}.landing-demo__heading{display:block}.demo-reset{margin-top:16px}
 .demo-body{padding:15px;min-height:310px}.demo-tabs{padding:7px}.demo-tabs button{min-width:111px;font-size:12px}
 .demo-stats{gap:6px}.demo-stats article{padding:10px}.demo-stats strong{font-size:24px}.org-departments{gap:6px}}
</style>
