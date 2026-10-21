import { tryDemoRoleApi } from './demoRoles'
import { getDemoEmployeePhoto } from './employeePhotos'
const companyId='11111111-1111-4111-8111-111111111111'
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const deps=[
  ['Генеральный директор',null],['Операционный блок',0],['Финансовый блок',0],['Департамент по работе с персоналом',0],['IT и цифровизация',0],
  ['Производственное управление',1],['Служба эксплуатации',1],['Бухгалтерия',2],['Планово-экономический отдел',2],['Подбор и адаптация',3],
  ['Обучение и развитие',3],['Отдел разработки',4],['Инфраструктура и поддержка',4],['Проектный офис',0],
].map(([name,p],i)=>({id:id(100+i),name,parent_id:p===null?null:id(100+Number(p)),revision:1}))
const positions=['Генеральный директор','Операционный директор','Финансовый директор','HR-директор','IT-директор','Руководитель отдела','HR бизнес-партнёр','Рекрутер','Специалист по обучению','Главный бухгалтер','Экономист','Бизнес-аналитик','Frontend-разработчик','Backend-разработчик','DevOps-инженер','Системный администратор','Менеджер проекта','Инженер эксплуатации','Специалист поддержки','Офис-менеджер'].map((name,i)=>({id:id(300+i),name,revision:1}))

