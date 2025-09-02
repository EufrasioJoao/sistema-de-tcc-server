# ARQUIVAR - Sistema de Gerenciamento de Arquivos

## Configuração Inicial

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure o arquivo `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/your_database"
JWT_SECRET="your-secret-key"
```

## Banco de Dados

1. Gere o Prisma Client:

```bash
npx prisma generate
```

2. Execute as migrações:

```bash
npx prisma migrate dev
```

3. Popule o banco com dados iniciais:

```bash
npm run seed
```

## Executando o Servidor

```bash
npm start
```

## Credenciais Iniciais

Após executar o seed:

**Operador Admin:**

- Email: admin@arquivar.com
- Password: password

**Usuário Teste:**

- Email: zb@futuromcb.co.mz
- Password: password

## Endpoints da API

### Clientes

```bash
# Criar Cliente
POST /api/organizations
Authorization: Bearer <token>

# Listar Clientes
GET /api/organizations
Authorization: Bearer <token>

# Buscar Cliente
GET /api/organizations/:id
Authorization: Bearer <token>

# Atualizar Cliente
PUT /api/organizations/:id
Authorization: Bearer <token>

# Deletar Cliente
DELETE /api/organizations/:id
Authorization: Bearer <token>
```

### Usuários

```bash
# Registrar usuário
POST /api/users/register

# Login
POST /api/users/login

# Listar usuários
GET /api/users
Authorization: Bearer <token>

# Buscar usuário
GET /api/users/:id
Authorization: Bearer <token>

# Atualizar usuário
PUT /api/users/:id
Authorization: Bearer <token>

# Deletar usuário
DELETE /api/users/:id
Authorization: Bearer <token>
```

## Exemplos de Requisições

### Criar Cliente

```bash
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Org",
    "description": "Test Description",
    "planId": "plan-id",
    "contact": "123456789",
    "nuit": "987654321"
  }'
```

### Login de Usuário

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## Notas

- Todas as requisições (exceto login e registro) requerem token JWT
- O token é obtido após o login
- Use o token no formato: `Bearer <token>`
