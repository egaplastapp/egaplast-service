# EGAPLAST — Documento de Produto (rascunho v0.1)

> Status em 16/10/2026: rascunho inicial preservado. O contexto vigente está em `docs/negocio/contexto.md`.
> O aplicativo de demonstração já existe. O responsável identificou o ERP como SIFN, ainda sem acesso. Onde este texto divergir do contexto vigente ou do código, registre o conflito; não apague a premissa abaixo.
> Legenda original: **[CONFIRMADO]** vem do site oficial ou do responsável pelo negócio · **[PREMISSA]** assumido até validação · **[ABERTO]** precisa de decisão.

---

## 1. Visão

Plataforma comercial B2B em que:

- o **lojista** recompra em poucos cliques e acompanha tudo sem precisar perguntar;
- o **gestor** trabalha por prioridades: o que está parado, quem parou de comprar e qual a próxima ação.

Não é uma loja virtual para consumidor final. Cada funcionalidade deve ter um indicador mensurável (seção 9).

## 2. Contexto confirmado

**Empresa [CONFIRMADO — site oficial]**
- Indústria de produtos hidrossanitários em Brasília-DF (Águas Claras). Contato institucional: ega@ e sac@egaplast.com.br.
- Especialidade declarada: mecanismos para caixa acoplada.
- Linhas: mecanismos para caixa acoplada, duchas higiênicas, torneiras e chuveiros, escoamento (válvulas, ralos, sifões), reparos e acabamentos, prolongadores, conexões e adaptadores, Linha Black.
- Materiais existentes: catálogo anual (2023 publicado), galeria de imagens, manual de identidade visual, expositores de PDV.

**Operação atual [CONFIRMADO — responsável]**
- Pedidos chegam por WhatsApp/telefone, representantes, e-mail/planilha e ERP.
- Existe um ERP, mas **ainda sem acesso**. Deve ser tratado como integração futura.
- Preço: **tabela única** para todos os clientes.

**Ainda não sabemos [ABERTO]**
- Qual ERP é usado e como extrair dados dele.
- Pedido mínimo, prazo de pagamento, frete e limite de crédito.
- Se o preço é público ou só visível após login e aprovação.
- Se distribuidores terão sub-clientes dentro do portal.
- Se o catálogo atual (2023) está vigente e onde ficam as fichas técnicas e compatibilidades.

## 3. Premissas de projeto (derivadas das respostas)

1. **Pedido do portal ≠ pedido faturado.** Sem ERP, o portal recebe, valida e aprova pedidos. O lançamento no ERP segue manual, com campo "nº do pedido no ERP" e exportação CSV dos aprovados. Status de separação e expedição são atualizados manualmente pelo gestor até haver integração.
2. **Pedido assistido é obrigatório desde o início.** Representantes hoje recebem pedidos; o portal deve permitir que o vendedor lance pedido em nome do cliente, registrando que foi assistido. Sem isso, o canal paralelo (WhatsApp) vence o portal.
3. **Preço modelado como tabela de preços**, mesmo com uma só tabela no início. Evita refazer o modelo quando surgirem condições por cliente.
4. **Sem histórico no dia 1.** Reposição inteligente exige importar vendas passadas (CSV do ERP ou planilhas). Importação de histórico é pré-requisito da Fase 3.
5. **Estoque, logística e fiscal: indisponíveis.** Tela deve mostrar "não informado", nunca um valor inventado.

## 4. Perfis e permissões

| Perfil | Ambiente | Pode |
|---|---|---|
| Lojista — Comprador | Portal | Montar carrinho, enviar pedido, ver os pedidos da própria empresa |
| Lojista — Aprovador/Admin | Portal | Tudo do comprador + aprovar pedidos internos, gerir usuários da empresa |
| Vendedor/Representante | Painel | Ver sua carteira, lançar pedido assistido, registrar contato |
| Gestor comercial | Painel | Aprovar/rejeitar, atribuir, ver todos os clientes e relatórios |
| Administrador | Painel | Tudo + equipe, permissões, auditoria, configurações |

Regras: acesso sempre limitado à **empresa** do usuário; autorização no backend; notas internas nunca visíveis ao lojista.

## 5. Modelo conceitual de dados (sem tecnologia)

- **Empresa** (cliente): CNPJ, razão social, status (`pendente` / `aprovado` / `rejeitado` / `suspenso`), aprovado por, data, vendedor responsável.
- **Usuário**: pertence a uma empresa (ou à EGAPLAST), perfil.
- **Produto**: código EGAPLAST oficial, nome, linha, categoria, especificações, imagem, ativo. Fonte: catálogo oficial.
- **Tabela de preços / Preço**: produto × tabela × valor × vigência.
- **Pedido**: id único, empresa, criado por, origem (`portal` / `assistido`), status, total, nº ERP, chave de idempotência.
- **Item do pedido**: produto, referência e preço **congelados** na hora do pedido, quantidade.
- **Evento** (linha do tempo): pedido/empresa, tipo, ator, data/hora, detalhe, motivo. Imutável.
- **Mensagem**: vinculada a pedido ou atendimento, visibilidade `cliente` ou `interna`.
- **Solicitação**: cancelamento, devolução, suporte, com motivo obrigatório e status.
- Futuro: Lista de compras, Oportunidade, Tarefa, Cotação, Meta, Regra de automação.

## 6. Fluxos críticos

### 6.1 Cadastro e aprovação de lojista
Solicita acesso → `pendente` → gestor analisa → `aprovado` (registra responsável e data) ou `rejeitado` (com motivo) → lojista é notificado. Sem aprovação, não vê catálogo com preços nem faz pedidos.

