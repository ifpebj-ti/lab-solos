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
