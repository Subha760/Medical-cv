import { newCvDocument } from '../types/cv';
export function demoCv(templateId:string, colorId:string) {
  const d=newCvDocument('demo','NURSE');
  d.templateId=templateId;d.colorId=colorId;
  Object.assign(d.personalInfo,{fullName:'Alex Morgan',professionalTitle:'Registered Nurse',cityCountry:'Bengaluru, India',email:'alex@example.com',phone:'+91 98765 43210',professionalSummary:'Registered nurse with five years of clinical experience delivering safe, compassionate care in busy hospital settings.'});
  d.skills='Patient assessment\nMedication administration\nCare planning and documentation';
  d.experience=[{id:'e',hospital:'City General Hospital',position:'Staff Nurse',department:'Medical ward',specialty:'',startDate:'2021',endDate:'Present',responsibilities:'Coordinated care for a 20-bed ward.\nMaintained accurate records and clear handovers.\nSupported patients and families with discharge education.',clinicalSkills:[],achievements:''}];
  d.education=[{id:'ed',degree:'B.Sc. Nursing',institution:'College of Nursing',location:'Bengaluru',startYear:'2016',graduationYear:'2020',grade:'First class'}];
  d.languages=[{id:'l',language:'English',proficiency:'Fluent'},{id:'l2',language:'Hindi',proficiency:'Professional working'}];
  return d;
}
