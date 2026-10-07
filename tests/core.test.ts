import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCvDocument } from '../src/types/cv';
import { generateProfessionalSummary, improveResponsibilities, runCvAutopilot } from '../src/ai/localWritingAssistant';
import { checkAtsCompatibility, validateCv } from '../src/validation/cvChecks';
import { TEMPLATE_CATALOG } from '../src/data/templateCatalog';
import { calendarFor, shiftHours, emptyWorkspace, isWorkspace } from '../src/workspace/model';
import { studyCards, matchJob, interviewFeedback } from '../src/workspace/assistants';
import { exportBackup, restoreBackup, recoverPrevious } from '../src/storage/backup';
import { cvStorage } from '../src/storage/cvStorage';
import { writeCollection } from '../src/storage/safeStorage';
const map = new Map<string,string>();
(globalThis as any).localStorage={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)};
(globalThis as any).window={localStorage};
test('assistant never invents duties or skills; roles are correct',()=>{
 const d=newCvDocument('1','PHARMACIST');assert.equal(generateProfessionalSummary(d),'Pharmacist.');assert.equal(improveResponsibilities(''), '');
 const result=runCvAutopilot(d);assert.equal(result.doc.skills,'');assert.equal(d.personalInfo.professionalSummary,'');assert.ok(!result.doc.personalInfo.professionalSummary.includes('Nursing'));
});
test('students get credit for placement and standalone skills',()=>{
 const d=newCvDocument('1','NURSING_STUDENT');d.personalInfo.fullName='Student';d.personalInfo.email='a@b.com';d.personalInfo.professionalSummary='Student';d.education=[{id:'e',degree:'BSN',institution:'College',location:'',startYear:'2023',graduationYear:'2026',grade:''}];d.internship='Supervised placement';d.skills='Documentation';
 assert.equal(checkAtsCompatibility(d,TEMPLATE_CATALOG[0]).score,100);assert.ok(!validateCv(d).some(i=>i.message.includes('license')));
});
test('overnight calendar shifts have correct duration and escaped text',()=>{
 const shift={id:'s',date:'2026-12-31',start:'19:00',end:'07:00',label:'Ward, A; night'};
 assert.equal(shiftHours(shift),12);const calendar=calendarFor([shift]);assert.ok(calendar.includes('DTEND:20270101T070000'));assert.ok(calendar.includes('Ward\\, A\\; night'));
});
test('notes and career coach use supplied facts only',()=>{
 assert.deepEqual(studyCards('SBAR: Situation, Background, Assessment, Recommendation')[0],{question:'Explain SBAR.',answer:'Situation, Background, Assessment, Recommendation'});
 const d=newCvDocument('1');d.skills='Patient assessment';assert.deepEqual(matchJob(d,'Patient assessment and wound care'),{matched:['patient assessment'],missing:['wound care']});assert.ok(interviewFeedback('I did well').length>1);
});
test('workspace rejects malformed input',()=>{assert.ok(isWorkspace(emptyWorkspace()));assert.ok(!isWorkspace({...emptyWorkspace(),learning:[{id:'x',hours:-1}]}));});
test('backup round trip and corrupt storage preservation',()=>{
 map.clear();const d=newCvDocument('1','NURSE');cvStorage.save(d,false);writeCollection('medcv:workspace',emptyWorkspace());const backup=exportBackup();map.clear();restoreBackup(backup);assert.equal(cvStorage.listSaved()[0].id,'1');
 const before=localStorage.getItem('medcv:documents');assert.throws(()=>restoreBackup(JSON.stringify({version:1,data:{'medcv:documents':'[{"id":"bad"}]'}})));assert.equal(localStorage.getItem('medcv:documents'),before);
 cvStorage.save({...d,label:'Second revision'},false);localStorage.setItem('medcv:documents','{broken');assert.throws(()=>cvStorage.listSaved());assert.throws(()=>cvStorage.save(d,false));assert.equal(localStorage.getItem('medcv:documents'),'{broken');recoverPrevious('medcv:documents');assert.equal(cvStorage.listSaved()[0].id,'1');
});
test('expired registration and certifications are flagged',()=>{const d=newCvDocument('date','NURSE');d.registrationInfo.licenseExpiry='2000-01-01';d.certifications=[{id:'c',name:'BLS',issuingBody:'Provider',issueDate:'1999-01-01',expiryDate:'2000-01-01'}];assert.equal(validateCv(d).filter(i=>i.message.includes('past')).length,2);});
