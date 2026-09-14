# Manutenção, publicação e reversão do manual

Esta página é um procedimento para mantenedores do manual. Ela é um arquivo de
controle da fonte e não uma jornada funcional: não entra no índice de
`docs/manual/README.md`, não é listada em `docs/manual/manual.json` e não é
gerada como uma página da Wiki.

## Registro da revisão

- Versão do manual de referência: `2026-09-14.2`
- Produto validado pelas páginas atuais: `2c78dbe1c3ec41f4004f53c42be8fed556080192`
- Data desta revisão do procedimento: `2026-09-14`
- Responsável pela revisão: `nathannmvr`

`versaoManual` é uma revisão editorial e deve avançar quando o conteúdo ou as
imagens publicadas mudarem. `produtoValidado` identifica a versão do produto
exercitada nas telas e é diferente do commit que futuramente conterá a fonte
aprovada. O `commitFonte` registrado na Wiki identifica exatamente esse commit
da fonte; o commit da Wiki é um terceiro identificador. Registre os dois últimos
após uma publicação.

## Regras de segurança e de posse

`docs/manual/` é a fonte revisável. A Wiki é somente o destino gerado a partir de
um commit aprovado da fonte. A publicação não acontece automaticamente no CI:
o CI pode validar o conteúdo em um pull request, mas não possui autorização
nem rotina para escrever, criar commit ou fazer push na Wiki.

Os scripts não recebem credenciais e não têm opções de commit, branch ou push.
Use a autenticação Git já configurada no operador, por SSH ou por um gerenciador
de credenciais. Nunca coloque token, senha ou credencial em URL, argumento de
linha de comando, arquivo de manifesto ou relatório.

As páginas publicadas e `manual-publicacao.json` são o conjunto gerenciado.
`Home.md`, `_Sidebar.md`, páginas de PRD e qualquer documento de outro autor
ficam fora da posse. Nunca use `git add .`, `git add --all`, curingas ou
`push --force`. Se aparecer um arquivo fora do conjunto esperado, pare e
investigue em um clone descartável.

## 1. Revisar e preparar a fonte

Faça esta operação em um checkout limpo do commit aprovado, depois que a
revisão da fonte tiver sido concluída em `develop`. O checkout limpo evita que
um arquivo local, uma imagem ou o manifesto sejam diferentes do SHA informado
ao gerador.

No PowerShell, a preparação pode ser conferida assim, a partir da raiz do
repositório:

```powershell
$Source = "docs/manual"
$SourceSha = (git rev-parse --verify 'HEAD^{commit}').Trim()

if ($SourceSha -notmatch '^[0-9a-f]{40}$') {
    throw "O commit aprovado precisa ser um SHA completo de 40 caracteres."
}

git status --short
git diff --exit-code -- $Source
git rev-parse --verify "${SourceSha}^{commit}"
```

O `status` deve estar vazio e o `diff` deve terminar com código `0`. O SHA
obtido deve ser o commit aprovado, não apenas o nome `develop`, uma tag móvel
ou um SHA temporário de um ensaio. Se o checkout não estiver no commit
aprovado, corrija a preparação antes de validar ou gerar.

Registre separadamente, sem confundi-los:

1. `versaoManual` e `atualizadoEm` em `manual.json` — revisão e data editoriais;
2. `produtoValidado` — commit completo do produto que foi exercitado;
3. `SourceSha` — commit completo da fonte aprovada, incluindo manifesto e
   imagens;
4. o SHA que a Wiki receberá depois do commit de publicação.

Não altere `manual.json` para incluir esta página. Se uma alteração funcional
ou uma imagem mudar, atualize a revisão editorial e repita as verificações e a
revisão afetadas antes de escolher um novo `SourceSha`.

## 2. Executar os validadores

Os comandos abaixo partem da raiz do repositório. Eles foram conferidos contra
as CLIs reais; não acrescente opções de publicação aos scripts.

### Validação local, sem rede

```powershell
python -B .github/scripts/check_manual.py --source docs/manual
```

O código `0` significa que o manifesto e as páginas locais foram aprovados.
Código `1` indica erro documental ou link definitivamente inválido; código `2`
indica entrada, configuração ou falha operacional. Corrija o problema e
repita a revisão. O modo local não usa rede nem credenciais e é o modo adequado
para o gate determinístico do CI.

### Verificação externa opcional

```powershell
python -B .github/scripts/check_manual.py --source docs/manual --external
```

Essa opção verifica links HTTPS públicos únicos. Ela pode acessar a rede, mas
não publica a Wiki e não deve receber credenciais. Além dos códigos `0`, `1` e
`2`, o código `3` significa resultado externo inconclusivo, por exemplo
timeout, limitação de requisições, erro transitório, servidor 5xx ou destino
que exige autenticação. Nesse caso, registre o destino e o resultado
sanitizado, faça uma conferência autorizada e não declare a publicação
validada apenas porque o comando terminou.

O `--external` não é um substituto para a revisão visual da Wiki. Não sonde
links de recuperação de senha, destinos institucionais ou endereços privados.

