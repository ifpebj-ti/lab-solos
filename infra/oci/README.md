# Infraestrutura OCI do LabOn

Este diretório cria um compartimento dedicado, rede pública, regras mínimas de firewall e uma VM ARM para o LabOn. A operação da aplicação usa o `docker-compose-prod.yml`; o guia canônico de configuração, diagnóstico e backup fica na [Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose).

Referência de infraestrutura: `790ee6bd8a1a32ff7e5519d591b73931f537657b` · 2026-09-22. Revisão operacional T028: 2026-10-13.

## Provisionamento

Configuração padrão:

- região `sa-saopaulo-1`;
- shape `VM.Standard.A2.Flex`;
- 1 OCPU e 4 GB de RAM;
- Ubuntu 24.04 ARM;
- volume de boot de 50 GB;
- portas públicas 80/443 e SSH restrito ao `admin_cidr`.

O estado Terraform, planos e `terraform.tfvars` são locais e não devem ser versionados.

```powershell
$env:TF_VAR_tenancy_ocid = "ocid1.tenancy.oc1..substitua"
$env:TF_VAR_admin_cidr = "203.0.113.10/32"
terraform -chdir=infra/oci init
terraform -chdir=infra/oci plan -out=labon.tfplan
terraform -chdir=infra/oci apply labon.tfplan
```

Após o `apply`, use o output `dns_record` para preparar o DNS. Não registre valores de tenancy, chaves ou credenciais em evidências.

## Pré-requisitos da aplicação

Na VM, o diretório de implantação é `/opt/labon`. O `.env` desse diretório deve ser criado pelo responsável com `APP_DOMAIN`, `LABON_IMAGE_VERSION`, os repositórios de imagens se necessário, conexão PostgreSQL, SMTP, JWT e seed. Use o [bloco de produção da Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execu%C3%A7%C3%A3o-e-Configura%C3%A7%C3%A3o-com-Docker-e-Docker-Compose) somente como contrato de nomes e estrutura; os valores publicados são fictícios.

Antes de iniciar uma release, confira no host:

```bash
cd /opt/labon
docker info
docker compose version
docker compose --env-file .env -f docker-compose-prod.yml config --quiet
```

Produção publica somente Caddy em 80/443. Frontend, backend e PostgreSQL ficam nas redes internas; `pg_data`, `caddy_data` e `caddy_config` são persistentes. `config --quiet` não valida DNS/TLS, login, migrações, SMTP ou existência das imagens.

## Segredos e proteção da autenticação

O `.env` aponta para dois arquivos no host: `AUTHENTICATION_THROTTLE_KEY_FILE` contém pelo menos 32 bytes aleatórios em formato binário; `RECOVERY_ENCRYPTION_KEYS_FILE` contém um JSON de até 65.536 bytes com `activeKeyId` e um mapa `keys`, cada chave decodificada com exatamente 32 bytes. O exemplo de produção usa `./secrets/authentication-throttle-key` e `./secrets/recovery-encryption-keys.json`, relativos a `/opt/labon`. A API os monta somente para leitura em `/run/secrets/` e roda como o usuário não root `app`.