const directoryStorageKey='hrm-demo-directories-v1'
// Keep harmless demo directory edits through a refresh in the current tab.
// The browser session is isolated from Laravel and production data.
function restoreDemoDirectories(){
  try {
    const saved=JSON.parse(sessionStorage.getItem(directoryStorageKey)||'null')
    if(!saved || !Array.isArray(saved.departments) || !Array.isArray(saved.positions))return
    const valid=(record:any)=>record&&typeof record.id==='string'
      &&/^[a-f0-9-]{36}$/i.test(record.id)
      &&typeof record.name==='string'&&record.name.length>0
      &&Number.isSafeInteger(record.revision)&&record.revision>=1
    if(saved.departments.length>=14&&saved.departments.length<=500
      &&saved.positions.length>=1&&saved.positions.length<=500
      &&saved.departments.every((record:any)=>valid(record)
        &&(record.parent_id===null||typeof record.parent_id==='string'))
      &&saved.positions.every(valid)){
      deps.splice(0,deps.length,...saved.departments)
      positions.splice(0,positions.length,...saved.positions)
    }
  }catch{ /* A blocked storage or invalid session never breaks the demo. */ }
}
function saveDemoDirectories(){
  try { sessionStorage.setItem(directoryStorageKey,JSON.stringify({departments:deps,positions})) }
  catch{ /* A blocked storage falls back to page-lifetime demo state. */ }
}
// Reference fixtures remain stable when a user adds new demo directory rows.
const fixtureDepartments=deps.map(dep=>({...dep}))
const fixturePositions=positions.map(pos=>({...pos}))
if(import.meta.env.VITE_DEMO_MODE==='true')restoreDemoDirectories()
const seededDepartments=fixtureDepartments.map(original=>deps.find(dep=>dep.id===original.id)??original)
const seededPositions=fixturePositions.map(original=>positions.find(pos=>pos.id===original.id)??original)
const names=[['Садыков','Арман','Ерланович'],['Ибраева','Алия','Сериковна'],['Ким','Даниил','Алексеевич'],['Ахметова','Мадина','Руслановна'],['Нуртаев','Асет','Маратович'],['Смирнова','Елена','Викторовна'],['Омаров','Тимур','Кайратович'],['Сейтова','Аружан','Нурлановна'],['Ли','Максим','Олегович'],['Жумабаева','Динара','Аскаровна'],['Касымов','Ринат','Булатович'],['Волкова','Анна','Игоревна'],['Тлеубаев','Адиль','Ермекович'],['Соколова','Мария','Андреевна'],['Беков','Нурсултан','Дауренович'],['Романова','Екатерина','Павловна'],['Абдрахманов','Ержан','Серикович'],['Кузнецова','Ольга','Дмитриевна'],['Мусин','Алихан','Талгатович'],['Морозова','Дарья','Сергеевна'],['Исаев','Руслан','Айдарович'],['Петрова','Виктория','Олеговна'],['Жанибеков','Данияр','Арманович'],['Орлова','Полина','Романовна'],['Сулейменов','Мирас','Канатович'],['Федорова','София','Ильинична'],['Калиев','Ерасыл','Бауыржанович'],['Новикова','Алина','Максимовна'],['Токтаров','Санжар','Ерланович'],['Попова','Ксения','Алексеевна'],['Ермеков','Айдос','Тимурович'],['Васильева','Наталья','Денисовна'],['Баймуханов','Алан','Рашидович'],['Захарова','Вероника','Олеговна'],['Серикбаев','Мади','Ерболович'],['Белова','Юлия','Антоновна'],['Кенжебек','Амир','Даулетович'],['Мельникова','Анастасия','Игоревна'],['Таиров','Ильяс','Муратович'],['Григорьева','Елизавета','Сергеевна']]
const employees=names.map(([last_name,first_name,middle_name],i)=>{const d=seededDepartments[5+i%(seededDepartments.length-5)],p=seededPositions[5+i%(seededPositions.length-5)],arch=i>=37,planned=i>=34&&i<37,unassigned=i===33;return{id:id(1000+i),personnel_number:`EMP-${String(i+1).padStart(4,'0')}`,last_name,first_name,middle_name,revision:1,birth_date:`${1987+i%12}-0${i%9+1}-${String(i%20+5).padStart(2,'0')}`,gender:i%2?'female':'male',email:`employee${i+1}@demo.local`,phone:`+7 700 100 ${String(10+i).padStart(2,'0')} ${String(20+i).padStart(2,'0')}`,address:i%2?'г. Астана':'г. Алматы',work_site:i%2?'Астана, головной офис':'Алматы, офис',work_zone:i%3?'Гибрид':'Офис',work_team:`Команда ${String.fromCharCode(65+i%4)}`,supervisor_name:'Садыков Арман Ерланович',employee_category:i%4===0?'Руководители':i%4===1?'Специалисты':i%4===2?'Рабочие':'Административный персонал',personnel_type:i%3===0?'Производственный':i%3===1?'Офисный':'ИТ-персонал',contract_type:i%4===0?'Срочный':'Бессрочный',current_department_name:unassigned||arch?null:d.name,current_position_name:unassigned||arch?null:p.name,current_department_id:unassigned||arch?null:d.id,current_position_id:unassigned||arch?null:p.id,current_assignment_valid_from:unassigned||arch?null:`202${2+i%4}-0${i%8+1}-01`,employment_status:arch?'archived':planned?'planned':unassigned?'unassigned':'active'}})
// Isolated Vercel demo data only; never interpreted as historical HR records.
const demoAddresses=new Map<string,any[]>([[
  id(1000),
  [{id:id(9700),kind:'residence',address_line:'Демо-адрес: г. Астана, ул. Тестовая, дом 1',
    entrance:'1',floor:'2',apartment:'5',is_primary:true,revision:1,archived:false}],
]])
function addressesFor(employeeId:string):any[]{
  return (demoAddresses.get(employeeId)??[]).filter(row=>!row.archived)
    .sort((a,b)=>Number(b.is_primary)-Number(a.is_primary))
}
// Synthetic normalized identity records intentionally differ from the legacy
// reference projection. Browser tests enforce that the normalized source wins.
const demoIdentityDocuments = new Map<string, any[]>([[
  id(1000), [
    {id:id(9741),type:'Тестовый документ A',number:'QA-DOC-PRIMARY-001',
      personal_number:'QA-PERSON-001',country_of_issue:'Тестовая страна',
      issued_by:'Демо-организация',issued_on:'2026-01-15',expires_on:'2036-01-15',
      is_primary:true,revision:1},
    {id:id(9742),type:'Тестовый документ B',number:'QA-DOC-SECONDARY-002',
      personal_number:'QA-PERSON-002',country_of_issue:'Тестовая страна',
      issued_by:'Демо-организация',issued_on:'2025-05-20',expires_on:'2035-05-20',
      is_primary:false,revision:1},
  ],
]])
const plan:any={id:id(500),name:'Штатное расписание 2026',valid_from:'2026-01-01',valid_to:'2026-12-31',status:'approved',revision:3}
const staffing=seededDepartments.slice(1).flatMap((d,di)=>Array.from({length:di%3===0?3:2},(_,ri)=>{const p=seededPositions[(di*2+ri+4)%seededPositions.length],planned=ri?2:4,occupied=Math.max(0,planned-((di+ri)%3===0?1:0));return{id:id(600+di*4+ri),department_id:d.id,position_id:p.id,department_name:d.name,position_name:p.name,planned_units:planned,occupied_units:occupied,vacant_units:planned-occupied,overstaffed_units:0,base_salary:420000+di*25000+ri*60000,currency:'KZT',notes:null,revision:1}}))
const draftPlan:any={...plan,id:id(501),name:'Проект штатного расписания 2027',valid_from:'2027-01-01',valid_to:null,status:'draft',revision:1}
const staffingPlans:any[]=[plan,draftPlan]
const staffingByPlan=new Map<string,any[]>([
  [plan.id,staffing],
  [draftPlan.id,staffing.map((row:any,index:number)=>({...row,id:id(1600+index),revision:1}))],
])
// The history is a real demo activity log, not 34 fabricated audit records.
// Seeded sample plans are fixtures, not user actions in this browser session.
type DemoStaffingEvent = {
  id:number; action:string; staffing_plan_id:string; staffing_line_id:string|null;
  revision:number; created_at:string
}
const staffingHistory:DemoStaffingEvent[]=[]
let staffingHistoryId=0
function recordStaffingEvent(action:string,planId:string,lineId:string|null,revision:number){
  staffingHistory.unshift({
    id:++staffingHistoryId,action,staffing_plan_id:planId,staffing_line_id:lineId,
    revision,created_at:new Date().toISOString(),
  })
}
function demoStaffingLinePayload(body:any,lines:any[],lineId:string|null){
  const department=deps.find(x=>x.id===body.department_id)
  const position=positions.find(x=>x.id===body.position_id)
  if(!department||!position)throw new Error('Выберите действующие подразделение и должность')
  const planned=Number(body.planned_units)
  if(!Number.isFinite(planned)||planned<=0||planned>999999.99||
    Math.abs(planned*100-Math.round(planned*100))>0.000001)
    throw new Error('Количество ставок должно быть положительным числом с точностью до сотых')
  const salary=body.base_salary===null||body.base_salary===''||body.base_salary===undefined
    ?null:Number(body.base_salary)
  if(salary!==null&&(!Number.isFinite(salary)||salary<0||salary>999999999999.99))
    throw new Error('Некорректный базовый оклад')
  const currency=body.currency??null
  if(currency!==null&&!['KZT','USD','EUR','GEL','RUB'].includes(currency))
    throw new Error('Некорректная валюта')
  if(lines.some(line=>line.id!==lineId&&line.department_id===department.id&&line.position_id===position.id))
    throw new Error('Такая штатная позиция уже есть в этой версии')
  return {
    department_id:department.id,position_id:position.id,
    department_name:department.name,position_name:position.name,
    planned_units:planned,base_salary:salary,
    currency:salary===null?null:currency,
    notes:body.notes??null,
  }
}
const actions=employees.slice(0,18).map((e,i)=>({id:id(3000+i),employee_id:e.id,action_type:i%5===0?'transfer':'hire',effective_on:`2026-0${i%9+1}-0${i%8+1}`,basis_reference:`Приказ № HR-${120+i}`,notes:null,source_assignment_id:i%5===0?id(4000+i):null,target_assignment_id:id(4100+i),personnel_number:e.personnel_number,last_name:e.last_name,first_name:e.first_name,middle_name:e.middle_name,source_department_name:i%5===0?deps[9].name:null,source_position_name:i%5===0?positions[7].name:null,target_department_name:e.current_department_name,target_position_name:e.current_position_name,created_at:'2026-10-01T09:30:00+05:00'}))
const training=employees.slice(0,16).map((e,i)=>({id:id(2000+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:i%4===0?'planned':i%3===0?'ongoing':'completed',training_type:i%2?'external':'internal',training_mode:i%3===0?'remote':i%3===1?'in_person':'on_the_job',topic:['Управление проектами','Excel и аналитика','Охрана труда','Лидерство'][i%4],provider:'ITP Academy',city:'Астана',started_on:'2026-09-10',ended_on:i%4===0?null:'2026-09-12',document_reference:i%4===0?null:`CERT-${202600+i}`}))
const reserve=employees.slice(4,14).map((e,i)=>({id:id(2100+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:i>=8?'alumni':'active',target_position:seededPositions[(i+1)%8].name,reserve_level:i%2?'Функциональный':'Корпоративный',reserve_type:i%3?'Среднесрочный':'Оперативный',joined_year:2024+i%3,left_year:i>=8?2026:null,notes:'Индивидуальный план развития'}))
const documents=employees.slice(0,22).map((e,i)=>({id:id(5000+i),employee_id:e.id,personnel_action_id:i<actions.length?actions[i].id:null,document_type:['order','contract','basis','other'][i%4],document_number:`DOC-2026-${100+i}`,title:['Приказ о приёме','Трудовой договор','Дополнительное соглашение','Приказ о переводе'][i%4],issued_on:'2026-09-15',status:i%4===3?'draft':'active',revision:1,created_at:'2026-10-01T10:00:00+05:00',personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,has_file:i%4!==3}))
const experienceByEmployee=new Map<string,any[]>(employees.map((e,i)=>[e.id,[{
  id:id(8000+i),revision:1,experience_type:'Основное место работы',
  started_on:'2022-03-01',ended_on:null,basis_reference:'Трудовой договор',
}]]))
const assignmentByEmployee=new Map<string,any[]>(employees.map((e,i)=>[e.id,
  e.current_department_id?[{
    id:id(7000+i),department_id:e.current_department_id,
    position_id:e.current_position_id,department_name:e.current_department_name,
    position_name:e.current_position_name,valid_from:e.current_assignment_valid_from,
    valid_to:null,basis_reference:`Приказ № HR-${120+i}`,revision:1,
  }]:[],
]))
// Same point-in-time occupancy calculation as StaffingPlanController: count
// assignments valid on the selected date, including closed historical periods.
function demoStaffingRowsAt(lines:any[],asOf:string){
  const occupancy=new Map<string,number>()
  for(const assignments of assignmentByEmployee.values())for(const item of assignments){
    if(item.valid_from<=asOf&&(item.valid_to===null||item.valid_to>=asOf)){
      const key=item.department_id+'|'+item.position_id
      occupancy.set(key,(occupancy.get(key)??0)+1)
    }
  }
  return lines.map(line=>{
    const planned=Number(line.planned_units)
    const occupied=occupancy.get(line.department_id+'|'+line.position_id)??0
    return {
      ...line,occupied_units:occupied,
      vacant_units:Math.max(planned-occupied,0),
      overstaffed_units:Math.max(occupied-planned,0),
    }
  })
}
const reserveFallbacks=new Map<string,any>()
const trainingFallbacks=new Map<string,any>()
function fallbackReserve(e:any,i:number){
  if(!reserveFallbacks.has(e.id))reserveFallbacks.set(e.id,{
    id:crypto.randomUUID(),employee_id:e.id,revision:1,personnel_number:e.personnel_number,
    first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,
    development_status:'active',target_position:seededPositions[(i+2)%seededPositions.length].name,
    reserve_level:'Функциональный',reserve_type:'Среднесрочный',
    joined_year:2026,left_year:null,notes:'Индивидуальный план развития',
  })
  return reserveFallbacks.get(e.id)
}
function fallbackTraining(e:any,i:number){
  if(!trainingFallbacks.has(e.id))trainingFallbacks.set(e.id,{
    id:crypto.randomUUID(),employee_id:e.id,revision:1,personnel_number:e.personnel_number,
    first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,
    development_status:'ongoing',training_type:'internal',training_mode:'in_person',
    topic:'Развитие профессиональных компетенций',provider:'Корпоративный университет',
    city:'Астана',started_on:'2026-10-05',ended_on:'2026-10-07',
    document_reference:`CERT-${202600+i}`,
  })
  return trainingFallbacks.get(e.id)
}
const employeeReserve=(e:any,i:number)=>{
  const matches=reserve.filter(x=>x.employee_id===e.id)
  return matches.length?matches:[fallbackReserve(e,i)]
}
const employeeTraining=(e:any,i:number)=>{
  const matches=training.filter(x=>x.employee_id===e.id)
  return matches.length?matches:[fallbackTraining(e,i)]
}
function syncCurrentAssignment(employee:any,assignment:any|null,status:'active'|'archived'|'unassigned'='active'){
  employee.current_department_id=assignment?.department_id??null
  employee.current_department_name=assignment?.department_name??null
  employee.current_position_id=assignment?.position_id??null
  employee.current_position_name=assignment?.position_name??null
  employee.current_assignment_valid_from=assignment?.valid_from??null
  employee.employment_status=assignment?status:status==='archived'?'archived':'unassigned'
  employee.revision=Number(employee.revision||1)+1
}
function overlaps(a:any,b:any){
  return (a.valid_to??'9999-12-31')>=b.valid_from&&(b.valid_to??'9999-12-31')>=a.valid_from
}
const employeeChanges = new Map<string, Array<{id: string; action: string; actor: string; created_at: string}>>()
function recordEmployeeChange(employeeId: string, action: string) {
  const changes = employeeChanges.get(employeeId) ?? []
  changes.unshift({id: crypto.randomUUID(), action, actor: 'HR-служба', created_at: new Date().toISOString()})
  employeeChanges.set(employeeId, changes)
}
const referenceProfileFor=(e:any,i:number)=>({
  personal:{
    iin:`9${String(10000000000+i).padStart(11,'0')}`,
    login:`@employee.${i+1}`,
    nationality:i%2?'казах':'русский',
    citizenship:'Республика Казахстан',
    marital_status:i%3===0?'Женат / замужем':i%3===1?'Не женат / не замужем':'Семейное положение не указано',
    registration_address:i%2?'г. Астана, район Есиль, ул. Достык, д. 18':'г. Алматы, Бостандыкский район, ул. Абая, д. 42',
    residence_address:e.address,
    address_entrance:String(1+i%4),
    address_floor:String(2+i%12),
    address_apartment:String(10+i),
    place_of_birth:i%2?'Карагандинская область, г. Темиртау':'Алматинская область, г. Конаев',
    birth_certificate_attachment:'Свидетельство о рождении.pdf',
    emergency_contact_name:i%2?'Ибраева Алия Сериковна':'Садыков Арман Ерланович',
    emergency_contact_phone:'+7 701 555 21 10',
  },
  identity_document:{
    type:'Удостоверение личности РК',
    number:`ID${String(450000+i).padStart(6,'0')}`,
    personal_number:`PN-${String(61000000000+i).padStart(11,'0')}`,
    country_of_issue:'Республика Казахстан',
    issued_on:'2023-04-18',
    expires_on:'2033-04-17',
    issued_by:'МВД Республики Казахстан',
    attachment_name:'Удостоверение личности.pdf',
  },
  family:[
    {id:crypto.randomUUID(),relationship:'Супруг / супруга',full_name:i%2?'Ибраев Серик Нурланович':'Садыкова Алия Сериковна',birth_date:'1990-06-14',document_reference:'Свидетельство о браке.pdf'},
    {id:crypto.randomUUID(),relationship:'Ребёнок',full_name:i%2?'Ибраева Дана Сериковна':'Садыков Тимур Арманович',birth_date:'2014-04-18',document_reference:'Свидетельство о рождении.pdf'},
  ],
  military:{
    status:i%2?'Военнообязанный':'Не состоит на воинском учёте',
    category:i%2?'Резерв':'Не применимо',
    document_reference:i%2?'Военный билет.pdf':null,
    comment:i%2?'Данные воинского учёта подтверждены':'Основание отсутствия воинского учёта внесено в личное дело',
  },
  banking:{
    bank_name:i%2?'Halyk Bank':'Kaspi Bank',
    iban:`KZ${String(1200+i).padStart(18,'0')}`,
    payroll_account:`Зарплатный счёт •••• ${String(1100+i).slice(-4)}`,
    recipient:[e.last_name,e.first_name,e.middle_name].filter(Boolean).join(' '),
    medical_insurance:'Стандартная корпоративная программа',
    tax_status:'Стандартный',
    pension_accruals:'Применяются',
    attachment_name:'Банковские реквизиты.pdf',
  },
  organization:{
    company_name:'ITP HRM Demo',
    employee_category:i%3===0?'Руководитель':'Специалист',
    personnel_type:'Производственный персонал',
    primary_workplace:'Да',
    site_area:i%2?'Участок A':'Участок B',
    location:e.work_site,
    access_status:'Разрешён',
    pass_number:`PASS-${String(1000+i).padStart(4,'0')}`,
    pass_issued_on:'2026-02-01',
    brigade:e.work_team,
    brigadier:'Садыков Арман Ерланович',
    department_manager:'Нуртаев Асет Маратович',
    assignment_status:'Закреплён',
    assignment_date:'2026-02-01',
    archived:e.employment_status==='archived'?'Да':'Нет',
    staffing_position:e.current_position_name,
    staffing_position_code:`SH-${String(100+i).padStart(4,'0')}`,
    status_change_reason:'Плановое кадровое изменение',
    status_change_date:'2026-02-01',
    employment_type:'Основное место работы',
    position_since:e.current_assignment_valid_from,
  },
  employment:{
    contract_number:`TD-${2022+i%4}-${String(120+i).padStart(3,'0')}`,
    contract_date:e.current_assignment_valid_from||'2024-01-15',
    contract_type:i%4===0?'Срочный трудовой договор':'Бессрочный трудовой договор',
    employment_type:i%3===0?'Полная занятость':'Основное место работы',
    valid_from:e.current_assignment_valid_from||'2024-01-15',
    valid_to:i%4===0?'2027-12-31':null,
    probation_enabled:i%5===0?'Да':'Нет',
    probation_from:i%5===0?'2026-09-01':null,
    probation_until:i%5===0?'2026-12-01':null,
    hire_basis:`Приказ № HR-${120+i}`,
    hire_date:e.current_assignment_valid_from||'2024-01-15',
    contract_attachment:'Трудовой договор.pdf',
    work_schedule:i%2?'5/2, 09:00–18:00':'Гибкий график, 40 часов в неделю',
    total_seniority:`${8+i%12} лет ${i%11} месяцев`,
    company_seniority:`${2+i%5} года ${i%10} месяцев`,
    position_seniority:`${1+i%4} года ${i%8} месяцев`,
    site_seniority:`${1+i%3} года`,
    special_seniority:i%2?'3 года 2 месяца':'Не учитывается',
  },
  working_conditions:{
    condition_type:i%3===0?'Вредные условия труда':'Нормальные условия труда',
    condition_code:i%3===0?'27-2':'00-0',
    list_position_code:i%3===0?'21-3641':'—',
    compensation:i%3===0?'Надбавка 12%, дополнительный отпуск':'Не предусмотрена',
    basis:i%3===0?'Карта оценки условий труда':'Не требуется',
    valid_from:'2026-01-01',
    valid_to:'2026-12-31',
    attachment_name:i%3===0?'Карта оценки условий труда.pdf':null,
  },
  combination:{
    enabled:i%4===0?'Да':'Нет',
    valid_from:i%4===0?'2026-03-01':null,
    valid_to:i%4===0?'2026-06-30':null,
    position:i%4===0?'Старший специалист':null,
    reason:i%4===0?'Замещение на период отпуска':null,
    replaced_employee:i%4===0?'Ким Даниил Алексеевич':null,
    basis:i%4===0?'Приказ о временном совмещении':null,
    duties:i%4===0?'Контроль работы смены, дополнительная отчётность':null,
    material_responsibility:i%4===0?'Да':'Нет',
    material_attachment:i%4===0?'Договор материальной ответственности.pdf':null,
  },
  termination:{
    terminated:e.employment_status==='archived'?'Да':'Нет',
    termination_date:e.employment_status==='archived'?'2026-09-30':null,
    basis:e.employment_status==='archived'?'Приказ об увольнении':null,
    basis_group:e.employment_status==='archived'?'По инициативе работника':null,
    reason:e.employment_status==='archived'?'Собственное желание':null,
    comment:e.employment_status==='archived'?'Все расчёты и документы закрыты':null,
    attachment_name:e.employment_status==='archived'?'Приказ об увольнении.pdf':null,
  },
  payroll:{
    salary:520000+i*15000,
    currency:'KZT',
    payment_frequency:'2 раза в месяц',
    next_payment_date:'2026-10-25',
    payment_type:'Повременная',
    base_rate:`${520000+i*15000} KZT`,
    settlement_period:'Месяц',
    calculation_method:'По табелю и условиям труда',
    data_source:'Табель, кадровые приказы, справочники',
  },
  payroll_adjustments:[
    {id:crypto.randomUUID(),kind:'Начисление',name:'Оклад',period:'Октябрь 2026',amount:520000+i*15000,hours:176,basis:'Трудовой договор'},
    {id:crypto.randomUUID(),kind:'Начисление',name:'Надбавка за квалификацию',period:'Октябрь 2026',amount:45000,hours:null,basis:'Положение об оплате труда'},
    {id:crypto.randomUUID(),kind:'Удержание',name:'ИПН и обязательные удержания',period:'Октябрь 2026',amount:-78000,hours:null,basis:'Налоговые правила'},
  ],
  payroll_history:[
    {id:crypto.randomUUID(),period:'Октябрь 2026',accrued:565000+i*15000,withheld:78000,paid:487000+i*15000,worked_hours:176,worked_days:22},
    {id:crypto.randomUUID(),period:'Сентябрь 2026',accrued:550000+i*15000,withheld:76000,paid:474000+i*15000,worked_hours:168,worked_days:21},
    {id:crypto.randomUUID(),period:'Август 2026',accrued:548000+i*15000,withheld:75500,paid:472500+i*15000,worked_hours:168,worked_days:21},
  ],
  schedule:{
    schedule_name:i%2?'Пятидневная рабочая неделя':'Сменный график',
    shift:i%3===0?'Смена 1':'Дневная',
    hours_per_week:40,
    timesheet_month:'Октябрь 2026',
    planned_hours:176,
    worked_hours:160-i%3*8,
    production_calendar:'Календарь Республики Казахстан 2026',
    schedule_type:i%2?'Недельный':'Сменный',
    time_accounting:'Суммированный',
    shift_duration:i%2?'8 часов':'12 часов',
    valid_from:'2026-01-01',
    valid_to:null,
    basis:'График сменности на 2026 год',
    night_shifts:i%3===0?'Разрешены':'Не предусмотрены',
    weekend_work:i%3===0?'Разрешена по графику':'Только по приказу',
  },
  leave_summary:{
    entitled_days:24+i%7,
    used_days:3+i%5,
    balance_days:21+i%4,
    planned_until:'2026-12-29',
    settlement_year:'2026',
    work_year_from:'2025-10-01',
    work_year_to:'2026-09-30',
    balance_method:'По рабочему году',
    data_source:'Кадровые процессы',
  },
  leave_limits:[
    {id:crypto.randomUUID(),leave_type:'Основной ежегодный отпуск',accrual_method:'По рабочему году',entitled_days:24,used_days:3,balance_days:21,basis:'Трудовой договор'},
    {id:crypto.randomUUID(),leave_type:'Дополнительный отпуск',accrual_method:'По условиям труда',entitled_days:i%3===0?7:0,used_days:0,balance_days:i%3===0?7:0,basis:i%3===0?'Карта условий труда':'Не применяется'},
  ],
  timesheet_history:[
    {id:crypto.randomUUID(),period:'Октябрь 2026',planned_hours:176,worked_hours:168,deviation_hours:-8,work_days:21,night_hours:i%3===0?24:0,overtime_hours:4,absences_days:1},
    {id:crypto.randomUUID(),period:'Сентябрь 2026',planned_hours:168,worked_hours:168,deviation_hours:0,work_days:21,night_hours:i%3===0?20:0,overtime_hours:2,absences_days:0},
    {id:crypto.randomUUID(),period:'Август 2026',planned_hours:168,worked_hours:164,deviation_hours:-4,work_days:20,night_hours:i%3===0?16:0,overtime_hours:0,absences_days:1},
  ],
  attendance_events:[
    {id:crypto.randomUUID(),event_type:'Смена',reason:'Смена по графику',period:'01.10.2026–31.10.2026',days:21,hours:168,source:'Табель',status:'Подтверждено'},
    {id:crypto.randomUUID(),event_type:'Опоздание',reason:'Транспортная задержка',period:'11.10.2026',days:0,hours:1,source:'Журнал опозданий',status:'Учтено'},
    {id:crypto.randomUUID(),event_type:'Сверхурочная работа',reason:'Производственная необходимость',period:'20.10.2026',days:0,hours:4,source:'Журнал сверхурочных',status:'Подтверждено'},
  ],
  reserve_profile:{
    status:'В резерве',
    match_percent:72+i%20,
    education:'Высшее / профильное',
    learning_plan:'1 программа в плане',
    enabled:'Да',
    target_position:seededPositions[(i+2)%seededPositions.length].name,
    included_on:'2026-01-15',
    review_on:'2026-07-15',
    reserve_level:i%2?'Функциональный':'Корпоративный',
    reserve_type:i%3?'Среднесрочный':'Оперативный',
    basis:'Решение комиссии',
    basis_document:'Протокол кадровой комиссии.pdf',
    comment:'Индивидуальный план развития согласован',
  },
  education:[
    {id:crypto.randomUUID(),education_type:'Высшее образование',organization:'Евразийский национальный университет',started_on:'2006-09-01',ended_on:'2010-06-30',specialization:'Управление и экономика',document_reference:'Диплом.pdf'},
    {id:crypto.randomUUID(),education_type:'Повышение квалификации',organization:'ITP Academy',started_on:'2025-05-10',ended_on:'2025-05-14',specialization:'Управление проектами',document_reference:'Сертификат.pdf'},
  ],
  fit_assessment:[
    {id:crypto.randomUUID(),criterion:'Стаж в текущей должности',requirement:'от 3 лет',fact:'5 лет 4 месяца',score_percent:100,recommendation:'Соответствует'},
    {id:crypto.randomUUID(),criterion:'Профильное образование',requirement:'Высшее профильное',fact:'Высшее профильное',score_percent:100,recommendation:'Соответствует'},
    {id:crypto.randomUUID(),criterion:'Квалификация',requirement:'Уровень не ниже 4',fact:'Уровень 3',score_percent:75,recommendation:'Повысить квалификацию'},
  ],
  documents:[
    {id:id(9000+i*10),title:'Трудовой договор',number:`TD-${2022+i%4}-${120+i}`,issued_on:e.current_assignment_valid_from||'2024-01-15',status:'Действует',document_type:'Трудовой договор',file_name:'Трудовой договор.pdf'},
    {id:id(9001+i*10),title:'Приказ о приёме',number:`HR-${120+i}`,issued_on:e.current_assignment_valid_from||'2024-01-15',status:'Подписан',document_type:'Приказ',file_name:'Приказ о приёме.pdf'},
    {id:id(9002+i*10),title:'Удостоверение личности',number:`ID-${450000+i}`,issued_on:'2023-04-18',status:'Действует',document_type:'Личный документ',file_name:'Удостоверение личности.pdf'},
    {id:id(9003+i*10),title:'Согласие на обработку персональных данных',number:`PD-${210+i}`,issued_on:'2026-01-10',status:'Действует',document_type:'Согласие',file_name:'Согласие.pdf'},
  ],
  history:[
    ...(employeeChanges.get(e.id) ?? []).map((item:any)=>({...item,section:'Карточка сотрудника',before:'—',after:'Обновлено',result:'Изменение сохранено'})),
    ...actions.filter((a:any)=>a.employee_id===e.id).slice(0,8).map((a:any)=>({
      id:a.id,
      action:a.action_type==='hire'?'Оформлен приём на работу':a.action_type==='transfer'?'Оформлен перевод':'Оформлено увольнение',
      actor:'HR-служба',
      created_at:a.created_at,
      section:'Трудовые данные',
      before:a.source_position_name??'—',
      after:a.target_position_name??'—',
      result:'Кадровое действие применено',
    })),
    {id:id(9500+i*10),action:'Карточка сотрудника создана',actor:'HR-служба',created_at:'2024-01-15T09:20:00+05:00',section:'Личные данные',before:'—',after:'Карточка создана',result:'Успешно'},
    {id:id(9501+i*10),action:'Обновлены контактные данные',actor:'HR-менеджер',created_at:'2026-06-03T14:10:00+05:00',section:'Личные данные',before:'Старые контакты',after:'Актуальные контакты',result:'Успешно'},
    {id:id(9502+i*10),action:'Обновлено организационное назначение',actor:'HR-служба',created_at:'2026-09-01T10:40:00+05:00',section:'Организационные данные',before:'Предыдущее назначение',after:e.current_position_name??'Назначение',result:'Успешно'},
  ],
})
const directoryHubRows:any[]=[
  {id:id(9801),group:'tariff-types',parent_id:null,code:'TRF-TYPE-001',name:'По грузам',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9802),group:'tariff-types',parent_id:id(9801),code:'TRF-TYPE-002',name:'Навалочные грузы',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9850),group:'tariff-types',parent_id:id(9802),code:'TRF-TYPE-003',name:'Силикомарганец навалом РТК №043',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9851),group:'tariff-types',parent_id:id(9802),code:'TRF-TYPE-004',name:'Кварцевый песок навалом РТК №001',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9852),group:'tariff-types',parent_id:id(9802),code:'TRF-TYPE-005',name:'2025. Сахар-сырец РТК №033.2',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9853),group:'tariff-types',parent_id:id(9802),code:'TRF-TYPE-006',name:'2025. Зерновые грузы РТК №013.3',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9854),group:'tariff-types',parent_id:id(9801),code:'TRF-TYPE-007',name:'Груз в мешках',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9855),group:'tariff-types',parent_id:id(9801),code:'TRF-TYPE-008',name:'Наливные жидкости',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9856),group:'tariff-types',parent_id:null,code:'TRF-TYPE-009',name:'Дополнительные работы',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9857),group:'tariff-types',parent_id:null,code:'TRF-TYPE-010',name:'Доплаты',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9858),group:'tariff-types',parent_id:null,code:'TRF-TYPE-011',name:'Внутрипортовые работы',category:'Тариф',unit:null,value:null,status:'active',revision:1},
  {id:id(9810),group:'leave-types',code:'LEAVE-ANNUAL',name:'Ежегодный оплачиваемый отпуск',category:'Отпуск',unit:'дней',value:'24',status:'active',revision:1},
  {id:id(9820),group:'work-conditions',code:'WC-NORMAL',name:'Нормальные условия труда',category:'Условия труда',unit:'—',value:null,status:'active',revision:1},
  {id:id(9830),group:'training-types',code:'TRN-INT',name:'Внутреннее обучение',category:'Обучение',unit:'—',value:null,status:'active',revision:1},
  {id:id(9840),group:'document-types',code:'DOC-ORDER',name:'Приказ',category:'Документ',unit:'—',value:null,status:'active',revision:1},
]
const page=(rows:any[],p:number,per=25,extra={})=>({data:structuredClone(rows.slice((p-1)*per,p*per)),meta:{current_page:p,last_page:Math.max(1,Math.ceil(rows.length/per)),per_page:per,total:rows.length,...extra}})
const json=(o:any)=>JSON.stringify(o)
export async function mockApiRequest<T>(path:string,options:RequestInit={}):Promise<T>{
  await new Promise(r=>setTimeout(r,80))
  const method=(options.method||'GET').toUpperCase(),u=new URL(path,'https://demo.local'),p=u.pathname
  if(p==='/health') return {status:'ok',service:'itp-hrm-api'} as T
  if(p==='/companies') return page([{id:companyId,name:'ITP HRM Demo',role_code:'company_admin',department_scopes:[]}],1,100,{role_management_enabled:true}) as T
  const scopedCompany=p.match(/^\/companies\/([^/]+)(?:\/|$)/)
  if(scopedCompany&&scopedCompany[1]!==companyId)throw new Error('Компания недоступна')
  // Explicit demo-only projection for the ZIP's monthly attendance card.
  // These synthetic minutes never cross into the connected Laravel environment.
  const employeeMonthMatch=p.match(/^\/companies\/[^/]+\/worktime\/employees\/([^/]+)\/monthly-summary$/)
  if(employeeMonthMatch&&method==='GET'){
    const employeeId=employeeMonthMatch[1],month=u.searchParams.get('month')
    if(!employees.some(e=>e.id===employeeId))throw new Error('Сотрудник не найден')
    if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Некорректный период')
    const sample=employeeId===employees[0].id
      ? [[1,480,480,0,0],[2,480,420,60,30],[6,480,480,0,0],[7,480,0,480,0],[9,480,480,0,90]]
      : []
    const days=sample.map(([day,planned,worked,absence,overtime])=>({
      date:month+'-'+String(day).padStart(2,'0'),planned_minutes:planned,worked_minutes:worked,
      absence_minutes:absence,overtime_minutes:overtime,
    }))
    const sum=(key:string)=>days.length?days.reduce((total,row)=>total+Number((row as any)[key]),0):null
    return {data:{
      employee_id:employeeId,month,
      summary:{
        days_recorded:days.length,present_days:days.length?days.filter(d=>d.worked_minutes>0).length:null,
        planned_minutes:sum('planned_minutes'),worked_minutes:sum('worked_minutes'),
        absence_minutes:sum('absence_minutes'),overtime_minutes:sum('overtime_minutes'),
        lateness_minutes:null,
      },days,
    },meta:{source:'worktime_entries',read_only:true,recorded_days:days.length,calendar_days:new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate()}} as T
  }
  const demoRoleResult=tryDemoRoleApi(p,method,u.searchParams,options.body,{departments:deps.map(d=>({id:d.id,name:String(d.name??'')})),employees})
  if(demoRoleResult.handled)return demoRoleResult.response as T
  let m=p.match(/^\/companies\/[^/]+\/directories\/([^/]+)(?:\/([^/]+))?$/)
  if(m){
    const group=decodeURIComponent(m[1]),recordId=m[2],body=options.body?JSON.parse(String(options.body)):{}
    const rows=directoryHubRows.filter(row=>row.group===group)
    if(method==='GET'&&!recordId)return {data:structuredClone(rows),meta:{group,writes_enabled:true}} as T
    if(method==='POST'&&!recordId){
      const code=String(body.code||'').trim(),name=String(body.name||'').trim()
      if(!code||!name)throw new Error('Код и наименование обязательны')
      if(rows.some(row=>row.code.toLowerCase()===code.toLowerCase()))throw new Error('Такая запись уже существует')
      const parentId=body.parent_id??null
      if(parentId!==null&&!rows.some(row=>row.id===parentId))throw new Error('Родитель должен принадлежать справочнику')
      const created:any={id:crypto.randomUUID(),group,parent_id:parentId,code,name,category:body.category??null,unit:body.unit??null,value:body.value??null,status:body.status??'active',revision:1}
      directoryHubRows.push(created);return {data:structuredClone(created)} as T
    }
    const record:any=directoryHubRows.find(row=>row.group===group&&row.id===recordId)
    if(!record)throw new Error('Запись не найдена')
    if(Number(body.revision)!==Number(record.revision))throw new Error('Запись уже изменена. Обновите страницу')
    if(method==='PUT'){
      const parentId=body.parent_id??null
      const seen=new Set([record.id])
      let cursor=parentId
      while(cursor){
        if(seen.has(cursor))throw new Error('Циклическая иерархия')
        seen.add(cursor)
        const parent=rows.find(row=>row.id===cursor)
        if(!parent)throw new Error('Родитель должен принадлежать справочнику')
        cursor=parent.parent_id??null
      }
      Object.assign(record,{parent_id:parentId,code:String(body.code||'').trim(),name:String(body.name||'').trim(),category:body.category??null,unit:body.unit??null,value:body.value??null,status:body.status??'active',revision:record.revision+1})
      return {data:structuredClone(record)} as T
    }
    if(method==='DELETE'){
      if(rows.some(row=>row.parent_id===record.id))throw new Error('Сначала удалите дочерние записи')
      directoryHubRows.splice(directoryHubRows.indexOf(record),1);return undefined as T
    }
  }
  m=p.match(/^\/companies\/[^/]+\/employees$/)
  if(m&&method==='POST'){
    const body=options.body?JSON.parse(String(options.body)):{}
    const nextIndex=employees.length
    const employee:any={
      id:id(1000+nextIndex),
      personnel_number:String(body.personnel_number||`EMP-${String(nextIndex+1).padStart(4,'0')}`),
      last_name:String(body.last_name||'Новый'),
      first_name:String(body.first_name||'Сотрудник'),
      middle_name:body.middle_name??null,
      revision:1,
      birth_date:body.birth_date??null,
      gender:body.gender??null,
      email:body.email??null,
      phone:body.phone??null,
      address:body.address??null,
      work_site:body.work_site??null,
      work_zone:body.work_zone??null,
      work_team:body.work_team??null,
      supervisor_name:body.supervisor_name??null,
      employee_category:'Специалисты',
      personnel_type:'Офисный',
      contract_type:'Бессрочный',
      current_department_name:null,
      current_position_name:null,
      current_department_id:null,
      current_position_id:null,
      current_assignment_valid_from:null,
      employment_status:'unassigned',
    }
    employees.unshift(employee)
    recordEmployeeChange(employee.id, 'personnel.employee_created')
    return {data:employee} as T
  }

  m=p.match(/^\/companies\/[^/]+\/documents$/)
  if(m&&method==='POST'){
    const body=options.body?JSON.parse(String(options.body)):{}
    const employee:any=employees.find(x=>x.id===body.employee_id)
    if(!employee)throw new Error('Сотрудник не найден')
    if(body.personnel_action_id && !actions.some((x:any)=>x.id===body.personnel_action_id&&x.employee_id===employee.id))
      throw new Error('Кадровое действие не относится к сотруднику')
    const document:any={
      id:id(5500+documents.length),
      employee_id:employee.id,
      personnel_action_id:body.personnel_action_id??null,
      document_type:body.document_type,
      document_number:body.document_number??null,
      title:String(body.title||'Документ'),
      issued_on:body.issued_on??null,
      status:'draft',
      revision:1,
      created_at:new Date().toISOString(),
      personnel_number:employee.personnel_number,
      first_name:employee.first_name,
      last_name:employee.last_name,
      has_file:false,
    }
    documents.unshift(document)
    return {data:{id:document.id,employee_id:document.employee_id,document_type:document.document_type,status:'draft',revision:1}} as T
  }

// The demo must behave like a real CRUD flow. Never acknowledge a write unless
  // the corresponding in-memory record was changed and can be read back.
  m=p.match(/^\/companies\/[^/]+\/(departments|positions)(?:\/([^/]+))?$/)
  if(m&&method!=='GET'){
    const kind=m[1],recordId=m[2],body=options.body?JSON.parse(String(options.body)):{}
    const rows:any[]=kind==='departments'?deps:positions
    const name=typeof body.name==='string'?body.name.trim():''
    if(method==='POST'&&!recordId){
      if(!name)throw new Error(kind==='departments'?'Введите название подразделения':'Введите название должности')
      const parentId=kind==='departments'?body.parent_id??null:null
      if(kind==='departments'&&parentId!==null&&!deps.some(dep=>dep.id===parentId))
        throw new Error('Родительское подразделение не найдено')
      if(rows.some(row=>row.name.toLowerCase()===name.toLowerCase()&&
        (kind==='positions'||row.parent_id===parentId)))
        throw new Error('Такая запись уже существует')
      const created:any=kind==='departments'
        ? {id:crypto.randomUUID(),name,parent_id:parentId,revision:1}
        : {id:crypto.randomUUID(),name,revision:1}
      rows.push(created)
      saveDemoDirectories()
      return {data:{...created}} as T
    }
    if((method==='PUT'||method==='DELETE')&&recordId){
      const record:any=rows.find(row=>row.id===recordId)
      if(!record)throw new Error('Запись не найдена')
      if(Number(body.revision)!==Number(record.revision))
        throw new Error('Запись уже изменена. Обновите страницу')
      if(method==='DELETE'){
        const planLines=Array.from(staffingByPlan.values()).flat()
        const referenced=kind==='departments'
          ? deps.some(dep=>dep.parent_id===recordId)
            || employees.some(employee=>employee.current_department_id===recordId)
            || planLines.some(line=>line.department_id===recordId)
          : employees.some(employee=>employee.current_position_id===recordId)
            || planLines.some(line=>line.position_id===recordId)
        if(referenced)throw new Error(kind==='departments'
          ? 'Подразделение используется в структуре, назначениях или штатном расписании'
          : 'Должность используется в назначениях или штатном расписании')
        rows.splice(rows.indexOf(record),1)
        saveDemoDirectories()
        return {data:{id:recordId}} as T
      }
      if(!name)throw new Error('Название не может быть пустым')
      const parentId=kind==='departments'?body.parent_id??null:null
      if(kind==='departments'&&parentId!==null){
        if(!deps.some(dep=>dep.id===parentId))throw new Error('Родительское подразделение не найдено')
        const visited=new Set<string>([recordId])
        let cursor:string|null=parentId
        while(cursor!==null){
          if(visited.has(cursor))throw new Error('Нельзя перенести подразделение в собственную ветку')
          visited.add(cursor)
          cursor=deps.find(dep=>dep.id===cursor)?.parent_id??null
        }
      }
      if(rows.some(row=>row.id!==recordId&&row.name.toLowerCase()===name.toLowerCase()&&
        (kind==='positions'||row.parent_id===parentId)))
        throw new Error('Такая запись уже существует')
      record.name=name
      if(kind==='departments')record.parent_id=parentId
      record.revision+=1
      // Labels on assignments and staffing must match their directory records.
      for(const employee of employees){
        if(kind==='departments'&&employee.current_department_id===recordId)
          employee.current_department_name=name
        if(kind==='positions'&&employee.current_position_id===recordId)
          employee.current_position_name=name
      }
      for(const lines of staffingByPlan.values())for(const line of lines){
        if(kind==='departments'&&line.department_id===recordId)line.department_name=name
        if(kind==='positions'&&line.position_id===recordId)line.position_name=name
      }
      saveDemoDirectories()
      return {data:{...record}} as T
    }
    throw new Error('Действие со справочником не поддерживается')
  }
  m=p.match(/^\/companies\/[^/]+\/(departments|positions|employees|personnel-actions|documents)$/)
  if(m&&method==='GET'){const pg=Number(u.searchParams.get('page')||1),kind=m[1];let rows:any[]=kind==='departments'?deps:kind==='positions'?positions:kind==='employees'?employees:kind==='personnel-actions'?actions:documents
    if(kind==='employees'){const q=(u.searchParams.get('search')||'').toLowerCase(),s=u.searchParams.get('status')||'all';rows=rows.filter((x:any)=>(s==='all'||x.employment_status===s)&&(!q||json(x).toLowerCase().includes(q)))}
    if(kind==='personnel-actions'&&u.searchParams.get('type'))rows=rows.filter((x:any)=>x.action_type===u.searchParams.get('type'))
    if(kind==='personnel-actions'&&u.searchParams.get('employee_id'))rows=rows.filter((x:any)=>x.employee_id===u.searchParams.get('employee_id'))
    if(kind==='documents'&&u.searchParams.get('document_type'))rows=rows.filter((x:any)=>x.document_type===u.searchParams.get('document_type'))
    if(kind==='documents'&&u.searchParams.get('employee_id'))rows=rows.filter((x:any)=>x.employee_id===u.searchParams.get('employee_id'))
    const extra:any=kind==='departments'?{department_writes_enabled:true}:kind==='positions'?{position_writes_enabled:true}:kind==='employees'?{employee_writes_enabled:true,status_filter:u.searchParams.get('status')||'all',registry_summary:{vacancies:demoStaffingRowsAt(staffing,new Date().toISOString().slice(0,10)).reduce((sum:any,row:any)=>sum+Number(row.vacant_units),0),expiring_contracts:null}}:kind==='personnel-actions'?{personnel_actions_writes_enabled:true,summary:{hire:actions.filter((x:any)=>x.action_type==='hire').length,transfer:actions.filter((x:any)=>x.action_type==='transfer').length,termination:actions.filter((x:any)=>x.action_type==='termination').length}}:{document_writes_enabled:true}
    const defaultSize=kind==='employees'||kind==='personnel-actions'||kind==='documents'?25:100
    const requestedSize=Number(u.searchParams.get('per_page')||defaultSize)
    const actualSize=Number.isSafeInteger(requestedSize)&&requestedSize>=1&&requestedSize<=100?requestedSize:defaultSize
    return page(rows,pg,actualSize,extra) as T}
  m=p.match(/^\/companies\/[^/]+\/documents\/([^/]+)\/file$/)
  if(m&&method==='POST'){
    const document:any=documents.find(x=>x.id===m![1])
    if(!document)throw new Error('Документ не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    if(document.status!=='draft'||document.has_file)throw new Error('PDF уже прикреплён или документ недоступен')
    if(Number(body.revision)!==Number(document.revision))throw new Error('Документ уже изменён')
    document.has_file=true
    document.revision=Number(document.revision)+1
    return {data:{id:document.id,has_file:true,revision:document.revision}} as T
  }

  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/private-records\/address(?:\/([^/]+))?$/)
  if(m){
    const employeeId=m[1],recordId=m[2]
    if(!employees.some(e=>e.id===employeeId))throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    const rows=demoAddresses.get(employeeId)??[]
    const existing=recordId?rows.find(row=>row.id===recordId&&!row.archived):null
    if(method==='POST'||method==='PUT'){
      if((method==='POST'&&recordId)||(method==='PUT'&&!existing))
        throw new Error('Адрес недоступен')
      const allowed=new Set(['kind','address_line','entrance','floor','apartment','is_primary',...(method==='PUT'?['revision']:[])])
      if(Object.keys(body).some(key=>!allowed.has(key))
        ||!['residence','registration','other'].includes(body.kind)
        ||typeof body.address_line!=='string'||!body.address_line.trim()
        ||body.address_line.length>500||typeof body.is_primary!=='boolean'
        ||['entrance','floor','apartment'].some(key=>body[key]!==null&&
          (typeof body[key]!=='string'||body[key].length>(key==='floor'?20:40))))
        throw new Error('Некорректные данные адреса')
      if(method==='PUT'&&Number(existing.revision)!==Number(body.revision))
        throw new Error('Адрес изменён другим пользователем')
      if(body.is_primary)for(const row of rows)if(!row.archived&&row.is_primary&&row.id!==recordId){
        row.is_primary=false;row.revision++
      }
      const result=existing??{id:crypto.randomUUID(),revision:0,archived:false}
      Object.assign(result,{kind:body.kind,address_line:body.address_line.trim(),
        entrance:body.entrance,floor:body.floor,apartment:body.apartment,
        is_primary:body.is_primary,revision:result.revision+1})
      if(!existing){rows.push(result);demoAddresses.set(employeeId,rows)}
      recordEmployeeChange(employeeId,'personnel.private_record_'+(method==='POST'?'created':'updated'))
      return {data:{id:result.id,revision:result.revision}} as T
    }
    if(method==='DELETE'&&existing){
      if(Number(body.revision)!==Number(existing.revision))throw new Error('Адрес изменён')
      existing.archived=true;existing.revision++
      recordEmployeeChange(employeeId,'personnel.private_record_archived')
      return {data:{id:existing.id,revision:existing.revision,archived:true}} as T
    }
    throw new Error('Адрес недоступен')
  }

  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/photo$/)
  if (m && ['POST', 'DELETE'].includes(method)) {
    const employee:any=employees.find(x=>x.id===m![1])
    if (!employee) throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    if (body.revision!==employee.revision) throw new Error('Карточка уже изменена. Обновите её')
    employee.revision++
    employee.has_photo=method==='POST'
    recordEmployeeChange(employee.id, method==='POST'?'personnel.employee_photo_updated':'personnel.employee_photo_removed')
    return {data:{has_photo:employee.has_photo,revision:employee.revision}} as T
  }
  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)$/)
  if(m&&method==='PUT'){
    const e:any=employees.find(x=>x.id===m![1])
    if(!e)throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    if (body.revision !== e.revision) throw new Error('Запись уже изменена. Обновите карточку перед сохранением')
    Object.assign(e,body,{revision:Number(e.revision||1)+1})
    recordEmployeeChange(e.id, 'personnel.employee_updated')
    return {data:e} as T
  }
  if(m&&method==='GET'){
    const e:any=employees.find(x=>x.id===m![1])
    if(!e)throw new Error('Сотрудник не найден')
    const ei=employees.indexOf(e)
    return structuredClone({
      data:{...e,has_photo:!!getDemoEmployeePhoto(e.id)},
      assignments:assignmentByEmployee.get(e.id)??[],
      experience:experienceByEmployee.get(e.id)??[],
      reserve:employeeReserve(e,ei),
      training:employeeTraining(e,ei),
      reference_profile:referenceProfileFor(e,ei),
      private_profile:{addresses:structuredClone(addressesFor(e.id)),
        identity_documents:structuredClone(demoIdentityDocuments.get(e.id)??[])},
      meta:{assignments_limit:50,assignments_truncated:false,extended_sections_visible:true,
        profile_writes_enabled:true,assignment_writes_enabled:true,employee_writes_enabled:true,
        private_address_writes_enabled:true,private_addresses_truncated:false},
    }) as T
  }
  // The same employee-card forms used against Laravel must actually mutate demo
  // state, rather than returning a generic success without any saved record.
  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/profile\/(experience|reserve|training)(?:\/([^/]+))?$/)
  if(m&&['POST','PUT'].includes(method)){
    const employee:any=employees.find(x=>x.id===m![1])
    if(!employee)throw new Error('Сотрудник не найден')
    const section=m[2],recordId=m[3]
    const body=options.body?JSON.parse(String(options.body)):{}
    const rows:any[]=section==='experience'
      ?(experienceByEmployee.get(employee.id)??[]):section==='training'?training:reserve
    const existing:any=recordId?rows.find(x=>x.id===recordId&&
      (section==='experience'||x.employee_id===employee.id)):null
    const fallback:any=recordId&&!existing&&section!=='experience'
      ?(section==='training'?fallbackTraining(employee,employees.indexOf(employee))
        :fallbackReserve(employee,employees.indexOf(employee))):null
    const record:any=existing??(fallback?.id===recordId?fallback:null)
    if(method==='PUT'){
      if(!recordId||!record)throw new Error('Запись не найдена')
      if(Number(body.revision)!==Number(record.revision))
        throw new Error('Запись уже изменена. Обновите карточку перед сохранением')
    }else if(recordId)throw new Error('Некорректный адрес создания записи')
    if(section==='experience'&&(!body.experience_type||!body.started_on))
      throw new Error('Укажите вид стажа и дату начала')
    if(section==='training'&&(!body.training_type||!body.training_mode||!body.topic||!body.started_on))
      throw new Error('Заполните обязательные данные обучения')
    if(section==='reserve'&&(!body.target_position||!body.reserve_level||!body.reserve_type||!body.joined_year))
      throw new Error('Заполните обязательные данные кадрового резерва')
    if(body.started_on&&body.ended_on&&body.ended_on<body.started_on)
      throw new Error('Дата окончания раньше даты начала')
    if(section==='reserve'&&body.left_year&&Number(body.left_year)<Number(body.joined_year))
      throw new Error('Год выхода раньше года зачисления')
    const next:any={
      ...(record??{}),...body,
      id:record?.id??crypto.randomUUID(),
      employee_id:employee.id,
      revision:record?Number(record.revision)+1:1,
      personnel_number:employee.personnel_number,
      last_name:employee.last_name,first_name:employee.first_name,middle_name:employee.middle_name,
    }
    if(section==='training')next.development_status=next.ended_on?'completed':next.started_on>new Date().toISOString().slice(0,10)?'planned':'ongoing'
    if(section==='reserve')next.development_status=next.left_year?'alumni':'active'
    if(record){
      if(existing)Object.assign(existing,next)
      else rows.push(next)
    }else rows.push(next)
    if(section==='experience')experienceByEmployee.set(employee.id,rows)
    recordEmployeeChange(employee.id,record?'personnel.profile_record_updated':'personnel.profile_record_created')
    return {data:{id:next.id,section,revision:next.revision}} as T
  }
  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/assignments(?:\/([^/]+))?(?:\/(transition))?$/)
  if(m&&['POST','PUT'].includes(method)){
    const employee:any=employees.find(x=>x.id===m![1])
    if(!employee)throw new Error('Сотрудник не найден')
    const recordId=m[2],isTransition=m[3]==='transition'
    const body=options.body?JSON.parse(String(options.body)):{}
    const rows:any[]=assignmentByEmployee.get(employee.id)??[]
    const current:any=recordId?rows.find(x=>x.id===recordId):null
    if(recordId&&!current)throw new Error('Назначение не найдено')
    if(method==='PUT'&&(!recordId||isTransition))throw new Error('Некорректная операция назначения')
    if(method==='POST'&&recordId&&!isTransition)throw new Error('Некорректная операция назначения')
    if(current&&Number(body.revision)!==Number(current.revision))
      throw new Error('Назначение уже изменено. Обновите карточку')
    if(isTransition&&(current.valid_to!==null||body.valid_from<=current.valid_from))
      throw new Error('Укажите новую дату после начала действующего назначения')
    const dep:any=deps.find(x=>x.id===body.department_id)
    const pos:any=positions.find(x=>x.id===body.position_id)
    if(!dep||!pos||!/^\d{4}-\d{2}-\d{2}$/.test(body.valid_from??''))
      throw new Error('Выберите подразделение, должность и дату')
    const period={valid_from:body.valid_from,valid_to:body.valid_to??null}
    if(period.valid_to&&period.valid_to<period.valid_from)
      throw new Error('Дата окончания раньше даты начала')
    const conflicts=rows.some(row=>row.id!==recordId&&overlaps(row,period))
    if(conflicts)throw new Error('Период пересекается с существующим назначением')
    if(isTransition&&rows.some(row=>row.id!==recordId&&row.valid_from>=period.valid_from))
      throw new Error('Существует более позднее назначение')
    const next:any={
      ...(method==='PUT'?current:{}),
      id:method==='PUT'?current.id:crypto.randomUUID(),
      department_id:dep.id,position_id:pos.id,
      department_name:dep.name,position_name:pos.name,
      valid_from:period.valid_from,valid_to:period.valid_to,
      basis_reference:body.basis_reference??null,
      revision:method==='PUT'?Number(current.revision)+1:1,
    }
    if(isTransition){
      const dayBefore=new Date(Date.parse(period.valid_from+'T00:00:00Z')-86_400_000).toISOString().slice(0,10)
      if(current.valid_from>dayBefore)throw new Error('Дата перевода раньше текущего назначения')
      current.valid_to=dayBefore
      current.revision+=1
      rows.push(next)
      syncCurrentAssignment(employee,next)
      assignmentByEmployee.set(employee.id,rows)
      recordEmployeeChange(employee.id,'personnel.assignment_transitioned')
      return {data:{closed_assignment:structuredClone(current),new_assignment:structuredClone(next)}} as T
    }
    if(method==='PUT')Object.assign(current,next)
    else rows.push(next)
    assignmentByEmployee.set(employee.id,rows)
    if(!period.valid_to)syncCurrentAssignment(employee,next)
    recordEmployeeChange(employee.id,method==='PUT'?'personnel.assignment_updated':'personnel.assignment_created')
    return {data:{id:next.id,employee_id:employee.id,valid_from:next.valid_from,valid_to:next.valid_to,revision:next.revision}} as T
  }

  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/personnel-actions\/(hire|transfer|terminate)$/)
  if(m&&method==='POST'){
    const employee:any=employees.find(x=>x.id===m![1])
    if(!employee)throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    const operation=m[2]
    const sourceDepartmentName=employee.current_department_name??null
    const sourcePositionName=employee.current_position_name??null
    const assignmentRows:any[]=assignmentByEmployee.get(employee.id)??[]
    const openAssignment:any=assignmentRows.find(row=>row.valid_to===null)??null
    const sourceAssignmentId=openAssignment?.id??null
    if(!/^\d{4}-\d{2}-\d{2}$/.test(body.effective_on??''))
      throw new Error('Укажите корректную дату кадрового действия')
    if(operation==='hire'&&openAssignment)throw new Error('Сотрудник уже имеет активное назначение')
    if(operation!=='hire'&&!openAssignment)throw new Error('У сотрудника нет действующего назначения')
    if(openAssignment&&body.effective_on<=openAssignment.valid_from)
      throw new Error('Дата действия должна быть позже начала назначения')
    const dayBefore=openAssignment
      ?new Date(Date.parse(body.effective_on+'T00:00:00Z')-86_400_000).toISOString().slice(0,10):null
    let targetDepartmentName:string|null=null
    let targetPositionName:string|null=null
    let targetAssignmentId:string|null=null
    let newAssignment:any=null
    if(operation!=='terminate'){
      const dep:any=deps.find(x=>x.id===body.department_id)
      const pos:any=positions.find(x=>x.id===body.position_id)
      if(!dep||!pos)throw new Error('Подразделение или должность не найдены')
      targetDepartmentName=dep.name
      targetPositionName=pos.name
      newAssignment={
        id:crypto.randomUUID(),department_id:dep.id,position_id:pos.id,
        department_name:dep.name,position_name:pos.name,
        valid_from:body.effective_on,valid_to:null,basis_reference:body.basis_reference??null,revision:1,
      }
      targetAssignmentId=newAssignment.id
    }
    if(openAssignment){openAssignment.valid_to=dayBefore;openAssignment.revision++}
    if(newAssignment)assignmentRows.push(newAssignment)
    assignmentByEmployee.set(employee.id,assignmentRows)
    syncCurrentAssignment(employee,newAssignment,newAssignment?'active':'archived')
    recordEmployeeChange(employee.id,'personnel.action_'+operation)
    const actionType=operation==='terminate'?'termination':operation
    const action:any={
      id:id(3300+actions.length),
      employee_id:employee.id,
      action_type:actionType,
      effective_on:body.effective_on,
      basis_reference:body.basis_reference,
      notes:body.notes??null,
      source_assignment_id:operation==='hire'?null:sourceAssignmentId,
      target_assignment_id:targetAssignmentId,
      personnel_number:employee.personnel_number,
      last_name:employee.last_name,
      first_name:employee.first_name,
      middle_name:employee.middle_name,
      source_department_name:operation==='hire'?null:sourceDepartmentName,
      source_position_name:operation==='hire'?null:sourcePositionName,
      target_department_name:targetDepartmentName,
      target_position_name:targetPositionName,
      created_at:new Date().toISOString(),
    }
    actions.unshift(action)
    return {data:action} as T
  }

  m=p.match(/^\/companies\/[^/]+\/staffing-plans\/([^/]+)\/lines\/([^/]+)$/)
  if(m&&method==='PUT'){
    const selected=staffingPlans.find((x:any)=>x.id===m![1])
    if(!selected||selected.status!=='draft')throw new Error('Утверждённое штатное расписание нельзя изменять')
    const rows=staffingByPlan.get(selected.id)??[]
    const line:any=rows.find((x:any)=>x.id===m![2])
    if(!line)throw new Error('Строка штатного расписания не найдена')
    const body=options.body?JSON.parse(String(options.body)):{}
    if(Number(body.revision)!==Number(line.revision))
      throw new Error('Штатная позиция уже изменена. Обновите страницу')
    const fields=demoStaffingLinePayload(body,rows,line.id)
    Object.assign(line,fields,{revision:Number(line.revision)+1})
    line.vacant_units=Math.max(Number(line.planned_units)-Number(line.occupied_units||0),0)
    line.overstaffed_units=Math.max(Number(line.occupied_units||0)-Number(line.planned_units),0)
    recordStaffingEvent('staffing.plan_line_updated',selected.id,line.id,line.revision)
    return {data:{id:line.id,revision:line.revision}} as T
  }

  m=p.match(/^\/companies\/[^/]+\/staffing-plans\/([^/]+)\/lines$/)
  if(m&&method==='POST'){
    const selected=staffingPlans.find((x:any)=>x.id===m![1])
    if(!selected||selected.status!=='draft')throw new Error('Утверждённое штатное расписание нельзя изменять')
    const rows=staffingByPlan.get(selected.id)??[]
    const body=options.body?JSON.parse(String(options.body)):{}
    const fields=demoStaffingLinePayload(body,rows,null)
    const line:any={
      id:crypto.randomUUID(),...fields,occupied_units:0,
      vacant_units:fields.planned_units,overstaffed_units:0,revision:1,
    }
    rows.push(line)
    staffingByPlan.set(selected.id,rows)
    recordStaffingEvent('staffing.plan_line_created',selected.id,line.id,1)
    return {data:{id:line.id,staffing_plan_id:selected.id,revision:1}} as T
  }

  m=p.match(/^\/companies\/[^/]+\/staffing-plans\/([^/]+)\/approve$/)
  if(m&&method==='POST'){
    const selected=staffingPlans.find((x:any)=>x.id===m![1])
    if(!selected||selected.status!=='draft')throw new Error('Версия уже утверждена')
    const body=options.body?JSON.parse(String(options.body)):{}
    if(Number(body.revision)!==Number(selected.revision))
      throw new Error('Версия штатного расписания уже изменена. Обновите данные')
    if(!(staffingByPlan.get(selected.id)?.length))throw new Error('Добавьте хотя бы одну строку')
    const overlapsApproved=staffingPlans.some((other:any)=>
      other.id!==selected.id&&other.status==='approved'&&
      other.valid_from<=(selected.valid_to??'9999-12-31')&&
      (other.valid_to??'9999-12-31')>=selected.valid_from)
    if(overlapsApproved)throw new Error('Период пересекается с утверждённым расписанием')
    selected.status='approved'
    selected.revision=Number(selected.revision)+1
    recordStaffingEvent('staffing.plan_approved',selected.id,null,selected.revision)
    return {data:{id:selected.id,status:'approved',revision:selected.revision}} as T
  }

  m=p.match(/^\/companies\/[^/]+\/staffing-plans(?:\/([^/]+))?$/)
  if(m&&method==='POST'&&!m[1]){
    const body=options.body?JSON.parse(String(options.body)):{}
    const name=typeof body.name==='string'?body.name.trim():''
    const from=body.valid_from
    const to=body.valid_to??null
    if(!name||name.length>255||typeof from!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(from)||
      (to!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<from)))
      throw new Error('Укажите название и корректный период штатного расписания')
    const created:any={
      id:crypto.randomUUID(),name,valid_from:from,valid_to:to,status:'draft',revision:1,
    }
    staffingPlans.unshift(created)
    staffingByPlan.set(created.id,[])
    recordStaffingEvent('staffing.plan_created',created.id,null,1)
    return {data:{...created}} as T
  }
  if(m&&method==='GET'){
    if(m[1]){
      const selected=staffingPlans.find((x:any)=>x.id===m![1])
      if(!selected)throw new Error('Версия штатного расписания не найдена')
      const asOf=u.searchParams.get('as_of')||new Date().toISOString().slice(0,10)
      const parsed=Date.parse(asOf+'T00:00:00Z')
      if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!Number.isFinite(parsed)
        ||new Date(parsed).toISOString().slice(0,10)!==asOf)
        throw new Error('Укажите корректную дату среза')
      return structuredClone({data:selected,lines:demoStaffingRowsAt(staffingByPlan.get(selected.id)??[],asOf),meta:{
        as_of:asOf,staffing_writes_enabled:selected.status==='draft',
      }}) as T
    }
    const pg=Number(u.searchParams.get('page')||1)
    return page([...staffingPlans].sort((a:any,b:any)=>b.valid_from.localeCompare(a.valid_from)),pg,25,{staffing_writes_enabled:true}) as T
  }
  if(p===`/companies/${companyId}/staffing-history`&&method==='GET'){
    const pg=Number(u.searchParams.get('page')||1)
    return page(staffingHistory,pg,25) as T
  }
  m=p.match(/^\/companies\/[^/]+\/development\/(training|reserve)$/)
  if(m){const rows=(m[1]==='training'?training:reserve).filter((x:any)=>{const s=u.searchParams.get('status')||'all',q=(u.searchParams.get('search')||'').toLowerCase();return(s==='all'||x.development_status===s)&&(!q||json(x).toLowerCase().includes(q))}),all=m[1]==='training'?training:reserve;const summary:any={total:all.length};for(const x of all as any[])summary[x.development_status]=(summary[x.development_status]||0)+1;const res:any=page(rows,Number(u.searchParams.get('page')||1),25,{section:m[1],status_filter:u.searchParams.get('status')||'all',summary,profile_writes_enabled:true});return res as T}
  if(method!=='GET')throw new Error('Операция недоступна в демонстрационной версии')
  throw new Error(`Demo API route not implemented: ${path}`)
}
