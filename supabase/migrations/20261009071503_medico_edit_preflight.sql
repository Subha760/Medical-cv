-- Explicit deny policies document that clients never read these private tables.
do $$ declare t text; begin foreach t in array array['config','profiles','receipts','ledger','templates','unlocks','edits','tickets','audit','qualified_subjects'] loop execute format('create policy medcv_no_direct_clients on medcv_private.%I for all to authenticated using (false) with check (false)',t);end loop;end $$;
alter table medcv_private.edits add column attempts integer not null default 0,add column attempted_at timestamptz;
create function medcv_private.check_edit(p_user uuid,p_session uuid,p_id uuid,p_fingerprint text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e medcv_private.edits;begin
 if not exists(select 1 from auth.sessions s join auth.users a on a.id=s.user_id where s.id=p_session and a.id=p_user and a.email_confirmed_at is not null and not coalesce(a.is_anonymous,false) and (s.not_after is null or s.not_after>now())) then raise exception 'Invalid verified session';end if;
 if exists(select 1 from medcv_private.profiles where user_id=p_user and frozen) then raise exception 'Account paused';end if;
 select * into e from medcv_private.edits where id=p_id and user_id=p_user for update;
 if e.id is null or e.fingerprint<>p_fingerprint or e.expires_at<now() or e.state='refunded' or p_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid or expired edit session';end if;
 if e.state='finalized' and e.result_hash<>p_hash then raise exception 'This credit has already finalized another version';end if;
 if e.attempts>=60 or e.attempted_at>now()-interval '2 seconds' then raise exception 'Please wait before retrying. Contact support after repeated export failures.';end if;
 update medcv_private.edits set attempts=attempts+1,attempted_at=now() where id=e.id;
 return jsonb_build_object('kind',e.kind);end $$;
create function public.medcv_check_edit(p_user uuid,p_session uuid,p_id uuid,p_fingerprint text,p_hash text) returns jsonb language sql security invoker set search_path='' as $$select medcv_private.check_edit(p_user,p_session,p_id,p_fingerprint,p_hash);$$;
revoke all on function public.medcv_check_edit(uuid,uuid,uuid,text,text),medcv_private.check_edit(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.medcv_check_edit(uuid,uuid,uuid,text,text),medcv_private.check_edit(uuid,uuid,uuid,text,text) to service_role;