## 3. Atualizar e inspecionar o clone local da Wiki

Esta seção descreve a operação posterior autorizada; ela não foi executada
nesta tarefa. Crie ou use um clone isolado, sem misturar trabalho de outro
autor:

```powershell
$Wiki = "D:\caminho\clone-lab-solos-wiki"
$WikiUrl = "https://github.com/ifpebj-ti/lab-solos.wiki.git"

git clone $WikiUrl $Wiki
git -C $Wiki status --short
git -C $Wiki remote show origin
```

O comando `remote show origin` revela a branch padrão anunciada pelo remoto.
Use o nome que ele informar; não presuma `master`. Se já existir um clone,
confira seu estado e atualize-o somente depois de verificar que ele não contém
trabalho do usuário:

```powershell
git -C $Wiki fetch --prune origin
git -C $Wiki remote show origin
```

Faça checkout da branch padrão descoberta, se necessário, e confirme novamente
`git status --short`. Falta de permissão para clonar, buscar ou escrever é uma
publicação pendente: não contorne a falha inserindo token nos scripts e não
continue com um clone que não possa ser verificado.

## 4. Gerar localmente e revisar o diff

Com a fonte no `SourceSha` completo e o clone da Wiki em `$Wiki`, execute:

```powershell
python -B .github/scripts/sync_manual_to_wiki.py `
    --source docs/manual `
    --wiki $Wiki `
    --repository ifpebj-ti/lab-solos `
    --ref $SourceSha `
    --mode generate
```

O gerador valida a fonte, prepara todo o conjunto em área temporária e só
então altera o clone local. `generate` não faz commit nem push. Ele transforma
links para as páginas da Wiki, fixa imagens no SHA da fonte e cria o manifesto
determinístico `manual-publicacao.json`. Na atualização, só pode remover uma
página obsoleta cuja posse e cujo hash anterior estejam comprovados.

Antes de preparar qualquer commit, examine o estado e a diferença incluindo
arquivos novos:

```powershell
git -C $Wiki status --short
git -C $Wiki diff --check
git -C $Wiki diff --name-status
```

Leia o diff completo e confirme que somente páginas do manual e
`manual-publicacao.json` foram criados, alterados ou removidos. O conteúdo de
`Home.md`, `_Sidebar.md`, PRDs e documentos alheios deve permanecer byte a
byte igual. A existência de arquivos novos exige revisão explícita porque
`git diff` sem estágio não os exibe.

### Estágio explícito e restrito

Leia `arquivosGerenciados` no `manual-publicacao.json` gerado e substitua a
lista abaixo pela lista exata desse manifesto. Para a fonte atual, o conjunto
esperado é o seguinte:

```powershell
git -C $Wiki add -- `
    Manual-do-Usuario.md `
    Manual-do-Usuario-perfis-e-permissoes.md `
    Manual-do-Usuario-acesso-e-conta.md `
    Manual-do-Usuario-administrador.md `
    Manual-do-Usuario-mentor.md `
    Manual-do-Usuario-mentorado.md `
    Manual-do-Usuario-solucao-de-problemas.md `
    manual-publicacao.json

git -C $Wiki status --short
git -C $Wiki diff --cached --check
git -C $Wiki diff --cached --name-status
```

Revise novamente o diff em estágio (`git diff --cached`). Se houver qualquer
arquivo inesperado, caminho fora da raiz, alteração em documento alheio,
colisão ou remoção sem posse comprovada, não faça commit. Aborte a preparação
e use uma fonte/clone limpos após reconciliar o problema na revisão editorial.

O modo `check` é somente leitura e deve ser usado para confirmar uma Wiki já
publicada ou para o caso sem mudanças:

```powershell
python -B .github/scripts/sync_manual_to_wiki.py `
    --source docs/manual `
    --wiki $Wiki `
    --repository ifpebj-ti/lab-solos `
    --ref $SourceSha `
    --mode check
```

Nesse modo, código `0` confirma equivalência; código `1` indica divergência
ou manifesto de publicação ausente; código `2` indica entrada, manifesto ou
falha operacional inválida. Se `check` retornar `0`, não há publicação a
fazer: não crie commit vazio nem faça push. Na primeira publicação, o retorno
`1` é esperado porque ainda não existe `manual-publicacao.json`; nesse caso,
gere localmente, revise o diff e só prossiga se a operação tiver autorização.

## 5. Commit e push somente em operação autorizada

Esta tarefa não autoriza publicação externa. Em uma sessão que tenha essa
autorização explícita, depois da revisão do diff em estágio e da confirmação de
que os checks locais passaram, crie um commit próprio na branch padrão da Wiki:

```powershell
git -C $Wiki commit -m "docs: publicar manual do usuario"
git -C $Wiki push origin <branch-padrao-descoberta>
```

Substitua `<branch-padrao-descoberta>` pelo nome retornado por `remote show
origin`; o marcador não é um argumento literal. O commit deve conter somente
os caminhos gerenciados. Não use `--force` ou `--force-with-lease` e não faça
push se a revisão, a permissão ou a autorização estiverem ausentes.

