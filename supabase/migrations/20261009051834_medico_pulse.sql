-- Medico data lives in a dedicated, non-exposed schema; Deals tables/auth settings are untouched.
create schema if not exists medcv_private;
revoke all on schema medcv_private from public, anon;
grant usage on schema medcv_private to authenticated, service_role;
create table medcv_private.config(id boolean primary key default true check(id),owner_email text not null,referrals_enabled boolean not null default true,imports_enabled boolean not null default true,identity_pepper uuid not null default gen_random_uuid());
insert into medcv_private.config(owner_email) values ('subhajitsatpathi6@gmail.com');
create table medcv_private.profiles(user_id uuid primary key references auth.users(id) on delete cascade,code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),referred_by uuid references medcv_private.profiles(user_id) on delete set null,credits integer not null default 0 check(credits>=0),frozen boolean not null default false,created_at timestamptz not null default now(),check(referred_by is distinct from user_id));
create table medcv_private.receipts(user_id uuid primary key references medcv_private.profiles(user_id) on delete cascade,cv_hash text not null check(cv_hash ~ '^[a-f0-9]{64}$'),credited_to uuid references medcv_private.profiles(user_id) on delete set null,created_at timestamptz not null default now());
create table medcv_private.ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null references medcv_private.profiles(user_id) on delete cascade,delta integer not null check(delta<>0),reason text not null,reference text not null unique,created_at timestamptz not null default now());
create index medcv_ledger_user_date on medcv_private.ledger(user_id,created_at desc);
create table medcv_private.templates(id text primary key,name text not null,category text not null,description text not null,config jsonb not null,active boolean not null default true,license text not null default 'Original ChoiceMatrix design');
create table medcv_private.unlocks(user_id uuid references medcv_private.profiles(user_id) on delete cascade,template_id text references medcv_private.templates(id),created_at timestamptz not null default now(),primary key(user_id,template_id));
create table medcv_private.edits(id uuid primary key default gen_random_uuid(),user_id uuid not null references medcv_private.profiles(user_id) on delete cascade,fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),kind text not null check(kind in ('pdf','docx')),state text not null default 'reserved' check(state in ('reserved','finalized','refunded')),result_hash text,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours');
create index medcv_edits_user_date on medcv_private.edits(user_id,created_at desc);
create table medcv_private.tickets(id uuid primary key default gen_random_uuid(),user_id uuid not null references medcv_private.profiles(user_id) on delete cascade,subject text not null check(length(subject) between 3 and 120),message text not null check(length(message) between 5 and 2000),status text not null default 'open' check(status in ('open','resolved')),reply text not null default '',created_at timestamptz not null default now());
create index medcv_tickets_user_date on medcv_private.tickets(user_id,created_at desc);
create table medcv_private.audit(id uuid primary key default gen_random_uuid(),actor uuid,action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create table medcv_private.qualified_subjects(subject text primary key,created_at timestamptz not null default now());
-- Defense in depth: no client receives direct table privileges, even in this private schema.
do $$ declare t text; begin foreach t in array array['config','profiles','receipts','ledger','templates','unlocks','edits','tickets','audit','qualified_subjects'] loop execute format('alter table medcv_private.%I enable row level security',t); execute format('revoke all on medcv_private.%I from public, anon, authenticated',t); end loop; end $$;
create function medcv_private.require_user() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();sid text:=auth.jwt()->>'session_id';begin
 if u is null or sid is null or sid !~ '^[0-9a-f-]{36}$' or not exists(select 1 from auth.sessions where id=sid::uuid and user_id=u and (not_after is null or not_after>now())) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and coalesce(is_anonymous,false)=false) then raise exception 'Verify your email before using referrals' using errcode='42501';end if;return u;end $$;
