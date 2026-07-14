
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  row_id TEXT,
  chamado_num TEXT,
  old_data JSONB,
  new_data JSONB,
  diff JSONB
);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_chamado ON public.audit_log(chamado_num);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated, service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log open" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_changes() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_diff JSONB := '{}'::jsonb;
  v_id TEXT;
  v_ch TEXT;
  k TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_id := (v_old->>'id');
    v_ch := (v_old->>'chamado');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_id := (v_new->>'id');
    v_ch := (v_new->>'chamado');
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_id := (v_new->>'id');
    v_ch := (v_new->>'chamado');
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_old->k) IS DISTINCT FROM (v_new->k) THEN
        v_diff := v_diff || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
      END IF;
    END LOOP;
    IF v_diff = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.audit_log(table_name, action, row_id, chamado_num, old_data, new_data, diff)
  VALUES (TG_TABLE_NAME, TG_OP, v_id, v_ch, v_old, v_new, CASE WHEN TG_OP='UPDATE' THEN v_diff ELSE NULL END);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_audit_chamados AFTER INSERT OR UPDATE OR DELETE ON public.chamados_faltas
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_etapas AFTER INSERT OR UPDATE OR DELETE ON public.chamados_etapas
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_refs AFTER INSERT OR UPDATE OR DELETE ON public.chamados_referencias
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_lojas AFTER INSERT OR UPDATE OR DELETE ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_transp AFTER INSERT OR UPDATE OR DELETE ON public.transportadoras
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_confs AFTER INSERT OR UPDATE OR DELETE ON public.conferentes
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_motivos AFTER INSERT OR UPDATE OR DELETE ON public.motivos
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
CREATE TRIGGER trg_audit_tarefas AFTER INSERT OR UPDATE OR DELETE ON public.tarefas_catalogo
FOR EACH ROW EXECUTE FUNCTION public.log_changes();
