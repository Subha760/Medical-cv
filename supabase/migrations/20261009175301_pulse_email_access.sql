-- A short-lived owner session may be issued only after server-verified Cloudflare email OTP.
alter table medcv_private.config add column owner_user_id uuid references auth.users(id);
create table medcv_private.pulse_sessions(
 session_id uuid primary key references auth.sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table medcv_private.pulse_sessions enable row level security;
create policy deny_direct_pulse_sessions on medcv_private.pulse_sessions as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on medcv_private.pulse_sessions from public,anon,authenticated;
create or replace function medcv_private.is_owner(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users a,medcv_private.config c where a.id=u and a.email_confirmed_at is not null and lower(a.email)=lower(c.owner_email) and (c.owner_user_id is null or c.owner_user_id=u));
$$;
create function medcv_private.issue_pulse_session(p_user uuid,p_session uuid,p_expires timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from medcv_private.config for update;
 if not medcv_private.is_owner(p_user) or p_expires<=now() or p_expires>now()+interval '30 minutes' or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now())) then
  raise exception 'Invalid verified owner session' using errcode='42501';
 end if;
 update medcv_private.config set owner_user_id=p_user where owner_user_id is null;
 delete from medcv_private.pulse_sessions where expires_at<=now();
 insert into medcv_private.pulse_sessions(session_id,user_id,expires_at) values(p_session,p_user,p_expires)
 on conflict(session_id) do update set expires_at=excluded.expires_at;
 insert into medcv_private.audit(actor,action,details) values(p_user,'owner_email_verification',jsonb_build_object('expires_at',p_expires));
 return jsonb_build_object('ok',true,'expires_at',p_expires);
end $$;
create function public.medcv_issue_pulse_session(p_user uuid,p_session uuid,p_expires timestamptz) returns jsonb language sql security invoker set search_path='' as $$
 select medcv_private.issue_pulse_session(p_user,p_session,p_expires);
$$;
revoke all on function medcv_private.issue_pulse_session(uuid,uuid,timestamptz),public.medcv_issue_pulse_session(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function medcv_private.issue_pulse_session(uuid,uuid,timestamptz),public.medcv_issue_pulse_session(uuid,uuid,timestamptz) to service_role;
-- Keep existing verified TOTP/AAL2 access, and add only the service-issued email verification session.
do $$ declare body text; old text := 'if not medcv_private.is_owner(u) or (auth.jwt()->>''aal'' is distinct from ''aal2'' or not exists(select 1 from auth.mfa_factors where user_id=u and status=''verified'')) then'; begin
 select pg_get_functiondef('medcv_private.handle(text,jsonb)'::regprocedure) into body;
 if position(old in body)=0 then raise exception 'Owner authorization guard has changed; review migration'; end if;
 body:=replace(body,old,'if not medcv_private.is_owner(u) or not ((auth.jwt()->>''aal'' is not distinct from ''aal2'' and exists(select 1 from auth.mfa_factors where user_id=u and status=''verified'')) or exists(select 1 from medcv_private.pulse_sessions where session_id=(auth.jwt()->>''session_id'')::uuid and user_id=u and expires_at>now())) then');
 body:=replace(body,'''config'',(select to_jsonb(c)-''owner_email''-''identity_pepper'' from medcv_private.config c)','''config'',(select to_jsonb(c)-''owner_email''-''identity_pepper''-''owner_user_id'' from medcv_private.config c)');
 execute body;
end $$;
