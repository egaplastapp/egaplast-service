---
name: prototipo-realista
description: Transforma um requisito operacional da EGAPLAST em interface funcional, com estados reais de uso e dados demonstrativos rotulados. Use ao desenhar dashboard, fila de pedidos, rastreio, wireframe ou protótipo de tela empresarial.
---

# Protótipo realista

## Objetivo

Permitir que alguém da operação julgue se a tela reduz o trabalho, antes de tratar a interface como solução definitiva.

## Procedimento

1. Escreva a pergunta operacional que a tela precisa responder.
2. Inspecione rotas e componentes existentes. Estenda loja, gestor ou mesa quando o fluxo já morar ali.
3. Implemente a tela no aplicativo Next.js atual. Uma imagem conceitual não substitui esse protótipo.
4. Use dados demonstrativos coerentes e rotule-os como fictícios. Informe origem e data de cada bloco.
5. Cubra vazio, carregamento, erro, divergência entre fontes e o caso excepcional do fluxo.
6. Não apresente número, pedido ou status de demonstração como operação atual da EGAPLAST.
7. Mostre a ação disponível e a consequência visível para quem usa a tela.
8. Reutilize `src/components/ui`. Não adicione biblioteca de interface.
9. Ao final, explique a decisão de layout e o critério para considerar o protótipo aceito.

## Restrições

- Não invente campo de API para preencher a tela.
- Se a informação não existir na fonte, a tela diz que está ausente.
- Status vindo de um único sistema aparece com o nome desse sistema, sem ser promovido a estado operacional consolidado.

## Formato da entrega

1. Pergunta que a tela responde.
2. Onde a tela ficou no aplicativo.
3. Quais dados são fictícios e quais seriam reais.
4. Estados cobertos.
5. O que ainda não dá para validar.
