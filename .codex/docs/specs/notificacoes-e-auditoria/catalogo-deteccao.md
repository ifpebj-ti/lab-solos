# Catálogo de regras de detecção de auditoria

Este catálogo registra as regras automáticas aplicadas aos diagnósticos operacionais. Os eventos são avaliados com o relógio UTC do servidor, por meio de `TimeProvider`, e os testes usam apenas identidades e origens sintéticas.

## Versão 1

| Código estável | Eixo | Evento | Janela | Limiar inclusivo | Precedência |
| --- | --- | --- | --- | ---: | ---: |
| `falhas-login-conta-15min` | Conta autenticada | Falha de autenticação | 15 minutos | 5 | 1 |
| `falhas-login-origem-15min` | Origem validada | Falha de autenticação | 15 minutos | 30 | 2 |

As regras contam o evento em avaliação. A janela inclui o instante inicial (`agora - 15 minutos`) e o instante atual. Uma falha no limiar aciona a regra. Quando os dois limites são atingidos, prevalece a regra por conta. A regra por origem agrupa pelo endereço IP normalizado pelo servidor e só é aplicada quando esse endereço está disponível.

Eventos sem identidade válida recebem a categoria explícita `SemAtorValido` quando nenhuma regra de suspeita se aplica. A categoria de detecção e a referência da regra são imutáveis depois do registro. A revisão humana autorizada altera a classificação efetiva (`Suspeita`) em revisão vinculada, sem apagar a categoria, o código, a versão ou a contagem observada pela detecção.

## Persistência e projeção

Cada evento guarda `CategoriaDeteccao`. Quando uma regra automática determina suspeita, também guarda seu código, versão e quantidade observada. Eventos legados recebem categoria inferida somente a partir do valor observado de suspeita e da origem já armazenada; a migração não cria uma regra ou versão retrospectiva.

A projeção administrativa expõe a classificação efetiva, a categoria automática e os metadados mínimos da regra junto do histórico de revisão. A exportação CSV usa os mesmos campos. Material de autenticação, contexto bruto e justificativas fora do histórico autorizado não são incluídos por esta mudança.

## Versionamento

O código e a versão registrados permanecem vinculados ao evento mesmo quando uma regra futura for alterada. Uma mudança de limiar, janela, eixo ou precedência exige uma nova versão neste catálogo e no `AuditDetectionRuleCatalog`; versões anteriores continuam documentadas para interpretação dos registros existentes.
