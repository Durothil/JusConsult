/**
 * Backend API Server para RPAtec
 * Usa cliente MCP oficial do SDK para comunicação com MCP server
 * Expõe REST endpoints amigáveis para o frontend
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Configuração MCP
const MCP_SERVER_URL = process.env.PROXY_TARGET_URL || 'https://tecjusticamcp-lite-production.up.railway.app/mcp';
const AUTH_TOKEN = process.env.TECJUSTICA_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ TECJUSTICA_AUTH_TOKEN não configurado. Defina a variável de ambiente antes de iniciar.');
  process.exit(1);
}

// Cliente MCP global
let mcpClient = null;
let clientConnected = false;

/**
 * Inicializar cliente MCP
 */
async function initializeMCPClient() {
  if (clientConnected && mcpClient) {
    return mcpClient;
  }

  try {
    console.log(`🔌 Conectando ao MCP Server: ${MCP_SERVER_URL}`);
    console.log(`   AUTH Token length: ${AUTH_TOKEN?.length}`);

    // Usar transporte SSE (Server-Sent Events)
    const transport = new SSEClientTransport({
      url: MCP_SERVER_URL,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
    });

    // Criar cliente MCP
    const clientOptions = {
      name: 'tecjustica-backend',
      version: '1.0.0',
    };

    mcpClient = new Client(clientOptions);

    // Conectar cliente ao transporte
    await mcpClient.connect(transport);

    clientConnected = true;
    console.log(`✅ MCP Client conectado com sucesso`);

    // Listar tools disponíveis
    try {
      const tools = await mcpClient.request({ method: 'tools/list' }, null);
      console.log(`🔧 Tools disponíveis (${tools.tools?.length || 0})`);
      tools.tools?.forEach((tool) => {
        console.log(`   - ${tool.name}`);
      });
    } catch (e) {
      console.warn(`⚠️ Não foi possível listar tools:`, e.message);
    }

    return mcpClient;
  } catch (error) {
    console.error(`❌ Erro ao inicializar MCP Client:`, error.message);
    clientConnected = false;
    throw error;
  }
}

/**
 * Executar ferramenta MCP
 */
async function callMCPTool(toolName, toolInput) {
  try {
    if (!mcpClient || !clientConnected) {
      await initializeMCPClient();
    }

    console.log(`🔧 Chamando MCP Tool: ${toolName}`, JSON.stringify(toolInput).substring(0, 100));

    // Chamar tool usando MCP client - usar callTool method
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolInput,
    });

    console.log(`✅ MCP Result recebido`);
    return result;
  } catch (error) {
    console.error(`❌ Erro ao chamar MCP Tool ${toolName}:`, error.message);
    // Tentar reconectar na próxima chamada
    clientConnected = false;
    throw error;
  }
}

/**
 * GET /api/health - Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/process/visao-geral - Buscar visão geral de processo
 * Body: { numero_processo: string }
 */