### 6.2 Pedido (máquina de estados proposta)

```
rascunho → recebido → em_análise → aprovado → em_separação → concluído
                 │          │          │
                 │          └→ devolvido_para_correção → recebido
                 └→ cancelado (motivo obrigatório; só até certo estágio)
```

- Só transições listadas são permitidas; validação no servidor.
- Cancelamento e devolução exigem justificativa.
- Reenvio do mesmo pedido não duplica (chave de idempotência).
- Erro de envio nunca descarta o carrinho.
- "Em separação" e "concluído" são atualizados manualmente enquanto não houver integração; a interface deve deixar isso claro para a equipe.
- Total = soma dos itens congelados; regras de frete e desconto só quando definidas.

### 6.3 Conversa vinculada
Mensagens ficam no pedido. Cada mensagem é `cliente` (visível ao lojista) ou `interna`. A interface deve distinguir isso de forma inequívoca antes do envio.

### 6.4 Pedido assistido
Vendedor escolhe empresa da sua carteira → monta itens → envia. O evento registra vendedor e origem. Pode exigir confirmação do cliente (**[ABERTO]**).

## 7. Mapa de navegação

**Portal do lojista**
Início (atalhos e reposição quando houver) · Catálogo · Carrinho · Meus pedidos (detalhe com linha do tempo e conversa) · Listas de compra · Solicitações (cancelamento, devolução, suporte) · Materiais e fichas técnicas · Minha empresa (usuários)

**Painel do gestor** (seis áreas, sem submenus profundos)
1. Visão geral — o que precisa de atenção (cada alerta leva à ação).
2. Pedidos — fila, aprovação, atribuição, atendimento.
3. Clientes e vendas — cadastros, carteira, inativos, oportunidades.
4. Catálogo — produtos oficiais e materiais.
5. Relatórios — indicadores e exportações.
6. Administração — equipe, permissões, auditoria, regras, integrações.

## 8. Escopo por fase

| Fase | Entregas | Critério de aceite resumido |
|---|---|---|
| **0 — Descoberta** | Mapear o fluxo atual, regras comerciais, ERP, catálogo vigente; definir dados mínimos | Fluxo atual documentado; decisões [ABERTO] resolvidas |
| **1 — Base** | Login real; cadastro e aprovação; catálogo oficial; carrinho; envio de pedido; status sincronizado; pedido assistido; auditoria; exportação CSV de pedidos aprovados | Pedido enviado nunca se perde nem duplica; lojista só vê dados da sua empresa; gestor e lojista veem o mesmo status |
| **2 — Operação** | Central de pedidos (fila, parados, responsável, ações em lote), conversa, cancelamento/devolução com motivo, central de atendimento | Tempo parado visível; notas internas isoladas |
| **3 — Recompra** | Importação de histórico, repetir pedido, listas de compra, reposição baseada em histórico | Reposição explica a origem ("comprou X vezes nos últimos Y dias") e não afirma estoque |
| **4 — Carteira** | CRM, clientes inativos, tarefas, metas, cotações | Inativos calculados por regra configurável |
| **5 — Inteligência** | Venda cruzada (só com compatibilidade documentada), relatórios, automações, copiloto de IA | Respostas rastreáveis a dados reais, respeitando permissões |

## 9. Indicadores de sucesso (hipóteses a validar)

- **Fase 1:** % de pedidos feitos pelo portal vs. canais manuais; tempo entre envio e aprovação.
- **Fase 2:** número de pedidos parados; tempo médio de resposta.
- **Fase 3:** frequência de recompra; % de pedidos criados a partir de reposição ou repetição.
- **Fase 4:** clientes reativados e receita recuperada; conversão de cotações.
- **Fase 5:** ticket médio e itens por pedido; tempo economizado pelo gestor.

Medir o estado atual (linha de base) antes de lançar. Sem isso, nenhum indicador é comparável.

## 10. Integração futura com o ERP

- Arquitetura com **camada de integração isolada**: o portal não depende do ERP para funcionar.
- Etapa intermediária: importação e exportação por arquivo (CSV/Excel) com validação, relatório de erros e proteção contra duplicidade.
- Quando houver acesso: sincronizar clientes, produtos, preços, status de pedido e estoque, com logs, tratamento de falhas e reprocessamento.
- Nunca exibir um dado de ERP que não foi sincronizado como se fosse real.

## 11. Segurança e integridade (resumo)

Autenticação real; autorização no servidor; isolamento por empresa no banco; validação de entradas no servidor; chaves fora do navegador e do repositório; auditoria de ações críticas; proteção de dados pessoais (LGPD); consentimento para mensagens automáticas.

## 12. Fora de escopo no início

Copiloto de IA, construtor visual de automações, mapa comercial, WhatsApp automatizado, estoque em tempo real, faturamento/fiscal. Entram quando existirem dados confiáveis e integrações.

## 13. Decisões em aberto (a resolver na Fase 0)

1. O preço aparece só após login e aprovação?
2. Pedido mínimo, prazo, frete, crédito: quais regras valem?
3. Distribuidores terão sub-clientes no portal?
4. Quem precisa aprovar um cadastro e um pedido? Há limites por valor?
5. Pedido assistido precisa de confirmação do cliente?
6. Qual o ERP e que formato de exportação ele oferece?
7. Quem mantém o catálogo (fonte e frequência de atualização)?
8. Qual o prazo aceitável para aprovar um pedido (SLA)?
9. Quantas empresas e usuários são esperados no lançamento?
