/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do usuário
 *         name:
 *           type: string
 *           description: Nome completo do usuário
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         role:
 *           type: string
 *           enum: [ADMIN, SYSTEM_MANAGER, COURSE_COORDINATOR, ACADEMIC_REGISTRY]
 *           description: Papel do usuário no sistema
 *         isActive:
 *           type: boolean
 *           description: Status de ativação do usuário
 *         organizationId:
 *           type: string
 *           description: ID da organização do usuário
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         password:
 *           type: string
 *           description: Senha do usuário
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT para autenticação
 *         user:
 *           $ref: '#/components/schemas/User'
 *         expiresIn:
 *           type: string
 *           description: Tempo de expiração do token
 *     
 *     SignUpRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *         - organizationId
 *       properties:
 *         name:
 *           type: string
 *           description: Nome completo do usuário
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Senha do usuário
 *         organizationId:
 *           type: string
 *           description: ID da organização
 *   
 *   tags:
 *     - name: Autenticação
 *       description: Endpoints de autenticação e autorização
 *     - name: Usuários
 *       description: Gestão de usuários do sistema
 *     - name: Dashboard
 *       description: Dados do painel administrativo
 */

import express from "express";
import {
  deleteUser,
  getAllUsers,
  getAllUsersWithDetails,
  activateUser,
  deactivateUser,
  getDashboardData,
  getUserById,
  getUserByIdWithDetails,
  updateUser,
  searchUser,
  loginUser,
  sendResetCode,
  verifyResetCode,
  resetPasswordWithCode,
  SignUp,
  registerUser,
} from "../controllers/UserController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * /api/users/signup:
 *   post:
 *     summary: Cadastro de novo usuário
 *     description: Permite que novos usuários se cadastrem no sistema
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpRequest'
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos ou email já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/signup", SignUp);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login do usuário
 *     description: Autentica um usuário e retorna um token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Usuário inativo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Registrar usuário (Admin)
 *     description: Permite que administradores registrem novos usuários com papéis específicos
 *     tags: [Usuários]
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
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, SYSTEM_MANAGER, COURSE_COORDINATOR, ACADEMIC_REGISTRY]
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.post("/register", authMiddleware, registerUser);

/**
 * @swagger
 * /api/users/get-dashboard-data:
 *   get:
 *     summary: Dados do dashboard
 *     description: Retorna dados estatísticos para o painel administrativo
 *     tags: [Dashboard]
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
 *                 activeUsers:
 *                   type: integer
 *                 totalTCCs:
 *                   type: integer
 *                 recentActivity:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/get-dashboard-data", authMiddleware, getDashboardData);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos os usuários
 *     description: Retorna uma lista de todos os usuários do sistema
 *     tags: [Usuários]
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
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 */
router.get("/", authMiddleware, getAllUsers);

/**
 * @swagger
 * /api/users/search/{searchTerm}:
 *   get:
 *     summary: Buscar usuários
 *     description: Busca usuários por nome ou email
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchTerm
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca (nome ou email)
 *     responses:
 *       200:
 *         description: Resultados da busca retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get("/search/:searchTerm", authMiddleware, searchUser);



router.post("/history", authMiddleware, getAllUsersWithDetails);

router.get(
  "/:id/with-history",
  authMiddleware,
  getUserByIdWithDetails
);

router.get(
  "/:id",
  authMiddleware,
  getUserById
);

router.put(
  "/:id",
  authMiddleware,
  updateUser
);

router.delete("/:id", authMiddleware, deleteUser);

router.put("/:UserId/activate", authMiddleware, activateUser);

router.put("/:UserId/deactivate", authMiddleware, deactivateUser);

// User password reset via email code
router.post("/password/forgot/send-code", sendResetCode);
router.post("/password/forgot/verify-code", verifyResetCode);
router.post("/password/forgot/reset", resetPasswordWithCode);

export default router;
