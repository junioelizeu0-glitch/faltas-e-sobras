
CREATE OR REPLACE FUNCTION public.aiiliana_run_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  lowered text;
BEGIN
  lowered := lower(btrim(sql));
  -- Only SELECT or WITH allowed, and nothing else chained
  IF NOT (lowered LIKE 'select %' OR lowered LIKE 'with %') THEN
    RAISE EXCEPTION 'Apenas consultas SELECT/WITH sao permitidas';
  END IF;
  IF lowered ~ ';\s*\S' THEN
    RAISE EXCEPTION 'Multiplas instrucoes nao permitidas';
  END IF;
  IF lowered ~* '\y(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|comment|reindex|vacuum|analyze|listen|notify|lock|set|reset|refresh|security)\y' THEN
    RAISE EXCEPTION 'Palavra-chave nao permitida na consulta';
  END IF;

  SET LOCAL statement_timeout = '10s';
  SET LOCAL default_transaction_read_only = on;

  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', rtrim(sql, ';')) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.aiiliana_run_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aiiliana_run_sql(text) TO service_role;