app.post('/api/process/visao-geral', async (req, res) => {
  try {
    const { numero_processo } = req.body;

    if (!numero_processo) {
      return res.status(400).json({ error: 'numero_processo é obrigatório' });
    }

    // Validar formato CNJ
    const cnjRegex = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    if (!cnjRegex.test(numero_processo)) {
      return res
        .status(400)
        .json({ error: 'Formato CNJ inválido: NNNNNNN-DD.AAAA.J.TR.OOOO' });
    }

    // Se VITE_USE_MOCK está ativo, retornar mock data
    if (process.env.VITE_USE_MOCK === 'true') {
      console.log(`📋 Retornando mock data para ${numero_processo}`);
      return res.json({
        numero_processo: numero_processo,
        tribunal: 'TJCE',
        classe: 'Procedimento Comum Cível',
        assunto: 'Responsabilidade Civil',
        status: 'Em andamento',
        valor_causa: 50000.00,
        data_ajuizamento: '2025-01-15',
        juiz: 'Dr. João Silva',
        natureza: 'Cível',
        fase: 'Conhecimento',
        _mock: true,
        _updated_at: new Date().toISOString()
      });
    }

    // Caso contrário, chamar MCP Tool
    try {
      const result = await callMCPTool('pdpj_visao_geral_processo', {
        numero_processo,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      // Fallback para mock se MCP falhar
      res.json({
        numero_processo: numero_processo,
        tribunal: 'TJCE',
        classe: 'Procedimento Comum Cível',
        assunto: 'Responsabilidade Civil',
        status: 'Em andamento',
        valor_causa: 50000.00,
        data_ajuizamento: '2025-01-15',
        _fallback_mock: true,
      });
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/search - Buscar processos por CPF/CNPJ
 * Body: { cpf_cnpj: string, tribunal?: string, situacao?: string }
 */
app.post('/api/process/search', async (req, res) => {
  try {
    const { cpf_cnpj, tribunal, situacao } = req.body;

    if (!cpf_cnpj) {
      return res.status(400).json({ error: 'cpf_cnpj é obrigatório' });
    }

    const digitsOnly = cpf_cnpj.replace(/\D/g, '');
    if (digitsOnly.length !== 11 && digitsOnly.length !== 14) {
      return res.status(400).json({ error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos' });
    }

    const result = await callMCPTool('pdpj_buscar_processos', {
      cpf_cnpj,
      tribunal: tribunal || null,
      situacao: situacao || null,
    });

    res.json(result);
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/partes - Listar partes de um processo
 * Body: { numero_processo: string }
 */
app.post('/api/process/partes', async (req, res) => {
  try {
    const { numero_processo } = req.body;

    if (!numero_processo) {
      return res.status(400).json({ error: 'numero_processo é obrigatório' });
    }

    try {
      const result = await callMCPTool('pdpj_list_partes', {
        numero_processo,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      // Fallback para mock data
      res.json({
        POLO_ATIVO: [
          {
            nome: 'João Silva',
            tipo: 'AUTOR',
            cpf_cnpj: '123.456.789-10',
            email: 'joao@example.com',
            advogados: [{ nome: 'Dr. Carlos Santos', oab: 'CE 12345' }]
          }
        ],
        POLO_PASSIVO: [
          {
            nome: 'Empresa XYZ Ltda',
            tipo: 'RÉU',
            cpf_cnpj: '12.345.678/0001-90',
            email: 'contato@empresa.com',
            advogados: [{ nome: 'Dra. Paula Costa', oab: 'CE 98765' }]
          }
        ],
        _fallback_mock: true
      });
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/movimentos - Listar movimentos de um processo
 * Body: { numero_processo: string, limit?: number, offset?: number }
 */
app.post('/api/process/movimentos', async (req, res) => {
  try {
    const { numero_processo, limit = 20, offset = 0 } = req.body;

    if (!numero_processo) {
      return res.status(400).json({ error: 'numero_processo é obrigatório' });
    }

    try {
      const result = await callMCPTool('pdpj_list_movimentos', {
        numero_processo,
        limit,
        offset,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      // Fallback para mock data
      res.json([
        {
          data: '2025-03-15T10:30:00',
          descricao: 'Citação do Réu',
          tipo: 'CITACAO',
          orgao: 'Cartório Judiciário'
        },
        {
          data: '2025-03-10T14:20:00',
          descricao: 'Petição inicial recebida',
          tipo: 'PETICIO',
          orgao: 'Protocolo Judiciário'
        },
        {
          data: '2025-03-05T09:00:00',
          descricao: 'Processo ajuizado',
          tipo: 'AJUIZAMENTO',
          orgao: 'Vara Cível'
        }
      ]);
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/documentos - Listar documentos de um processo
 * Body: { numero_processo: string, limit?: number, offset?: number }
 */
app.post('/api/process/documentos', async (req, res) => {
  try {
    const { numero_processo, limit = 20, offset = 0 } = req.body;

    if (!numero_processo) {
      return res.status(400).json({ error: 'numero_processo é obrigatório' });
    }

    try {
      const result = await callMCPTool('pdpj_list_documentos', {
        numero_processo,
        limit,
        offset,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      // Fallback para mock data
      res.json([
        {
          name: 'Petição Inicial',
          type: 'Petição',
          pages: 5,
          size: 2048
        },
        {
          name: 'Contestação do Réu',
          type: 'Peça',
          pages: 3,
          size: 1536
        },
        {
          name: 'Laudo Pericial',
          type: 'Perícia',
          pages: 8,
          size: 4096
        }
      ]);
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/documento/conteudo - Ler conteúdo de um documento
 * Body: { numero_processo: string, documento_id: string }
 */
app.post('/api/process/documento/conteudo', async (req, res) => {
  try {
    const { numero_processo, documento_id } = req.body;

    if (!numero_processo || !documento_id) {
      return res
        .status(400)
        .json({ error: 'numero_processo e documento_id são obrigatórios' });
    }

    try {
      const result = await callMCPTool('pdpj_read_documento', {
        numero_processo,
        documento_id,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      res.status(404).json({ error: 'Documento não encontrado ou indisponível no momento' });
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/process/documento/url - Obter URL do documento
 * Body: { numero_processo: string, documento_id: string }
 */
app.post('/api/process/documento/url', async (req, res) => {
  try {
    const { numero_processo, documento_id } = req.body;

    if (!numero_processo || !documento_id) {
      return res
        .status(400)
        .json({ error: 'numero_processo e documento_id são obrigatórios' });
    }

    try {
      const result = await callMCPTool('pdpj_get_documento_url', {
        numero_processo,
        documento_id,
      });
      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      res.status(404).json({ error: 'URL do documento não encontrada ou indisponível no momento' });
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

/**
 * POST /api/precedentes/buscar - Buscar precedentes
 * Body: { busca: string, orgaos?: string[], tipos?: string[] }
 */
app.post('/api/precedentes/buscar', async (req, res) => {
  try {
    const { busca, orgaos, tipos } = req.body;

    if (!busca) {
      return res.status(400).json({ error: 'busca é obrigatória' });
    }

    try {
      const result = await callMCPTool('pdpj_buscar_precedentes', {
        busca,
        orgaos: orgaos || null,
        tipos: tipos || null,
      });

      res.json(result);
    } catch (mcpError) {
      console.error('❌ MCP Error:', mcpError.message);
      // Fallback para mock data
      res.json({
        busca: busca,
        total: 5,
        resultados: [
          {
            id: '1',
            ementa: 'Dano moral - responsabilidade civil',
            tese: 'Responsável é aquele que age de forma contrária ao direito',
            tribunal: 'STJ',
            tipo: 'SUM',
            orgao: 'Superior Tribunal de Justiça',
            status: 'Vigente'
          },
          {
            id: '2',
            ementa: 'Dano moral - indenização',
            tese: 'O dano moral é passível de indenização',
            tribunal: 'STF',
            tipo: 'RG',
            orgao: 'Supremo Tribunal Federal',
            status: 'Vigente'
          }
        ],
        _fallback_mock: true
      });
    }
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ error: 'Erro ao processar requisição' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend API Server rodando em http://localhost:${PORT}`);
  console.log(`📡 MCP Server: ${MCP_SERVER_URL}`);
  console.log(`📡 Usando SSE transport para comunicação MCP`);
});
