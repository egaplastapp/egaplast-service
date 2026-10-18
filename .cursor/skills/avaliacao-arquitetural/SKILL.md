---
name: avaliacao-arquitetural
description: Compara alternativas de arquitetura, integração, modelagem, segurança e evolução do código da EGAPLAST. Use ao escolher como integrar Sellent, SIFN, Monday ou outro sistema, ao mudar persistência, fronteiras de módulo ou contratos de dados.
---

# Avaliação arquitetural

## Objetivo

Escolher uma decisão técnica verificável, compatível com o código e com o acesso real aos sistemas.

## Procedimento

1. Leia `docs/negocio/contexto.md` e inspecione `src/domain`, `src/data` e as rotas em `src/app` antes de propor estrutura.
2. Formule a decisão em uma frase e o critério que a torna aceitável.
3. Liste o que já existe: fronteiras, contratos, testes e o que ainda é só comentário ou intenção.
4. Para cada alternativa, registre encaixe no código atual, dono do dado, modo de falha, segurança, esforço, manutenção e o que ela não resolve.
5. Descarte alternativa que exija dependência, serviço ou acesso a sistema ainda inexistente, salvo se o acesso for um passo explícito e anterior.
6. Recomende a menor mudança que possa ser verificada sem fechar a evolução futura.
7. Defina critérios de sucesso, regressões a observar e o que continua desconhecido.
8. Se a dúvida for de processo de negócio, e não de estrutura técnica, use a skill `diagnostico-operacional` antes desta.

## Restrições

- Status de um sistema não prova estado de outro.
- Não invente campo, endpoint ou regra de correlação.
- Supabase, filas, cache e novos serviços só entram com necessidade demonstrada.
- Preserve o contrato atual da demonstração: leitura por `useDemo()` e escrita por `aplicar()`.

## Formato da entrega

1. Decisão em aberto.
2. Restrições confirmadas no repositório.
3. Alternativas, com vantagens, desvantagens, riscos e custo.
4. Recomendação e o que ela adia de propósito.
5. Plano incremental e critérios de aceite.
