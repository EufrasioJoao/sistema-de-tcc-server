/**
 * @swagger
 * components:
 *   schemas:
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
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   
 *   tags:
 *     - name: Cursos
 *       description: Gestão de cursos acadêmicos
 */

import express from "express";
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Listar todos os cursos
 *     description: Retorna uma lista de todos os cursos cadastrados na organização
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cursos retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       401:
 *         description: Token de autenticação inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getAllCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Obter curso por ID
 *     description: Retorna os detalhes de um curso específico
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do curso
 *     responses:
 *       200:
 *         description: Curso encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         description: Curso não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Cadastrar novo curso
 *     description: Cria um novo curso acadêmico no sistema
 *     tags: [Cursos]
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
 *               - code
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do curso
 *                 example: "Licenciatura em Direito"
 *               code:
 *                 type: string
 *                 description: Código único do curso
 *                 example: "DIR001"
 *               level:
 *                 type: string
 *                 enum: [LICENCIATURA, MESTRADO, DOUTORAMENTO]
 *                 description: Nível acadêmico
 *                 example: "LICENCIATURA"
 *     responses:
 *       201:
 *         description: Curso criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *       400:
 *         description: Dados inválidos ou código já existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", createCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Atualizar curso
 *     description: Atualiza as informações de um curso existente
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do curso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do curso
 *               code:
 *                 type: string
 *                 description: Código do curso
 *               level:
 *                 type: string
 *                 enum: [LICENCIATURA, MESTRADO, DOUTORAMENTO]
 *                 description: Nível acadêmico
 *     responses:
 *       200:
 *         description: Curso atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 course:
 *                   $ref: '#/components/schemas/Course'
 *       404:
 *         description: Curso não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", updateCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Excluir curso
 *     description: Remove um curso do sistema (apenas se não possuir estudantes ou TCCs)
 *     tags: [Cursos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do curso
 *     responses:
 *       200:
 *         description: Curso excluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Curso não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Não é possível excluir curso com estudantes ou TCCs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", deleteCourse);

export default router;
