/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStatistics:
 *       type: object
 *       properties:
 *         totalTCCs:
 *           type: integer
 *           description: Total de TCCs no sistema
 *         totalUsers:
 *           type: integer
 *           description: Total de usuários ativos
 *         totalStudents:
 *           type: integer
 *           description: Total de estudantes cadastrados
 *         totalCourses:
 *           type: integer
 *           description: Total de cursos cadastrados
 *         totalOrganizations:
 *           type: integer
 *           description: Total de organizações ativas
 *         storageUsed:
 *           type: number
 *           description: Armazenamento total usado em bytes
 *         recentActivity:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *               count:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *
 *   tags:
 *     - name: Relatórios
 *       description: Relatórios estatísticos e analíticos do sistema
 */

import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  getSystemStatistics,
  getTccReports,
  getUserActivityReports,
  getStorageReports,
  getCourseReports,
  getAuthorReports,
  getKeywordReports,
} from "../controllers/reportsController";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/reports/statistics:
 *   get:
 *     summary: Estatísticas gerais do sistema
 *     description: Retorna estatísticas consolidadas de todo o sistema
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStatistics'
 *       403:
 *         description: Acesso negado - permissões insuficientes
 */
router.get("/statistics", getSystemStatistics);

/**
 * @swagger
 * /api/reports/tccs:
 *   get:
 *     summary: Relatório de TCCs
 *     description: Retorna relatórios detalhados sobre os TCCs cadastrados
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filtrar por curso específico
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MONOGRAFIA, DISSERTACAO, TESE]
 *         description: Filtrar por tipo de trabalho
 *     responses:
 *       200:
 *         description: Relatório de TCCs retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTCCs:
 *                   type: integer
 *                 tccsByType:
 *                   type: object
 *                 tccsByYear:
 *                   type: object
 *                 tccsByCourse:
 *                   type: object
 *                 tccsByMonth:
 *                   type: object
 *                 averageDefenseTime:
 *                   type: number
 */
router.get("/tccs", getTccReports);

/**
 * @swagger
 * /api/reports/activity:
 *   get:
 *     summary: Relatório de atividade dos usuários
 *     description: Retorna relatórios sobre a atividade dos usuários no sistema
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Período para o relatório
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por usuário específico
 *     responses:
 *       200:
 *         description: Relatório de atividade retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalActions:
 *                   type: integer
 *                 actionsByUser:
 *                   type: object
 *                 actionsByType:
 *                   type: object
 *                 loginActivity:
 *                   type: object
 *                 mostActiveUsers:
 *                   type: array
 */
router.get("/activity", getUserActivityReports);

/**
 * @swagger
 * /api/reports/storage:
 *   get:
 *     summary: Relatório de armazenamento
 *     description: Retorna informações sobre o uso de armazenamento do sistema
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório de armazenamento retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalStorageUsed:
 *                   type: number
 *                   description: Armazenamento total usado em bytes
 *                 storageByOrganization:
 *                   type: object
 *                   description: Uso de armazenamento por organização
 *                 storageByFileType:
 *                   type: object
 *                   description: Uso de armazenamento por tipo de arquivo
 *                 largestFiles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileName:
 *                         type: string
 *                       fileSize:
 *                         type: number
 *                       uploadDate:
 *                         type: string
 *                         format: date-time
 */
router.get("/storage", getStorageReports);

/**
 * @swagger
 * /api/reports/courses:
 *   get:
 *     summary: Relatório por cursos
 *     description: Retorna estatísticas agrupadas por curso
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório por cursos retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courseStatistics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       courseId:
 *                         type: string
 *                       courseName:
 *                         type: string
 *                       totalTCCs:
 *                         type: integer
 *                       totalStudents:
 *                         type: integer
 *                       tccsByType:
 *                         type: object
 *                       averageDefenseTime:
 *                         type: number
 */
router.get("/courses", getCourseReports);

/**
 * @swagger
 * /api/reports/authors:
 *   get:
 *     summary: Relatório por orientadores
 *     description: Retorna estatísticas dos orientadores e co-orientadores
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório por orientadores retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 advisorStatistics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       advisorId:
 *                         type: string
 *                       advisorName:
 *                         type: string
 *                       totalTCCs:
 *                         type: integer
 *                       tccsByType:
 *                         type: object
 *                       averageGrade:
 *                         type: number
 */
router.get("/authors", getAuthorReports);

/**
 * @swagger
 * /api/reports/keywords:
 *   get:
 *     summary: Relatório por palavras-chave
 *     description: Retorna análise das palavras-chave mais utilizadas
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de palavras-chave a retornar
 *     responses:
 *       200:
 *         description: Relatório por palavras-chave retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topKeywords:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       keyword:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *                 keywordsByYear:
 *                   type: object
 *                 keywordsByCourse:
 *                   type: object
 */
router.get("/keywords", getKeywordReports);

export default router;
