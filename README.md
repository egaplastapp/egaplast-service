# EGAPLAST Service

Base operacional dos pedidos. A tela lê o Postgres. A coleta do Sellent é separada e só faz leitura.

```bash
npm run dev
npm run coletar
npm test
```

O acesso é por convite. As variáveis ficam em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SELLENT_API_TOKEN`, `SERVICE_ADMIN_EMAIL` e `SERVICE_ADMIN_PASSWORD`.
