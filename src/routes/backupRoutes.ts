/**
 * @swagger
 * components:
 *   schemas:
 *     Backup:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do backup
 *         fileName:
 *           type: string
 *           description: Nome do arquivo de backup
 *         fileSize:
 *           type: number
 *           description: Tamanho do arquivo em bytes
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *           description: Status do backup
 *         type:
 *           type: string
 *           enum: [MANUAL, AUTOMATIC]
 *           description: Tipo do backup
 *         createdBy:
 *           type: string
 *           description: ID do usuário que criou o backup
 *         user:
 *           $ref: '#/components/schemas/User'
 *         organizationId:
 *           type: string
 *           description: ID da organização
 *         createdAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         downloadUrl:
 *           type: string
 *           description: URL para download do backup
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Data de expiração do backup
 *   
 *   tags:
 *     - name: Backup
 *       description: Gestão de backups e restauração de dados
 */

import { Router } from "express";
import {
  getBackupHistory,
  createBackup,
  downloadBackup,
} from "../controllers/backupController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// All backup routes require authentication and admin/system manager roles
router.use(authMiddleware);

/**
 * @swagger
 * /api/backup/history:
 *   get:
 *     summary: Histórico de backups
 *     description: Retorna o histórico de todos os backups realizados (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Backup]
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
 *           default: 20
 *         description: Itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED]
 *         description: Filtrar por status do backup
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [MANUAL, AUTOMATIC]
 *         description: Filtrar por tipo de backup
 *     responses:
 *       200:
 *         description: Histórico de backups retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Backup'
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
router.get("/history", getBackupHistory);

/**
 * @swagger
 * /api/backup/create:
 *   post:
 *     summary: Criar novo backup
 *     description: Inicia o processo de criação de um novo backup manual do sistema (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               includeFiles:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir arquivos de TCCs no backup
 *               includeDatabase:
 *                 type: boolean
 *                 default: true
 *                 description: Incluir dados do banco de dados
 *               description:
 *                 type: string
 *                 description: Descrição opcional do backup
 *                 example: "Backup manual antes da atualização do sistema"
 *     responses:
 *       202:
 *         description: Backup iniciado com sucesso (processamento assíncrono)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Backup iniciado com sucesso"
 *                 backupId:
 *                   type: string
 *                   description: ID do backup criado
 *                 estimatedTime:
 *                   type: string
 *                   description: Tempo estimado para conclusão
 *                   example: "15-30 minutos"
 *       400:
 *         description: Parâmetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado - apenas ADMIN e SYSTEM_MANAGER
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Já existe um backup em andamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/create", createBackup);

/**
 * @swagger
 * /api/backup/download/{id}:
 *   get:
 *     summary: Download de backup
 *     description: Realiza o download de um arquivo de backup específico (apenas ADMIN e SYSTEM_MANAGER)
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do backup
 *     responses:
 *       200:
 *         description: Arquivo de backup disponibilizado para download
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Nome do arquivo para download
 *             schema:
 *               type: string
 *               example: 'attachment; filename="backup_2025-01-15.zip"'
 *           Content-Length:
 *             description: Tamanho do arquivo em bytes
 *             schema:
 *               type: integer
 *       404:
 *         description: Backup não encontrado ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Acesso negado - apenas ADMIN e SYSTEM_MANAGER
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       410:
 *         description: Backup expirado e não está mais disponível
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/download/:id", downloadBackup);

export default router;
