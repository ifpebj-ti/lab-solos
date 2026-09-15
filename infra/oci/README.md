# Infraestrutura OCI do LabOn

Este módulo cria um compartimento dedicado, rede pública, regras mínimas de firewall e uma VM ARM para o LabOn.

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

Após o apply, use o output `dns_record` para criar o registro `A` na Namecheap.

## Atualização automática por release

O Compose usa as imagens multi-arquitetura publicadas no GHCR com uma tag SemVer
imutável. A VM consulta a release estável mais recente no GitHub a cada cinco
minutos, baixa as duas imagens, recria somente os serviços da aplicação e só
registra a nova versão após o health check. Em caso de falha, o script restaura a
versão anterior.

Instalação ou atualização do timer na VM:

```bash
cd /opt/labon
sudo ./infra/oci/scripts/install-auto-update.sh
```

Deploy manual de uma versão específica:

```bash
cd /opt/labon
./infra/oci/scripts/deploy-release.sh 2.0.5
```

Diagnóstico:

```bash
systemctl status labon-update.timer
journalctl -u labon-update.service --since today
cat /opt/labon/.deployed-version
```

### Configuração do Docker no serviço

O atualizador mantém `ProtectHome=true` e usa `DOCKER_CONFIG=/var/lib/labon-docker`.
O systemd cria esse diretório com `StateDirectory=labon-docker`, dono `ubuntu` e
permissão `0700`. Assim, o cliente Docker encontra o plugin Compose instalado no
sistema sem precisar acessar `/home/ubuntu/.docker`, bloqueado pelo isolamento.
As imagens públicas do GHCR não exigem copiar credenciais do usuário.

O deploy verifica a disponibilidade do Compose e a validade da configuração antes
de baixar imagens ou alterar contêineres. Para conferir o resultado do serviço:

```bash
systemctl show labon-update.service -p Result -p ExecMainStatus
systemctl list-timers labon-update.timer
```

### Rotação de logs dos contêineres

Os quatro serviços de produção usam `json-file`, com `max-size: "10m"` e
`max-file: "3"`: aproximadamente 30 MB por serviço, 120 MB no conjunto.
Os limites são definidos no Compose, sem alterar o daemon Docker para outros
contêineres. A configuração entra em vigor ao recriar os serviços; um simples
`docker restart` não a aplica aos contêineres existentes.

```bash
docker inspect labon-backend-1 labon-frontend-1 labon-db-1 labon-proxy-1 \
  --format '{{.Name}} {{json .HostConfig.LogConfig}}'
```

### Bancos legados e atualização de credenciais

O bootstrap atual usa `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`. Em instalações
antigas, preserve os valores existentes de `PRODUCTION_ADMIN_EMAIL` e
`PRODUCTION_ADMIN_PASSWORD` ao preencher as novas variáveis; não gere outra senha
como parte de uma atualização. Um banco que já contém usuários não recria o
administrador inicial.

Uma instalação criada por `EnsureCreated` precisa seguir o
[procedimento de migração do banco](../../backend/LabSolos-Server-DotNet8/Data/Migrations/README.md)
antes da primeira atualização para uma versão com migrações EF. Faça backup,
teste sua restauração e compare o esquema completo com a baseline antes de
registrá-la. O rollback de imagens do atualizador não restaura o banco nem desfaz
migrações; a reversão de dados exige o procedimento específico da migração.
