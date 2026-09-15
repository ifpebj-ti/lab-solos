# Validação T014 — auditoria e publicação local

## Escopo e identificação

- Tarefa: T014 — Auditar o conjunto e ensaiar a publicação local.
- Data da execução: `2026-09-14`.
- Fonte auditada: `docs/manual/`.
- Versão editorial: `2026-09-14.2`.
- Produto validado: snapshot `2c78dbe1c3ec41f4004f53c42be8fed556080192`; a interface registrada em T011 exibe `2.5.0`.
- Fonte temporária do ensaio: `d3d9e2e309cb232dcd42643f65b23002934dbfa2`.
- O SHA acima é de um commit criado dentro do repositório Git temporário do teste e não é o commit aprovado do produto, nem um commit publicável da documentação.
- Responsável público da revisão: `nathannmvr`, conforme manifesto e usuário autenticado.
- Conjunto: 7 páginas funcionais, 11 jornadas, 26 variantes de perfil e 9 imagens PNG.
- Issue: [#220](https://github.com/ifpebj-ti/lab-solos/issues/220), aberta, sem comentários, atribuída a `nathannmvr`.
- Project: `LabOn — Desenvolvimento e Qualidade` (#41), item confirmado como `In Progress`.

O item da issue foi adicionado ao Project antes do RED e o status/assignee foram confirmados depois da atualização. Não houve comentário, fechamento da issue, commit, push, merge ou escrita na Wiki remota.

## RED

A linha de base executada antes da alteração do teste foi:

```text
python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v
Ran 19 tests in 18.127s
OK (skipped=1)
```

O critério específico de copiar a fonte real para um Git temporário ainda não tinha um teste; a suíte cobria apenas fixtures sintéticas. O gerador de T005/T006 já satisfazia o comportamento, portanto não foi criada uma falha artificial: a ausência do ensaio foi registrada como lacuna de cobertura e tratada como caracterização, conforme a exceção de TDD da skill `execute-task`.

## GREEN

Foi acrescentado a `test_manual_publication.py` o teste `test_real_manual_integrates_with_temporary_git_source_idempotently`. Ele:

1. copia o conjunto real `docs/manual/` para um repositório Git temporário;
2. cria e identifica o commit completo `d3d9e2e309cb232dcd42643f65b23002934dbfa2` somente nesse repositório;
3. cria três documentos alheios (`Home.md`, `_Sidebar.md` e `Guia-de-Testes-de-Usuario.md`) no destino temporário;
4. executa `sync_manual_to_wiki.py --mode generate`;
5. confirma as 7 páginas gerenciadas e `manual-publicacao.json`, com `commitFonte` igual ao SHA temporário;
6. executa `--mode check` e confirma código 0 sem alterar o destino;
7. executa uma segunda geração e confirma os mesmos bytes;
8. confirma byte a byte a preservação dos três documentos alheios.

Resultado do teste direcionado após a inclusão do ensaio:

```text
python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v
Ran 20 tests in 21.364s
OK (skipped=1)
T014 temporary source SHA: d3d9e2e309cb232dcd42643f65b23002934dbfa2
```

Esse SHA é o identificador do ensaio reportado nesta execução; cada execução cria um repositório/commit temporário novo. Ele é temporário e não representa uma fonte aprovada.

### Resultado por requisito e critério

| Requisito/critério | Resultado T014 | Evidência e limite |
|---|---|---|
| RF-001 — Manual por jornada | Aprovado documentalmente | Validador local aprovou J01–J11 e a integração reproduziu as 7 páginas reais; não é aceite de autonomia humana. |
| RF-002 — Perfis e permissões | Aprovado documentalmente | Manifesto, páginas e matriz registram Administrador, Mentor e Mentorado em 26 variantes; a execução humana por perfil permanece em T015–T017. |
| RF-003 — Publicação rastreável | Preparado localmente | SHA temporário, geração, `check`, segunda geração e hashes foram conferidos; Wiki remota e commit real permanecem para T019. |
| RNF-001 — Acessibilidade e privacidade | Revisão documental/visual concluída | 9/9 PNGs auditados, todos os usos com alt não vazio e passos textuais; a auditoria não substitui autonomia. |
| RNF-002 — Manutenibilidade | Aprovado no conjunto local | Metadados, links locais, âncoras, inventário, hashes e idempotência passaram; links externos elegíveis não foram encontrados. |
| CA-001 — Autonomia | Pendente | T014 não conduz sessão com pessoa sem contexto; depende de T015, T016 e T017. Suíte/E2E não são evidência humana. |
| CA-002 — Conteúdo seguro | Revisão local concluída | Texto/alt foram cruzados com o validador e as 9 imagens foram revisadas visualmente e em seus bytes, conforme auditoria abaixo e T011. |
| CA-003 — Fonte e Wiki | Pendente, com preparação local aprovada | Não houve publicação remota nem leitura pós-push; a comprovação externa é T019. |

### Resultado por jornada

| Jornada | Perfis | Fonte e âncora principal | Imagem(ns) relacionada(s) | Resultado |
|---|---|---|---|---|
| J01 — Entender o acesso | Administrador, Mentor, Mentorado | `README.md#j01-acesso` | `j01-acesso-login.png` | Estrutura, entrada por perfil e retorno validados; autonomia pendente. |
| J02 — Solicitar cadastro | Mentor, Mentorado | `acesso-e-conta.md#j02-cadastro` | — | Pré-requisitos, envio e espera pela decisão validados; autonomia pendente. |
| J03 — Avaliar cadastro e vínculos | Administrador, Mentor | `perfis-e-permissoes.md#j03-aprovacao`, com variantes em `administrador.md` e `mentor.md` | `j03-administrador-solicitacoes.png` | Alcance por perfil e ações de aprovar/recusar cruzados; autonomia pendente. |
| J04 — Entrar e concluir primeiro acesso | Administrador, Mentor, Mentorado | `acesso-e-conta.md#j04-primeiro-acesso` | — | Credencial por canal autorizado, troca obrigatória e nova autenticação documentadas; autonomia pendente. |
| J05 — Alterar/recuperar senha e sair | Administrador, Mentor, Mentorado | `acesso-e-conta.md#j05-senha-saida` | — | Alteração, recuperação, expiração e saída segura validadas; autonomia pendente. |
| J06 — Preparar a operação | Administrador | `administrador.md#j06-preparar-operacao` | `j06-administrador-home.png`, `j06-administrador-adicionar-bens.png` | Preparação e cadastro pelos controles visíveis validados; autonomia pendente. |
| J07 — Gerir e consultar materiais | Administrador, Mentor, Mentorado | Variantes em `administrador.md#j07-materiais-admin`, `mentor.md#j07-consulta-materiais-mentor` e `mentorado.md#j07-consulta-materiais-mentorado` | `j06-administrador-adicionar-bens.png`, `j07-mentor-home.png` | Consulta separada da administração e limites de permissão preservados; autonomia pendente. |
| J08 — Solicitar e acompanhar empréstimo | Mentor, Mentorado | Variantes em `mentor.md#j08-emprestimos-mentor` e `mentorado.md#j08-acompanhamento-mentorado` | `j08-mentor-criacao-emprestimo.png`, `j08-mentorado-historico.png` | Mentor solicita; Mentorado acompanha apenas o próprio histórico; autonomia pendente. |
| J09 — Decidir e concluir empréstimo | Administrador | `administrador.md#j09-emprestimos-admin` | — | Aprovação/recusa, histórico e devolução administrativas validados; autonomia pendente. |
| J10 — Gerir e consultar turma/perfil | Administrador, Mentor, Mentorado | Variantes em `administrador.md#j10-usuarios-admin`, `mentor.md#j10-turma-mentor` e `mentorado.md#j10-perfil-mentorado` | `j10-mentorado-perfil.png` | Vínculos, registros pessoais e limites de status cruzados; autonomia pendente. |
| J11 — Recuperar-se de falhas | Administrador, Mentor, Mentorado | `solucao-de-problemas.md#j11-falhas` | `j11-mentor-acesso-negado.png` | Lista vazia, erro, retry, acesso negado, recurso inexistente e sessão expirada diferenciados; autonomia pendente. |

## Manifesto, páginas, permissões e metadados

- `manual.json` é JSON válido, usa `versaoEsquema: 1`, lista 7 páginas sem colisões, mapeia cada origem para seu destino Wiki e exclui `manual.json`/`manutencao.md` do conjunto publicável.
- J01–J11 aparecem uma vez no manifesto, com as variantes de perfil aplicáveis e referências ao inventário/âncoras.
- O comando local confirmou que o índice alcança as páginas funcionais, que cada página funcional retorna ao `README.md`, que as âncoras e os fragmentos existem e que a matriz de permissões está ligada às variantes documentadas.
- As sete páginas apresentam, de forma consistente com o manifesto: versão `2026-09-14.2`, produto `2c78dbe1c3ec41f4004f53c42be8fed556080192`, data `2026-09-14` e responsável `nathannmvr`.
- O ensaio de publicação gerou exatamente os 7 destinos de página do manifesto mais `manual-publicacao.json`; não gerou páginas para os arquivos de controle nem alterou documentos alheios.

## Auditoria de imagens e alt

A auditoria visual de T011 foi revisitada para T014; os nove PNGs foram inspecionados em resolução de revisão. A conferência binária confirma PNG RGB de 8 bits, dimensões abaixo e apenas chunks estruturais `IHDR`, `IDAT` e `IEND` (sem `eXIf`, `tEXt`, `zTXt`, `iTXt`, `pHYs` ou outro metadado auxiliar). Os dados visíveis são sintéticos; os domínios são reservados e não há senhas preenchidas, tokens, cookies, URLs de recuperação ou PII identificável.

| Arquivo | SHA-256 | Dimensão | Uso/alt conferido |
|---|---|---:|---|
| `imagens/j01-acesso-login.png` | `c62441466e09513ee59ba74ab9f1323a7135a2cfbebe5fd9536eccf4525fb2d5` | 1440×900 | `README.md`: tela inicial de login com email e senha vazios. |
| `imagens/j03-administrador-solicitacoes.png` | `90143116c4bca8c26c432b6230a581c04658556d5c87d33bbb43e9eedd95690d` | 1440×960 | `administrador.md`: solicitações de cadastro com data, nome, email e instituição. |
| `imagens/j06-administrador-adicionar-bens.png` | `1687c9e347fc7995b86cec00f616da56419607de192d9e08acd81edc3ffc3bcc` | 1440×960 | `administrador.md`: formulário de Adicionar Bens com campos vazios. |
| `imagens/j06-administrador-home.png` | `9ca95785ffe1b7830b10a207170ac3b40ecb36d178c758957aef38bceef717c3` | 1440×960 | `administrador.md`: área inicial com atalhos de usuários, produtos e empréstimos. |
| `imagens/j07-mentor-home.png` | `ed8ce421f697c94cd309032569da5858ce0f5aa0ef06919c40b860dc3d3e7dc4` | 1440×960 | `mentor.md`: área inicial com turma, empréstimo e pesquisa de material. |
| `imagens/j08-mentor-criacao-emprestimo.png` | `a165674e88ddc6383e4ac3e6f029065aaad3007cb0c0e0540eabc50281042593` | 1440×960 | `mentor.md`: criação de empréstimo com seleção vazia e envio desabilitado sem itens. |
| `imagens/j08-mentorado-historico.png` | `abb1b5b581dcb896b81857d2b69950970263061cba1f8f5fb564977931ac1373` | 1440×960 | `mentorado.md`: histórico pessoal sem empréstimos registrados. |
| `imagens/j10-mentorado-perfil.png` | `142f5bee55ec7b5a30f57f23e8cb77825365437acd48c0eb76fa8dcfd734e961` | 1440×960 | `mentorado.md`: perfil com dados sintéticos e vínculo habilitado. |
| `imagens/j11-mentor-acesso-negado.png` | `9c8e062ce06584a79905ab269611ce10b628cc3acc6f76047ea859d8a51395c6` | 1440×960 | `solucao-de-problemas.md`: acesso negado e retorno à área do Mentor. |

Os alts são informativos e cada imagem tem passos textuais correspondentes. A presença de identificadores de demonstração visíveis, inclusive `example.invalid`, foi classificada como dado sintético reservado; isso não constitui aprovação humana de autonomia.

## Links externos

```text
python -B .github/scripts/check_manual.py --source docs/manual --external
Manual aprovado: manifesto e páginas coerentes.
exit=0
```

O resultado externo foi conclusivo no sentido do código do validador, sem inconclusão registrada. Não havia URL HTTPS elegível no conteúdo funcional a consultar: as ocorrências de `https://` encontradas estão em exemplos cercados do arquivo de controle `manutencao.md`, que não é página publicável e não é interpretado como link pelo subconjunto Markdown do validador. O teste não sondou a instância institucional, links de recuperação, a Wiki remota ou destinos privados.

## REFACTOR e validações finais

O ensaio foi consolidado sobre os helpers Git temporários já existentes, passou a conferir explicitamente o conjunto de 7 destinos gerenciados e manteve o diagnóstico do SHA temporário. A reexecução da suíte manual terminou verde:

```text
python -B -m unittest discover -s .github/scripts/tests -p "test_manual_*.py" -v
Ran 69 tests in 29.355s
OK (skipped=2)
```

Os dois skips são os testes de symlink de publicação/conteúdo, justificados pela limitação real do Windows (`WinError 1314`); não foram contados como aprovações.

Validações solicitadas para esta tarefa:

| Comando | Resultado |
|---|---|
| `python -B -m unittest discover -s .github/scripts/tests -p test_manual_publication.py -v` | 20 testes, 19 aprovados, 1 skip; código 0. |
| `python -B -m unittest discover -s .github/scripts/tests -p "test_manual_*.py" -v` | 69 testes, 67 aprovados, 2 skips; código 0. |
| `python -B -m unittest discover -s .github/scripts/tests -p "test_*.py" -v` | 240 testes, 238 aprovados, 2 skips; código 0. |
| `python -B .github/scripts/check_manual.py --source docs/manual` | Código 0; manual aprovado. |
| `python -B .github/scripts/check_manual.py --source docs/manual --external` | Código 0; nenhuma URL externa elegível, sem inconclusão. |
| `git diff --check` | Código 0; sem whitespace inválido. |

Docker/E2E direcionado não foi repetido: T011 já registrou o ambiente Docker saudável e a auditoria visual da fonte real; nesta T014 a integração solicitada é local e não substitui a sessão humana. Não foi produzido qualquer resultado de autonomia a partir de suíte automatizada ou E2E.

## Pendências e integridade do escopo

- CA-001 permanece pendente e não foi inferido dos testes: requer T015, T016 e T017 com pessoas sem contexto prévio.
- CA-003 foi comprovado em T019: a Wiki recebeu o conjunto gerenciado, o `--mode check` retornou 0 em clone novo com LF preservado e as páginas/imagens responderam HTTP 200.
- O `--external` local terminou com código 0 e não deixou resultado inconclusivo; a disponibilidade pública das imagens foi conferida após a publicação.
- Defeitos que surgirem na fonte, no validador ou no gerador devem retornar à tarefa proprietária; T014 não corrigiu scripts de produção nem conteúdo do manual.
- Alterações desta tarefa ficaram restritas a `.github/scripts/tests/test_manual_publication.py` e `.codex/docs/specs/manual-usuario/validacao.md`. `tasks.md`, scripts de produção, `docs/manual`, workflow e README não foram editados por T014; alterações preexistentes do worktree foram preservadas.

## Publicação posterior de T019

Em `2026-09-14`, houve autorização explícita para publicar o manual sem
executar as sessões humanas de T015–T018. A fonte foi integrada em `develop` no
commit `f615dff5af6e5a9cc931f976b2c263e7034c7d0e`; a Wiki recebeu o commit
`d81feb51eafe7606af5a01fac7950d68c3099216` em `master`. A comparação em clone
novo com LF preservado retornou código 0. As 7 páginas e as 9 imagens
responderam HTTP 200. T015–T018 e CA-001 continuam pendentes; a evidência
detalhada está em `evidencias/T019.md`.
