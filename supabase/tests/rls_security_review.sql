-- Live RLS regression for the 2026-11 security review (54 checks).
-- SAFE ON PRODUCTION: one DO block; every check runs in a sub-block that is undone,
-- and the block ends with RAISE EXCEPTION carrying the results, so the whole
-- transaction rolls back. Run:  supabase db query --linked --file supabase/tests/rls_security_review.sql
-- Then confirm: select count(*) from auth.users where email like '%@example.invalid';  -- must be 0

-- RLS live test for 20261113140000 + 20261114120000. ONE DO block, always rolls back:
-- every check runs in a sub-block that ends with RAISE 'UNDO' (or a real error),
-- and the whole block ends with RAISE EXCEPTION 'RLS_RESULTS ...'. Synthetic data only.
DO $rls$
DECLARE
  r   jsonb := '[]'::jsonb;
  P   uuid := gen_random_uuid();  V uuid := gen_random_uuid();  L uuid := gen_random_uuid();
  E   uuid := gen_random_uuid();  S uuid := gen_random_uuid();  S2 uuid := gen_random_uuid();
  C   uuid := gen_random_uuid();  CS uuid := gen_random_uuid();
  rid uuid := gen_random_uuid();  plog uuid := gen_random_uuid();
  id1 uuid; id2 uuid; ch uuid; pid uuid; nid uuid; pid2 uuid;
  n int; got text; tmp jsonb;
BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'ABORT: expected postgres, got %', current_user; END IF;

  -- ───────── setup (postgres) ─────────
  INSERT INTO auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  SELECT '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'rls-'||k||'-'||left(u::text,8)||'@example.invalid', '{}', '{}', now(), now()
  FROM (VALUES (P,'p'),(V,'v'),(L,'l'),(E,'e'),(S,'s'),(S2,'s2')) t(u,k);
  INSERT INTO profiles (id, name) VALUES (P,'Synthetic P'),(V,'Synthetic V'),(L,'Synthetic L'),(E,'Synthetic E'),(S,'Synthetic S');
  INSERT INTO children (id, parent_id, name, blood_type, allergies, medications, conditions, pediatrician)
  VALUES (C, P, 'Synthetic C', 'O+', '{peanut}', '{ibuprofen}', '{asthma}', '{"name":"Dr Synthetic"}'),
         (CS, S, 'Synthetic CS', NULL, '{}', '{}', '{}', NULL);
  INSERT INTO child_caregivers (child_id, user_id, invited_by, email, role, status, permissions) VALUES
    (C, P, P, 'rls-pself@example.invalid', 'parent', 'accepted', '{}'),
    (C, V, P, 'rls-v@example.invalid',     'family', 'accepted', '{"view":true}'),
    (C, L, P, 'rls-l@example.invalid',     'nanny',  'accepted', '{"view":true,"log_activity":true}'),
    (C, E, P, 'rls-e@example.invalid',     'family', 'accepted', '{"view":true,"emergency":true}');
  INSERT INTO kids_reminders (id, user_id, child_id, text) VALUES (rid, P, C, 'synthetic reminder');
  INSERT INTO child_logs (id, child_id, user_id, type, value) VALUES (plog, C, P, 'feeding', 'synthetic');
  INSERT INTO cycle_logs (user_id, date, type) VALUES (P, current_date, 'note');
  INSERT INTO pregnancy_logs (user_id, log_date, log_type) VALUES (P, current_date, 'note');
  INSERT INTO menopause_logs (user_id, date, type) VALUES (P, current_date, 'note');

  -- Macro (inlined everywhere):
  --   as X:  PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',X,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',X::text,true);
  --   back:  PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);

  -- ───────── 1. children PHI direct read ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM (SELECT blood_type, allergies, medications, conditions, pediatrician FROM children WHERE id = C) x;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','1','a','V','exp','0 rows','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',E,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',E::text,true);
    SELECT count(*) INTO n FROM (SELECT blood_type, allergies, medications, conditions, pediatrician FROM children WHERE id = C) x;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','1','a','E','exp','1 row','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',P,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',P::text,true);
    SELECT count(*) INTO n FROM (SELECT blood_type, allergies, medications, conditions, pediatrician FROM children WHERE id = C) x;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','1','a','P','exp','1 row','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    SELECT count(*) INTO n FROM children WHERE id = C;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','1x','a','S','exp','0 rows','got',got);

  -- ───────── 2. get_caregiver_children masking ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT jsonb_agg(jsonb_build_object('blood',g.blood_type,'allergies',g.allergies,'meds',g.medications,'cond',g.conditions,'ped',g.pediatrician)) INTO tmp FROM get_caregiver_children() g WHERE g.id = C;
    got := COALESCE(tmp::text,'0 rows'); RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','2','a','V','exp','C returned, PHI masked','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',E,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',E::text,true);
    SELECT jsonb_agg(jsonb_build_object('blood',g.blood_type,'allergies',g.allergies,'meds',g.medications,'cond',g.conditions,'ped',g.pediatrician)) INTO tmp FROM get_caregiver_children() g WHERE g.id = C;
    got := COALESCE(tmp::text,'0 rows'); RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','2','a','E','exp','C returned, PHI unmasked','got',got);

  -- ───────── 3. child_logs insert by caregivers ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    INSERT INTO child_logs (child_id, user_id, type, value) VALUES (C, V, 'feeding', 'synthetic');
    got := 'inserted'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','3','a','V','exp','denied','got',got);

  got := NULL; BEGIN
    id1 := gen_random_uuid();
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',L,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',L::text,true);
    INSERT INTO child_logs (id, child_id, user_id, type, value) VALUES (id1, C, L, 'feeding', 'synthetic');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT 'inserted; stored user_id='||CASE user_id WHEN P THEN 'P' WHEN L THEN 'L' ELSE user_id::text END||' logged_by='||CASE logged_by WHEN L THEN 'L' ELSE coalesce(logged_by::text,'null') END INTO got FROM child_logs WHERE id = id1;
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','3','a','L','exp','allowed','got',got);

  -- extra: L claims authorship as S
  got := NULL; BEGIN
    id1 := gen_random_uuid();
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',L,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',L::text,true);
    INSERT INTO child_logs (id, child_id, user_id, logged_by, type, value) VALUES (id1, C, S, S, 'feeding', 'synthetic');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT 'stored user_id='||CASE user_id WHEN P THEN 'P' WHEN S THEN 'S' ELSE user_id::text END||' logged_by='||CASE logged_by WHEN L THEN 'L' WHEN S THEN 'S' ELSE coalesce(logged_by::text,'null') END INTO got FROM child_logs WHERE id = id1;
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','3x','a','L','exp','user_id=P logged_by=L (spoof overwritten)','got',got);

  -- ───────── 4. child_logs re-point to foreign child ─────────
  got := NULL; BEGIN
    id1 := gen_random_uuid();
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    INSERT INTO child_logs (id, child_id, user_id, type, value) VALUES (id1, CS, S, 'feeding', 'synthetic');
    UPDATE child_logs SET child_id = C WHERE id = id1; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','4','a','S','exp','denied / 0 rows','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    INSERT INTO child_logs (child_id, user_id, type, value) VALUES (C, S, 'feeding', 'synthetic');
    got := 'inserted'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','4x','a','S','exp','denied (direct insert for C)','got',got);

  -- ───────── 5. kids_reminders ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    DELETE FROM kids_reminders WHERE child_id = C; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows deleted'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','5','a','V','exp','0 rows deleted','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',L,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',L::text,true);
    DELETE FROM kids_reminders WHERE child_id = C; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows deleted'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','5','a','L','exp','1 row deleted','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    UPDATE kids_reminders SET user_id = V WHERE id = rid; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','5','a','V','exp','denied / 0 rows (user_id change)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',L,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',L::text,true);
    UPDATE kids_reminders SET user_id = L WHERE id = rid; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','5x','a','L','exp','denied (owner frozen)','got',got);

  -- ───────── 6. invite forced pending ─────────
  got := NULL; BEGIN
    id1 := gen_random_uuid();
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',P,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',P::text,true);
    INSERT INTO child_caregivers (id, child_id, invited_by, user_id, status, role, email, permissions)
    VALUES (id1, C, P, S, 'accepted', 'family', 'rls-x@example.invalid', '{"view":true}');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT 'user_id='||coalesce(user_id::text,'NULL')||' status='||status INTO got FROM child_caregivers WHERE id = id1;
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','6','a','P','exp','user_id=NULL status=pending','got',got);

  -- ───────── 7. one co-parent invite ─────────
  BEGIN
    id1 := gen_random_uuid();
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',P,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',P::text,true);
    got := NULL; BEGIN
      INSERT INTO child_caregivers (id, child_id, invited_by, role, email) VALUES (id1, C, P, 'parent', 'rls-cp1@example.invalid');
      got := 'inserted';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','7a','a','P','exp','allowed, pending','got',got);
    got := NULL; BEGIN
      INSERT INTO child_caregivers (child_id, invited_by, role, email) VALUES (C, P, 'parent', 'rls-cp2@example.invalid');
      got := 'inserted';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','7b','a','P','exp','ERR already has a co-parent','got',got);
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT 'status='||status INTO got FROM child_caregivers WHERE id = id1;
    r := r || jsonb_build_object('c','7a+','a','pg read','exp','status=pending','got',coalesce(got,'row missing'));
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN r := r || jsonb_build_object('c','7','a','setup','got','ERR: '||SQLERRM); END IF; END;

  -- ───────── 8. caregiver self-edit ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    UPDATE child_caregivers SET permissions = permissions || '{"emergency":true}'::jsonb WHERE child_id = C AND user_id = V; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','8','a','V','exp','denied (add emergency)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    UPDATE child_caregivers SET role = 'parent' WHERE child_id = C AND user_id = V; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','8x','a','V','exp','denied (role->parent)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    UPDATE child_caregivers SET status = 'revoked' WHERE child_id = C AND user_id = V; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','8','a','V','exp','1 row (leave allowed)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM child_caregivers WHERE child_id = C;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','8y','a','V','exp','1 row (own link only)','got',got);

  -- ───────── 9. billing columns ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    UPDATE profiles SET subscription_status = 'premium' WHERE id = S; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','9a','a','S','exp','denied','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    UPDATE profiles SET subscription_tier = 'premium_family' WHERE id = S; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','9b','a','S','exp','denied','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    UPDATE profiles SET subscription_event_ms = 9000000000000000 WHERE id = S; GET DIAGNOSTICS n = ROW_COUNT;
    got := n||' rows updated'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','9c','a','S','exp','denied','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S2,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S2::text,true);
    INSERT INTO profiles (id, name, subscription_tier, subscription_status) VALUES (S2, 'Synthetic S2', 'premium_family', 'premium');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT 'tier='||coalesce(subscription_tier::text,'NULL')||' status='||coalesce(subscription_status,'NULL') INTO got FROM profiles WHERE id = S2;
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','9d','a','S2','exp','tier=free status=free','got',got);

  -- ───────── 10. profiles_public ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    SELECT count(*) INTO n FROM profiles_public WHERE id = P;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','10','a','S','exp','0 rows','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM profiles_public WHERE id = P;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','10','a','V','exp','1 row','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','anon',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT count(*) INTO n FROM profiles_public;
    got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','10','a','anon','exp','permission denied','got',got);

  -- ───────── 11. create_notification + reply-title spoof ─────────
  BEGIN
    ch := gen_random_uuid(); pid := gen_random_uuid();
    INSERT INTO channels (id, name, channel_type, created_by) VALUES (ch, 'rls-synthetic', 'public', P);
    INSERT INTO channel_members (channel_id, user_id) VALUES (ch, P), (ch, S);
    INSERT INTO channel_posts (id, channel_id, author_id, content, author_name) VALUES (pid, ch, P, 'synthetic P post', 'Synthetic P');
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);

    got := NULL; BEGIN PERFORM create_notification(P, 'caregiver_update', 'Support', 'verify your account', '{}'::jsonb, NULL); got := 'allowed';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','11a','a','S','exp','error','got',got);

    got := NULL; BEGIN PERFORM create_notification(P, 'mention', 'x', 'y', '{}'::jsonb, NULL); got := 'allowed';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','11b','a','S','exp','error','got',got);

    got := NULL; BEGIN PERFORM create_notification(P, 'mention', 'Support', 'verify', '{}'::jsonb, ch); got := 'allowed';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','11c','a','S','exp','error (no recent post)','got',got);

    got := NULL; BEGIN
      INSERT INTO channel_posts (id, channel_id, author_id, content) VALUES (gen_random_uuid(), ch, S, 'no mention here') RETURNING id INTO nid;
      PERFORM create_notification(P, 'mention', 'x', 'y', jsonb_build_object('postId', nid), ch); got := 'allowed';
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    r := r || jsonb_build_object('c','11c2','a','S','exp','error (P not in post mentions)','got',got);

    got := NULL; nid := NULL; BEGIN
      INSERT INTO channel_posts (channel_id, author_id, content, mentions) VALUES (ch, S, 'synthetic S post', ARRAY[P]) RETURNING id INTO pid2;
      nid := create_notification(P, 'mention', 'Support: verify your account', 'verify at evil.example', jsonb_build_object('postId', pid2), ch);
      got := 'allowed';
      IF create_notification(P, 'mention', 'again', 'again', jsonb_build_object('postId', pid2), ch) IS NULL
        THEN r := r || jsonb_build_object('c','11f','a','S','exp','dup -> NULL','got','NULL');
        ELSE r := r || jsonb_build_object('c','11f','a','S','exp','dup -> NULL','got','created another'); END IF;
    EXCEPTION WHEN OTHERS THEN got := 'ERR: '||SQLERRM; END;
    -- reply-title spoof (notify_thread_reply uses client-supplied author_name)
    BEGIN
      INSERT INTO channel_posts (channel_id, author_id, content, reply_to_id, author_name)
      VALUES (ch, S, 'Your account is locked - verify at evil.example', pid, 'Grandma Support');
    EXCEPTION WHEN OTHERS THEN r := r || jsonb_build_object('c','11e','a','S','got','reply insert ERR: '||SQLERRM); END;

    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    IF nid IS NOT NULL THEN SELECT got||'; title="'||title||'" body="'||coalesce(body,'')||'"' INTO got FROM notifications WHERE id = nid; END IF;
    r := r || jsonb_build_object('c','11d','a','S','exp','allowed; server-built title, body = post text not "verify at evil.example"','got',got);
    SELECT string_agg('title="'||title||'" body="'||coalesce(body,'')||'"', ' || ') INTO got FROM notifications WHERE user_id = P AND type = 'reply';
    r := r || jsonb_build_object('c','11e','a','S','exp','title uses real profile name, not "Grandma Support"','got',coalesce(got,'no reply notification'));
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN r := r || jsonb_build_object('c','11','a','setup','got','ERR: '||SQLERRM); END IF; END;

  -- ───────── 12. private channel membership ─────────
  BEGIN
    ch := gen_random_uuid();
    INSERT INTO channels (id, name, channel_type, created_by) VALUES (ch, 'rls-private', 'private', P);
    INSERT INTO channel_members (channel_id, user_id) VALUES (ch, P);
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    SELECT count(*) INTO n FROM channel_members WHERE channel_id = ch;
    r := r || jsonb_build_object('c','12','a','S','exp','0 rows','got',n||' rows');
    SELECT count(*) INTO n FROM channels WHERE id = ch;
    r := r || jsonb_build_object('c','12x','a','S','exp','info: private channel row visible?','got',n||' rows');
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN r := r || jsonb_build_object('c','12','a','S','got','ERR: '||SQLERRM); END IF; END;

  -- ───────── 13. scan_history locked caregiver ─────────
  BEGIN
    INSERT INTO scan_history (child_id, user_id, scan_type, result_json) VALUES (C, P, 'food', '{}');
    INSERT INTO scan_history (child_id, user_id, scan_type, result_json) VALUES (C, V, 'food', '{}');
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM scan_history WHERE child_id = C;
    r := r || jsonb_build_object('c','13ctl','a','V unlocked','exp','2 rows (control)','got',n||' rows');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    UPDATE child_caregivers SET is_locked = true WHERE child_id = C AND user_id = V;
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM scan_history WHERE child_id = C;
    r := r || jsonb_build_object('c','13','a','V locked','exp','0 rows (incl. V own scan)','got',n||' rows');
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN r := r || jsonb_build_object('c','13','a','V','got','ERR: '||SQLERRM); END IF; END;

  -- ───────── 14. anon community reads + storage listing ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','anon',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT count(*) INTO n FROM garage_posts; got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','14','a','anon','exp','permission denied (garage_posts)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','anon',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT count(*) INTO n FROM channels; got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','14','a','anon','exp','permission denied (channels)','got',got);

  got := NULL; BEGIN
    IF to_regclass('public.garage_listings') IS NULL THEN got := 'n/a: table does not exist';
    ELSE
      PERFORM set_config('role','anon',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
      EXECUTE 'SELECT count(*) FROM public.garage_listings' INTO n; got := n||' rows';
    END IF;
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','14','a','anon','exp','permission denied (garage_listings)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','anon',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id IN ('garage-photos','garage-media'); got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','14','a','anon','exp','0 rows (storage garage-*)','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    SELECT count(*) INTO n FROM storage.objects WHERE bucket_id IN ('garage-photos','garage-media'); got := n||' rows'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','14x','a','S','exp','0 rows (S owns none)','got',got);

  -- ───────── 15. personal health logs ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    got := 'cycle='||(SELECT count(*) FROM cycle_logs WHERE user_id = P)||' preg='||(SELECT count(*) FROM pregnancy_logs WHERE user_id = P)||' meno='||(SELECT count(*) FROM menopause_logs WHERE user_id = P);
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','15','a','S','exp','cycle=0 preg=0 meno=0','got',got);

  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    got := 'cycle='||(SELECT count(*) FROM cycle_logs WHERE user_id = P)||' preg='||(SELECT count(*) FROM pregnancy_logs WHERE user_id = P)||' meno='||(SELECT count(*) FROM menopause_logs WHERE user_id = P);
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','15','a','V','exp','cycle=0 preg=0 meno=0','got',got);

  -- ───────── 16. reserve_ai_call ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    got := 'allowed: '||public.reserve_ai_call(S, 'scan-image', 3, 3, 3, 0); RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','16','a','S','exp','permission denied','got',got);

  -- ───────── 17. stranger invites to foreign child ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    INSERT INTO child_caregivers (child_id, invited_by, user_id, status, role, email) VALUES (C, S, S, 'accepted', 'family', 'rls-s17@example.invalid');
    got := 'inserted'; RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','17','a','S','exp','denied','got',got);

  -- ───────── 18. revocation removes access (threat #6) ─────────
  BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    SELECT count(*) INTO n FROM child_logs WHERE child_id = C;
    r := r || jsonb_build_object('c','18ctl','a','V active','exp','>=1 row (control, by design)','got',n||' rows');
    PERFORM set_config('role','postgres',true), set_config('request.jwt.claims','',true), set_config('request.jwt.claim.sub','',true);
    UPDATE child_caregivers SET status = 'revoked' WHERE child_id = C AND user_id IN (V, E);
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',V,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',V::text,true);
    got := 'child_logs='||(SELECT count(*) FROM child_logs WHERE child_id = C)||' reminders='||(SELECT count(*) FROM kids_reminders WHERE child_id = C)||' rpc='||(SELECT count(*) FROM get_caregiver_children())||' scans='||(SELECT count(*) FROM scan_history WHERE child_id = C);
    r := r || jsonb_build_object('c','18','a','V revoked','exp','all 0','got',got);
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',E,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',E::text,true);
    SELECT count(*) INTO n FROM children WHERE id = C;
    r := r || jsonb_build_object('c','18','a','E revoked','exp','0 rows children','got',n||' rows');
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN r := r || jsonb_build_object('c','18','a','V/E','got','ERR: '||SQLERRM); END IF; END;

  -- ───────── 19. stranger sees nothing of C ─────────
  got := NULL; BEGIN
    PERFORM set_config('role','authenticated',true), set_config('request.jwt.claims', json_build_object('sub',S,'role','authenticated')::text,true), set_config('request.jwt.claim.sub',S::text,true);
    got := 'child_logs='||(SELECT count(*) FROM child_logs WHERE child_id = C)||' reminders='||(SELECT count(*) FROM kids_reminders WHERE child_id = C)||' links='||(SELECT count(*) FROM child_caregivers WHERE child_id = C)||' scans='||(SELECT count(*) FROM scan_history WHERE child_id = C);
    RAISE EXCEPTION 'UNDO';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'UNDO' THEN got := 'ERR: '||SQLERRM; END IF; END;
  r := r || jsonb_build_object('c','19','a','S','exp','all 0','got',got);

  RAISE EXCEPTION 'RLS_RESULTS %', r::text;
END
$rls$;