Gere as chaves no host, nunca em uma imagem, no Git ou na linha de comando de um processo da aplicação. No Ubuntu, execute o bloco como operador autorizado com `sudo`; não habilite `set -x` e não imprima o conteúdo dos arquivos. A imagem ASP.NET 8 usa o usuário não root `app` com UID 1654; o diretório e os arquivos abaixo são legíveis por esse grupo, mas não por outros usuários do host. Consulte a [documentação Microsoft sobre o usuário não root `app`](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8/containers#non-root-user).

```bash
cd /opt/labon
sudo install -d -o root -g 1654 -m 0750 /opt/labon/secrets
sudo sh -c 'umask 077; \
  openssl rand -out /opt/labon/secrets/authentication-throttle-key 32; \
  recovery_key=$(openssl rand -base64 32 | tr -d "\n"); \
  printf "{\"activeKeyId\":\"v1\",\"keys\":{\"v1\":\"%s\"}}\n" "$recovery_key" > /opt/labon/secrets/recovery-encryption-keys.json; \
  unset recovery_key; \
  chown root:1654 /opt/labon/secrets/authentication-throttle-key /opt/labon/secrets/recovery-encryption-keys.json; \
  chmod 0440 /opt/labon/secrets/authentication-throttle-key /opt/labon/secrets/recovery-encryption-keys.json'
```

Execute esse bloco somente na configuração inicial e depois de confirmar que os dois arquivos de destino ainda não existem: os comandos sobrescrevem arquivos existentes. Em uma instalação que já usa essas chaves, não gere valores novos por este procedimento; siga a rotação coordenada abaixo.

Antes de iniciar ou atualizar, confirme que `.env` aponta para esses arquivos, sem copiar os valores para o terminal ou para tickets. `docker compose ... config --quiet` valida a estrutura do Compose e os caminhos declarados, mas não valida o conteúdo das chaves nem a leitura por `app`. A inicialização da API faz a validação autoritativa: se faltar arquivo, permissão, formato ou chave ativa, a API não entra em operação. Após iniciar, confira a saúde e os logs sanitizados do serviço; não grave saídas de `docker inspect`/`config` sem `--quiet`, pois variáveis de ambiente contêm outros segredos.

Todas as instâncias conectadas ao mesmo banco devem usar os mesmos valores de política e bytes idênticos nos arquivos. O startup registra uma impressão da configuração e recusa uma instância que divirja de outra ativa. No Compose OCI atual há um serviço `backend`; rotação requer janela coordenada, atualizar o arquivo e recriar todas as instâncias, não apenas reiniciar uma delas. Mantenha cópia protegida dos dois arquivos junto ao backup de banco. Uma restauração de fila sem a chave de recuperação correspondente não consegue descriptografar pedidos.

### Rotação

**Chave de recuperação:** acrescente uma chave aleatória de 32 bytes ao mapa e a torne `activeKeyId`, conservando as chaves antigas. Atualize o arquivo de forma coordenada em todas as instâncias, recrie os serviços e confirme que ficaram saudáveis. Os trabalhos ativos guardam o identificador da chave usada; consulte apenas contagens por identificador e estado, sem ler destinatários ou payload:

```sql
SELECT "EncryptionKeyId", "Status", COUNT(*) AS active_jobs
FROM "PasswordRecoveryJobs"
WHERE "Status" IN ('Pending', 'Processing')
  AND "ExpiresAt" > clock_timestamp()
GROUP BY "EncryptionKeyId", "Status"
ORDER BY "EncryptionKeyId", "Status";
```

Retenha uma chave antiga até a consulta não retornar trabalho ativo que a utilize. Só então remova-a, atualize todas as instâncias e recrie os serviços novamente. A validação de inicialização interrompe o start se algum pedido ativo depender de uma chave ausente.

**Chave HMAC das cotas:** ela não é intercambiável durante janelas ativas; uma chave diferente produz hashes que não encontram as linhas anteriores. Não a substitua para “limpar” limites. Planeje janela sem tentativas, espere pelo menos a maior janela/cooldown configurada após a última tentativa com a chave antiga e confirme que o trabalhador removeu buckets expirados; então atualize o arquivo e recrie todas as instâncias juntas. Os valores padrão têm janelas de até uma hora e o validador permite até 24 horas, portanto use a configuração efetiva, não um prazo fixo presumido. Não apague `AuthenticationThrottleBuckets` para acelerar a rotação.

## Limites, NAT e saturação

Os valores de produção atuais são os padrões de `AuthenticationProtectionOptions`, pois o Compose não os substitui:

| Fluxo | Cota por destinatário/conta | Cota por IP | Janela/intervalo |
| --- | ---: | ---: | --- |
| Login | 5 falhas por conta | 30 falhas | Janela fixa de 15 min |
| Pedido de recuperação | 3 pedidos admitidos por destinatário | 20 pedidos | Janela fixa de 1 h; no mínimo 60 s entre emissões efetivas |
| Validação de código de recuperação | 5 falhas por destinatário | 30 falhas | Janela fixa de 15 min |

As cotas são transacionais e compartilhadas pelo PostgreSQL entre instâncias. A janela começa na primeira falha/pedido admitido e não desliza por tentativas recusadas; sucesso de login não zera uma cota ativa. Email é normalizado por `Trim` e minúsculas somente para calcular a cota. A identidade e a entrega continuam usando igualdade exata; pontos e sufixos `+` não são removidos. Os IPs são interpretados após `ForwardedHeaders`: somente o IP exato do Caddy e `ForwardLimit=1` são confiáveis. A borda não aceita o `X-Forwarded-For` fornecido pelo cliente como origem. Vários usuários atrás de NAT compartilham a cota de IP e podem atingir o limite juntos; não aumente o limite preventivamente sem evidência de uso e revisão do risco.

A configuração inicial permite até 10.000 buckets por espaço de cota e 5.000 pedidos ativos; o processo de limpeza verifica até 100 buckets por lote a cada 30 segundos. Esses são tetos compartilhados no banco, não uma promessa de throughput. Consulte capacidade e filas somente com agregações:

```sql
SELECT "Scope", "Allocated" FROM "AuthenticationProtectionCapacity" ORDER BY "Scope";
SELECT "Scope", COUNT(*) AS buckets FROM "AuthenticationThrottleBuckets" GROUP BY "Scope" ORDER BY "Scope";
SELECT "Status", COUNT(*) AS jobs, MIN("CreatedAt") AS oldest_created_at
FROM "PasswordRecoveryJobs" GROUP BY "Status" ORDER BY "Status";
```

Ao encontrar saturação, confirme conectividade PostgreSQL, estado agregado da fila e logs locais do trabalhador SMTP. Preserve as contagens e horários; não remova buckets, zere contadores nem exclua pedidos para recuperar disponibilidade. Login e validação de código falham fechados com 503 quando o banco/proteção não pode responder; a solicitação pública de recuperação mantém sua resposta neutra 202 e pode não gerar uma mensagem. A resposta neutra não prova entrega. Se a saturação persistir, use o procedimento de incidente e uma mudança revisada de capacidade/configuração; não amplie CORS nem relaxe a CSP como contorno.

O transporte SMTP é externo à transação do banco. Se a conexão cair depois de o servidor de email aceitar uma mensagem, a repetição limitada pode entregar o mesmo código mais de uma vez. O sistema limita a três tentativas, mas não garante “exatamente uma entrega”. O serviço não consulta se a conta existe na resposta pública. Para diagnosticar, compare contagens agregadas e o estado do transporte; não copie email, código, token, payload ou logs integrais para tickets.

Produção mantém frontend e API na mesma origem através do Caddy. `CORS` não autoriza origens externas; não adicione `AllowAll` ou `AllowCredentials`. A CSP efetiva é aplicada ao ramo frontend pelo snippet `infra/proxy/security-headers.caddy`; o ramo `/api/*` não recebe a política do frontend. O backend confia somente no IP de proxy configurado em `CADDY_PROXY_IP`; a sub-rede ilustrativa em `.env.prod.example` precisa ser conferida contra redes existentes no host antes do uso. No Compose de desenvolvimento, as origens exatas são montadas a partir de `FRONTEND_PORT`; o `.env.example` define `http://localhost:8081` e `http://127.0.0.1:8081`. Esses valores não configuram CORS em produção.

Consulte o [runbook completo de proteção e autenticação](../../.codex/docs/specs/protecao-acesso-autenticacao/operacao.md) para os passos antes/depois de uma release, diagnóstico e reversão segura.

## Atualização automática por release

O Compose usa imagens multi-arquitetura publicadas no GHCR com tag SemVer. A VM consulta a release estável mais recente, baixa frontend/backend, recria os serviços e só registra a nova versão após o health check. Em caso de falha, o script tenta restaurar a versão de imagem anterior.

Instalação ou atualização do timer na VM:

```bash
cd /opt/labon
sudo ./infra/oci/scripts/install-auto-update.sh
```

Deploy manual de uma versão específica:

```bash
cd /opt/labon
bash ./infra/oci/scripts/deploy-release.sh 2.7.2
```

O argumento deve ser uma versão SemVer existente no GHCR. O script usa o `.env`, valida a configuração, verifica as imagens, executa `docker compose pull` e `up`, consulta `http://backend:8080/api/System/health` a partir do proxy e grava `.deployed-version` somente após sucesso.

O health check do script, nesta referência, envia `Host: labon.nmvr.me`. Portanto, uma instalação com outro `APP_DOMAIN` precisa ser conferida antes de depender do deploy automático; alterar esse comportamento exige uma mudança separada no script, fora deste README. O endpoint retorna um sinal HTTP simples e não comprova a integridade dos dados nem a entrega de e-mail.

## Diagnóstico do atualizador

```bash
systemctl status labon-update.timer
systemctl show labon-update.service -p Result -p ExecMainStatus
journalctl -u labon-update.service --since today
cat /opt/labon/.deployed-version
docker compose --env-file /opt/labon/.env -f /opt/labon/docker-compose-prod.yml ps
```

O serviço systemd usa `DOCKER_CONFIG=/var/lib/labon-docker`, `ProtectHome=true`, `PrivateTmp=true` e permissões de leitura do projeto. Os registros devem ser inspecionados localmente; não copie `.env`, tokens ou logs completos para tickets.

## Rollback e banco de dados

O rollback automático é limitado: se uma release falhar no health check e houver versão anterior válida, o script restaura somente as imagens frontend/backend e repete o percurso de saúde. Ele não restaura PostgreSQL, não desfaz `Database.Migrate()` e não reverte migrações. Sem versão anterior válida, a operação termina com erro e exige decisão do operador.

Antes de uma release que altere o esquema:

1. interrompa escritas conforme a janela aprovada;
2. crie e teste um backup em formato nativo, sem conversão textual;
3. compare o esquema com a baseline e revise o script de migração;
4. faça a atualização e valide `__EFMigrationsHistory`, contagens sanitizadas e acesso;
5. se houver falha, prefira roll-forward compatível ou restaure o backup em banco isolado; não execute rollback destrutivo diretamente em produção.

Siga o [procedimento de migrações](../../backend/LabSolos-Server-DotNet8/Data/Migrations/README.md) e o roteiro de [backup/restauração da Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execu%C3%A7%C3%A3o-e-Configura%C3%A7%C3%A3o-com-Docker-e-Docker-Compose). Não marque uma baseline sem conferir o esquema completo.

## Configuração do Docker no serviço

O atualizador mantém `ProtectHome=true` e usa `DOCKER_CONFIG=/var/lib/labon-docker`. O systemd cria esse diretório com `StateDirectory=labon-docker`, dono `ubuntu` e permissão `0700`, permitindo ao serviço encontrar o plugin Compose sem acessar `/home/ubuntu/.docker`. As imagens públicas do GHCR não exigem copiar credenciais do usuário.

## Rotação de logs dos contêineres

Os quatro serviços de produção usam `json-file`, com `max-size: "10m"` e `max-file: "3"`: aproximadamente 30 MB por serviço, 120 MB no conjunto. Os limites são definidos no Compose, sem alterar o daemon Docker para outros contêineres. A configuração entra em vigor ao recriar os serviços; `docker restart` isolado não a aplica aos contêineres existentes.

```bash
docker inspect labon-backend-1 labon-frontend-1 labon-db-1 labon-proxy-1 \
  --format '{{.Name}} {{json .HostConfig.LogConfig}}'
```

## Bancos legados e seed

O bootstrap atual usa `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` somente quando não há usuários. Em um banco que já contém usuários, não troque as credenciais existentes nem tente recriar o administrador alterando o `.env`; use o fluxo de recuperação aprovado pelo responsável.

Uma instalação criada por `EnsureCreated` precisa seguir o procedimento de migração antes da primeira release com migrações EF. Faça backup, teste a restauração e compare o esquema completo com a baseline. Nunca trate o rollback de imagem como rollback de banco.

## Limpeza

Não execute `docker system prune`, `docker volume prune` nem remoção global de volumes na VM. Encerramento normal deve preservar os volumes. Qualquer descarte com `down --volumes` é exclusivo de um projeto de teste identificado e revisado; não é procedimento de operação OCI nem de recuperação.
