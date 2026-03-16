# TecJustica 3.0 Lite — MCP para Pesquisa Jurídica

Integração do [TecJustica 3.0 Lite](https://tecjusticamcp-lite-production.up.railway.app) com Claude Code via protocolo MCP (Model Context Protocol), permitindo consultar processos judiciais brasileiros diretamente no seu assistente de IA.

## O que é

O TecJustica MCP conecta o Claude ao DataLake PDPJ/CNJ e ao Banco Nacional de Precedentes, disponibilizando 9 ferramentas para análise processual:

- Buscar processos por número CNJ, CPF ou CNPJ
- Listar partes, advogados e movimentações
- Ler documentos e peças processuais
- Pesquisar jurisprudência e súmulas (STF, STJ)

## Configuração

### 1. Obter o token de API

Acesse [tecjusticamcp-lite-production.up.railway.app/login](https://tecjusticamcp-lite-production.up.railway.app/login), faça login e copie seu token no dashboard.

### 2. Criar o arquivo `.env`

```bash
export TECJUSTICA_AUTH_TOKEN="seu_token_aqui"
```

### 3. Registrar o servidor MCP

```bash
claude mcp add --transport http tecjustica \
  "https://tecjusticamcp-lite-production.up.railway.app/mcp" \
  --header "Authorization: Bearer seu_token_aqui"
```

### 4. Verificar conexão

```bash
claude mcp list
# tecjustica: ... (HTTP) - ✓ Connected
```

## Usando o skill de análise processual

O arquivo [`tecjustica-skill-analise-processual.md`](tecjustica-skill-analise-processual.md) contém as instruções completas para o Claude analisar processos judiciais de forma estruturada. Carregue-o como instrução de sistema ou cole no início da conversa.

**Exemplos de uso:**

```
Analise o processo 3000066-83.2025.8.06.0203
Quais processos o CPF 12345678900 tem no TJSP?
Busque precedentes sobre dano moral por empréstimo consignado
```

## Ferramentas MCP disponíveis

| Tool | Descrição |
|------|-----------|
| `pdpj_visao_geral_processo` | Resumo completo por número CNJ |
| `pdpj_buscar_processos` | Busca por CPF/CNPJ |
| `pdpj_buscar_precedentes` | Jurisprudência e súmulas |
| `pdpj_list_partes` | Partes e advogados |
| `pdpj_list_movimentos` | Linha do tempo processual |
| `pdpj_list_documentos` | Lista de documentos |
| `pdpj_read_documento` | Leitura de documento |
| `pdpj_read_documentos_batch` | Leitura em lote (até 50 docs) |
| `pdpj_get_documento_url` | URL do PDF original |
