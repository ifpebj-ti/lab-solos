-- Use somente em um banco existente criado por EnsureCreated e já validado contra
-- 20260830172637_InitialSchemaBaseline. Execute com uma conta autorizada e backup válido.
BEGIN;

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

DO $baseline$
DECLARE
    required_table text;
BEGIN
    IF EXISTS (
        SELECT 1 FROM "__EFMigrationsHistory"
        WHERE "MigrationId" = '20260830172637_InitialSchemaBaseline'
    ) THEN
        RETURN;
    END IF;

    FOREACH required_table IN ARRAY ARRAY[
        'Usuarios', 'Lotes', 'Produtos', 'Emprestimos', 'ProdutosEmprestados',
        'Notificacoes', 'LogsAuditoria'
    ] LOOP
        IF to_regclass(format('public.%I', required_table)) IS NULL THEN
            RAISE EXCEPTION 'baseline_schema_mismatch: tabela % ausente', required_table;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Usuarios'
          AND column_name = 'TokenRedefinicao'
    ) OR EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Usuarios'
          AND column_name IN ('ExigeTrocaSenha', 'VersaoSessao', 'TokenRedefinicaoHash')
    ) THEN
        RAISE EXCEPTION 'baseline_schema_mismatch: estado de credenciais não corresponde ao legado';
    END IF;
END
$baseline$;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260830172637_InitialSchemaBaseline', '9.0.19')
ON CONFLICT ("MigrationId") DO NOTHING;

COMMIT;
