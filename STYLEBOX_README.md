# 🎨 StyleBox Backend API

Backend API para StyleBox - Una red social de moda construida con NestJS, MongoDB y JWT Authentication.

---

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Documentación](#documentación)
- [Testing](#testing)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## ✨ Características

- 🔐 **Autenticación JWT** con access token + refresh token
- 👥 **Gestión de usuarios** (registro, login, perfil)
- 📝 **Posts** con imágenes y categorías
- 💬 **Comentarios** en posts
- ⭐ **Sistema de ratings** (1-5 estrellas)
- 📚 **Colecciones** públicas y privadas
- 🔔 **Notificaciones** en tiempo real
- 🔍 **Búsqueda** de usuarios, posts y hashtags
- 👥 **Sistema de seguimiento** (follow/unfollow)
- 🖼️ **Upload de imágenes** con Multer
- 📖 **Documentación Swagger** interactiva
- 🌐 **CORS** configurado para desarrollo

---

## 🛠️ Tecnologías

- **Framework:** NestJS 11.x
- **Base de datos:** MongoDB Atlas
- **ODM:** Mongoose
- **Autenticación:** Passport + JWT
- **Validación:** Class Validator
- **Documentación:** Swagger / OpenAPI
- **Upload:** Multer
- **Hash:** Bcrypt

---

## 📦 Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- MongoDB Atlas account (o instancia local de MongoDB)

### Pasos

1. **Clonar el repositorio:**
```bash
git clone <repository-url>
cd ISIS3710_202520_S1_E01_Back
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales (ver sección [Configuración](#configuración))

---

## ⚙️ Configuración

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/stylebox?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=tu-super-secreto-jwt-cambiar-en-produccion
JWT_REFRESH_SECRET=tu-super-secreto-refresh-cambiar-en-produccion
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3003
```

### Variables Importantes

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3001` |
| `MONGODB_URI` | URI de conexión a MongoDB | (requerido) |
| `JWT_SECRET` | Secret para firmar access tokens | (requerido) |
| `JWT_REFRESH_SECRET` | Secret para firmar refresh tokens | (requerido) |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:3003` |

---

## 🚀 Ejecución

### Desarrollo

```bash
# Modo watch (recomendado)
npm run start:dev

# Modo debug
npm run start:debug
```

El servidor estará disponible en: `http://localhost:3001`

### Producción

```bash
# Build
npm run build

# Start
npm run start:prod
```

---

## 📚 Documentación

### Swagger UI

Una vez que el servidor esté corriendo, accede a la documentación interactiva:

```
http://localhost:3001/api/docs
```

Aquí podrás:
- Ver todos los endpoints disponibles
- Probar las APIs directamente desde el navegador
- Ver schemas de request/response
- Autenticarte con JWT

### Guías Adicionales

Este proyecto incluye documentación completa:

1. **[AUTHENTICATION_GUIDE.md](AUTHENTICATION_GUIDE.md)**
   - Guía completa de autenticación
   - Flujo de JWT (access + refresh tokens)
   - Ejemplos de uso con Postman y cURL
   - Integración con frontend
   - Troubleshooting

2. **[FRONTEND_EXAMPLES.md](FRONTEND_EXAMPLES.md)**
   - Código completo para frontend Next.js
   - Cliente Axios configurado
   - Context Provider de autenticación
   - Páginas de login/registro/perfil
   - Manejo de cookies y tokens

3. **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)**
   - Resumen de cambios recientes
   - Problemas resueltos
   - Mejoras implementadas

---

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Coverage

```bash
npm run test:cov
```

---

## 📁 Estructura del Proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── dto/                 # DTOs de auth (login, register, etc.)
│   ├── guards/              # Guards de JWT
│   ├── strategies/          # Estrategias de Passport
│   ├── auth.controller.ts   # Endpoints de auth
│   ├── auth.service.ts      # Lógica de autenticación
│   └── auth.module.ts
│
├── users/                   # Módulo de usuarios
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── posts/                   # Módulo de posts
│   ├── dto/
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   └── posts.module.ts
│
├── comments/                # Módulo de comentarios
├── ratings/                 # Módulo de ratings
├── collections/             # Módulo de colecciones
├── notifications/           # Módulo de notificaciones
├── search/                  # Módulo de búsqueda
├── upload/                  # Módulo de upload de archivos
│
├── schemas/                 # Schemas de Mongoose
│   ├── user.schema.ts
│   ├── post.schema.ts
│   ├── comment.schema.ts
│   ├── collection.schema.ts
│   └── ...
│
├── common/                  # Utilidades comunes
│   ├── decorators/          # Decoradores custom
│   ├── filters/             # Exception filters
│   ├── guards/              # Guards globales
│   ├── interceptors/        # Interceptors
│   └── pipes/               # Pipes custom
│
├── app.module.ts            # Módulo principal
└── main.ts                  # Punto de entrada
```

---

## 🔑 Endpoints Principales

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | ❌ |
| POST | `/api/auth/login` | Iniciar sesión | ❌ |
| GET | `/api/auth/me` | Obtener usuario actual | ✅ |
| PATCH | `/api/auth/me` | Actualizar perfil | ✅ |
| POST | `/api/auth/refresh` | Refrescar access token | ✅ |

### Usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Listar usuarios | ❌ |
| GET | `/api/users/:id` | Ver perfil de usuario | ❌ |
| POST | `/api/users/:id/follow` | Seguir usuario | ✅ |
| DELETE | `/api/users/:id/follow` | Dejar de seguir | ✅ |

### Posts

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/posts` | Listar posts (feed) | ❌ |
| GET | `/api/posts/:id` | Ver post | ❌ |
| POST | `/api/posts` | Crear post | ✅ |
| PATCH | `/api/posts/:id` | Actualizar post | ✅ |
| DELETE | `/api/posts/:id` | Eliminar post | ✅ |
| POST | `/api/posts/:id/like` | Like a post | ✅ |

### Colecciones

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/collections` | Mis colecciones | ✅ |
| GET | `/api/collections/:id` | Ver colección | ❌* |
| POST | `/api/collections` | Crear colección | ✅ |
| POST | `/api/collections/:id/items` | Añadir post | ✅ |

*_Público si la colección es pública_

---

## 🔐 Autenticación

Este API usa **JWT Bearer Authentication**:

### 1. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Usar el Token

En todas las peticiones protegidas, incluir el header:

```
Authorization: Bearer <access_token>
```

### 3. Refresh Token

Cuando el access token expira (1 hora), usar el refresh token:

```bash
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

---

## 🌐 CORS

El backend está configurado para aceptar requests desde:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:3002`
- `http://localhost:3003`
- Cualquier puerto localhost

Para cambiar esto en producción, edita `src/main.ts`.

---

## 🐛 Troubleshooting

### El servidor no inicia

**Problema:** `Error: connect ECONNREFUSED`

**Solución:** Verifica que MongoDB esté corriendo y que la URI en `.env` sea correcta.

---

### Error 401 en endpoints protegidos

**Problema:** `401 Unauthorized`

**Solución:**
1. Verifica que el token se envíe en el header `Authorization: Bearer <token>`
2. Verifica que el token no haya expirado
3. Verifica que el usuario exista en la base de datos

---

### Error de CORS

**Problema:** `Access blocked by CORS policy`

**Solución:**
1. Verifica que la URL del frontend esté en la lista de origins permitidos en `src/main.ts`
2. Asegúrate que el frontend use `withCredentials: true` en Axios

---

## 📄 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev       # Iniciar en modo watch
npm run start:debug     # Iniciar con debugger

# Producción
npm run build           # Compilar proyecto
npm run start:prod      # Iniciar en producción

# Testing
npm run test            # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage

# Calidad de código
npm run lint            # Ejecutar ESLint
npm run format          # Formatear con Prettier
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📞 Soporte

Si necesitas ayuda:

1. Revisa la documentación en `/api/docs`
2. Lee las guías en este repositorio:
   - `AUTHENTICATION_GUIDE.md`
   - `FRONTEND_EXAMPLES.md`
   - `CHANGES_SUMMARY.md`
3. Verifica la sección de Troubleshooting

---

## 📝 Licencia

Este proyecto es privado y está bajo la licencia UNLICENSED.

---

## 👥 Equipo

**StyleBox Team** - ISIS3710 - Universidad de los Andes

---

## 🎉 Estado del Proyecto

✅ **Backend completamente funcional**
- Autenticación JWT implementada
- Todos los módulos funcionando
- CORS configurado
- Documentación completa
- Listo para integración con frontend

---

**Version:** 0.0.1
**Last Updated:** 2024-12-03
