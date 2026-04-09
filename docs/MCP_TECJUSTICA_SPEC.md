# TecJustica MCP — Especificação Formal das Ferramentas

> Documento gerado por engenharia reversa dos parsers em `backend-server.js`.  
> Serve como referência para implementar servidores MCP compatíveis com este cliente.

---

## 1. Visão Geral

### Protocolo

O servidor MCP TecJustica usa o protocolo **Model Context Protocol (MCP)** com transporte **Streamable HTTP** (também chamado de SSE/HTTP).

```
URL padrão: https://tecjusticamcp-lite-production.up.railway.app/mcp
Protocolo:  MCP sobre HTTP (StreamableHTTPClientTransport)
SDK:        @modelcontextprotocol/sdk ^1.0.0
```

### Autenticação

```
Header: Authorization: Bearer <TECJUSTICA_AUTH_TOKEN>
```

O token é enviado na inicialização do transporte via `requestInit.headers`.

### Comportamento de Conexão

| Parâmetro | Valor |
|-----------|-------|
| Timeout por chamada | 20 segundos |
| Tentativas de retry | 3 |
| Backoff entre retries | 500ms → 1000ms → 2000ms (exponencial) |
| Reconexão automática | Sim (ao detectar sessão expirada) |

---

## 2. Convenções de Resposta

### 2.1 Formato do envelope

O servidor retorna respostas no seguinte formato (mais comum — Formato A):

```json
{
  "content": [
    { "type": "text", "text": "<conteúdo textual estruturado>" }
  ],
  "isError": false
}
```

Outros formatos suportados pelo cliente:

| Formato | Estrutura | Observação |
|---------|-----------|-----------|
| A (principal) | `{ content: [{type:"text", text:"..."}] }` | Mais comum |
| B (com mídia) | `{ content: [{type:"text"}, {type:"image"}] }` | Apenas texto é processado |
| C (estruturado) | `{ structuredContent: { result: "..." } }` | Alternativo |
| D (string pura) | `"texto diretamente"` | Fallback |

### 2.2 Erros

Quando uma chamada falha, o servidor retorna `isError: true`:

```json
{
  "content": [{ "type": "text", "text": "Erro: processo não encontrado" }],
  "isError": true
}
```

**Padrões de texto que indicam erro** (detecção client-side):

```
^NAO encontrado
^não encontrado
^Processo não encontrado
^Erro:
^.*retornou HTTP [45]\d\d
```

> Nota: a detecção é ancorada ao início do texto para evitar falso-positivo em documentos que mencionem "não encontrado" no conteúdo.

### 2.3 Cabeçalhos de lista

Linhas de metadados ignoradas durante o parsing:

```
Mostrando N de M resultados
Total: N
```

---

## 3. Ferramentas Disponíveis

### Sumário

| # | Nome | Descrição |
|---|------|-----------|
| 1 | `pdpj_visao_geral_processo` | Resumo completo do processo |
| 2 | `pdpj_buscar_processos` | Busca por CPF ou CNPJ |
| 3 | `pdpj_list_partes` | Partes e advogados por polo |
| 4 | `pdpj_list_movimentos` | Movimentações processuais |
| 5 | `pdpj_list_documentos` | Lista de documentos |
| 6 | `pdpj_read_documento` | Conteúdo de um documento |
| 7 | `pdpj_read_documentos_batch` | Conteúdo de múltiplos documentos |
| 8 | `pdpj_get_documento_url` | URL do PDF original |
| 9 | `pdpj_buscar_precedentes` | Jurisprudência e súmulas |

---

### 3.1 `pdpj_visao_geral_processo`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `numero_processo` | string | sim | Número CNJ no formato `NNNNNNN-DD.AAAA.J.TR.OOOO` |

#### Formato raw esperado (texto)

