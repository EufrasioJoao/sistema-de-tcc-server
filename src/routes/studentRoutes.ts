/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do estudante
 *         name:
 *           type: string
 *           description: Nome completo do estudante
 *         email:
 *           type: string
 *           format: email
 *           description: Email do estudante
 *         studentNumber:
 *           type: string
 *           description: Número de matrícula do estudante
 *         phone:
 *           type: string
 *           description: Telefone do estudante
 *         courseId:
 *           type: string
 *           description: ID do curso do estudante
 *         course:
 *           $ref: '#/components/schemas/Course'
 *         organizationId:
 *           type: string
 *           description: ID da organização
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único do curso
 *         name:
 *           type: string
 *           description: Nome do curso
 *         code:
 *           type: string
 *           description: Código do curso
 *         level:
 *           type: string
 *           enum: [LICENCIATURA, MESTRADO, DOUTORAMENTO]
 *           description: Nível acadêmico do curso
 *         organizationId:
 *           type: string
 *           description: ID da organização
 *   
 *   tags:
 *     - name: Estudantes
 *       description: Gestão de estudantes do sistema
 */

import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Listar todos os estudantes
 *     description: Retorna uma lista paginada de todos os estudantes cadastrados
 *     tags: [Estudantes]
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
 *         description: Buscar por nome ou número de matrícula
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *         description: Filtrar por curso
 *     responses:
 *       200:
 *         description: Lista de estudantes retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
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
router.get("/", getAllStudents);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Obter estudante por ID
 *     description: Retorna os detalhes completos de um estudante específico
 *     tags: [Estudantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do estudante
 *     responses:
 *       200:
 *         description: Estudante encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Estudante não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getStudentById);

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Cadastrar novo estudante
 *     description: Cria um novo registro de estudante no sistema
 *     tags: [Estudantes]
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
 *               - studentNumber
 *               - courseId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome completo do estudante
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do estudante
 *               studentNumber:
 *                 type: string
 *                 description: Número de matrícula único
 *               phone:
 *                 type: string
 *                 description: Telefone do estudante
 *               courseId:
 *                 type: string
 *                 description: ID do curso
 *     responses:
 *       201:
 *         description: Estudante criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 student:
 *                   $ref: '#/components/schemas/Student'
 *       400:
 *         description: Dados inválidos ou número de matrícula já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", createStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Atualizar dados do estudante
 *     description: Atualiza as informações de um estudante existente
 *     tags: [Estudantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do estudante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome completo do estudante
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do estudante
 *               phone:
 *                 type: string
 *                 description: Telefone do estudante
 *               courseId:
 *                 type: string
 *                 description: ID do curso
 *     responses:
 *       200:
 *         description: Estudante atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 student:
 *                   $ref: '#/components/schemas/Student'
 *       404:
 *         description: Estudante não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", updateStudent);

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Excluir estudante
 *     description: Remove um estudante do sistema (apenas se não possuir TCCs)
 *     tags: [Estudantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do estudante
 *     responses:
 *       200:
 *         description: Estudante excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Estudante não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Não é possível excluir estudante com TCCs cadastrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", deleteStudent);

export default router;
