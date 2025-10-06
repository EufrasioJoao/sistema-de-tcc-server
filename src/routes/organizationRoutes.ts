/**
 * @swagger
 * components:
 *   schemas:
 *     Organization:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único da organização
 *         name:
 *           type: string
 *           description: Nome da organização
 *         email:
 *           type: string
 *           format: email
 *           description: Email da organização
 *         phone:
 *           type: string
 *           description: Telefone da organização
 *         address:
 *           type: string
 *           description: Endereço da organização
 *         isActive:
 *           type: boolean
 *           description: Status de ativação da organização
 *         storageUsed:
 *           type: number
 *           description: Armazenamento usado em bytes
 *         storageLimit:
 *           type: number
 *           description: Limite de armazenamento em bytes
 *         subscriptionEndDate:
 *           type: string
 *           format: date
 *           description: Data de fim da subscrição
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   
 *   tags:
 *     - name: Organizações
 *       description: Gestão de organizações/instituições
 */

import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  activateOrganization,
  createOrganization,
  deactivateOrganization,
  deleteOrganization,
  getAllOrganizations,
  getDashboardDataByOrganizationID,
  getOrganizationById,
  getOrganizationStorage,
  updateOrganization,
} from "../controllers/OrganizationController";

const router = express.Router();

/**
 * @swagger
 * /api/organizations/get-dashboard-data-by-organization-id:
 *   get:
 *     summary: Dados do dashboard por organização
 *     description: Retorna dados estatísticos específicos de uma organização
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                 totalTCCs:
 *                   type: integer
 *                 totalStudents:
 *                   type: integer
 *                 totalCourses:
 *                   type: integer
 *                 storageUsage:
 *                   type: object
 */
router.get(
  "/get-dashboard-data-by-organization-id",
  authMiddleware,
  getDashboardDataByOrganizationID
);

/**
 * @swagger
 * /api/organizations/create:
 *   post:
 *     summary: Criar nova organização
 *     description: Cadastra uma nova organização/instituição no sistema
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - adminName
 *               - adminEmail
 *               - adminPassword
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da organização
 *                 example: "Universidade Católica de Moçambique"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email da organização
 *                 example: "info@ucm.ac.mz"
 *               phone:
 *                 type: string
 *                 description: Telefone da organização
 *                 example: "+258 26 212345"
 *               address:
 *                 type: string
 *                 description: Endereço da organização
 *                 example: "Nampula, Moçambique"
 *               adminName:
 *                 type: string
 *                 description: Nome do administrador
 *                 example: "João Silva"
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 description: Email do administrador
 *                 example: "admin@ucm.ac.mz"
 *               adminPassword:
 *                 type: string
 *                 description: Senha do administrador
 *                 example: "senha123"
 *     responses:
 *       201:
 *         description: Organização criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 */
router.post("/create", authMiddleware, createOrganization);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Listar todas as organizações
 *     description: Retorna uma lista de todas as organizações cadastradas
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de organizações retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Organization'
 */
router.get("/", authMiddleware, getAllOrganizations);

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Obter organização por ID
 *     description: Retorna os detalhes de uma organização específica
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único da organização
 *     responses:
 *       200:
 *         description: Organização encontrada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       404:
 *         description: Organização não encontrada
 */
router.get("/:id", authMiddleware, getOrganizationById);

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Atualizar organização
 *     description: Atualiza as informações de uma organização
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único da organização
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organização atualizada com sucesso
 *       404:
 *         description: Organização não encontrada
 */
router.put("/:id", authMiddleware, updateOrganization);

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: Excluir organização
 *     description: Remove uma organização do sistema
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único da organização
 *     responses:
 *       200:
 *         description: Organização excluída com sucesso
 *       404:
 *         description: Organização não encontrada
 */
router.delete("/:id", authMiddleware, deleteOrganization);

/**
 * @swagger
 * /api/organizations/{organizationId}/activate:
 *   put:
 *     summary: Ativar organização
 *     description: Ativa uma organização desativada
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Organização ativada com sucesso
 *       404:
 *         description: Organização não encontrada
 */
router.put("/:organizationId/activate", authMiddleware, activateOrganization);

/**
 * @swagger
 * /api/organizations/{organizationId}/deactivate:
 *   put:
 *     summary: Desativar organização
 *     description: Desativa uma organização ativa
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Organização desativada com sucesso
 *       404:
 *         description: Organização não encontrada
 */
router.put(
  "/:organizationId/deactivate",
  authMiddleware,
  deactivateOrganization
);

/**
 * @swagger
 * /api/organizations/{id}/storage:
 *   get:
 *     summary: Informações de armazenamento
 *     description: Retorna informações sobre o uso de armazenamento da organização
 *     tags: [Organizações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Informações de armazenamento retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 storageUsed:
 *                   type: number
 *                   description: Armazenamento usado em bytes
 *                 storageLimit:
 *                   type: number
 *                   description: Limite de armazenamento em bytes
 *                 storagePercentage:
 *                   type: number
 *                   description: Percentual de uso do armazenamento
 */
router.get("/:id/storage", authMiddleware, getOrganizationStorage);

export default router;