```
Processo: 7654321-89.2024.8.26.0100
Tribunal: TJSP | 1o Grau | 37ª Vara Cível de São Paulo
Classe: Procedimento Comum Cível
Assunto: Responsabilidade Civil
Status: Em andamento
Juiz: Dr. João da Silva Pereira
Valor da Causa: R$ 25.000,00
Ajuizado: 2024-01-15
```

**Variantes aceitas pelo parser:**

- `Tribunal:` pode conter até 3 partes separadas por `|` → `[sigla] | [instância] | [vara]`
- `Valor:`, `Valor da Causa:` — aceita formato BR (`1.234,56`) e US (`1,234.56`)
- `Ajuizado:` — aceita `YYYY-MM-DD` e `DD/MM/YYYY`
- `Status:`, `Situação:`, `Situacao:` — equivalentes; conteúdo truncado no primeiro `|`
- `Matéria:` — alternativa a `Assunto:`
- `Magistrado:` — alternativa a `Juiz:`

#### Output JSON

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "tribunal": "TJSP",
  "classe": "Procedimento Comum Cível",
  "assunto": "Responsabilidade Civil",
  "assuntos": ["Responsabilidade Civil", "Indenização por Dano Moral"],
  "status": "Em andamento",
  "juiz": "Dr. João da Silva Pereira",
  "vara": "37ª Vara Cível de São Paulo",
  "orgao_julgador": {
    "codigo": null,
    "nome": "37ª Vara Cível de São Paulo",
    "codigo_municipio_ibge": null
  },
  "valor": 25000.00,
  "data_abertura": "2024-01-15",
  "ultima_atualizacao": "2025-03-15T10:22:00Z",
  "resumo": "<texto bruto completo retornado pelo MCP>"
}
```

| Campo | Tipo | Nullable | Observação |
|-------|------|----------|-----------|
| `numero_processo` | string | não | Fallback para o número de entrada |
| `tribunal` | string | não | Primeira parte do campo Tribunal |
| `classe` | string | não | |
| `assunto` | string | não | **Truncado:** primeiro/principal assunto apenas (ver `assuntos[]`) |
| `assuntos` | string[] | não | Lista completa de assuntos. Na fonte Datajud é `assuntos[].descricao` (array com código TPU + descrição). Implementação atual extrai apenas o primeiro; implementações futuras devem expor o array completo |
| `status` | string | não | Default `"Em andamento"` se ausente |
| `juiz` | string | não | |
| `vara` | string | não | Terceira parte do campo Tribunal — equivale a `orgao_julgador.nome` |
| `orgao_julgador` | object | não | Estrutura completa do órgão julgador. Na fonte Datajud contém `{codigo, nome, codigoMunicipioIBGE}`. Implementação atual preenche apenas `nome`; `codigo` e `codigo_municipio_ibge` são null quando não fornecidos pelo MCP |
| `orgao_julgador.codigo` | string\|null | sim | Código interno do órgão no PDPJ |
| `orgao_julgador.nome` | string | não | Nome legível da vara/serventia |
| `orgao_julgador.codigo_municipio_ibge` | string\|null | sim | Código IBGE do município — útil para geolocalização e roteamento por comarca |
| `valor` | number | não | Float; `0` se ausente |
| `data_abertura` | string\|null | sim | ISO 8601 (`YYYY-MM-DD`) |
| `ultima_atualizacao` | string\|null | sim | ISO 8601 com hora — corresponde ao `@timestamp` do índice Datajud. **Crítico para cache:** indica quando os dados foram atualizados na fonte; use para decidir se o cache local está obsoleto |
| `resumo` | string | não | Texto raw completo da resposta MCP |

---

### 3.2 `pdpj_buscar_processos`

#### Input

```json
{
  "cpf_cnpj": "12345678900",
  "tribunal": "TJSP",
  "situacao": "Em andamento"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `cpf_cnpj` | string | sim | CPF (11 dígitos) ou CNPJ (14 dígitos), apenas números |
| `tribunal` | string | não | Sigla do tribunal (ex: `TJSP`, `TRF3`) |
| `situacao` | string | não | Filtro de situação processual |

#### Formato raw esperado (texto)

```
1. 7654321-89.2024.8.26.0100 (TJSP)
   Classe: Procedimento Comum Cível
   Em andamento | Ajuiz: 15/01/2024

2. 1234567-00.2023.8.26.0050 (TJSP)
   Classe: Execução de Título Extrajudicial
   Baixado | Ajuiz: 10/03/2023
```

#### Output JSON

```json
[
  {
    "numero_processo": "7654321-89.2024.8.26.0100",
    "tribunal": "TJSP",
    "classe": "Procedimento Comum Cível",
    "status": "Em andamento"
  }
]
```

| Campo | Tipo | Observação |
|-------|------|-----------|
| `numero_processo` | string | Extraído do header `N. CNJ (TRIBUNAL)` |
| `tribunal` | string | Entre parênteses no header |
| `classe` | string | Linha `Classe:` |
| `status` | string | Primeira parte antes do `\|` na linha de status |

---

### 3.3 `pdpj_list_partes`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `numero_processo` | string | sim |

#### Formato raw esperado (texto)

```
POLO ATIVO
João Silva Santos
Tipo: PF | CPF: 123.456.789-00
Adv: Maria Oliveira Costa (OAB/SP 123456)

POLO PASSIVO
Empresa XYZ Ltda
Tipo: PJ | CNPJ: 12.345.678/0001-90
Adv: Carlos Alberto Souza (OAB/RJ 654321)

POLO OUTROS
```

**Variantes aceitas:**

- Cabeçalhos: `POLO ATIVO` ou `POLO_ATIVO`; `POLO PASSIVO` ou `POLO_PASSIVO`; `POLO OUTROS`, `OUTROS` ou `TERCEIRO`
- `CPF:`, `CNPJ:` ou `CPF/CNPJ:` — todos mapeiam para `cpf_cnpj`
- Advogado: formato `Adv: <nome> (OAB/<estado> <número>)` — regex: `Adv:\s+(.+?)\s+\(OAB\/(\w+)\s+(\w+)\)`

#### Output JSON

```json
{
  "POLO_ATIVO": [
    {
      "nome": "João Silva Santos",
      "tipo": "PF",
      "cpf_cnpj": "123.456.789-00",
      "email": "",
      "advogados": [
        { "nome": "Maria Oliveira Costa", "oab": "SP 123456" }
      ]
    }
  ],
  "POLO_PASSIVO": [
    {
      "nome": "Empresa XYZ Ltda",
      "tipo": "PJ",
      "cpf_cnpj": "12.345.678/0001-90",
      "email": "",
      "advogados": [
        { "nome": "Carlos Alberto Souza", "oab": "RJ 654321" }
      ]
    }
  ],
  "POLO_OUTROS": []
}
```

| Campo | Tipo | Observação |
|-------|------|-----------|
| `nome` | string | Linha sem prefixo, sem `:`, comprimento > 2 |
| `tipo` | string | Default `"PARTE"` se não informado; extraído antes do `\|` em `Tipo:` |
| `cpf_cnpj` | string | Com ou sem formatação |
| `email` | string | Sempre `""` (não extraído atualmente) |
| `advogados` | array | Pode ser vazio |
| `advogados[].nome` | string | |
| `advogados[].oab` | string | Formato `"UF NÚMERO"` |

---

### 3.4 `pdpj_list_movimentos`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "limit": 100,
  "offset": 0
}
```

| Campo | Tipo | Obrigatório | Default | Observação |
|-------|------|-------------|---------|-----------|
| `numero_processo` | string | sim | — | |
| `limit` | integer | não | 20 | Recomendado: 100+ para análise completa |
| `offset` | integer | não | 0 | Paginação |

#### Formato raw esperado (texto)

O servidor suporta **três formatos de linha**:

**Formato A** (preferencial):
```
[15] 2024-12-15 14:30 | Sentença
Juiz prolatou sentença condenando o réu ao pagamento de danos morais.
Órgão: 37ª Vara Cível
Código: 11010

