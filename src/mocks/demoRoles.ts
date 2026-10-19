// Synthetic presentation state only. Never import this module from connected API code.
type Role = 'company_admin'|'hr_specialist'|'department_manager'|'employee'
type Department = {id:string;name:string}
type Membership = {
  user_id:number;name:string;email:string;status:string;role_code:Role;
  department_scopes:Department[];updated_at:string
}
type Audit = {
  id:string;action:'company.role_changed'|'company.role_revoked';
  actor:string;subject:string;created_at:string
}
export type DemoRoleDependencies = {departments:Department[];employees:Array<{id:string}>}
const demoUsers:Membership[]=[
  {user_id:1,name:'Демо-администратор',email:'admin@hrm.example.test',status:'active',role_code:'company_admin',department_scopes:[],updated_at:'2026-10-19T08:00:00Z'},
  {user_id:2,name:'Специалист по кадрам',email:'hr@hrm.example.test',status:'active',role_code:'hr_specialist',department_scopes:[],updated_at:'2026-10-19T08:00:00Z'},
  {user_id:3,name:'Руководитель отдела',email:'manager@hrm.example.test',status:'active',role_code:'department_manager',department_scopes:[],updated_at:'2026-10-19T08:00:00Z'},
  {user_id:4,name:'Сотрудник',email:'employee@hrm.example.test',status:'active',role_code:'employee',department_scopes:[],updated_at:'2026-10-19T08:00:00Z'},
]
const audit:Audit[]=[]
const links=new Map<number,{employee_id:string|null;revision:number}>()
const roleKeys=[
  'overview.view','employees.view','employees.extended_view','organization.view',
  'staffing.view','personnel_actions.view','worktime.view','leaves.view',
  'documents.view','directories.view','development.view','reports.view',
  'settings.view','self_service.view','roles.interface','employees.write',
  'staffing.write','documents.write','directories.write','worktime.calendar.edit',
  'leave.requests.manage','leave.requests.approve','leave.types.manage','roles.assign',
]
function capabilities(role:Role):Record<string,boolean>{
  const admin=role==='company_admin',hr=role==='hr_specialist',manager=role==='department_manager'
  const staff=admin||hr
  const visible=new Set<string>([
    'settings.view','self_service.view',
    ...(staff||manager?['overview.view','employees.view','organization.view','worktime.view','leaves.view']:[]),
    ...(staff?['employees.extended_view','staffing.view','personnel_actions.view','documents.view',
      'directories.view','development.view','reports.view','employees.write','staffing.write',
      'documents.write','directories.write','leave.requests.manage']:[]),
    ...(admin?['roles.interface','roles.assign','worktime.calendar.edit','leave.requests.approve','leave.types.manage']:[]),
  ])
  return Object.fromEntries(roleKeys.map(key=>[key,visible.has(key)]))
}
const roles=(['company_admin','hr_specialist','department_manager','employee'] as Role[])
  .map(code=>({code,capabilities:capabilities(code),assignable:code!=='company_admin'}))
function snapshot<T>(value:T):T{return structuredClone(value)}
function logChange(action:Audit['action'],subject:string){
  audit.unshift({id:crypto.randomUUID(),action,actor:'Демо-администратор',subject,created_at:new Date().toISOString()})
}
function payload(raw:unknown):Record<string,unknown>{
  if(typeof raw!=='string')return{}
  try{const data:unknown=JSON.parse(raw);return data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:{}}
  catch{return{}}
}
export function tryDemoRoleApi(path:string,method:string,search:URLSearchParams,raw:unknown,deps:DemoRoleDependencies)
  :{handled:boolean;response?:unknown}{
  const match=path.match(/^\/companies\/[^/]+\/memberships(?:\/(\d+))?(?:\/(employee-link))?$/)
  if(!match)return{handled:false}
  const userId=match[1]?Number(match[1]):null
  const person=demoUsers.find(item=>item.user_id===userId)
  const body=payload(raw)
  if(userId!==null&&!person)throw new Error('Учётная запись в компании не найдена')
  if(match[2]==='employee-link'&&userId!==null){
    const existing=links.get(userId)??{employee_id:null,revision:0}
    if(method==='GET')return{handled:true,response:{data:snapshot(links.get(userId)??null)}}
    if(method==='PUT'){
      if(body.revision!==existing.revision)throw new Error('Связь уже изменена, обновите данные')
      const employee=body.employee_id
      if(employee!==null&&(!deps.employees.some(item=>item.id===employee)))throw new Error('Кадровая запись не найдена')
      if(employee!==null&&[...links].some(([other,link])=>other!==userId&&link.employee_id===employee))throw new Error('Кадровая запись уже связана')
      const link={employee_id:typeof employee==='string'?employee:null,revision:existing.revision+1}
      links.set(userId,link)
      return{handled:true,response:{data:snapshot(link)}}
    }
  }
  if(userId===null&&method==='GET'){
    const current=Math.max(1,Number(search.get('page')||1))
    const per=Math.max(1,Math.min(100,Number(search.get('per_page')||50)))
    const term=(search.get('search')||'').trim().toLocaleLowerCase('ru')
    const filtered=demoUsers.filter(item=>!term||[item.name,item.email].some(field=>field.toLocaleLowerCase('ru').includes(term)))
      .sort((a,b)=>a.name.localeCompare(b.name,'ru'))
    return{handled:true,response:{
      data:snapshot(filtered.slice((current-1)*per,current*per)),
      meta:{current_page:current,last_page:Math.max(1,Math.ceil(filtered.length/per)),per_page:per,total:filtered.length,role_management_enabled:true},
      roles:snapshot(roles),audit:snapshot(audit.slice(0,100)),
    }}
  }
  if(person&&method==='PUT'&&!match[2]){
    if(person.role_code==='company_admin')throw new Error('Роль администратора защищена')
    if(!['hr_specialist','department_manager','employee'].includes(String(body.role_code)))throw new Error('Некорректная роль')
    const next=body.role_code as Role
    const ids=Array.isArray(body.department_ids)?body.department_ids:[]
    if(next==='department_manager'&&!ids.length)throw new Error('Укажите подразделение')
    if(next!=='department_manager'&&ids.length)throw new Error('Для этой роли подразделения не выбираются')
    if(!ids.every(id=>typeof id==='string'&&deps.departments.some(d=>d.id===id)))throw new Error('Неизвестное подразделение')
    person.role_code=next
    person.department_scopes=(ids as string[]).map(id=>deps.departments.find(d=>d.id===id)!)
    person.updated_at=new Date().toISOString()
    logChange('company.role_changed',person.name)
    return{handled:true,response:{data:{user_id:userId,role_code:next,department_ids:ids}}}
  }
  if(person&&method==='DELETE'&&!match[2]){
    if(person.role_code==='company_admin')throw new Error('Роль администратора защищена')
    demoUsers.splice(demoUsers.indexOf(person),1)
    links.delete(userId!)
    logChange('company.role_revoked',person.name)
    return{handled:true}
  }
  throw new Error('Недопустимое действие с учётной записью')
}
