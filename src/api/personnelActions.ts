import { apiRequest } from './client'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PersonnelActionType='hire'|'transfer'|'termination'

export interface PersonnelActionRow extends Record<string,unknown>{
  id:string
  employee_id:string
  action_type:PersonnelActionType
  effective_on:string
  basis_reference:string
  notes:string|null
  source_assignment_id:string|null
  target_assignment_id:string|null
  personnel_number:string
  last_name:string
  first_name:string
  middle_name:string|null
  source_department_name:string|null
  source_position_name:string|null
  target_department_name:string|null
  target_position_name:string|null
  created_at:string
}

export interface PersonnelActionListResponse{
  data:PersonnelActionRow[]
  meta:{
    personnel_actions_writes_enabled:boolean
    current_page:number
    last_page:number
    per_page:number
    total:number
    summary?: {
      hire:number
      transfer:number
      termination:number
    }
  }
}

export function listPersonnelActions(companyId:string,page=1,type?:PersonnelActionType|''):Promise<PersonnelActionListResponse>{
  if(!uuid.test(companyId)) throw new Error('Некорректный идентификатор компании')
  const params=new URLSearchParams({page:String(page),per_page:'25'})
  if(type) params.set('type',type)
  return apiRequest(`/companies/${companyId}/personnel-actions?${params.toString()}`)
}

export interface HirePayload{
  department_id:string
  position_id:string
  effective_on:string
  basis_reference:string
  notes:string|null
}

export interface TransferPayload extends HirePayload{
  source_assignment_id:string
  source_assignment_revision:number
}

export interface TerminationPayload{
  source_assignment_id:string
  source_assignment_revision:number
  effective_on:string
  basis_reference:string
  notes:string|null
}

export function hireEmployee(companyId:string,employeeId:string,payload:HirePayload){
  if(!uuid.test(companyId)||!uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  return apiRequest(`/companies/${companyId}/employees/${employeeId}/personnel-actions/hire`,{
    method:'POST',body:JSON.stringify(payload),
  })
}

export function transferEmployee(companyId:string,employeeId:string,payload:TransferPayload){
  if(!uuid.test(companyId)||!uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  return apiRequest(`/companies/${companyId}/employees/${employeeId}/personnel-actions/transfer`,{
    method:'POST',body:JSON.stringify(payload),
  })
}

export function terminateEmployee(companyId:string,employeeId:string,payload:TerminationPayload){
  if(!uuid.test(companyId)||!uuid.test(employeeId)) throw new Error('Некорректный идентификатор')
  return apiRequest(`/companies/${companyId}/employees/${employeeId}/personnel-actions/terminate`,{
    method:'POST',body:JSON.stringify(payload),
  })
}
