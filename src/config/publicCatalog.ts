import {
  UsersRound, Network, CalendarDays, Clock3, FileCheck2, FolderArchive,
  BarChart3, ShieldCheck, Laptop, Pickaxe, Factory, BriefcaseBusiness,
} from 'lucide-vue-next'

export const publicModules = [
  { id:'employees', label:'employees', preview:'previewEmployees', icon:UsersRound, category:'people' },
  { id:'staffing', label:'staffing', preview:'previewStaffing', icon:Network, category:'people' },
  { id:'leave', label:'vacations', preview:'previewVacations', icon:CalendarDays, category:'time' },
  { id:'timesheets', label:'worktime', preview:'previewWorktime', icon:Clock3, category:'time' },
  { id:'personnel', label:'personnel', preview:'previewPersonnel', icon:FileCheck2, category:'workflow' },
  { id:'documents', label:'documents', preview:'previewDocuments', icon:FolderArchive, category:'workflow' },
  { id:'reports', label:'reporting', preview:'feature3Text', icon:BarChart3, category:'workflow' },
  { id:'access', label:'roles', preview:'feature4Text', icon:ShieldCheck, category:'people' },
] as const
export type PublicModuleId = typeof publicModules[number]['id']
export const publicSectors = [
  {id:'it',title:'sectorIT',text:'sectorITText',icon:Laptop},
  {id:'mining',title:'sectorMining',text:'sectorMiningText',icon:Pickaxe},
  {id:'manufacturing',title:'sectorManufacturing',text:'sectorManufacturingText',icon:Factory},
  {id:'services',title:'sectorServices',text:'sectorServicesText',icon:BriefcaseBusiness},
] as const
export type PublicSectorId = typeof publicSectors[number]['id']
export const legalTypes = ['offer','tariff-policy','acceptable-use','personal-data-consent','privacy'] as const
export function modulePath(id:string){return '/product/modules/'+encodeURIComponent(id)}
export function sectorPath(id:string){return '/solutions/'+encodeURIComponent(id)}
