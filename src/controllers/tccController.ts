import { db } from "../lib/db";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { TccType, UserRoles } from "@prisma/client";
import { generatePresignedUrl } from "../services/s3Service";
import { canDownloadFile } from "../middlewares/roleMiddleware";
import { AuditService } from "../services/auditService";
import env from "../config/env";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";


// Get all TCCs with pagination and filtering
export async function getAllTCCs(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    // Extract query parameters
    const {
      page = "1",
      limit = "10",
      search = "",
      type = "",
      year = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering based on user role
    const whereClause: any = {
      course: {
        coordinator: {
          organization_id: user?.organization_id,
        },
      },
      deletedAt: null,
    };

    // COURSE_COORDENATOR can only see TCCs from their coordinated courses
    if (user?.role === UserRoles.COURSE_COORDENATOR) {
      whereClause.course.coordinatorId = requestingUser.id;
    }

    // Add search filter
    if (search) {
      whereClause.OR = [
        { title: { contains: search as string } },
        { keywords: { contains: search as string } },
        {
          author: {
            OR: [
              { firstName: { contains: search as string } },
              { lastName: { contains: search as string } },
              { studentNumber: { contains: search as string } },
            ],
          },
        },
        {
          supervisor: {
            OR: [
              { first_name: { contains: search as string } },
              { last_name: { contains: search as string } },
            ],
          },
        },
        {
          course: {
            name: { contains: search as string },
          },
        },
      ];
    }

    // Add type filter
    if (type && type !== "all") {
      whereClause.type = type as TccType;
    }

    // Add year filter
    if (year && year !== "all") {
      whereClause.year = parseInt(year as string);
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "author") {
      orderBy.author = { firstName: sortOrder };
    } else if (sortBy === "supervisor") {
      orderBy.supervisor = { first_name: sortOrder };
    } else if (sortBy === "course") {
      orderBy.course = { name: sortOrder };
    } else {
      orderBy[sortBy as string] = sortOrder;
    }

    // Get total count for pagination
    const totalCount = await db.tCC.count({
      where: whereClause,
    });

    const tccs = await db.tCC.findMany({
      where: whereClause,
      skip,
      take: limitNum,
      orderBy,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
      },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    res.json({
      success: true,
      data: tccs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching TCCs:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get TCC statistics for dashboard
export async function getTCCStatistics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const whereClause = {
      course: {
        coordinator: {
          organization_id: user?.organization_id,
        },
      },
      deletedAt: null,
    };

    // Get total count
    const totalTCCs = await db.tCC.count({
      where: whereClause,
    });

    // Get count by type
    const tccsByType = await db.tCC.groupBy({
      by: ["type"],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    // Get count by year
    const tccsByYear = await db.tCC.groupBy({
      by: ["year"],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        year: "desc",
      },
    });

    // Get current year count
    const currentYear = new Date().getFullYear();
    const currentYearTCCs = await db.tCC.count({
      where: {
        ...whereClause,
        year: currentYear,
      },
    });

    // Get recent TCCs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTCCs = await db.tCC.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    res.json({
      success: true,
      data: {
        total: totalTCCs,
        currentYear: currentYearTCCs,
        recent: recentTCCs,
        byType: tccsByType.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
        byYear: tccsByYear.map((item) => ({
          year: item.year,
          count: item._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching TCC statistics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get TCC statistics specifically for cards component
export async function getTCCCardsStatistics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const whereClause = {
      course: {
        coordinator: {
          organization_id: user?.organization_id,
        },
      },
      deletedAt: null,
    };

    // Get total count
    const totalTCCs = await db.tCC.count({
      where: whereClause,
    });

    // Get count by type
    const tccsByType = await db.tCC.groupBy({
      by: ["type"],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    // Get current year count
    const currentYear = new Date().getFullYear();
    const currentYearTCCs = await db.tCC.count({
      where: {
        ...whereClause,
        year: currentYear,
      },
    });

    // Get recent TCCs (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTCCs = await db.tCC.count({
      where: {
        ...whereClause,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    res.json({
      success: true,
      data: {
        total: totalTCCs,
        currentYear: currentYearTCCs,
        recent: recentTCCs,
        byType: tccsByType.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching TCC cards statistics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get TCC statistics specifically for charts component
export async function getTCCChartsStatistics(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const whereClause = {
      course: {
        coordinator: {
          organization_id: user?.organization_id,
        },
      },
      deletedAt: null,
    };

    // Get count by type
    const tccsByType = await db.tCC.groupBy({
      by: ["type"],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    // Get count by year (last 5 years for charts)
    const currentYear = new Date().getFullYear();
    const fiveYearsAgo = currentYear - 4;

    // Get monthly data for current year
    const monthlyData = await db.tCC.findMany({
      where: {
        ...whereClause,
        year: currentYear,
      },
      select: {
        createdAt: true,
        type: true,
      },
    });



    // Area Chart Data: Daily TCC registrations over the last 90 days (3 months) up to today
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89); // 90 days including today
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    const areaChartData = Array.from({ length: 90 }, (_, i) => {
      const date = new Date(ninetyDaysAgo);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        tccs: 0,
      };
    });

    // Fetch TCCs from the last 90 days
    const recentTccs = await db.tCC.findMany({
      where: {
        ...whereClause,
        createdAt: {
          gte: ninetyDaysAgo,
          lte: today,
        },
      },
      select: {
        createdAt: true,
      },
    });

    recentTccs.forEach((tcc) => {
      const tccCreationDate = new Date(tcc.createdAt);
      tccCreationDate.setHours(0, 0, 0, 0);

      if (tccCreationDate >= ninetyDaysAgo && tccCreationDate <= today) {
        const dateStr = tccCreationDate.toISOString().split('T')[0];
        const dayData = areaChartData.find((d) => d.date === dateStr);
        if (dayData) {
          dayData.tccs++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        byType: tccsByType.map((item) => ({
          type: item.type,
          count: item._count.id,
        })),
        areaChartData: areaChartData,
      },
    });
  } catch (error) {
    console.error("Error fetching TCC charts statistics:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}


export async function streamFile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Buscar o arquivo no banco de dados
    const file = await db.file.findUnique({
      where: { id: id },
    });

    if (!file) {
      res.status(404).json({ success: false, message: "File not found" });
      return;
    }

    // Configuração para acesso ao S3
    const BUCKET_NAME = env.AWS_S3_BUCKET_NAME;
    const s3Key = file.filename;

    try {
      // Buscar o arquivo do S3
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });


      const s3 = new S3Client({
        region: env.AWS_S3_BUCKET_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const s3Response = await s3.send(command);

      if (!s3Response.Body) {
        res.status(404).json({
          success: false,
          message: "File content not available",
        });
        return;
      }

      // Definir headers apropriados
      res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
      res.setHeader("Content-Length", s3Response.ContentLength || 0);
      res.setHeader("Content-Disposition", `inline; filename="${file.displayName}"`);

      // Headers para permitir CORS se necessário
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      res.setHeader("Cache-Control", "public, max-age=3600");

      // Stream o arquivo diretamente para a resposta
      const stream = s3Response.Body as NodeJS.ReadableStream;
      stream.pipe(res);

      // Tratar erros no stream
      stream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Error streaming file",
          });
        }
      });

    } catch (s3Error: any) {
      console.error(`S3 error for file ${id}:`, s3Error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve file from storage",
        error: s3Error.message,
      });
    }
  } catch (error: any) {
    console.error("Error in streamFile:", error.message);
    res.status(500).json({
      success: false,
      message: "Error streaming file",
      error: error.message,
    });
  }
}



// Get TCC by ID
export async function getTCCById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const tcc = await db.tCC.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            path: true,
            created_at: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            path: true,
            created_at: true,
          },
        },
      },
    });

    if (!tcc) {
      res.status(404).json({
        success: false,
        message: "TCC não encontrado",
      });
      return;
    }

    // Log TCC view audit
    await AuditService.logTCCView(requestingUser.id, tcc.id, tcc.file.id);

    res.status(200).json({
      success: true,
      tcc,
    });
  } catch (error) {
    console.error(`Error fetching TCC ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar TCC",
      error,
    });
  }
}

// Update a TCC
export async function updateTCC(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const {
    title,
    year,
    keywords,
    type,
    authorId,
    supervisorId,
    courseId,
    defenseRecordFileId,
  } = req.body;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    // Verify the TCC belongs to the user's organization
    const existingTCC = await db.tCC.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
    });

    if (!existingTCC) {
      res.status(404).json({
        success: false,
        message: "TCC não encontrado ou não pertence à sua organização",
      });
      return;
    }

    // Verify all related entities belong to the user's organization
    const [student, supervisor, course] = await Promise.all([
      db.student.findFirst({
        where: {
          id: authorId,
          course: {
            coordinator: {
              organization_id: user?.organization_id,
            },
          },
          deletedAt: null,
        },
      }),
      db.user.findFirst({
        where: {
          id: supervisorId,
          organization_id: user?.organization_id,
          deleted_at: null,
        },
      }),
      db.course.findFirst({
        where: {
          id: courseId,
          coordinator: {
            organization_id: user?.organization_id,
          },
          deletedAt: null,
        },
      }),
    ]);

    if (!student || !supervisor || !course) {
      res.status(404).json({
        success: false,
        message: "Uma ou mais entidades relacionadas não foram encontradas",
      });
      return;
    }

    // Verify defense record file if provided
    if (defenseRecordFileId) {
      const defenseRecordFile = await db.file.findFirst({
        where: {
          id: defenseRecordFileId,
          organization_id: user?.organization_id,
          deleted_at: null,
        },
      });

      if (!defenseRecordFile) {
        res.status(404).json({
          success: false,
          message: "Arquivo de ata de defesa não encontrado",
        });
        return;
      }
    }

    const updatedTCC = await db.tCC.update({
      where: { id },
      data: {
        title,
        year: parseInt(year),
        keywords,
        type: type as TccType,
        authorId,
        supervisorId,
        courseId,
        defenseRecordFileId: defenseRecordFileId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "TCC atualizado com sucesso",
      tcc: updatedTCC,
    });
  } catch (error) {
    console.error(`Error updating TCC ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar TCC",
      error,
    });
  }
}

// Delete a TCC (soft delete)
export async function deleteTCC(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    // Verify the TCC belongs to the user's organization
    const tcc = await db.tCC.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
    });

    if (!tcc) {
      res.status(404).json({
        success: false,
        message: "TCC não encontrado ou não pertence à sua organização",
      });
      return;
    }

    await db.tCC.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "TCC removido com sucesso",
    });
  } catch (error) {
    console.error(`Error deleting TCC ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover TCC",
      error,
    });
  }
}

// Intelligent TCC search with semantic matching
export async function intelligentTCCSearch(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const { query, limit = "10" } = req.body;

    if (!query || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Query de busca é obrigatória",
      });
      return;
    }

    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true },
    });

    const limitNum = parseInt(limit as string);
    const searchTerm = query.trim().toLowerCase();

    // Build where clause for semantic search
    const whereClause: any = {
      course: {
        coordinator: {
          organization_id: user?.organization_id,
        },
      },
      deletedAt: null,
      OR: [
        { title: { contains: searchTerm } },
        { keywords: { contains: searchTerm } },
        {
          author: {
            OR: [
              { firstName: { contains: searchTerm } },
              { lastName: { contains: searchTerm } },
              { studentNumber: { contains: searchTerm } },
            ],
          },
        },
        {
          supervisor: {
            OR: [
              { first_name: { contains: searchTerm } },
              { last_name: { contains: searchTerm } },
            ],
          },
        },
        {
          course: {
            name: { contains: searchTerm },
          },
        },
      ],
    };

    const tccs = await db.tCC.findMany({
      where: whereClause,
      take: limitNum,
      orderBy: [{ createdAt: "desc" }, { title: "asc" }],
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentNumber: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            size: true,
            created_at: true,
          },
        },
      },
    });

    // Calculate relevance score for each result
    const resultsWithRelevance = tccs.map((tcc) => {
      let relevanceScore = 0;
      const matchedFields: string[] = [];
      const queryWords = searchTerm
        .split(" ")
        .filter((word: string) => word.length > 0);

      // Title match (highest weight)
      let titleMatched = false;
      queryWords.forEach((word: string) => {
        if (tcc.title.toLowerCase().includes(word)) {
          relevanceScore += 10;
          titleMatched = true;
        }
      });
      if (titleMatched) matchedFields.push('Título');

      // Keywords match
      let keywordsMatched = false;
      queryWords.forEach((word: string) => {
        if (tcc.keywords?.toLowerCase().includes(word)) {
          relevanceScore += 8;
          keywordsMatched = true;
        }
      });
      if (keywordsMatched) matchedFields.push('Palavras-chave');

      // Author match
      let authorMatched = false;
      const authorFullName = `${tcc.author.firstName} ${tcc.author.lastName}`.toLowerCase();
      queryWords.forEach((word: string) => {
        if (authorFullName.includes(word) || tcc.author.studentNumber?.toLowerCase().includes(word)) {
          relevanceScore += 6;
          authorMatched = true;
        }
      });
      if (authorMatched) matchedFields.push('Autor');

      // Supervisor match
      let supervisorMatched = false;
      const supervisorFullName = `${tcc.supervisor.first_name} ${tcc.supervisor.last_name}`.toLowerCase();
      queryWords.forEach((word: string) => {
        if (supervisorFullName.includes(word)) {
          relevanceScore += 5;
          supervisorMatched = true;
        }
      });
      if (supervisorMatched) matchedFields.push('Orientador');

      // Course match
      let courseMatched = false;
      queryWords.forEach((word: string) => {
        if (tcc.course.name.toLowerCase().includes(word)) {
          relevanceScore += 4;
          courseMatched = true;
        }
      });
      if (courseMatched) matchedFields.push('Curso');

      return {
        ...tcc,
        relevanceScore,
        matchedFields,
      };
    });

    // Sort by relevance score (descending) then by creation date (descending)
    resultsWithRelevance.sort((a, b) => {
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Save search to history
    try {
      await db.searchHistory.create({
        data: {
          query: query.trim(),
          userId: requestingUser.id,
          resultsCount: resultsWithRelevance.length,
        },
      });
    } catch (error) {
      console.error("Error saving search history:", error);
      // Don't fail the search if history save fails
    }

    res.json({
      success: true,
      data: resultsWithRelevance,
      query: query.trim(),
      totalResults: resultsWithRelevance.length,
    });
  } catch (error) {
    console.error("Error performing intelligent TCC search:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Get search history for the current user
export async function getSearchHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    const { limit = "10" } = req.query;
    const limitNum = parseInt(limit as string);

    const searchHistory = await db.searchHistory.findMany({
      where: {
        userId: requestingUser.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limitNum,
      select: {
        id: true,
        query: true,
        resultsCount: true,
        createdAt: true,
      },
    });

    // Map createdAt to timestamp for frontend compatibility
    const mappedHistory = searchHistory.map(item => ({
      id: item.id,
      query: item.query,
      resultsCount: item.resultsCount,
      timestamp: item.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: mappedHistory,
    });
  } catch (error) {
    console.error("Error fetching search history:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Clear search history for the current user
export async function clearSearchHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const requestingUser = req.user;

    if (!requestingUser) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      });
      return;
    }

    await db.searchHistory.deleteMany({
      where: {
        userId: requestingUser.id,
      },
    });

    res.json({
      success: true,
      message: "Histórico de busca limpo com sucesso",
    });
  } catch (error) {
    console.error("Error clearing search history:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
}

// Download TCC file
export async function downloadTCCFile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { id, fileType } = req.params; // fileType: 'main' or 'defense'
  const requestingUser = req.user;

  if (!requestingUser) {
    res.status(401).json({
      success: false,
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: requestingUser.id },
      select: { organization_id: true, role: true },
    });

    // Get TCC with file information
    const tcc = await db.tCC.findFirst({
      where: {
        id,
        course: {
          coordinator: {
            organization_id: user?.organization_id,
          },
        },
        deletedAt: null,
      },
      include: {
        file: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            path: true,
          },
        },
        defenseRecordFile: {
          select: {
            id: true,
            filename: true,
            displayName: true,
            path: true,
          },
        },
      },
    });

    if (!tcc) {
      res.status(404).json({
        success: false,
        message: "TCC não encontrado",
      });
      return;
    }

    let fileToDownload;
    if (fileType === "defense") {
      if (!tcc.defenseRecordFile) {
        res.status(404).json({
          success: false,
          message: "Arquivo de ata de defesa não encontrado",
        });
        return;
      }
      fileToDownload = tcc.defenseRecordFile;
    } else {
      fileToDownload = tcc.file;
    }

    if (!fileToDownload.path) {
      res.status(404).json({
        success: false,
        message: "Caminho do arquivo não encontrado",
      });
      return;
    }

    // Check file access permissions
    const hasFileAccess = await canDownloadFile(
      requestingUser.id,
      fileToDownload.id
    );

    if (!hasFileAccess) {
      res.status(403).json({
        success: false,
        message: "Acesso negado ao arquivo",
      });
      return;
    }

    // Generate presigned URL for download
    const presignedUrl = await generatePresignedUrl(fileToDownload.path);

    // Log TCC download audit
    await AuditService.logTCCDownload(
      requestingUser.id,
      tcc.id,
      fileToDownload.id,
      fileType as 'main' | 'defense'
    );

    res.status(200).json({
      success: true,
      downloadUrl: presignedUrl,
      filename: fileToDownload.displayName,
    });
  } catch (error) {
    console.error(`Error downloading TCC file ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar link de download",
      error,
    });
  }
}
