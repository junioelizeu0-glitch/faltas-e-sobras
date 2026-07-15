
CREATE OR REPLACE FUNCTION public.log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_diff JSONB := '{}'::jsonb;
  v_id TEXT;
  v_ch TEXT;
  v_chamado_id TEXT;
  k TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_id := (v_old->>'id');
    v_ch := (v_old->>'chamado');
    v_chamado_id := (v_old->>'chamado_id');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_id := (v_new->>'id');
    v_ch := (v_new->>'chamado');
    v_chamado_id := (v_new->>'chamado_id');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_id := (v_new->>'id');
    v_ch := (v_new->>'chamado');
    v_chamado_id := (v_new->>'chamado_id');
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_old->k) IS DISTINCT FROM (v_new->k) THEN
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;

  -- Resolve chamado_num from parent when this is a child row
  IF v_ch IS NULL AND v_chamado_id IS NOT NULL THEN
    SELECT chamado INTO v_ch FROM public.chamados_faltas WHERE id::text = v_chamado_id;
  END IF;

  INSERT INTO public.audit_log(table_name, action, row_id, chamado_num, old_data, new_data, diff)
  VALUES (TG_TABLE_NAME, TG_OP, v_id, v_ch, v_old, v_new, CASE WHEN TG_OP='UPDATE' THEN v_diff ELSE NULL END);
  RETURN COALESCE(NEW, OLD);
END $function$;
