const companyId='11111111-1111-4111-8111-111111111111'
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const deps=[
  ['Генеральный директор',null],['Операционный блок',0],['Финансовый блок',0],['Департамент по работе с персоналом',0],['IT и цифровизация',0],
  ['Производственное управление',1],['Служба эксплуатации',1],['Бухгалтерия',2],['Планово-экономический отдел',2],['Подбор и адаптация',3],
  ['Обучение и развитие',3],['Отдел разработки',4],['Инфраструктура и поддержка',4],['Проектный офис',0],
].map(([name,p],i)=>({id:id(100+i),name,parent_id:p===null?null:id(100+Number(p)),revision:1}))
const positions=['Генеральный директор','Операционный директор','Финансовый директор','HR-директор','IT-директор','Руководитель отдела','HR бизнес-партнёр','Рекрутер','Специалист по обучению','Главный бухгалтер','Экономист','Бизнес-аналитик','Frontend-разработчик','Backend-разработчик','DevOps-инженер','Системный администратор','Менеджер проекта','Инженер эксплуатации','Специалист поддержки','Офис-менеджер'].map((name,i)=>({id:id(300+i),name,revision:1}))
const names=[['Садыков','Арман','Ерланович'],['Ибраева','Алия','Сериковна'],['Ким','Даниил','Алексеевич'],['Ахметова','Мадина','Руслановна'],['Нуртаев','Асет','Маратович'],['Смирнова','Елена','Викторовна'],['Омаров','Тимур','Кайратович'],['Сейтова','Аружан','Нурлановна'],['Ли','Максим','Олегович'],['Жумабаева','Динара','Аскаровна'],['Касымов','Ринат','Булатович'],['Волкова','Анна','Игоревна'],['Тлеубаев','Адиль','Ермекович'],['Соколова','Мария','Андреевна'],['Беков','Нурсултан','Дауренович'],['Романова','Екатерина','Павловна'],['Абдрахманов','Ержан','Серикович'],['Кузнецова','Ольга','Дмитриевна'],['Мусин','Алихан','Талгатович'],['Морозова','Дарья','Сергеевна'],['Исаев','Руслан','Айдарович'],['Петрова','Виктория','Олеговна'],['Жанибеков','Данияр','Арманович'],['Орлова','Полина','Романовна'],['Сулейменов','Мирас','Канатович'],['Федорова','София','Ильинична'],['Калиев','Ерасыл','Бауыржанович'],['Новикова','Алина','Максимовна'],['Токтаров','Санжар','Ерланович'],['Попова','Ксения','Алексеевна'],['Ермеков','Айдос','Тимурович'],['Васильева','Наталья','Денисовна'],['Баймуханов','Алан','Рашидович'],['Захарова','Вероника','Олеговна'],['Серикбаев','Мади','Ерболович'],['Белова','Юлия','Антоновна'],['Кенжебек','Амир','Даулетович'],['Мельникова','Анастасия','Игоревна'],['Таиров','Ильяс','Муратович'],['Григорьева','Елизавета','Сергеевна']]
const employees=names.map(([last_name,first_name,middle_name],i)=>{const d=deps[5+i%(deps.length-5)],p=positions[5+i%(positions.length-5)],arch=i>=37,planned=i>=34&&i<37,unassigned=i===33;return{id:id(1000+i),personnel_number:`EMP-${String(i+1).padStart(4,'0')}`,last_name,first_name,middle_name,revision:1,birth_date:`${1987+i%12}-0${i%9+1}-${String(i%20+5).padStart(2,'0')}`,gender:i%2?'female':'male',email:`employee${i+1}@demo.local`,phone:`+7 700 100 ${String(10+i).padStart(2,'0')} ${String(20+i).padStart(2,'0')}`,address:i%2?'г. Астана':'г. Алматы',work_site:i%2?'Астана, головной офис':'Алматы, офис',work_zone:i%3?'Гибрид':'Офис',work_team:`Команда ${String.fromCharCode(65+i%4)}`,supervisor_name:'Садыков Арман Ерланович',current_department_name:unassigned||arch?null:d.name,current_position_name:unassigned||arch?null:p.name,current_department_id:unassigned||arch?null:d.id,current_position_id:unassigned||arch?null:p.id,current_assignment_valid_from:unassigned||arch?null:`202${2+i%4}-0${i%8+1}-01`,employment_status:arch?'archived':planned?'planned':unassigned?'unassigned':'active'}})
const plan={id:id(500),name:'Штатное расписание 2026',valid_from:'2026-01-01',valid_to:null,status:'approved',revision:3}
const staffing=deps.slice(1).flatMap((d,di)=>Array.from({length:di%3===0?3:2},(_,ri)=>{const p=positions[(di*2+ri+4)%positions.length],planned=ri?2:4,occupied=Math.max(0,planned-((di+ri)%3===0?1:0));return{id:id(600+di*4+ri),department_id:d.id,position_id:p.id,department_name:d.name,position_name:p.name,planned_units:planned,occupied_units:occupied,vacant_units:planned-occupied,overstaffed_units:0,base_salary:420000+di*25000+ri*60000,currency:'KZT',notes:null,revision:1}}))
const actions=employees.slice(0,18).map((e,i)=>({id:id(3000+i),employee_id:e.id,action_type:i%5===0?'transfer':'hire',effective_on:`2026-0${i%9+1}-0${i%8+1}`,basis_reference:`Приказ № HR-${120+i}`,notes:null,source_assignment_id:i%5===0?id(4000+i):null,target_assignment_id:id(4100+i),personnel_number:e.personnel_number,last_name:e.last_name,first_name:e.first_name,middle_name:e.middle_name,source_department_name:i%5===0?deps[9].name:null,source_position_name:i%5===0?positions[7].name:null,target_department_name:e.current_department_name,target_position_name:e.current_position_name,created_at:'2026-10-01T09:30:00+05:00'}))
const training=employees.slice(0,16).map((e,i)=>({id:id(2000+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:i%4===0?'planned':i%3===0?'ongoing':'completed',training_type:i%2?'external':'internal',training_mode:i%3===0?'remote':i%3===1?'in_person':'on_the_job',topic:['Управление проектами','Excel и аналитика','Охрана труда','Лидерство'][i%4],provider:'ITP Academy',city:'Астана',started_on:'2026-09-10',ended_on:i%4===0?null:'2026-09-12',document_reference:i%4===0?null:`CERT-${202600+i}`}))
const reserve=employees.slice(4,14).map((e,i)=>({id:id(2100+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:i>=8?'alumni':'active',target_position:positions[(i+1)%8].name,reserve_level:i%2?'Функциональный':'Корпоративный',reserve_type:i%3?'Среднесрочный':'Оперативный',joined_year:2024+i%3,left_year:i>=8?2026:null,notes:'Индивидуальный план развития'}))
const documents=employees.slice(0,22).map((e,i)=>({id:id(5000+i),employee_id:e.id,personnel_action_id:i<actions.length?actions[i].id:null,document_type:['order','contract','basis','other'][i%4],document_number:`DOC-2026-${100+i}`,title:['Приказ о приёме','Трудовой договор','Дополнительное соглашение','Приказ о переводе'][i%4],issued_on:'2026-09-15',status:i%4===3?'draft':'active',revision:1,created_at:'2026-10-01T10:00:00+05:00',personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,has_file:i%4!==3}))
const employeeReserve=(e:any,i:number)=>reserve.filter(x=>x.employee_id===e.id).length
  ? reserve.filter(x=>x.employee_id===e.id)
  : [{id:id(2100+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:'active',target_position:positions[(i+2)%positions.length].name,reserve_level:'Функциональный',reserve_type:'Среднесрочный',joined_year:2026,left_year:null,notes:'Индивидуальный план развития'}]
const employeeTraining=(e:any,i:number)=>training.filter(x=>x.employee_id===e.id).length
  ? training.filter(x=>x.employee_id===e.id)
  : [{id:id(2000+i),employee_id:e.id,revision:1,personnel_number:e.personnel_number,first_name:e.first_name,last_name:e.last_name,middle_name:e.middle_name,development_status:'ongoing',training_type:'internal',training_mode:'in_person',topic:'Развитие профессиональных компетенций',provider:'Корпоративный университет',city:'Астана',started_on:'2026-10-05',ended_on:'2026-10-07',document_reference:`CERT-${202600+i}`}]
const referenceProfileFor=(e:any,i:number)=>({
  personal:{
    iin:`9${String(10000000000+i).padStart(11,'0')}`,
    citizenship:'Республика Казахстан',
    marital_status:i%3===0?'Женат / замужем':i%3===1?'Не женат / не замужем':'Семейное положение не указано',
    registration_address:i%2?'г. Астана, район Есиль':'г. Алматы, Бостандыкский район',
    residence_address:e.address,
    emergency_contact_name:i%2?'Ибраева Алия Сериковна':'Садыков Арман Ерланович',
    emergency_contact_phone:'+7 701 555 21 10',
  },
  identity_document:{
    type:'Удостоверение личности РК',
    number:`ID${String(450000+i).padStart(6,'0')}`,
    issued_on:'2023-04-18',
    expires_on:'2033-04-17',
    issued_by:'МВД Республики Казахстан',
  },
  banking:{
    bank_name:i%2?'Halyk Bank':'Kaspi Bank',
    iban:`KZ${String(1200+i).padStart(18,'0')}`,
    payroll_account:`Зарплатный счёт •••• ${String(1100+i).slice(-4)}`,
  },
  employment:{
    contract_number:`TD-${2022+i%4}-${String(120+i).padStart(3,'0')}`,
    contract_date:e.current_assignment_valid_from||'2024-01-15',
    contract_type:i%4===0?'Срочный трудовой договор':'Бессрочный трудовой договор',
    employment_type:i%3===0?'Полная занятость':'Основное место работы',
    probation_until:i%5===0?'2026-12-01':null,
    work_schedule:i%2?'5/2, 09:00–18:00':'Гибкий график, 40 часов в неделю',
  },
  payroll:{
    salary:520000+i*15000,
    currency:'KZT',
    payment_frequency:'2 раза в месяц',
    next_payment_date:'2026-10-25',
  },
  schedule:{
    schedule_name:i%2?'Пятидневная рабочая неделя':'Гибкий график',
    shift:i%3===0?'Смена 1':'Дневная',
    hours_per_week:40,
    timesheet_month:'Октябрь 2026',
    planned_hours:176,
    worked_hours:160-i%3*8,
  },
  documents:[
    {id:id(9000+i*10),title:'Трудовой договор',number:`TD-${2022+i%4}-${120+i}`,issued_on:e.current_assignment_valid_from||'2024-01-15',status:'Действует'},
    {id:id(9001+i*10),title:'Приказ о приёме',number:`HR-${120+i}`,issued_on:e.current_assignment_valid_from||'2024-01-15',status:'Подписан'},
    {id:id(9002+i*10),title:'Согласие на обработку персональных данных',number:`PD-${210+i}`,issued_on:'2026-01-10',status:'Действует'},
  ],
  history:[
    {id:id(9500+i*10),action:'Карточка сотрудника создана',actor:'HR-служба',created_at:'2024-01-15T09:20:00+05:00'},
    {id:id(9501+i*10),action:'Обновлены контактные данные',actor:'HR-менеджер',created_at:'2026-06-03T14:10:00+05:00'},
    {id:id(9502+i*10),action:'Обновлено организационное назначение',actor:'HR-служба',created_at:'2026-09-01T10:40:00+05:00'},
  ],
})
const page=(rows:any[],p:number,per=25,extra={})=>({data:rows.slice((p-1)*per,p*per),meta:{current_page:p,last_page:Math.max(1,Math.ceil(rows.length/per)),per_page:per,total:rows.length,...extra}})
const json=(o:any)=>JSON.stringify(o)
export async function mockApiRequest<T>(path:string,options:RequestInit={}):Promise<T>{
  await new Promise(r=>setTimeout(r,80))
  const method=(options.method||'GET').toUpperCase(),u=new URL(path,'https://demo.local'),p=u.pathname
  if(p==='/health') return {status:'ok',service:'itp-hrm-api'} as T
  if(p==='/companies') return page([{id:companyId,name:'ITP HRM Demo'}],1,100) as T
  let m=p.match(/^\/companies\/[^/]+\/employees$/)
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
      current_department_name:null,
      current_position_name:null,
      current_department_id:null,
      current_position_id:null,
      current_assignment_valid_from:null,
      employment_status:'unassigned',
    }
    employees.unshift(employee)
    return {data:employee} as T
  }

  m=p.match(/^\/companies\/[^/]+\/(departments|positions|employees|personnel-actions|documents)$/)
  if(m){const pg=Number(u.searchParams.get('page')||1),kind=m[1];let rows:any[]=kind==='departments'?deps:kind==='positions'?positions:kind==='employees'?employees:kind==='personnel-actions'?actions:documents
    if(kind==='employees'){const q=(u.searchParams.get('search')||'').toLowerCase(),s=u.searchParams.get('status')||'all';rows=rows.filter((x:any)=>(s==='all'||x.employment_status===s)&&(!q||json(x).toLowerCase().includes(q)))}
    if(kind==='personnel-actions'&&u.searchParams.get('type'))rows=rows.filter((x:any)=>x.action_type===u.searchParams.get('type'))
    const extra:any=kind==='departments'?{department_writes_enabled:true}:kind==='positions'?{position_writes_enabled:true}:kind==='employees'?{employee_writes_enabled:true,status_filter:u.searchParams.get('status')||'all',registry_summary:{vacancies:staffing.reduce((sum:any,row:any)=>sum+Number(row.vacant_units||0),0),expiring_contracts:6}}:kind==='personnel-actions'?{personnel_actions_writes_enabled:true,summary:{hire:actions.filter((x:any)=>x.action_type==='hire').length,transfer:actions.filter((x:any)=>x.action_type==='transfer').length,termination:actions.filter((x:any)=>x.action_type==='termination').length}}:{document_writes_enabled:true}
    return page(rows,pg,kind==='employees'||kind==='personnel-actions'||kind==='documents'?25:100,extra) as T}
  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)$/)
  if(m&&method==='PUT'){
    const e:any=employees.find(x=>x.id===m![1])
    if(!e)throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    Object.assign(e,body,{revision:Number(e.revision||1)+1})
    return {data:e} as T
  }
  if(m&&method==='GET'){const e:any=employees.find(x=>x.id===m![1]);if(!e)throw new Error('Сотрудник не найден');const ei=employees.indexOf(e);return {data:e,assignments:e.current_department_id?[{id:id(7000+ei),department_id:e.current_department_id,position_id:e.current_position_id,department_name:e.current_department_name,position_name:e.current_position_name,valid_from:e.current_assignment_valid_from,valid_to:null,basis_reference:`Приказ № HR-${120+ei}`,revision:1}]:[],experience:[{id:id(8000+ei),revision:1,experience_type:'Основное место работы',started_on:'2022-03-01',ended_on:null,basis_reference:'Трудовой договор'}],reserve:employeeReserve(e,ei),training:employeeTraining(e,ei),reference_profile:referenceProfileFor(e,ei),meta:{assignments_limit:50,assignments_truncated:false,extended_sections_visible:true,profile_writes_enabled:true,assignment_writes_enabled:true,employee_writes_enabled:true}} as T}
  m=p.match(/^\/companies\/[^/]+\/employees\/([^/]+)\/personnel-actions\/(hire|transfer|terminate)$/)
  if(m&&method==='POST'){
    const employee:any=employees.find(x=>x.id===m![1])
    if(!employee)throw new Error('Сотрудник не найден')
    const body=options.body?JSON.parse(String(options.body)):{}
    const operation=m[2]
    const sourceDepartmentName=employee.current_department_name??null
    const sourcePositionName=employee.current_position_name??null
    const sourceAssignmentId=employee.current_department_id?id(7000+Math.max(0,employees.indexOf(employee))):null
    let targetDepartmentName:string|null=null
    let targetPositionName:string|null=null
    let targetAssignmentId:string|null=null

    if(operation!=='terminate'){
      const dep:any=deps.find(x=>x.id===body.department_id)
      const pos:any=positions.find(x=>x.id===body.position_id)
      if(!dep||!pos)throw new Error('Подразделение или должность не найдены')
      targetDepartmentName=dep.name
      targetPositionName=pos.name
      targetAssignmentId=id(7200+actions.length)
      employee.current_department_id=dep.id
      employee.current_department_name=dep.name
      employee.current_position_id=pos.id
      employee.current_position_name=pos.name
      employee.current_assignment_valid_from=body.effective_on
      employee.employment_status='active'
    }else{
      employee.current_department_id=null
      employee.current_department_name=null
      employee.current_position_id=null
      employee.current_position_name=null
      employee.current_assignment_valid_from=null
      employee.employment_status='archived'
    }
    employee.revision=Number(employee.revision||1)+1
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

  m=p.match(/^\/companies\/[^/]+\/staffing-plans(?:\/([^/]+))?$/)
  if(m){if(m[1])return {data:plan,lines:staffing,meta:{as_of:u.searchParams.get('as_of')||'2026-10-13',staffing_writes_enabled:true}} as T;return page([plan,{...plan,id:id(501),name:'Проект штатного расписания 2027',valid_from:'2027-01-01',status:'draft',revision:1}],1,25,{staffing_writes_enabled:true}) as T}
  if(p.includes('/staffing-history'))return page(Array.from({length:34},(_,i)=>({id:34-i,action:i%6===0?'staffing.plan_approved':i%4===0?'staffing.plan_line_updated':'staffing.plan_line_created',staffing_plan_id:plan.id,staffing_line_id:staffing[i%staffing.length].id,revision:1+i%3,created_at:'2026-10-01T10:30:00+05:00'})),Number(u.searchParams.get('page')||1),25) as T
  m=p.match(/^\/companies\/[^/]+\/development\/(training|reserve)$/)
  if(m){const rows=(m[1]==='training'?training:reserve).filter((x:any)=>{const s=u.searchParams.get('status')||'all',q=(u.searchParams.get('search')||'').toLowerCase();return(s==='all'||x.development_status===s)&&(!q||json(x).toLowerCase().includes(q))}),all=m[1]==='training'?training:reserve;const summary:any={total:all.length};for(const x of all as any[])summary[x.development_status]=(summary[x.development_status]||0)+1;const res:any=page(rows,Number(u.searchParams.get('page')||1),25,{section:m[1],status_filter:u.searchParams.get('status')||'all',summary,profile_writes_enabled:true});return res as T}
  if(method!=='GET') return {data:{id:id(9999),revision:1,status:'draft'}} as T
  throw new Error(`Demo API route not implemented: ${path}`)
}