[14] 2024-11-10 09:00 | Audiência de Instrução
Realizada audiência de instrução e julgamento.
Doc: uuid-do-documento
Código: 22600
```

**Formato B**:
```
1. 2024-12-15 - Sentença
2. 2024-11-10 | Audiência de Instrução
```

**Formato C** (multiline):
```
Data: 2024-12-15
Tipo: Sentença
Órgão: 37ª Vara Cível
Texto da movimentação aqui.
```

#### Output JSON

```json
[
  {
    "id": "mov-15",
    "data": "2024-12-15T14:30:00",
    "tipo": "Sentença",
    "codigo_tpu": 11010,
    "descricao": "Juiz prolatou sentença condenando o réu ao pagamento de danos morais.",
    "orgao": "37ª Vara Cível",
    "doc_id": null
  }
]
```

| Campo | Tipo | Nullable | Observação |
|-------|------|----------|-----------|
| `id` | string | não | `"mov-N"` onde N é o número da linha |
| `data` | string | não | ISO 8601 com hora (`T00:00:00` quando sem hora) |
| `tipo` | string | não | Descrição textual da movimentação (ex: `"Sentença"`) |
| `codigo_tpu` | integer\|null | sim | Código numérico da Tabela Processual Unificada (TPU) do CNJ. Na fonte Datajud: `movimentos[].codigo`. **Preferir filtros por código em vez de string matching em `tipo`**, pois a descrição pode variar entre tribunais enquanto o código é padronizado nacionalmente |
| `descricao` | string | não | Primeira linha de texto após o header |
| `orgao` | string | não | Extraído de `Órgão:` ou `Orgao:` |
| `doc_id` | string\|null | sim | Extraído de `Doc:` |

> **Convenção:** `movements[0]` = movimentação mais recente (ordem decrescente por data).

---

### 3.5 `pdpj_list_documentos`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "limit": 20,
  "offset": 0
}
```

