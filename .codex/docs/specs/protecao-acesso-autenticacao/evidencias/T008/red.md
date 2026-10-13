# T008 — RED

Data: 2026-10-13. Ambiente: Docker 29.8.0; testes relacionais com PostgreSQL 16.

Antes das mudanças, a linha de base pertinente passou: `dotnet test backend/Tests/Tests.csproj -c Release --filter "FullyQualifiedName~UsuarioDataContractTests|FullyQualifiedName~RequiredPasswordChangeAuthorizationTests|FullyQualifiedName~CriticalUserApprovalTests" --nologo --verbosity quiet` — 34/34.

Com os seis novos cenários HTTP compilados, o filtro `FullyQualifiedName~UserResourceAuthorizationTests` retornou 4 falhas e 2 aprovações. As falhas confirmaram lacunas observáveis: Mentor recebia campos além da projeção mínima (`responsavel`); listagem por tipo retornava 200 para não administrador, em vez de 403; consulta com ID de outro responsável retornava 200, em vez de 404; lista administrativa de aprovações vazia retornava 404, em vez de 200/`[]`. Os cenários anônimo e perfil próprio confirmaram, respectivamente, 401 e preservação do resumo do responsável.

O caso de perfil cruzado também passou a exigir 404 uniforme para acesso de outro Mentorando e para ID inexistente. No RED original, o teste foi interrompido antes dessa comparação pela falha anterior da projeção; a validação final executou a comparação após a correção.
