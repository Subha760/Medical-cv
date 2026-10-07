import { test, expect } from '@playwright/test';
import { newCvDocument } from '../../src/types/cv';
import { demoCv } from '../../src/data/demoCv';
const tabs=['Overview','Shifts','Tasks','Credentials','Learning','Study','Career','Wellbeing'];
test('nursing daily tools save, export, review and fit phones',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/workspace');
 await expect(page.getByRole('heading',{name:'Your daily workspace'})).toBeVisible();
 for(const tab of tabs){await page.getByRole('button',{name:tab,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),tab+' fits viewport').toBeTruthy();}
 await page.getByRole('button',{name:'Shifts',exact:true}).click();
 await page.getByLabel('Shift label').fill('Night placement');await page.getByLabel('Date',{exact:true}).fill('2026-12-31');await page.getByLabel('Starts').fill('19:00');await page.getByLabel('Ends').fill('07:00');await page.getByRole('button',{name:'Add shift'}).click();await expect(page.getByText(/12 hours/)).toBeVisible();
 const calendar=page.waitForEvent('download');await page.getByRole('button',{name:'Export calendar (.ics)'}).click();expect((await calendar).suggestedFilename()).toBe('MedCV-shifts.ics');
 await page.getByRole('button',{name:'Tasks',exact:true}).click();await page.getByLabel('Task',{exact:true}).fill('Prepare portfolio');await page.getByRole('button',{name:'Add task'}).click();await page.getByRole('checkbox').check();await page.reload();await page.getByRole('button',{name:'Tasks',exact:true}).click();await expect(page.getByRole('checkbox')).toBeChecked();
 await page.getByRole('button',{name:'Credentials',exact:true}).click();await page.getByLabel('Credential',{exact:true}).fill('BLS');await page.getByLabel('Expiry date').fill('2026-01-01');await page.getByRole('button',{name:'Add credential'}).click();await expect(page.getByText(/Expired/)).toBeVisible();
 await page.getByRole('button',{name:'Learning',exact:true}).click();await page.getByLabel('Topic or activity').fill('SBAR workshop');await page.getByLabel('Date',{exact:true}).fill('2026-10-07');await page.getByLabel('Hours',{exact:true}).fill('2');await page.getByLabel('Reflection',{exact:true}).fill('Practised structured communication.');await page.getByRole('button',{name:'Log learning'}).click();await expect(page.getByText('2 hours',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Study',exact:true}).click();await page.getByLabel('Study notes').fill('SBAR: Situation, Background, Assessment, Recommendation');await page.getByRole('button',{name:'Create study cards'}).click();await page.getByRole('button',{name:'Show answer'}).click();await expect(page.getByText('Situation, Background, Assessment, Recommendation',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Review in 3 days'}).click();await expect(page.getByText('No cards due.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Career',exact:true}).click();await page.getByLabel('Your STAR answer').fill('I did well');await page.getByRole('button',{name:'Review answer structure'}).click();await expect(page.getByText(/Add a concrete example/)).toBeVisible();
 expect(errors).toEqual([]);
});
test('CV editor, complete PDF preview and downloads',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const cv=demoCv('ats_professional_clarity_01','navy');cv.id='browser-cv';cv.isDraft=false;cv.registrationInfo.licenseExpiry='2028-01-01';
 await page.addInitScript(doc=>localStorage.setItem('medcv:documents',JSON.stringify([doc])),cv);
 await page.goto('/#/editor/browser-cv');await expect(page.getByText('Personal Details',{exact:true}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.goto('/#/preview/browser-cv');await expect(page.locator('canvas').first()).toBeVisible({timeout:20000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:/Download PDF/i}).first().click();expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);expect(errors).toEqual([]);
});
test('backup import and corrupted collection recovery',async({page})=>{
 await page.goto('/#/settings');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.json$/);
 const doc=newCvDocument('restore','NURSE');doc.isDraft=false;doc.personalInfo.fullName='Restored Nurse';
 const backup={version:1,data:{'medcv:documents':JSON.stringify([doc]),'medcv:coverLetters':null,'medcv:workspace':null}};
 page.on('dialog',d=>d.accept());await page.getByLabel('Choose backup file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(page.getByText(/Backup restored/)).toBeVisible();
 await page.evaluate(()=>{localStorage.setItem('medcv:documents:previous',localStorage.getItem('medcv:documents')!);localStorage.setItem('medcv:documents','{bad');});await page.goto('/#/saved');await expect(page.getByRole('heading',{name:'Your saved work needs attention'})).toBeVisible();await page.getByRole('link',{name:'Open recovery settings'}).click();await page.getByRole('button',{name:'Recover documents',exact:true}).click();await expect(page.getByText('Previous revision recovered.')).toBeVisible();await page.goto('/#/saved');await expect(page.getByText('Restored Nurse',{exact:true}).first()).toBeVisible();
});
test('offline app opens all new tools after install',async({page,context})=>{
 await page.goto('/#/workspace');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await expect(page.getByRole("heading",{name:"Your daily workspace"})).toBeVisible();await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Your daily workspace'})).toBeVisible();await expect(page.getByText(/Offline ·/)).toBeVisible();await page.getByRole('button',{name:'Study',exact:true}).click();await expect(page.getByRole('heading',{name:'Notes-to-cards assistant'})).toBeVisible();await context.setOffline(false);
});