| Campo | Tipo | Obrigatório | Default |
|-------|------|-------------|---------|
| `numero_processo` | string | sim | — |
| `limit` | integer | não | 20 |
| `offset` | integer | não | 0 |

#### Formato raw esperado (texto)

**Formato A** (inline):
```
[1] 2024-01-15 | Petição Inicial (Petição) | 45 pág
[2] 2024-03-10 | Contestação (Petição) | 32 pág
[3] 2024-06-20 | Sentença (Decisão) | 8 pág
```

**Formato B** (multiline):
```
1. Petição Inicial
   Data: 2024-01-15
   Tipo: Petição
   ID: 550e8400-e29b-41d4-a716-446655440000
   45 pág
```

#### Output JSON

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titulo": "Petição Inicial",
    "tipo": "Petição",
    "data_criacao": "2024-01-15",
    "paginas": 45
  }
]
```

| Campo | Tipo | Nullable | Observação |
|-------|------|----------|-----------|
| `id` | string\|null | sim | UUID; pode ser null se não informado na resposta |
| `titulo` | string | não | |
| `tipo` | string | não | Pode ser vazio |
| `data_criacao` | string\|null | sim | `YYYY-MM-DD` |
| `paginas` | integer\|null | sim | Extraído de padrão `N pág` ou `N págs` |

---

### 3.6 `pdpj_read_documento`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "documento_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `numero_processo` | string | sim |
| `documento_id` | string | sim |

#### Formato raw esperado

Texto puro do documento (sem estrutura especial). Pode incluir:
- Texto extraído via OCR (qualidade variável)
- Cabeçalhos institucionais
- Conteúdo da peça processual

#### Output JSON

```json
{
  "conteudo": "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO...\n\nVem respeitosamente...",
  "metadata": {
    "titulo": "",
    "tipo": "",
    "dataCriacao": "",
    "paginas": null
  }
}
```

| Campo | Tipo | Observação |
|-------|------|-----------|
| `conteudo` | string | Texto integral do documento |
| `metadata` | object | Campos vazios — metadados não extraídos nesta tool |

---

### 3.7 `pdpj_read_documentos_batch`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "documento_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660f9511-f3ac-52e5-b827-557766551111"
  ]
}
```

