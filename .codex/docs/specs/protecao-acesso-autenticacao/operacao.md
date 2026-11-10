# Runbook de proteção de acesso, autenticação e publicação

Data da revisão documental: 2026-10-14. Este runbook descreve a configuração deste repositório e evidências locais sintéticas. Ele prepara uma implantação e sua validação, mas não publica, executa migrações em produção nem substitui a autorização do operador.

Documentos relacionados: [README de execução](../../../../README.md), [operação OCI](../../../../infra/oci/README.md), [operação de migrações](../../../../backend/LabSolos-Server-DotNet8/Data/Migrations/README.md), [manual de uso](../../../../docs/manual/README.md) e [especificação técnica](techspec.md).

## 1. Matriz de acesso

O servidor valida identidade, papel e relacionamento registrado em cada consulta protegida. Um ID recebido pela API não concede acesso por si só.

| Sessão/papel | Perfis consultáveis | Empréstimos consultáveis | Alterações de perfil |
| --- | --- | --- | --- |
| Anônima, ausente ou inválida | Nenhum recurso protegido | Nenhum recurso protegido | Nenhuma |
| Administrador | Todos os perfis nos endpoints administrativos autorizados | Todos | Gestão administrativa autorizada; dados pessoais próprios seguem a validação do próprio perfil |
| Mentor | Próprio perfil e Mentorados diretamente vinculados; as listas de dependentes retornam projeção mínima | Solicitações/aprovações próprias e registros de Mentorados vinculados | Pode alterar apenas campos próprios autorizados; email próprio exige a senha atual |
| Mentorado | Próprio perfil e resumo autorizado do responsável no contexto do próprio perfil | Registros em que é solicitante/aprovador | Pode alterar apenas campos próprios autorizados; email próprio exige a senha atual |

