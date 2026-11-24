# Política local de Semgrep

Esta pasta entrega a T005 de Cobertura e segurança na CI, issue #489. A responsabilidade está atribuída à função **CI quality maintainer**. A integração ao workflow pertence à T008.

## Ferramenta e regras

`policy.json` fixa Semgrep CLI 1.185.0 e a imagem `semgrep/semgrep:1.185.0@sha256:67518c174185a2043fdbed16c70631b79209499b3671178e7194379b48295a0d`. O digest foi obtido na instalação local dessa versão.

Os arquivos de regras são JSON, formato aceito pelo leitor de configuração do Semgrep. As regras são próprias e versionadas junto da política.

| Módulo | Regra | Condição identificada | Classificação aprovada |
| --- | --- | --- | --- |
| Frontend | labon.frontend.dynamic-code | Uso direto de eval ou construção dinâmica de função. | HIGH, confiança HIGH, bloqueante. |
| Backend | labon.backend.tls-validation-disabled | Aceitação irrestrita de certificado TLS pelo handler HTTP. | HIGH, confiança HIGH, bloqueante. |

A classificação vem da configuração revisada no repositório. Metadados de severidade recebidos no relatório ficam fora dessa decisão. `blocking-approved` representa a aprovação da condição estática como bloqueante na política. Cada ocorrência satisfaz uma condição de confiança alta dessa regra. A conferência contextual e a justificativa de eventual exceção ficam registradas na revisão.

A configuração abrange `frontend/src` e `backend/LabSolos-Server-DotNet8`. A lista explícita de exclusões da política cobre testes do frontend, bin/obj, migrações e arquivos C# gerados. O executor mantém os IDs das regras, desativa nosemgrep, métricas e checagem de versão remota e seleciona o motor OSS. O prazo máximo por módulo é de 180 segundos.

## Executar localmente

Conferir primeiro a versão da ferramenta. O modo scan usa apenas configurações locais e captura o relatório bruto em memória.

```sh
semgrep --version
python .github/scripts/check_semgrep.py scan +  --sha 0123456789abcdef0123456789abcdef01234567 +  --run-id local-example --run-attempt 1
```

Substituir o SHA ilustrativo pela revisão do checkout. O resumo identifica a revisão declarada e `source_state=working_tree`. Uma execução local com alterações pendentes corresponde ao conteúdo da árvore de trabalho. A integração de CI deve vincular a revisão ao checkout efetivamente analisado.

Para usar a imagem fixada, montar o checkout em `/src`, diretório exigido pela distribuição Docker do Semgrep, e executar com a rede desativada. O mesmo comando pode ser aplicado a uma cópia temporária dos fontes para evitar o custo de acesso de um bind mount do Docker Desktop.

```sh
docker run --rm --network none +  --mount type=bind,source="$PWD",target=/src,readonly +  --workdir /src +  semgrep/semgrep:1.185.0@sha256:67518c174185a2043fdbed16c70631b79209499b3671178e7194379b48295a0d +  python .github/scripts/check_semgrep.py scan +  --sha 0123456789abcdef0123456789abcdef01234567 +  --run-id local-example --run-attempt 1
```

Redirecionar a saída do verificador para guardar somente o resumo sanitizado. Os testes sintéticos estão em `.github/scripts/tests/fixtures/semgrep`. Copiar as amostras para os diretórios de módulo de uma árvore temporária permite demonstrar aprovação e bloqueio com o mesmo comando, conservando a configuração original por `--policy`.

## Avaliar relatórios já coletados

O modo evaluate recebe um arquivo por módulo. Cada arquivo contém `module`, `sha`, `run_id`, `run_attempt`, `policy_version`, `config_sha256`, `scanner_exit_code` e `report`. O campo report contém o JSON original do Semgrep, com versão, results, errors e paths.scanned.

O hash é o SHA256 dos bytes da configuração daquele módulo. O executor scan o calcula e confere novamente ao concluir. Isso associa o resultado à configuração efetiva e impede aceitar um resultado de regras diferentes com o mesmo número de versão.

```sh
python .github/scripts/check_semgrep.py evaluate +  --frontend /tmp/frontend-semgrep.json +  --backend /tmp/backend-semgrep.json +  --sha 0123456789abcdef0123456789abcdef01234567 +  --run-id local-example --run-attempt 1
```

Uma coleta válida usa os argumentos do modo scan, executa com código zero, possui caminhos analisados no módulo e preserva a identidade da execução. Resultado ausente, inválido, vazio, interrompido, com erro de parsing, regra desconhecida, escopo inesperado ou versão divergente recebe análise incompleta. Os relatórios brutos exigem o tratamento restrito definido para a coleta. O resumo compartilhável usa somente os campos abaixo.

## Exceções

`exceptions.json` começa com uma lista vazia. Cada exceção exige os campos seguintes.

| Campo | Validação |
| --- | --- |
| id | Identificador único e estável, usado no resumo para localizar a aprovação. |
| rule | ID de uma regra presente na configuração versionada. |
| path | Arquivo relativo exato dentro do módulo, com abrangência restrita ao caminho. |
| justification | Justificativa preenchida para a revisão da exceção. |
| approver | Identidade preenchida de quem aprovou a exceção. A função responsável deve verificar sua autoridade na revisão. |
| created_at | Instante UTC da aprovação, em yyyy-MM-ddTHH:mm:ssZ. |
| expires_at | Instante UTC posterior à aprovação e distante dela por no máximo 30 dias. |

A exceção fica válida no intervalo iniciado em created_at e encerrado exclusivamente em expires_at. Uma exceção vencida ou futura aparece como tal no resumo e mantém o achado sujeito à política. Uma entrada malformada torna a avaliação incompleta. O histórico versionado conserva justificativa e aprovador. O resumo aponta o identificador, a regra, o caminho, a validade e o estado, com acesso à revisão da política para auditar a aprovação.

## Resultado e evidência

| Estado | Código de saída | Conteúdo |
| --- | --- | --- |
| passed | 0 | Ambos os módulos analisados, com ocorrências não bloqueantes ou cobertas por exceção válida quando houver. |
| failed | 1 | Ao menos um achado bloqueante sem exceção válida. |
| incomplete | 2 | Política, exceções, versão, execução, escopo ou resultado indisponível ou inválido. |

O resumo registra SHA declarado, execução e tentativa, versão da política e da ferramenta, imagem fixada, módulos e hash das regras. Cada ocorrência contém somente regra, severidade, caminho relativo, linha e estado da exceção. Mensagens do scanner, código-fonte, metavariáveis, credenciais, valores capturados e erros brutos ficam fora da saída compartilhável.

Executar os testes do avaliador com o comando seguinte.

```sh
python -m unittest discover -s .github/scripts/tests -p "test_check_semgrep.py" -v
```

O RED inicial observou falhas de aprovação, bloqueio e exceção no verificador ainda sem implementação. As validações locais com o CLI exato usam amostras seguras e inseguras dos dois módulos. A integração de CI deve publicar o resumo mesmo quando a análise estiver incompleta e conservar a conclusão de falha.

Na validação local desta entrega, as amostras seguras passaram e as inseguras bloquearam ambos os módulos. Exceções sintéticas exatas permitiram as duas ocorrências e permaneceram identificadas no resumo. O snapshot dos fontes de trabalho, copiado para o filesystem Linux do contêiner, analisou 211 arquivos de frontend e 149 de backend com resultado passed nas duas regras desta política. A leitura direta pelo bind mount do Docker Desktop excedeu o prazo por módulo e produziu incomplete. A evidência do snapshot identifica o SHA-base declarado e source_state=working_tree.