| Campo | Tipo | Obrigatório | Limite |
|-------|------|-------------|--------|
| `numero_processo` | string | sim | — |
| `documento_ids` | string[] | sim | máx. 50 IDs |

#### Output JSON

```json
{
  "conteudo": "--- Documento 1 ---\n<texto>\n\n--- Documento 2 ---\n<texto>",
  "documento_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660f9511-f3ac-52e5-b827-557766551111"
  ]
}
```

| Campo | Tipo | Observação |
|-------|------|-----------|
| `conteudo` | string | Texto agregado de todos os documentos solicitados |
| `documento_ids` | string[] | Echo dos IDs solicitados |

---

### 3.8 `pdpj_get_documento_url`

#### Input

```json
{
  "numero_processo": "7654321-89.2024.8.26.0100",
  "documento_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `numero_processo` | string | sim |
| `documento_id` | string | sim |

#### Formato raw esperado

```
URL: https://pje.tjsp.jus.br/pje/Processo/ConsultaDocumento/listView.seam?x=24010300000000
```

A URL é extraída com regex `/(https?:\/\/\S+)/`.

#### Output JSON

```json
{
  "url": "https://pje.tjsp.jus.br/pje/Processo/ConsultaDocumento/listView.seam?x=24010300000000",
  "texto": "URL: https://pje.tjsp.jus.br/pje/Processo/ConsultaDocumento/listView.seam?x=24010300000000"
}
```

| Campo | Tipo | Observação |
|-------|------|-----------|
| `url` | string | URL extraída do texto |
| `texto` | string | Texto bruto da resposta MCP |

---

### 3.9 `pdpj_buscar_precedentes`

#### Input

```json
{
  "busca": "dano moral empréstimo consignado",
  "orgaos": ["STJ", "STF"],
  "tipos": ["SUM", "RG"]
}
```

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|-----------|
| `busca` | string | sim | Termos de busca em linguagem natural |
| `orgaos` | string[] | não | Filtro por tribunal (ver enumeração abaixo) |
| `tipos` | string[] | não | Filtro por tipo de precedente (ver enumeração abaixo) |

#### Formato raw esperado (texto)

```
Total: 3 precedentes

1. [STJ] Súmula 385 — Vigente (atualiz: 01/04/2025)
   Tese: Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral quando preexistente legítima inscrição.
   Decisão: Unânime

2. [STJ] Súmula 387 — Vigente (atualiz: 01/04/2025)
   Tese: É lícita a cumulação das indenizações de dano estético e dano moral.
