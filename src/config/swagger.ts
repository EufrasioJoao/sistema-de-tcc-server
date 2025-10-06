import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sistema de Gestão de TCCs - API',
            version: '1.0.0',
            description: `
        API REST para o Sistema de Gestão de Trabalhos de Conclusão de Curso (TCCs).
        
        Este sistema permite o armazenamento, organização, pesquisa e visualização de:
        - Monografias (Licenciatura)
        - Dissertações (Mestrado) 
        - Teses (Doutoramento)
        
        Desenvolvido para a Maratona de Inovação Tecnológica e Soluções Digitais 2025
        da Universidade Católica de Moçambique - Faculdade de Direito.
      `,
            contact: {
                name: 'Faculdade de Direito - UCM',
                email: 'info@ucm.ac.mz'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://api.tcc-system.com'
                    : 'http://localhost:3001',
                description: process.env.NODE_ENV === 'production'
                    ? 'Servidor de Produção'
                    : 'Servidor de Desenvolvimento'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Token JWT para autenticação. Formato: Bearer <token>'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Mensagem de erro'
                        },
                        error: {
                            type: 'string',
                            description: 'Detalhes do erro'
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Mensagem de sucesso'
                        },
                        data: {
                            type: 'object',
                            description: 'Dados retornados'
                        }
                    }
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
        './src/models/*.ts'
    ]
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
    // Swagger UI options
    const swaggerOptions = {
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f8fafc; }
    `,
        customSiteTitle: 'Sistema de Gestão de TCCs - Documentação API',
        customfavIcon: '/favicon.ico'
    };

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

    // JSON endpoint for the OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};

export default specs;