/**
 * @swagger
 * components:
 *   schemas:
 *     TCC:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do TCC
 *         title:
 *           type: string
 *           description: Título do trabalho
 *         type:
 *           type: string
 *           enum: [MONOGRAFIA, DISSERTACAO, TESE]
 *           description: Tipo do trabalho acadêmico
 *         defenseDate:
 *           type: string
 *           format: date
 *           description: Data da defesa
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           description: Palavras-chave do trabalho
 *         abstract:
 *           type: string
 *           description: Resumo do trabalho
 *         student:
 *           $ref: '#/components/schemas/Student'
 *         course:
 *           $ref: '#/components/schemas/Course'
 *         advisor:
 *           $ref: '#/components/schemas/User'
 *         coAdvisor:
 *           $ref: '#/components/schemas/User'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     TCCStatistics:
 *       type: object
 *       properties:
 *         totalTCCs:
 *           type: integer
 *           description: Total de TCCs cadastrados
 *         tccsByType:
 *           type: object
 *           description: TCCs agrupados por tipo
 *         tccsByYear:
 *           type: object
 *           description: TCCs agrupados por ano
 *         tccsByCourse:
 *           type: object
 *           description: TCCs agrupados por curso
 *     
 *     SearchQuery:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Termo de busca
 *         filters:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [MONOGRAFIA, DISSERTACAO, TESE]
 *             courseId:
 *               type: string
 *             year:
 *               type: integer
 *             advisorId:
 *               type: string
 *   
 *   tags:
 *     - name: TCCs
 *       description: Gestão de Trabalhos de Conclusão de Curso
 *     - name: Estatísticas
 *       description: Relatórios e estatísticas dos TCCs
 *     - name: Busca
 *       description: Funcionalidades de pesquisa inteligente
 */

import { Router } from "express";
import {
  getAllTCCs,
  getTCCStatistics,
  getTCCCardsStatistics,
  getTCCChartsStatistics,
  getTCCById,
  updateTCC,
  deleteTCC,
  downloadTCCFile,
  intelligentTCCSearch,
  getSearchHistory,
  clearSearchHistory,
  streamFile,
} from "../controllers/tccController";
import {
  createTCCWithUpload,
  updateTCCDefenseRecord,
} from "../controllers/tccUploadController";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  requireRole,
  requireTCCAccess,
  requireTCCModifyAccess,
  requireTCCDeleteAccess,
} from "../middlewares/roleMiddleware";
import { UserRoles } from "@prisma/client";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/tccs:
 *   get:
 *     summary: Listar todos os TCCs
 *     description: Retorna uma lista paginada de todos os TCCs com filtros opcionais
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca no título
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MONOGRAFIA, DISSERTACAO, TESE]
 *         description: Filtrar por tipo de trabalho
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filtrar por curso
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filtrar por ano de defesa
 *     responses:
 *       200:
 *         description: Lista de TCCs retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tccs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TCC'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Token de autenticação inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAllTCCs);

/**
 * @swagger
 * /api/tccs/statistics/cards:
 *   get:
 *     summary: Estatísticas para cards do dashboard
 *     description: Retorna estatísticas resumidas para exibição em cards
 *     tags: [Estatísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTCCs:
 *                   type: integer
 *                 totalStudents:
 *                   type: integer
 *                 totalCourses:
 *                   type: integer
 *                 recentDefenses:
 *                   type: integer
 */
router.get("/statistics/cards", getTCCCardsStatistics);

/**
 * @swagger
 * /api/tccs/statistics/charts:
 *   get:
 *     summary: Dados para gráficos estatísticos
 *     description: Retorna dados formatados para geração de gráficos
 *     tags: [Estatísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados para gráficos retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tccsByYear:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                       count:
 *                         type: integer
 *                 tccsByType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router.get("/statistics/charts", getTCCChartsStatistics);

/**
 * @swagger
 * /api/tccs/statistics:
 *   get:
 *     summary: Estatísticas completas dos TCCs
 *     description: Retorna estatísticas detalhadas de todos os TCCs
 *     tags: [Estatísticas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas completas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TCCStatistics'
 */
router.get("/statistics", getTCCStatistics);

/**
 * @swagger
 * /api/tccs/search/intelligent:
 *   post:
 *     summary: Busca inteligente de TCCs
 *     description: Realiza busca semântica e inteligente nos TCCs com recomendações
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchQuery'
 *     responses:
 *       200:
 *         description: Resultados da busca retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TCC'
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 totalResults:
 *                   type: integer
 */
router.post("/search/intelligent", intelligentTCCSearch);

/**
 * @swagger
 * /api/tccs/search/history:
 *   get:
 *     summary: Histórico de buscas do usuário
 *     description: Retorna o histórico de buscas realizadas pelo usuário atual
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Histórico de buscas retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   query:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   resultsCount:
 *                     type: integer
 */