```

**Separadores aceitos:** `—` (em-dash U+2014) ou `-` (hífen)

#### Output JSON

```json
{
  "busca": "dano moral empréstimo consignado",
  "total": 3,
  "resultados": [
    {
      "id": "prec-STJ-1",
      "ementa": "Súmula 385",
      "tese": "Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral quando preexistente legítima inscrição.",
      "decisao": "Unânime",
      "teor": "",
      "tribunal": "STJ",
      "orgao": "STJ",
      "tipo": "SUM",
      "status": "Vigente",
      "href": null
    }
  ]
}
```

| Campo | Tipo | Nullable | Observação |
|-------|------|----------|-----------|
| `busca` | string | não | Echo do termo buscado |
| `total` | integer | não | Total de resultados no servidor |
| `resultados` | array | não | Resultados na página atual |
| `resultados[].id` | string | não | `"prec-{ORGAO}-{N}"` |
| `resultados[].ementa` | string | não | Identificador do precedente (ex: "Súmula 385") |
| `resultados[].tese` | string | não | Texto da tese fixada |
| `resultados[].decisao` | string | não | Ex: "Unânime" |
| `resultados[].teor` | string | não | Texto adicional (pode ser vazio) |
| `resultados[].tribunal` | string | não | Sigla do tribunal |
| `resultados[].orgao` | string | não | Igual a `tribunal` |
| `resultados[].tipo` | string | não | Código do tipo (ver tabela abaixo) |
| `resultados[].status` | string | não | Ex: "Vigente", "Superado" |
| `resultados[].href` | string\|null | sim | Link externo (raramente preenchido) |

---

## 4. Tipos e Enumerações

### 4.1 Tipos de Precedente

| Código | Nome completo |
|--------|---------------|
| `SV` | Súmula Vinculante |
| `SUM` | Súmula |
| `RG` | Repercussão Geral |
| `IRDR` | Incidente de Resolução de Demandas Repetitivas |
| `IRR` | Incidente de Recurso Repetitivo |
| `RR` | Recurso Repetitivo |
| `CT` | Outros (default quando não reconhecido) |

### 4.2 Polos Processuais

| Chave | Descrição |
|-------|-----------|
| `POLO_ATIVO` | Autor, requerente, denunciante |
| `POLO_PASSIVO` | Réu, requerido, denunciado |
| `POLO_OUTROS` | Terceiros, assistentes, intervenientes |

### 4.3 Tipos de Parte

| Valor | Descrição |
|-------|-----------|
| `PF` | Pessoa Física |
| `PJ` | Pessoa Jurídica |
| `PARTE` | Default quando não especificado |

### 4.4 Formato de Número CNJ

```
NNNNNNN-DD.AAAA.J.TT.OOOO
```

- `NNNNNNN` — 7 dígitos (número do processo)
- `DD` — 2 dígitos (dígito verificador)
- `AAAA` — 4 dígitos (ano)
- `J` — 1 dígito (segmento de justiça)
- `TT` — 2 dígitos (tribunal)
- `OOOO` — 4 dígitos (origem/vara)

Exemplo: `7654321-89.2024.8.26.0100`

**Decodificação do dígito `J` (segmento de justiça):**

| J | Ramo |
|---|------|
| 1 | STF |
| 2 | CNJ |
| 3 | STJ |
| 4 | Justiça Federal (TRFs) |
| 5 | Justiça do Trabalho (TRTs) |
| 6 | Justiça Eleitoral (TREs) |
| 7 | Justiça Militar da União |
| 8 | Justiça Estadual (TJs) |
| 9 | Justiça Militar Estadual |

O dígito `J` determina qual índice do Datajud deve ser consultado para esse processo (ex: `J=8, TT=26` → `api_publica_tjsp`).

---

## 5. Notas de Implementação

### 5.1 Parsing de valor monetário

O parser detecta automaticamente o formato (BR vs. US) pelo último separador:

- Se o último separador é `.` → formato US: `1,234.56` → `1234.56`
- Se o último separador é `,` → formato BR: `1.234,56` → `1234.56`

### 5.2 Parsing de datas

- Entrada aceita: `YYYY-MM-DD` e `DD/MM/YYYY`
- Saída sempre: `YYYY-MM-DD` (ISO 8601)

### 5.3 Paginação

O servidor suporta paginação via `limit` e `offset` em `pdpj_list_movimentos` e `pdpj_list_documentos`. Não paginar automaticamente — sempre consultar o usuário antes de buscar mais páginas.

### 5.4 Processos sigilosos

Processos sigilosos podem retornar acesso negado. O cliente trata como erro via `isMCPError`.

### 5.5 Qualidade do OCR

Documentos obtidos via `pdpj_read_documento` podem conter texto com qualidade variável (OCR). Em caso de texto ilegível, usar `pdpj_get_documento_url` para obter o PDF original.

### 5.6 Campo `vara` em visão geral

O campo `vara` é extraído da **terceira parte** do campo `Tribunal` (separado por `|`):

```
Tribunal: TRF5 | 1o Grau | JEF - PERNAMBUCO
                            ^^^^^^^^^^^^^^^^^ → vara
