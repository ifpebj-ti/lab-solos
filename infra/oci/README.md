# Infraestrutura OCI do LabOn

Este diretório cria um compartimento dedicado, rede pública, regras mínimas de firewall e uma VM ARM para o LabOn. A operação da aplicação usa o \`docker-compose-prod.yml\`; o guia canônico de configuração, diagnóstico e backup fica na [Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execução-e-Configuração-com-Docker-e-Docker-Compose).

Referência revisada: \`790ee6bd8a1a32ff7e5519d591b73931f537657b\` · 2026-09-22.

## Provisionamento

Configuração padrão:

- região \`sa-saopaulo-1\`;
- shape \`VM.Standard.A2.Flex\`;
- 1 OCPU e 4 GB de RAM;
- Ubuntu 24.04 ARM;
- volume de boot de 50 GB;
- portas públicas 80/443 e SSH restrito ao \`admin_cidr\`.

O estado Terraform, planos e \`terraform.tfvars\` são locais e não devem ser versionados.

\`\`\`powershell
$env:TF_VAR_tenancy_ocid = "ocid1.tenancy.oc1..substitua"
$env:TF_VAR_admin_cidr = "203.0.113.10/32"
terraform -chdir=infra/oci init
terraform -chdir=infra/oci plan -out=labon.tfplan
terraform -chdir=infra/oci apply labon.tfplan
\`\`\`

Após o \`apply\`, use o output \`dns_record\` para preparar o DNS. Não registre valores de tenancy, chaves ou credenciais em evidências.

## Pré-requisitos da aplicação

Na VM, o diretório de implantação é \`/opt/labon\`. O \`.env\` desse diretório deve ser criado pelo responsável com \`APP_DOMAIN\`, \`LABON_IMAGE_VERSION\`, os repositórios de imagens se necessário, conexão PostgreSQL, SMTP, JWT e seed. Use o [bloco de produção da Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execu%C3%A7%C3%A3o-e-Configura%C3%A7%C3%A3o-com-Docker-e-Docker-Compose) somente como contrato de nomes e estrutura; os valores publicados são fictícios.

Antes de iniciar uma release, confira no host:

\`\`\`bash
cd /opt/labon
docker info
docker compose version
docker compose --env-file .env -f docker-compose-prod.yml config --quiet
\`\`\`

Produção publica somente Caddy em 80/443. Frontend, backend e PostgreSQL ficam nas redes internas; \`pg_data\`, \`caddy_data\` e \`caddy_config\` são persistentes. \`config --quiet\` não valida DNS/TLS, login, migrações, SMTP ou existência das imagens.

## Atualização automática por release

O Compose usa imagens multi-arquitetura publicadas no GHCR com tag SemVer. A VM consulta a release estável mais recente, baixa frontend/backend, recria os serviços e só registra a nova versão após o health check. Em caso de falha, o script tenta restaurar a versão de imagem anterior.

Instalação ou atualização do timer na VM:

\`\`\`bash
cd /opt/labon
sudo ./infra/oci/scripts/install-auto-update.sh
\`\`\`

Deploy manual de uma versão específica:

\`\`\`bash
cd /opt/labon
bash ./infra/oci/scripts/deploy-release.sh 2.0.5
\`\`\`

O argumento deve ser uma versão SemVer existente no GHCR. O script usa o \`.env\`, valida a configuração, verifica as imagens, executa \`docker compose pull\` e \`up\`, consulta \`http://backend:8080/api/System/health\` a partir do proxy e grava \`.deployed-version\` somente após sucesso.

O health check do script, nesta referência, envia \`Host: labon.nmvr.me\`. Portanto, uma instalação com outro \`APP_DOMAIN\` precisa ser conferida antes de depender do deploy automático; alterar esse comportamento exige uma mudança separada no script, fora deste README. O endpoint retorna um sinal HTTP simples e não comprova a integridade dos dados nem a entrega de e-mail.

## Diagnóstico do atualizador

\`\`\`bash
systemctl status labon-update.timer
systemctl show labon-update.service -p Result -p ExecMainStatus
journalctl -u labon-update.service --since today
cat /opt/labon/.deployed-version
docker compose --env-file /opt/labon/.env -f /opt/labon/docker-compose-prod.yml ps
\`\`\`

O serviço systemd usa \`DOCKER_CONFIG=/var/lib/labon-docker\`, \`ProtectHome=true\`, \`PrivateTmp=true\` e permissões de leitura do projeto. Os registros devem ser inspecionados localmente; não copie \`.env\`, tokens ou logs completos para tickets.

## Rollback e banco de dados

O rollback automático é limitado: se uma release falhar no health check e houver versão anterior válida, o script restaura somente as imagens frontend/backend e repete o percurso de saúde. Ele não restaura PostgreSQL, não desfaz \`Database.Migrate()\` e não reverte migrações. Sem versão anterior válida, a operação termina com erro e exige decisão do operador.

Antes de uma release que altere o esquema:

1. interrompa escritas conforme a janela aprovada;
2. crie e teste um backup em formato nativo, sem conversão textual;
3. compare o esquema com a baseline e revise o script de migração;
4. faça a atualização e valide \`__EFMigrationsHistory\`, contagens sanitizadas e acesso;
5. se houver falha, prefira roll-forward compatível ou restaure o backup em banco isolado; não execute rollback destrutivo diretamente em produção.

Siga o [procedimento de migrações](../../backend/LabSolos-Server-DotNet8/Data/Migrations/README.md) e o roteiro de [backup/restauração da Wiki](https://github.com/ifpebj-ti/lab-solos/wiki/Guia-de-Execu%C3%A7%C3%A3o-e-Configura%C3%A7%C3%A3o-com-Docker-e-Docker-Compose). Não marque uma baseline sem conferir o esquema completo.

## Configuração do Docker no serviço

O atualizador mantém \`ProtectHome=true\` e usa \`DOCKER_CONFIG=/var/lib/labon-docker\`. O systemd cria esse diretório com \`StateDirectory=labon-docker\`, dono \`ubuntu\` e permissão \`0700\`, permitindo ao serviço encontrar o plugin Compose sem acessar \`/home/ubuntu/.docker\`. As imagens públicas do GHCR não exigem copiar credenciais do usuário.

## Rotação de logs dos contêineres

Os quatro serviços de produção usam \`json-file\`, com \`max-size: "10m"\` e \`max-file: "3"\`: aproximadamente 30 MB por serviço, 120 MB no conjunto. Os limites são definidos no Compose, sem alterar o daemon Docker para outros contêineres. A configuração entra em vigor ao recriar os serviços; \`docker restart\` isolado não a aplica aos contêineres existentes.

\`\`\`bash
docker inspect labon-backend-1 labon-frontend-1 labon-db-1 labon-proxy-1 \
  --format '{{.Name}} {{json .HostConfig.LogConfig}}'
\`\`\`

## Bancos legados e seed

O bootstrap atual usa \`SEED_ADMIN_EMAIL\` e \`SEED_ADMIN_PASSWORD\` somente quando não há usuários. Em um banco que já contém usuários, não troque as credenciais existentes nem tente recriar o administrador alterando o \`.env\`; use o fluxo de recuperação aprovado pelo responsável.

Uma instalação criada por \`EnsureCreated\` precisa seguir o procedimento de migração antes da primeira release com migrações EF. Faça backup, teste a restauração e compare o esquema completo com a baseline. Nunca trate o rollback de imagem como rollback de banco.

## Limpeza

Não execute \`docker system prune\`, \`docker volume prune\` nem remoção global de volumes na VM. Encerramento normal deve preservar os volumes. Qualquer descarte com \`down --volumes\` é exclusivo de um projeto de teste identificado e revisado; não é procedimento de operação OCI nem de recuperação.
