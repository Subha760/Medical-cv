import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createRemoteJWKSet,jwtVerify} from 'npm:jose@6.1.0';
import {OWNER_EMAIL,ACCESS_ISSUER,ACCESS_AUDIENCE,validateOwnerClaims} from './access.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const jwks=createRemoteJWKSet(new URL(ACCESS_ISSUER+'/cdn-cgi/access/certs'));
Deno.serve(async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 // Only Cloudflare's protected Worker route can forward the signed Access assertion.
 const assertion=req.headers.get('Cf-Access-Jwt-Assertion');
 if(!assertion||assertion.length>16000)return reply({error:'Owner email verification required'},401);
 try{
  const {payload}=await jwtVerify(assertion,jwks,{issuer:ACCESS_ISSUER,audience:ACCESS_AUDIENCE,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email','type'],clockTolerance:10});
  const expires=validateOwnerClaims(payload,Math.floor(Date.now()/1000));
  // Auth issues and validates its own token; no custom JWT signing or fabricated password.
  const link=await service.auth.admin.generateLink({type:'magiclink',email:OWNER_EMAIL});
  if(link.error||!link.data.properties.hashed_token)throw new Error('Unable to establish owner identity.');
  const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'email'});
  if(result.error||!result.data.session||result.data.user?.email!==OWNER_EMAIL)throw new Error('Unable to establish owner session.');
  const session=result.data.session;
  const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  const grant=await service.rpc('medcv_issue_pulse_session',{p_user:result.data.user.id,p_session:claims.session_id,p_expires:expires});
  if(grant.error){await auth.auth.signOut({scope:'local'});throw new Error('Owner session was denied.');}
  return reply({access_token:session.access_token,refresh_token:session.refresh_token,expires_at:expires});
 }catch{return reply({error:'Owner email verification failed. Start a new sign-in.'},401);}
});