Se o push for rejeitado por concorrência, pare. Não force o histórico: obtenha
uma nova leitura/clonagem do remoto, descubra novamente a branch, confira as
alterações concorrentes, regenere a partir do mesmo ou de um novo commit de
fonte aprovado e repita a revisão do diff. Uma edição direta em página
gerenciada, remoção inesperada ou colisão sem posse deve ser reconciliada na
fonte, não sobrescrita pelo gerador.

## 6. Comparar após a publicação

Depois de um push autorizado, faça uma leitura nova do remoto em outro clone
ou em um clone descartável atualizado. Não use somente os arquivos que
acabaram de ser escritos localmente para declarar sucesso:

```powershell
$VerifyWiki = "D:\caminho\clone-lab-solos-wiki-verificacao"
git clone --branch <branch-padrao-descoberta> --single-branch `
    https://github.com/ifpebj-ti/lab-solos.wiki.git $VerifyWiki
git -C $VerifyWiki rev-parse HEAD

python -B .github/scripts/sync_manual_to_wiki.py `
    --source docs/manual `
    --wiki $VerifyWiki `
    --repository ifpebj-ti/lab-solos `
    --ref $SourceSha `
    --mode check
```

Registre o `SourceSha`, o SHA retornado por `git -C $VerifyWiki rev-parse
HEAD`, a versão editorial, a versão do produto, a data e o resultado do
`check`. O resultado esperado é código `0`. Confira também no navegador as
páginas, âncoras, links e imagens fixadas no SHA da fonte. Código `1` ou `2`
mantém a publicação inconclusiva; código `3` do validador externo também exige
conferência antes de afirmar que a publicação foi validada.

## 7. Falhas e ausência de publicação parcial

O gerador foi desenhado para preparar e validar o conjunto antes de aplicar a
alteração. Se a validação da fonte, do manifesto, da posse ou do destino
falhar, não faça estágio, commit ou push. Preserve o clone para diagnóstico ou
descarte-o e repita a operação em um clone limpo. Nunca corrija uma falha
escrevendo diretamente uma página da Wiki.

Use esta decisão para os cenários principais:

| Situação | Resultado seguro |
|---|---|
| Primeira publicação | `check` retorna `1`; `generate` só depois de confirmar clone e diff vazios/permitidos. Colisões com arquivos não gerenciados interrompem a geração. |
| Nenhuma mudança | `check` retorna `0`; não criar commit nem fazer push. |
| Edição direta, remoção inesperada ou colisão | `generate` interrompe com erro operacional (`2`) e não sobrescreve nem remove o conteúdo conflitante. Reconciliar na fonte. |
| Link ou manifesto inválido | O validador reprova; não preparar um conjunto parcial. |
| Push concorrente rejeitado | Não usar force-push; atualizar a leitura do remoto, regenerar e revisar novamente. |
| Falta de permissão ou Wiki indisponível | Registrar publicação pendente; manter a fonte aprovada e a preparação local, sem alegar CA-003 concluído. |
| Verificação externa inconclusiva | Registrar código `3`, destino e diagnóstico sanitizado; conferir antes de declarar sucesso. |
| Falha depois da preparação local | Não publicar parte do conjunto. Usar clone descartável ou repetir a preparação em outro clone limpo. |

## 8. Reversão compatível

Uma reversão do manual não reverte o produto. Primeiro escolha um commit
anterior da fonte que tenha sido aprovado e confirme que suas páginas,
imagens, `manual.json` e versão do gerador continuam compatíveis. Use um
checkout limpo desse commit anterior e seu SHA completo como `--ref`; não
edite a fonte atual para simular a reversão.

Em um clone atualizado da Wiki, repita as etapas de geração, revisão e estágio
restrito com o commit anterior:

```powershell
git -C $Wiki status --short

python -B .github/scripts/sync_manual_to_wiki.py `
    --source docs/manual `
    --wiki $Wiki `
    --repository ifpebj-ti/lab-solos `
    --ref $PreviousSourceSha `
    --mode generate

git -C $Wiki diff --check
git -C $Wiki diff --name-status
```

Após revisão e autorização, registre a reversão em um novo commit da Wiki e
faça push normal. Depois, execute novamente o `--mode check` em uma nova leitura
do remoto e registre o SHA anterior da fonte e o novo SHA da Wiki. Não reescreva
o histórico. Se o esquema do gerador tiver evoluído de modo incompatível, use a
versão correspondente ao commit anterior e valide o conjunto antes de publicar.

Uma reversão compatível é uma nova geração rastreável, não uma edição direta
nem uma restauração indiscriminada. A disponibilidade do produto para os
leitores deve ser conferida novamente, pois documentação anterior pode não ser
compatível com a versão atual do sistema.

## Limite desta execução

Nesta revisão foram documentados o procedimento e o caminho de descoberta no
README principal. Nenhuma publicação externa, commit, push ou merge foi
executado. O CI continua sendo apenas validação; qualquer publicação ou
reversão futura exige autorização própria, revisão do diff e comparação após a
leitura nova do remoto.
