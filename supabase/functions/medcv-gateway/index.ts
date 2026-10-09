import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {Document,Packer,Paragraph,TextRun} from 'npm:docx@9.9.0';
import {editedPdf,validateDocx,sha256,toBase64,fromBase64,MAX_BYTES} from './documents.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://subha760.github.io','https://medico.choicematrix.in','https://appassets.androidplatform.net','http://localhost:4173','http://localhost:5173']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://subha760.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply({error:'Sign in required'},401);
 const {data:{user},error}=await service.auth.getUser(token);if(error||!user||!user.email_confirmed_at)return reply({error:'Verified sign-in required'},401);
 // Signature and user validity were checked by getUser. DB separately checks the session's continued existence.
 const claims=JSON.parse(new TextDecoder().decode(fromBase64(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))));const sid=claims.session_id;if(typeof sid!=='string')return reply({error:'Invalid session'},401);
 if(Number(req.headers.get('content-length')||0)>12*1024*1024)return reply({error:'Request too large'},413);
 const reader=req.body?.getReader();let raw='';if(reader){const decoder=new TextDecoder();let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>12*1024*1024){await reader.cancel();return reply({error:'Request too large'},413);}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}if(raw.length>12*1024*1024)return reply({error:'Request too large'},413);const b=JSON.parse(raw);
 if(b.action==='complete'){
  const cv=b.cv;if(!cv||typeof cv.personalInfo?.fullName!=='string'||cv.personalInfo.fullName.trim().length<3||!cv.personalInfo.professionalTitle?.trim()||!cv.personalInfo.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)||!Array.isArray(cv.education)||!Array.isArray(cv.experience)||!(cv.education.some((e:any)=>e.degree?.trim()&&e.institution?.trim())||cv.experience.some((e:any)=>e.position?.trim()&&e.hospital?.trim()))||raw.length>300000)throw new Error('Complete your name, professional title, email and education or experience before verifying your CV.');
  const hash=await sha256(new TextEncoder().encode(JSON.stringify(cv)));const r=await service.rpc('medcv_complete_cv',{p_user:user.id,p_session:sid,p_hash:hash});if(r.error)throw new Error(r.error.message);return reply(r.data);
 }
 if(b.action==='edit'){
  if(typeof b.source!=='string'||b.source.length>Math.ceil(MAX_BYTES*4/3)+4||!['pdf','docx'].includes(b.kind))throw new Error('Invalid document.');const bytes=fromBase64(b.source);if(bytes.length>MAX_BYTES)throw new Error('File exceeds 8 MB.');
  const fingerprint=await sha256(bytes),hash=await sha256(new TextEncoder().encode(JSON.stringify({kind:b.kind,text:b.kind==='docx'?b.text:'',replacements:b.kind==='pdf'?b.replacements:[]})));
  const check=await service.rpc('medcv_check_edit',{p_user:user.id,p_session:sid,p_id:b.id,p_fingerprint:fingerprint,p_hash:hash});if(check.error)throw new Error(check.error.message);if(check.data.kind!==b.kind)throw new Error('Document kind does not match the edit session.');
  let result:Uint8Array;let mime:string;
  if(b.kind==='pdf'){if(!Array.isArray(b.replacements))throw new Error('Invalid replacements.');result=await editedPdf(bytes,b.replacements);mime='application/pdf';}
  else {validateDocx(bytes);if(typeof b.text!=='string'||b.text.length>40000||!b.text.trim())throw new Error('Enter up to 40,000 characters of document text.');const doc=new Document({sections:[{children:b.text.split('\n').map((line:string)=>new Paragraph({children:[new TextRun({text:line,font:'Calibri',size:22})],spacing:{after:100}}))}]});result=new Uint8Array(await Packer.toBuffer(doc));mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';}
  // Bind entitlement to this source and exact edit intent, independent of variable output file timestamps.

  const r=await service.rpc('medcv_finalize_edit',{p_user:user.id,p_session:sid,p_id:b.id,p_fingerprint:fingerprint,p_hash:hash});if(r.error)throw new Error(r.error.message);if(r.data.kind!==b.kind)throw new Error('Document kind does not match the edit session.');return reply({data:toBase64(result),mime});
 }
 return reply({error:'Unknown action'},400);
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to process request'},400);}
});