router.get("/search/history", getSearchHistory);

/**
 * @swagger
 * /api/tccs/search/history:
 *   delete:
 *     summary: Limpar histórico de buscas
 *     description: Remove todo o histórico de buscas do usuário atual
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Histórico limpo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.delete("/search/history", clearSearchHistory);

/**
 * @swagger
 * /api/tccs/{id}:
 *   get:
 *     summary: Obter TCC por ID
 *     description: Retorna os detalhes completos de um TCC específico
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *     responses:
 *       200:
 *         description: TCC encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TCC'
 *       404:
 *         description: TCC não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado ao TCC
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", requireTCCAccess, getTCCById);

/**
 * @swagger
 * /api/tccs/stream/{id}:
 *   get:
 *     summary: Visualizar TCC em streaming
 *     description: Permite visualização do arquivo PDF do TCC em modo streaming
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *     responses:
 *       200:
 *         description: Arquivo PDF retornado para visualização
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Arquivo não encontrado
 *       403:
 *         description: Acesso negado ao arquivo
 */
router.get("/stream/:id", authMiddleware, streamFile);

/**
 * @swagger
 * /api/tccs/{id}/download/{fileType}:
 *   get:
 *     summary: Download de arquivo do TCC
 *     description: Realiza o download do arquivo principal ou ata de defesa do TCC
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *       - in: path
 *         name: fileType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [main, defense]
 *         description: Tipo do arquivo (main=trabalho principal, defense=ata de defesa)
 *     responses:
 *       200:
 *         description: Arquivo disponibilizado para download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Arquivo não encontrado
 *       403:
 *         description: Acesso negado ao arquivo
 */
router.get("/:id/download/:fileType", requireTCCAccess, downloadTCCFile);

/**
 * @swagger
 * /api/tccs/upload:
 *   post:
 *     summary: Cadastrar novo TCC com upload
 *     description: Cria um novo registro de TCC com upload do arquivo principal
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título do trabalho
 *               type:
 *                 type: string
 *                 enum: [MONOGRAFIA, DISSERTACAO, TESE]
 *                 description: Tipo do trabalho
 *               abstract:
 *                 type: string
 *                 description: Resumo do trabalho
 *               keywords:
 *                 type: string
 *                 description: Palavras-chave separadas por vírgula
 *               defenseDate:
 *                 type: string
 *                 format: date
 *                 description: Data da defesa
 *               studentId:
 *                 type: string
 *                 description: ID do estudante
 *               courseId:
 *                 type: string
 *                 description: ID do curso
 *               advisorId:
 *                 type: string
 *                 description: ID do orientador
 *               coAdvisorId:
 *                 type: string
 *                 description: ID do co-orientador (opcional)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo PDF do trabalho
 *             required:
 *               - title
 *               - type
 *               - studentId
 *               - courseId
 *               - advisorId
 *               - file
 *     responses:
 *       201:
 *         description: TCC criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tcc:
 *                   $ref: '#/components/schemas/TCC'
 *       400:
 *         description: Dados inválidos ou arquivo não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/upload", createTCCWithUpload);

/**
 * @swagger
 * /api/tccs/{id}/defense-record:
 *   put:
 *     summary: Atualizar ata de defesa
 *     description: Faz upload ou atualiza o arquivo da ata de defesa do TCC
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               defenseRecord:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo PDF da ata de defesa
 *             required:
 *               - defenseRecord
 *     responses:
 *       200:
 *         description: Ata de defesa atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: TCC não encontrado
 *       403:
 *         description: Sem permissão para modificar este TCC
 */
router.put("/:id/defense-record", requireTCCModifyAccess, updateTCCDefenseRecord);

/**
 * @swagger
 * /api/tccs/{id}:
 *   put:
 *     summary: Atualizar dados do TCC
 *     description: Atualiza as informações básicas de um TCC existente
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               abstract:
 *                 type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               defenseDate:
 *                 type: string
 *                 format: date
 *               advisorId:
 *                 type: string
 *               coAdvisorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: TCC atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tcc:
 *                   $ref: '#/components/schemas/TCC'
 *       404:
 *         description: TCC não encontrado
 *       403:
 *         description: Sem permissão para modificar este TCC
 */
router.put("/:id", requireTCCModifyAccess, updateTCC);

/**
 * @swagger
 * /api/tccs/{id}:
 *   delete:
 *     summary: Excluir TCC
 *     description: Remove permanentemente um TCC do sistema (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [TCCs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do TCC
 *     responses:
 *       200:
 *         description: TCC excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: TCC não encontrado
 *       403:
 *         description: Sem permissão para excluir TCCs
 */
router.delete("/:id", requireTCCDeleteAccess, deleteTCC);

export default router;