create function medcv_private.is_owner(u uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from auth.users a,medcv_private.config c where a.id=u and a.email_confirmed_at is not null and lower(a.email)=lower(c.owner_email)); $$;
create function medcv_private.handle(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=medcv_private.require_user();p medcv_private.profiles;ref uuid;t medcv_private.templates;e medcv_private.edits;target uuid;amount integer;begin
 if p_action='enroll' then
  if not exists(select 1 from medcv_private.profiles where user_id=u) then
   if coalesce(p_payload->>'code','')<>'' then select user_id into ref from medcv_private.profiles where code=upper(p_payload->>'code') and not frozen;if ref is null or ref=u then raise exception 'Invalid referral code';end if;end if;
   insert into medcv_private.profiles(user_id,referred_by) values(u,ref) on conflict(user_id) do nothing;
  end if;
 end if;
 select * into p from medcv_private.profiles where user_id=u for update;
 if p.user_id is null then raise exception 'Create your Medico account profile first';end if;
 if p_action in ('status','enroll') then return jsonb_build_object('userId',u,'code',p.code,'credits',p.credits,'frozen',p.frozen,'owner',medcv_private.is_owner(u),'qualified',exists(select 1 from medcv_private.receipts where user_id=u),'unlocks',coalesce((select jsonb_agg(template_id) from medcv_private.unlocks where user_id=u),'[]'::jsonb),'ledger',coalesce((select jsonb_agg(x) from (select delta,reason,created_at from medcv_private.ledger where user_id=u order by created_at desc limit 100)x),'[]'::jsonb),'edits',coalesce((select jsonb_agg(x) from (select id,fingerprint,kind,state,expires_at from medcv_private.edits where user_id=u order by created_at desc limit 30)x),'[]'::jsonb),'tickets',coalesce((select jsonb_agg(x) from (select id,subject,status,reply,created_at from medcv_private.tickets where user_id=u order by created_at desc limit 30)x),'[]'::jsonb));end if;
 if p_action like 'admin_%' then
  if not medcv_private.is_owner(u) or (auth.jwt()->>'aal' is distinct from 'aal2' or not exists(select 1 from auth.mfa_factors where user_id=u and status='verified')) then raise exception 'Owner MFA required' using errcode='42501';end if;
  if p_action='admin_report' then return jsonb_build_object('users',(select count(*) from medcv_private.profiles),'qualified',(select count(*) from medcv_private.receipts),'awarded',(select coalesce(sum(delta),0) from medcv_private.ledger where reason='referral'),'spent',(select coalesce(-sum(delta),0) from medcv_private.ledger where delta<0),'edits',(select count(*) from medcv_private.edits where state='finalized'),'unlocks',(select count(*) from medcv_private.unlocks),'profiles',coalesce((select jsonb_agg(x) from (select user_id,code,credits,frozen,created_at from medcv_private.profiles order by created_at desc limit 200)x),'[]'::jsonb),'tickets',coalesce((select jsonb_agg(x) from (select * from medcv_private.tickets order by created_at desc limit 200)x),'[]'::jsonb),'audit',coalesce((select jsonb_agg(x) from (select * from medcv_private.audit order by created_at desc limit 200)x),'[]'::jsonb),'config',(select to_jsonb(c)-'owner_email'-'identity_pepper' from medcv_private.config c));end if;
  if length(coalesce(p_payload->>'reason',''))<5 then raise exception 'An audit reason is required';end if;
  if p_action='admin_freeze' then target:=(p_payload->>'userId')::uuid; if target=u then raise exception 'Cannot freeze the owner';end if;update medcv_private.profiles set frozen=(p_payload->>'frozen')::boolean where user_id=target;if not found then raise exception 'Unknown user';end if;
  elsif p_action='admin_credit' then target:=(p_payload->>'userId')::uuid;amount:=(p_payload->>'amount')::integer;if amount<1 or amount>20 then raise exception 'Grant 1 to 20 credits';end if;update medcv_private.profiles set credits=credits+amount where user_id=target;if not found then raise exception 'Unknown user';end if;insert into medcv_private.ledger(user_id,delta,reason,reference) values(target,amount,'support adjustment',gen_random_uuid()::text);
  elsif p_action='admin_ticket' then update medcv_private.tickets set status='resolved',reply=left(p_payload->>'reply',2000) where id=(p_payload->>'id')::uuid;if not found then raise exception 'Unknown ticket';end if;
  elsif p_action='admin_flags' then update medcv_private.config set referrals_enabled=(p_payload->>'referrals')::boolean,imports_enabled=(p_payload->>'imports')::boolean;
  elsif p_action='admin_refund_edit' then select * into e from medcv_private.edits where id=(p_payload->>'id')::uuid for update;if e.id is null or e.state<>'reserved' then raise exception 'Only an unused reserved edit can be refunded';end if;update medcv_private.edits set state='refunded' where id=e.id;update medcv_private.profiles set credits=credits+1 where user_id=e.user_id;insert into medcv_private.ledger(user_id,delta,reason,reference) values(e.user_id,1,'unused edit refund','refund:'||e.id);
  else raise exception 'Unknown admin action';end if;
  insert into medcv_private.audit(actor,action,details) values(u,p_action,p_payload);return jsonb_build_object('ok',true);
 end if;
 if p_action='delete_profile' then if medcv_private.is_owner(u) then raise exception 'Owner profile cannot be deleted here';end if;delete from medcv_private.profiles where user_id=u;return jsonb_build_object('ok',true);end if;
 if p.frozen then raise exception 'Referral account paused. Contact support.' using errcode='42501';end if;
 if p_action='unlock' then
  select * into t from medcv_private.templates where id=p_payload->>'templateId' and active;if t.id is null then raise exception 'Unknown premium template';end if;
  if not exists(select 1 from medcv_private.unlocks where user_id=u and template_id=t.id) then if p.credits<1 then raise exception 'One referral credit is required';end if;update medcv_private.profiles set credits=credits-1 where user_id=u;insert into medcv_private.unlocks(user_id,template_id) values(u,t.id);insert into medcv_private.ledger(user_id,delta,reason,reference) values(u,-1,'template unlock','template:'||u||':'||t.id);end if;return t.config;
 elsif p_action='template' then select * into t from medcv_private.templates where id=p_payload->>'templateId' and active;if not exists(select 1 from medcv_private.unlocks where user_id=u and template_id=t.id) then raise exception 'Template locked' using errcode='42501';end if;return t.config;
 elsif p_action='reserve_edit' then
  if not (select imports_enabled from medcv_private.config) then raise exception 'Document imports temporarily paused';end if;
  if p.credits<1 then raise exception 'One referral credit is required';end if;
  insert into medcv_private.edits(user_id,fingerprint,kind) values(u,p_payload->>'fingerprint',p_payload->>'kind') returning * into e;update medcv_private.profiles set credits=credits-1 where user_id=u;insert into medcv_private.ledger(user_id,delta,reason,reference) values(u,-1,'document edit','edit:'||e.id);return jsonb_build_object('id',e.id,'expires',e.expires_at);
 elsif p_action='ticket' then
  if (select count(*) from medcv_private.tickets where user_id=u and created_at>now()-interval '1 hour')>=3 then raise exception 'Please wait before sending more support requests';end if;
  insert into medcv_private.tickets(user_id,subject,message) values(u,p_payload->>'subject',p_payload->>'message');return jsonb_build_object('ok',true);
 else raise exception 'Unknown account action';end if;end $$;
create function public.medcv_account(p_action text default 'status',p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select medcv_private.handle(p_action,p_payload); $$;
revoke all on function public.medcv_account(text,jsonb) from public,anon;
grant execute on function public.medcv_account(text,jsonb) to authenticated;
revoke all on all functions in schema medcv_private from public,anon,authenticated;
grant execute on function medcv_private.handle(text,jsonb) to authenticated;
-- Only verified Edge Functions may issue completion receipts and finalize an edit version.
create function medcv_private.complete_cv(p_user uuid,p_session uuid,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p medcv_private.profiles;mail text;subject text;fresh boolean;begin
 if not exists(select 1 from auth.sessions s join auth.users a on a.id=s.user_id where s.id=p_session and a.id=p_user and a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false) and (s.not_after is null or s.not_after>now())) then raise exception 'Invalid session';end if;
 select * into p from medcv_private.profiles where user_id=p_user for update;if p.user_id is null or p.frozen then raise exception 'Account unavailable';end if;
 if exists(select 1 from medcv_private.receipts where user_id=p_user) then return jsonb_build_object('ok',true,'alreadyCompleted',true);end if;
 select lower(email) into mail from auth.users where id=p_user;
 if split_part(mail,'@',2) in ('gmail.com','googlemail.com') then mail:=replace(split_part(split_part(mail,'@',1),'+',1),'.','')||'@gmail.com';end if;
 select encode(sha256(convert_to(mail||identity_pepper::text,'UTF8')),'hex') into subject from medcv_private.config;
 insert into medcv_private.qualified_subjects(subject) values(subject) on conflict do nothing;fresh:=found;
 insert into medcv_private.receipts(user_id,cv_hash) values(p_user,p_hash);
 if fresh and p.referred_by is not null and (select referrals_enabled from medcv_private.config) then
  update medcv_private.profiles set credits=credits+1 where user_id=p.referred_by and not frozen;
  if found then insert into medcv_private.ledger(user_id,delta,reason,reference) values(p.referred_by,1,'referral','referral:'||p_user);update medcv_private.receipts set credited_to=p.referred_by where user_id=p_user;end if;
 end if;return jsonb_build_object('ok',true);end $$;
create function public.medcv_complete_cv(p_user uuid,p_session uuid,p_hash text) returns jsonb language sql security invoker set search_path='' as $$ select medcv_private.complete_cv(p_user,p_session,p_hash); $$;
create function medcv_private.finalize_edit(p_user uuid,p_session uuid,p_id uuid,p_fingerprint text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e medcv_private.edits;begin
 if not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now())) then raise exception 'Invalid session';end if;
 if exists(select 1 from medcv_private.profiles where user_id=p_user and frozen) then raise exception 'Account paused';end if;
 select * into e from medcv_private.edits where id=p_id and user_id=p_user for update;
 if e.id is null or e.fingerprint<>p_fingerprint or e.expires_at<now() or e.state='refunded' or p_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid or expired edit session';end if;
 if e.state='finalized' and e.result_hash<>p_hash then raise exception 'This credit has already finalized another version';end if;
 update medcv_private.edits set state='finalized',result_hash=p_hash where id=e.id;return jsonb_build_object('ok',true,'kind',e.kind);end $$;
create function public.medcv_finalize_edit(p_user uuid,p_session uuid,p_id uuid,p_fingerprint text,p_hash text) returns jsonb language sql security invoker set search_path='' as $$ select medcv_private.finalize_edit(p_user,p_session,p_id,p_fingerprint,p_hash); $$;
revoke all on function public.medcv_complete_cv(uuid,uuid,text), public.medcv_finalize_edit(uuid,uuid,uuid,text,text),medcv_private.complete_cv(uuid,uuid,text),medcv_private.finalize_edit(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.medcv_complete_cv(uuid,uuid,text), public.medcv_finalize_edit(uuid,uuid,uuid,text,text),medcv_private.complete_cv(uuid,uuid,text),medcv_private.finalize_edit(uuid,uuid,uuid,text,text) to service_role;
