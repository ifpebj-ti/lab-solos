# T025 — RED

- Antes das alterações, o filtro das verificações do seed passou **7/7**.
- Acrescentei um caso que fornece apenas parte das credenciais do segundo vínculo sintético e exige rejeição do parser. Executado antes da implementação, o caso falhou porque nenhuma exceção era lançada (`Assert.Throws(): No exception was thrown`). Essa falha caracteriza a lacuna de validação e não decorre de compilação ou infraestrutura.
- Não registrei credenciais, tokens de sessão, tokens de recuperação nem códigos de e-mail nesta evidência.