```

Se o campo `Tribunal` tiver menos de 3 partes, `vara` será string vazia.

### 5.7 Rate limiting upstream (Datajud)

O servidor TecJustica MCP consulta a API Pública do Datajud como fonte primária de dados. Essa API possui rate limiting regulado pelo CNJ para evitar sobrecarga da infraestrutura dos tribunais.

**Implicações para implementações do servidor MCP:**
- Respeitar os limites de taxa do Datajud independentemente dos limitadores do próprio MCP
- Implementar throttling e backoff nas chamadas downstream ao Datajud
- Não disparar consultas em burst para múltiplos processos simultaneamente — sequenciar ou usar filas
- Para CPF/CNPJ de grandes empresas (milhares de processos), sempre exigir filtro de `tribunal` e/ou `situacao` antes de paginar

**Códigos HTTP esperados do Datajud:**
- `404` — processo não encontrado naquele índice de tribunal
- `403` — sem permissão (processo sigiloso ou token inválido)
- `429` — rate limit atingido (implementar backoff)

### 5.8 Limitações conhecidas

- Dados do DataLake PDPJ/CNJ podem ter atraso de atualização — usar `ultima_atualizacao` (`@timestamp`) para avaliar frescor
- A estabilidade depende dos servidores dos tribunais
- `pdpj_read_documentos_batch` aceita no máximo 50 IDs por chamada
- Campo `assunto` retorna apenas o assunto principal; múltiplos assuntos requerem o campo `assuntos[]`
- Campos `codigo_tpu`, `orgao_julgador.codigo` e `orgao_julgador.codigo_municipio_ibge` podem ser `null` dependendo do tribunal e do nível de detalhe exposto pelo MCP

---

## 6. Exemplos de Uso Completo

### Fluxo de análise por CNJ

```
1. pdpj_visao_geral_processo  { numero_processo: "CNJ" }
2. pdpj_list_partes            { numero_processo: "CNJ" }
3. pdpj_list_movimentos        { numero_processo: "CNJ", limit: 100 }
4. pdpj_list_documentos        { numero_processo: "CNJ", limit: 20 }
5. pdpj_read_documento         { numero_processo: "CNJ", documento_id: "ID" }
```

### Fluxo de busca por CPF/CNPJ

```
1. pdpj_buscar_processos  { cpf_cnpj: "12345678900" }
   → apresentar lista, perguntar qual analisar
2. Seguir fluxo por CNJ acima
```

### Fluxo de pesquisa de precedentes

```
1. pdpj_buscar_precedentes  { busca: "termo", orgaos: ["STJ"], tipos: ["SUM"] }
```

---

---

## 7. Ferramentas Potenciais (não implementadas)

### 7.1 Domicílio Judicial Eletrônico

O PDPJ-Br oferece um serviço de citações e intimações eletrônicas com modelo **push via webhook**, diferente do modelo pull das 9 ferramentas atuais. Uma futura tool poderia expor:

| Tool (sugerida) | Descrição |
|-----------------|-----------|
| `pdpj_verificar_habilitacao` | Verifica se CPF/CNPJ está habilitado para receber comunicações eletrônicas |
| `pdpj_listar_intimacoes` | Lista citações e intimações pendentes de uma parte |

**Segurança do webhook:** o PDPJ assina as notificações com HMAC-SHA256 no header `X-PDPJ-Webhook-Signature`. Uma implementação deve validar esse hash antes de processar qualquer notificação recebida.

---

*Gerado em 2026-04-09 a partir de `backend-server.js` (parsers) e `tecjustica-skill-analise-processual.md`.*  
*Atualizado em 2026-04-09 com informações do relatório Gemini sobre a arquitetura PDPJ-Br.*
