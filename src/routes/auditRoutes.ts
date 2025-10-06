/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do log de auditoria
 *         action:
 *           type: string
 *           description: Ação realizada
 *           example: "TCC_DOWNLOAD"
 *         entityType:
 *           type: string
 *           description: Tipo da entidade afetada
 *           example: "TCC"
 *         entityId:
 *           type: string
 *           description: ID da entidade afetada
 *         userId:
 *           type: string
 *           description: ID do usuário que realizou a ação
 *         user:
 *           $ref: '#/components/schemas/User'
 *         ipAddress:
 *           type: string
 *           description: Endereço IP do usuário
 *           example: "192.168.1.100"
 *         userAgent:
 *           type: string
 *           description: User agent do navegador
 *         details:
 *           type: object
 *           description: Detalhes adicionais da ação
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Data e hora da ação
 *         organizationId:
 *           type: string
 *           description: ID da organização
 *   
 *   tags:
 *     - name: Auditoria
 *       description: Logs e relatórios de auditoria do sistema
 */

import { Router } from "express";
import {
  getAuditLogs,
  getAuditStatistics,
  getUserAuditLogs,
  getFileAuditLogs,
} from "../controllers/auditController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Listar logs de auditoria
 *     description: Retorna uma lista paginada de todos os logs de auditoria (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Auditoria]
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
 *           default: 50
 *         description: Itens por página
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de ação
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de entidade
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por usuário
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do filtro
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do filtro
 *     responses:
 *       200:
 *         description: Logs de auditoria retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
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
 *       403:
 *         description: Acesso negado - apenas ADMIN e SYSTEM_MANAGER
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAuditLogs);

/**
 * @swagger
 * /api/audit/statistics:
 *   get:
 *     summary: Estatísticas de auditoria
 *     description: Retorna estatísticas dos logs de auditoria (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Período para as estatísticas
 *     responses:
 *       200:
 *         description: Estatísticas de auditoria retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalActions:
 *                   type: integer
 *                   description: Total de ações registradas
 *                 actionsByType:
 *                   type: object
 *                   description: Ações agrupadas por tipo
 *                 actionsByUser:
 *                   type: object
 *                   description: Ações agrupadas por usuário
 *                 actionsByDate:
 *                   type: object
 *                   description: Ações agrupadas por data
 *                 mostAccessedFiles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileId:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       accessCount:
 *                         type: integer
 *       403:
 *         description: Acesso negado - apenas ADMIN e SYSTEM_MANAGER
 */
router.get("/statistics", getAuditStatistics);

/**
 * @swagger
 * /api/audit/user/{userId}:
 *   get:
 *     summary: Logs de auditoria por usuário
 *     description: Retorna logs de auditoria de um usuário específico
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
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
 *           default: 50
 *         description: Itens por página
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de ação
 *     responses:
 *       200:
 *         description: Logs do usuário retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Acesso negado - apenas próprios logs ou ADMIN/SYSTEM_MANAGER
 *       404:
 *         description: Usuário não encontrado
 */
router.get("/user/:userId", getUserAuditLogs);

/**
 * @swagger
 * /api/audit/file/{fileId}:
 *   get:
 *     summary: Logs de auditoria por arquivo
 *     description: Retorna logs de auditoria de um arquivo específico (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do arquivo/TCC
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
 *           default: 50
 *         description: Itens por página
 *     responses:
 *       200:
 *         description: Logs do arquivo retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Acesso negado - apenas ADMIN e SYSTEM_MANAGER
 *       404:
 *         description: Arquivo não encontrado
 */
router.get("/file/:fileId", getFileAuditLogs);

export default router;
