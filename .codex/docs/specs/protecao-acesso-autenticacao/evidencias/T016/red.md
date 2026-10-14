# T016 — evidência RED

O teste HTTP `SixthInvalidAttemptIsLimitedBeforePasswordVerification` foi adicionado e executado antes de conectar a cota ao endpoint. Após cinco tentativas inválidas para a mesma conta, a sexta tentativa com a senha correta retornou `200 OK`; o contrato exige `429 Too Many Requests` antes da verificação da senha. A falha reproduziu o comportamento anterior e mostrou a ausência do controle no login.

O teste então foi mantido como regressão e ampliado para confirmar o `Retry-After`, a resposta `application/problem+json`, `Cache-Control: no-store` e que a sexta tentativa não chama o hasher.