O acesso a um empréstimo do Mentor é permitido quando ele é solicitante, aprovador ou responsável vinculado ao Mentorado solicitante. O Mentorado acessa registros em que é solicitante ou aprovador. Projeções de acompanhamento excluem hash de senha, token/expiração de recuperação e versão de sessão. Em endpoints individuais protegidos, ID fora do alcance e recurso inexistente usam a mesma resposta de não encontrado; listas e operações administrativas mantêm seus contratos de autorização próprios. A matriz voltada às pessoas usuárias está em [Perfis e permissões](../../../../docs/manual/perfis-e-permissoes.md#matriz-de-acesso-aos-dados).

Uma mudança do email próprio exige a senha atual na mesma atualização. O backend verifica igualdade exata do endereço e recusa duplicação sem persistir nenhum campo do documento. O fluxo atual não executa confirmação por link enviado ao novo endereço; não declare propriedade da caixa verificada. Após salvar, o email atualizado passa a ser o identificador usado pelo login e pela recuperação. A troca cancela pedidos pendentes que dependem do endereço antigo e limpa tokens existentes, sem reduzir a versão da sessão por essa alteração.

## 2. Cotas, espera e normalização

O Compose de produção não substitui os valores padrão de `AuthenticationProtectionOptions`:

| Operação | Limite por identificador | Limite por IP | Renovação/feedback |
| --- | ---: | ---: | --- |
| Login | 5 falhas por conta | 30 falhas | Janela fixa de 900 s (15 min); a tentativa seguinte à cota retorna `429`/`Retry-After` |
| Pedido de recuperação | 3 pedidos admitidos por destinatário | 20 pedidos | Janela fixa de 3.600 s (1 h); cooldown mínimo de 60 s entre emissões efetivas |
| Validação de código | 5 falhas por destinatário | 30 falhas | Janela fixa de 900 s (15 min); a tentativa seguinte retorna `429`/`Retry-After` |

As cotas começam na primeira falha ou admissão da janela. Tentativas recusadas não estendem a espera nem limpam a contagem. Um login bem-sucedido não apaga uma cota ativa de conta ou IP. Emissão e validação de recuperação não compartilham as cotas de login. `429` usa `Cache-Control: no-store`, `Retry-After` em segundos e `application/problem+json`; banco/proteção indisponível no login ou validação resulta em `503` genérico e falha fechada.

Email é aplicado a `Trim()` e `ToLowerInvariant()` **somente para chave de cota**. A busca de conta e a chave de entrega continuam por igualdade exata, sem remover pontos, sufixos `+` ou aplicar regras de provedores. A normalização de cota não é normalização da identidade.

As cotas por IP são calculadas depois de `ForwardedHeaders`. A produção configura somente o IP exato do Caddy em `KnownProxies` e `ForwardLimit=1`; a borda Caddy não incorpora um `X-Forwarded-For` fornecido pelo cliente. Pessoas que saem pela mesma rede/NAT compartilham a cota de IP, portanto uma pessoa pode receber espera temporária após falhas de outras pessoas nesse IP. Não desative o limite, zere buckets nem interprete `429` como conta bloqueada.

Capacidade padrão: 10.000 buckets por espaço de cota e 5.000 trabalhos de recuperação ativos; janela máxima aceita pela validação de opções: 86.400 s (24 h). A limpeza percorre lotes de até 100 a cada 30 s. A capacidade máxima de recuperação aceita na configuração é 10.000 trabalhos, não um objetivo de throughput. Os tempos de bloqueio/timeout padrão de banco são 2 s/5 s. Ajustes precisam ser iguais em todas as instâncias, validados contra carga e registrados como valores configurados; os defaults não são medições de volume real.

## 3. Recuperação, fila e SMTP

Os aliases de solicitação usam o mesmo serviço e devolvem a mesma resposta neutra `202 Accepted` antes de consultar elegibilidade ou chamar SMTP. Pedidos admitidos consomem as cotas mesmo se a conta não existir ou não estiver habilitada. Pedidos repetidos com a mesma chave de entrega exata coalescem enquanto houver um trabalho ativo. Pedidos limitados ou fila cheia continuam neutros e podem não produzir email; a resposta `202` não confirma existência de conta nem entrega.

O worker processa lotes de até 10 trabalhos usando bloqueios `SKIP LOCKED`, consulta a conta somente depois da admissão, e descarta pedidos com mais de 15 min. Um código tem validade de 15 min desde a emissão. O worker tenta no máximo 3 envios, com timeout de 15 s, lease de 60 s e intervalos de 30 s e 120 s entre as tentativas (até três tentativas no total); o worker consulta a fila a cada 1 s; o payload cifrado é apagado quando o trabalho termina. SMTP não participa da transação do banco: uma queda depois de o servidor aceitar a mensagem pode fazer uma repetição entregar o mesmo código outra vez. O sistema oferece repetição limitada e código estável por trabalho, não entrega exatamente uma vez.

Procedimento ao suspeitar de atraso/saturação:

1. Consulte `docker compose ... ps`, a saúde da API e logs locais recentes do backend/worker. Preserve apenas categorias, horários e códigos sanitizados; não copie o `.env`, payload, email, token, código ou stack trace integral para um ticket.
2. Use as consultas agregadas abaixo para verificar a alocação, os buckets e os estados/idades da fila. Não consulte nem exporte destinatários ou payloads para este diagnóstico.
3. Verifique a conectividade PostgreSQL, espaço e estado do serviço SMTP pelos mecanismos operacionais aprovados. O endpoint de health informa somente estado geral; não é uma sonda de entrega de email.
4. Preserve o estado e abra investigação operacional. Não apague buckets, contadores, jobs ou volumes; não aumente limites como contorno.
5. Em recuperação solicitada durante indisponibilidade, explique que o resultado neutro não comprova envio. Login e tentativa de código ficam indisponíveis (`503`) se o armazenamento/proteção falhar.

```sql
SELECT "Scope", "Allocated"
FROM "AuthenticationProtectionCapacity"
ORDER BY "Scope";

SELECT "Scope", COUNT(*) AS buckets
FROM "AuthenticationThrottleBuckets"
GROUP BY "Scope"
ORDER BY "Scope";

SELECT "Status", COUNT(*) AS jobs, MIN("CreatedAt") AS oldest_created_at
FROM "PasswordRecoveryJobs"
GROUP BY "Status"
ORDER BY "Status";
```

## 4. Chaves, configuração e topologia

O Compose monta arquivos do host como somente leitura:

| Variável do `.env` | Destino dentro da API | Formato validado |
| --- | --- | --- |
| `AUTHENTICATION_THROTTLE_KEY_FILE` | `/run/secrets/authentication-throttle-key` | Arquivo binário com no mínimo 32 bytes aleatórios; chave HMAC exclusiva para cotas |
| `RECOVERY_ENCRYPTION_KEYS_FILE` | `/run/secrets/recovery-encryption-keys.json` | JSON até 65.536 bytes com `activeKeyId` e `keys`; cada chave Base64 decodifica para 32 bytes e a chave ativa existe no mapa |

O `.env.prod.example` aponta para `./secrets/authentication-throttle-key` e `./secrets/recovery-encryption-keys.json`, relativos ao diretório `/opt/labon` quando os comandos Compose partem dali. Não versione arquivos gerados, não os inclua na imagem, não coloque material de chave em argumento, relatório, CI, log ou variável de frontend. A API roda como `app` não root; conceda leitura apenas a esse usuário/grupo, monte `read_only` e mantenha backup criptografado sob controle separado. Um secret ausente, ilegível ou inválido impede a inicialização.

`activeKeyId` é o seletor para novas cifras. Preserve as chaves anteriores no mapa enquanto houver trabalho ativo com seus IDs. A validação de startup recusa a instância se um trabalho `Pending`/`Processing` e não expirado usar chave ausente. Todas as instâncias precisam compartilhar os mesmos bytes dos arquivos e a mesma política. O startup compara uma impressão da configuração com instâncias ativas; configuração divergente falha ao iniciar. Como os arquivos são bind mounts de arquivo, recrie os serviços após substituí-los para atualizar o mount.

### Rotação da chave de recuperação

1. Gere uma nova chave de 32 bytes fora do Git. Atualize o JSON em um arquivo temporário com a chave nova em `keys`, defina `activeKeyId` para ela e preserve os IDs antigos.
2. Em janela coordenada, instale o mesmo arquivo em todas as instâncias e recrie todas elas. Não mantenha instâncias com impressões diferentes simultaneamente.
3. Confirme startup/health e consulte as contagens por `EncryptionKeyId`/`Status` na consulta abaixo.
4. Mantenha cada chave anterior até que não exista trabalho ativo não expirado com aquele ID. Depois remova-a do JSON e recrie todas as instâncias novamente.

Consulta agregada para a rotação, sem expor destinatários ou payloads:

```sql
SELECT "EncryptionKeyId", "Status", COUNT(*) AS jobs
FROM "PasswordRecoveryJobs"
WHERE "Status" IN ('Pending', 'Processing')
  AND "ExpiresAt" > CURRENT_TIMESTAMP
GROUP BY "EncryptionKeyId", "Status"
ORDER BY "EncryptionKeyId", "Status";
```

### Rotação da chave HMAC

A chave HMAC não tem identificador por bucket e os hashes antigos não podem ser recalculados. Trocar seu valor com buckets ativos torna as cotas existentes inalcançáveis e pode reiniciar a proteção. Planeje manutenção sem novas tentativas, aguarde ao menos a maior janela/cooldown efetivamente configurada desde a última solicitação com a chave antiga e confirme por contagem que não há buckets ativos. A janela pode ser configurada até 24 h; não suponha uma hora se a configuração divergir dos defaults. Atualize a chave e recrie todas as instâncias coordenadamente. A limpeza normal pode remover linhas expiradas; não as apague manualmente para acelerar o processo.

Produção expõe apenas Caddy nas portas 80/443. Frontend, API e PostgreSQL permanecem em redes internas; o backend não tem porta publicada no host. `PUBLIC_NETWORK_SUBNET`, `PUBLIC_NETWORK_DYNAMIC_RANGE` e `CADDY_PROXY_IP` do `.env.prod.example` são valores ilustrativos e precisam ser comparados com as redes reais do host. A faixa dinâmica deve estar dentro da sub-rede e excluir o IP fixo do proxy, para impedir colisão durante a subida dos contêineres. O mesmo IP fixo deve ser o endereço conhecido de Forwarded Headers da API. Produção serve a API na mesma origem pelo caminho `/api/*` e não registra política CORS para liberar origens externas. CORS controla leitura pelo navegador; não substitui autenticação da API.

O snippet de cabeçalhos compartilhados está em `infra/proxy/security-headers.caddy`. O ramo frontend recebe esta CSP efetiva, também em fallback/rotas SPA:

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'; frame-src 'none'; worker-src 'none'
```

`'wasm-unsafe-eval'` habilita somente compilação/execução de WebAssembly necessária à exportação PDF (Yoga); não habilita `eval()` de JavaScript. `connect-src data:` permite o carregamento WASM por URL `data:` observado no PDF. `style-src 'unsafe-inline'` cobre estilos dinâmicos da UI; `img-src data: blob:` cobre recursos de imagem/exportação usados na interface. `script-src` permanece sem `'unsafe-eval'`, `'unsafe-inline'`, `blob:` ou origem externa; objetos, base, formulários, frames e workers continuam restritos. Não duplique CSP no Nginx nem adicione allowlist sem inventário e teste.

A CSP aplica-se ao ramo frontend, não ao ramo `/api/*`. Cabeçalhos comuns são aplicados pelo Caddy. No Compose de desenvolvimento, as origens exatas vêm de `FRONTEND_PORT`; o `.env.example` usa `http://localhost:8081` e `http://127.0.0.1:8081`. Essa allowlist não se aplica à produção. OPTIONS externo não é autorizado para leitura cross-origin. Um `curl`/HTTP externo ainda poder enviar uma requisição não significa que CORS concedeu leitura ao navegador nem substitui a autorização por objeto.

## 5. Upgrade, migração e emails repetidos

A API executa `Database.Migrate()` na inicialização. Antes de uma release que possa aplicar a migração `20261013153155_AuthenticationProtection`:

1. Identifique o candidato publicado e a versão anterior compatível; confirme imagens GHCR e variável `.env` sem imprimir segredos.
2. Confirme que a sub-rede selecionada não conflita com redes OCI/Docker existentes, que o IP fixo do Caddy corresponde ao backend e que ambos os arquivos secretos existem, têm ACL de leitura para `app` e estão protegidos.
3. Crie e teste backup restaurável do banco e faça backup criptografado dos dois arquivos de chave. Não misture backup de banco com chaves de outro ambiente.
4. Faça preflight de valores de email exatamente duplicados, retornando somente a quantidade:

   ```sql
   SELECT COUNT(*) AS duplicate_email_groups
   FROM (
       SELECT "Email" FROM "Usuarios" GROUP BY "Email" HAVING COUNT(*) > 1
   ) AS duplicate_email_groups;
   ```

   O esperado é `0`. A migration também aborta com diagnóstico apenas da quantidade se houver grupos duplicados. Não mescle ou exclua contas automaticamente, não escolha um vencedor por script e não normalize emails existentes. Pare a implantação e encaminhe a resolução ao responsável autorizado.

5. Valide `docker compose --env-file /opt/labon/.env -f /opt/labon/docker-compose-prod.yml config --quiet`. Esse comando só valida a definição Compose; não comprova chaves legíveis, DNS, TLS, migração, SMTP ou comportamento.
6. Execute a publicação somente pelo fluxo autorizado. Para a VM OCI, `deploy-release.sh` verifica SemVer/imagens, recria serviços e aguarda health; observe o log e a saúde. O startup aplica as migrações pendentes.
7. Após a migração, confira `__EFMigrationsHistory`, saúde, cabeçalhos e jornadas de baixo volume com contas de teste. Nunca teste cotas com usuários reais ou volume ofensivo.

A migração verifica igualdade exata de `Usuarios.Email`, cria o índice único e as tabelas/capacidades de cotas e fila. Uma duplicação aborta antes do índice; não há mescla automática. A atualização é aditiva para outras tabelas, mas seu `Down` elimina buckets, contadores, jobs ativos e o índice único. Não use o `Down` em produção para reverter versão.

## 6. Reversão e recuperação compatível

A reversão automática do atualizador OCI restaura somente as imagens frontend/backend. Ela não restaura PostgreSQL, volumes nem desfaz migrações. Se uma migração tiver sido aplicada, a volta de imagem preserva o esquema mais novo; confirme a compatibilidade do binário anterior antes de aceitar esse caminho. Um health check simples não comprova acesso, dados ou entrega SMTP. Sem versão anterior compatível, pare e faça diagnóstico sob a janela operacional; não faça downgrade destrutivo por tentativa.

Regras de segurança:

- Prefira correção à frente ou uma versão anterior comprovadamente compatível mantendo o esquema aditivo.
- Não reverta `VersaoSessao`, não revalide cookies/tokens antigos, não restaure cotas antigas e não limpe a fila para fazer login voltar.
- Nunca rode `docker compose down --volumes`, `docker volume prune` ou `docker system prune` em produção.
- Se uma restauração de banco for autorizada, faça-a em ambiente isolado primeiro e use a cópia compatível das chaves HMAC e de recuperação. Banco sem chave de recuperação não restaura a capacidade de decriptar jobs pendentes; chave HMAC diferente não encontra buckets antigos.
- Se o preflight de email bloquear a migração, resolva duplicatas com governança de conta e auditoria; o índice único só deve ser criado depois do resultado zero.
- Não torne CORS permissivo, remova CSP ou aumente cotas como contorno de falha.

O README de migrações registra os efeitos do `Down`, o preflight e os limites das bases criadas por `EnsureCreated`. O procedimento OCI documenta o alcance do rollback automático e preservação de volumes. Toda reversão deve registrar versão, resultado sanitizado, backup utilizado e decisão do operador.

## 7. Validação pós-publicação (T030)

Esta seção prepara a coleta futura e não afirma que exista publicação validada. Execute-a apenas após uma publicação autorizada, com URL/versionamento confirmados e contas sintéticas/dedicadas fornecidas pelo responsável. Não crie nem envie credenciais por conta própria.

1. Defina `LABON_VALIDATION_BASE_URL` com a origem pública confirmada, sem barra final. Leia somente status e cabeçalho CSP da raiz e de uma rota SPA, por exemplo `/mentor/`; não imprima tokens/cookies.
2. Confirme CSP na raiz e rota SPA, ausência da CSP do frontend em `/api/*` e ausência de `Access-Control-Allow-Origin` em produção. Isso é uma conferência pública de cabeçalhos, não teste de autenticação.
3. Com contas de teste autorizadas, percorra a matriz de perfil e vínculos com baixo volume: próprio/vinculado, cruzado e inexistente; compare status/corpo apenas de forma sanitizada. Verifique login, troca própria de email com senha atual e login pelo endereço atualizado.
4. Use uma caixa de teste controlada para recuperação. Confirme resposta pública neutra, chegada do email, token válido/inválido/expirado e limite do worker sem publicar código ou endereço.
5. Teste `429` somente em conta e IP de teste, respeitando `Retry-After`; não gere carga em produção. Associe resultados a cada issue e registre o ambiente, versão, data, método e limitações sem segredos.

Os comandos públicos previstos em T030 são:

```powershell
$env:LABON_VALIDATION_BASE_URL = "https://dominio-publicado-confirmado"
Invoke-WebRequest -Uri "$env:LABON_VALIDATION_BASE_URL/" -Method Get |
  Select-Object StatusCode, @{Name="CSP";Expression={$_.Headers["Content-Security-Policy"]}}
Invoke-WebRequest -Uri "$env:LABON_VALIDATION_BASE_URL/mentor/" -Method Get |
  Select-Object StatusCode, @{Name="CSP";Expression={$_.Headers["Content-Security-Policy"]}}
```

Não substitua o domínio de exemplo por um host não confirmado, não rode agora e não trate esses dois GETs como comprovação de matriz autenticada, CORS, cotas ou recuperação. A execução de T030 depende de publicação e contas autorizadas.

## 8. Evidências locais e limites

Os registros abaixo vêm de testes de worktrees/Compose isolados, com identidades e chaves sintéticas. Eles não são medições do serviço publicado:

| Evidência local | Resultado registrado | O que demonstra |
| --- | --- | --- |
| [T022](evidencias/T022/execucao.md) | Startup 12/12, cabeçalhos backend 7/7, contratos Compose 4/4, Compose dev/prod/E2E válido; backend completo 428/428 | Configuração ausente/divergente falha fechada, montagens e defaults atuais |
| [T024](evidencias/T024/execucao.md) | Caddy security smoke 1/1 | Raiz e rota SPA via TLS local com CSP; `/api` protegido e sem CSP/CORS |
| [T025](evidencias/T025/validacao.md) | Seed safety/isolation 9/9; jornadas real 6/6; UI 429 1/1 | Autorização/perfil, ciclo de credencial e feedback acessível de espera |
| [T026](evidencias/T026/execucao.md) | Navegador security 4/4 em 13,9 s; Caddy validate aprovado | CSP efetiva/bloqueios, CORS, perfis, PDF/Excel e IP confiável sob `X-Forwarded-For` forjado |

Os 13,9 s são o tempo total daquela execução Playwright local, não latência de endpoint nem SLO. Não há neste registro medição de produção, p95/p99, volume real de SMTP, entrega exatamente uma vez, uso sob carga, DNS/TLS de um domínio final, regra remota de branch ou deploy confirmado. Esses pontos exigem validação autorizada posterior; não inferir conclusão das issues ou publicação a partir dos testes locais.
