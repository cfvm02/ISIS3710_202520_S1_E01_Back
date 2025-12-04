# 🔐 StyleBox - Guía Completa de Autenticación

## 📋 Índice
1. [Resumen del Sistema](#resumen-del-sistema)
2. [Configuración del Backend](#configuración-del-backend)
3. [Flujo de Autenticación](#flujo-de-autenticación)
4. [Endpoints de Auth](#endpoints-de-auth)
5. [Testing Manual](#testing-manual)
6. [Integración con Frontend](#integración-con-frontend)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen del Sistema

**StyleBox** usa autenticación basada en **JWT (JSON Web Tokens)** con dos tipos de tokens:

- **Access Token (token)**: Válido por 1 hora, se usa para autenticar requests
- **Refresh Token**: Válido por 7 días, se usa para renovar el access token

### Arquitectura

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│  Frontend       │◄───────►│  Backend        │
│  (Next.js)      │  HTTPS  │  (NestJS)       │
│  Port: 3003     │         │  Port: 3001     │
│                 │         │                 │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
   ┌────▼────┐               ┌──────▼──────┐
   │ Cookies │               │  MongoDB    │
   │         │               │  (Atlas)    │
   └─────────┘               └─────────────┘
```

---

## ⚙️ Configuración del Backend

### 1. Variables de Entorno (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://cfvm06_db_user:idlrkmwEDrtzGkVf@cluster0.nqifda5.mongodb.net/stylebox?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3003
```

### 2. CORS Configuración

El backend está configurado en `src/main.ts` para aceptar requests desde múltiples puertos localhost:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    /^http:\/\/localhost:\d+$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  exposedHeaders: ['Set-Cookie'],
});
```

### 3. Rutas del Backend

**Base URL**: `http://localhost:3001/api`

Todos los endpoints comienzan con `/api` gracias a:
```typescript
app.setGlobalPrefix('api');
```

---

## 🔄 Flujo de Autenticación

### 1️⃣ Registro de Usuario

```
POST http://localhost:3001/api/auth/register

Body:
{
  "username": "usuario123",
  "email": "usuario@example.com",
  "password": "Password123!",
  "firstName": "Juan",
  "lastName": "Pérez"
}

Response (201):
{
  "user": {
    "id": "674abc123...",
    "username": "usuario123",
    "email": "usuario@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "avatar": null,
    "bio": null,
    "followersCount": 0,
    "followingCount": 0,
    "postsCount": 0,
    "isPrivate": false,
    "isVerified": false,
    "createdAt": "2024-12-03T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2️⃣ Login

```
POST http://localhost:3001/api/auth/login

Body:
{
  "email": "usuario@example.com",
  "password": "Password123!"
}

Response (200):
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3️⃣ Obtener Usuario Actual (Protegido)

```
GET http://localhost:3001/api/auth/me

Headers:
Authorization: Bearer <access_token>

Response (200):
{
  "id": "674abc123...",
  "username": "usuario123",
  "email": "usuario@example.com",
  ...
}
```

### 4️⃣ Refrescar Token

```
POST http://localhost:3001/api/auth/refresh

Headers:
Authorization: Bearer <refresh_token>

Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "token": "nuevo_access_token...",
  "refreshToken": "nuevo_refresh_token..."
}
```

### 5️⃣ Actualizar Perfil (Protegido)

```
PATCH http://localhost:3001/api/auth/me

Headers:
Authorization: Bearer <access_token>

Body:
{
  "firstName": "Carlos",
  "bio": "Amante de la moda"
}

Response (200):
{
  "id": "674abc123...",
  "username": "usuario123",
  "firstName": "Carlos",
  "bio": "Amante de la moda",
  ...
}
```

---

## 🧪 Testing Manual

### Usando Postman

#### 1. **Test de Registro**

1. Abre Postman
2. Crea un nuevo request `POST`
3. URL: `http://localhost:3001/api/auth/register`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Test123!",
  "firstName": "Test",
  "lastName": "User"
}
```
6. Click **Send**
7. Deberías recibir status `201` con `user`, `token` y `refreshToken`

#### 2. **Test de Login**

1. Request `POST`
2. URL: `http://localhost:3001/api/auth/login`
3. Body:
```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```
4. Click **Send**
5. **IMPORTANTE**: Copia el `token` de la respuesta

#### 3. **Test de /auth/me**

1. Request `GET`
2. URL: `http://localhost:3001/api/auth/me`
3. Headers:
   - Key: `Authorization`
   - Value: `Bearer <pega_aqui_el_token>`
4. Click **Send**
5. Deberías recibir status `200` con los datos del usuario

### Usando cURL

```bash
# 1. Registro
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# 3. Get Me (reemplaza TOKEN con el token real)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Usando el Navegador

#### Verificar Swagger Documentation

1. Abre tu navegador
2. Ve a: `http://localhost:3001/api/docs`
3. Verás la documentación interactiva de la API
4. Puedes probar todos los endpoints directamente desde ahí

#### Verificar Network Tab

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Haz login desde tu frontend
4. Deberías ver:
   - Request a `http://localhost:3001/api/auth/login`
   - Status: `200 OK`
   - Response con `user`, `token`, `refreshToken`

---

## 🌐 Integración con Frontend

### Estructura de Cookies que el Frontend Debe Guardar

Después del login exitoso, el frontend debe guardar 3 cookies:

```javascript
import Cookies from 'js-cookie';

// Después de recibir la respuesta del login
const { user, token, refreshToken } = response.data;

// 1. Access Token
Cookies.set('accessToken', token, {
  sameSite: 'Lax',
  secure: false, // true en producción (HTTPS)
  expires: 1/24, // 1 hora
});

// 2. Refresh Token
Cookies.set('refreshToken', refreshToken, {
  sameSite: 'Lax',
  secure: false,
  expires: 7, // 7 días
});

// 3. Usuario actual (opcional, para UI)
Cookies.set('currentUser', JSON.stringify(user), {
  sameSite: 'Lax',
  secure: false,
  expires: 7,
});
```

### Interceptor de Axios

```typescript
import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inyectar token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Manejar errores 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si el error es 401 y no hemos intentado refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');

        if (!refreshToken) {
          // No hay refresh token, redirigir a login
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Intentar refrescar el token
        const response = await axios.post(
          'http://localhost:3001/api/auth/refresh',
          { refreshToken },
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { token, refreshToken: newRefreshToken } = response.data;

        // Guardar nuevos tokens
        Cookies.set('accessToken', token, { sameSite: 'Lax', secure: false });
        Cookies.set('refreshToken', newRefreshToken, { sameSite: 'Lax', secure: false });

        // Reintentar la request original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, redirigir a login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('currentUser');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Cliente de Auth

```typescript
import apiClient from './client';
import Cookies from 'js-cookie';

export const authAPI = {
  async login(email: string, password: string) {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const { user, token, refreshToken } = response.data;

    // Guardar tokens en cookies
    Cookies.set('accessToken', token, {
      sameSite: 'Lax',
      secure: false,
      expires: 1/24,
    });

    Cookies.set('refreshToken', refreshToken, {
      sameSite: 'Lax',
      secure: false,
      expires: 7,
    });

    Cookies.set('currentUser', JSON.stringify(user), {
      sameSite: 'Lax',
      secure: false,
      expires: 7,
    });

    return response.data;
  },

  async register(data: RegisterData) {
    const response = await apiClient.post('/auth/register', data);

    const { user, token, refreshToken } = response.data;

    // Guardar tokens
    Cookies.set('accessToken', token, {
      sameSite: 'Lax',
      secure: false,
      expires: 1/24,
    });

    Cookies.set('refreshToken', refreshToken, {
      sameSite: 'Lax',
      secure: false,
      expires: 7,
    });

    Cookies.set('currentUser', JSON.stringify(user), {
      sameSite: 'Lax',
      secure: false,
      expires: 7,
    });

    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  async updateProfile(data: UpdateProfileData) {
    const response = await apiClient.patch('/auth/me', data);

    // Actualizar usuario en cookies
    Cookies.set('currentUser', JSON.stringify(response.data), {
      sameSite: 'Lax',
      secure: false,
      expires: 7,
    });

    return response.data;
  },

  logout() {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('currentUser');
  },

  isAuthenticated(): boolean {
    return !!Cookies.get('accessToken');
  },

  getStoredUser() {
    const userStr = Cookies.get('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },
};
```

---

## 🔍 Troubleshooting

### Problema 1: Error 401 en /auth/me

**Síntomas:**
- El login funciona
- Pero `/auth/me` devuelve 401 Unauthorized

**Solución:**

1. **Verificar que el token se envía correctamente:**
   - Abre DevTools → Network
   - Busca la request a `/auth/me`
   - Verifica que tenga header `Authorization: Bearer <token>`

2. **Verificar que el token es válido:**
   - Copia el token
   - Ve a [jwt.io](https://jwt.io)
   - Pega el token
   - Verifica que no haya expirado y que tenga `sub` (user ID)

3. **Verificar que el usuario existe en la DB:**
```bash
# Conecta a MongoDB y busca el usuario
db.users.findOne({ email: "test@example.com" })
```

### Problema 2: CORS Error

**Síntomas:**
```
Access to XMLHttpRequest at 'http://localhost:3001/api/auth/login'
from origin 'http://localhost:3003' has been blocked by CORS policy
```

**Solución:**

1. Verifica que el backend esté corriendo en el puerto correcto (3001)
2. Verifica la configuración CORS en `src/main.ts`
3. Asegúrate que `credentials: true` esté en el backend
4. Asegúrate que `withCredentials: true` esté en el cliente Axios

### Problema 3: Cookies no se guardan

**Síntomas:**
- El login responde correctamente
- Pero las cookies no aparecen en DevTools → Application → Cookies

**Solución:**

1. **Verificar dominio:**
   - Las cookies deben estar en `http://localhost:3003` (dominio del frontend)
   - NO en `http://localhost:3001`

2. **Verificar SameSite:**
```javascript
Cookies.set('accessToken', token, {
  sameSite: 'Lax', // DEBE ser 'Lax' o 'None' (con Secure: true)
  secure: false,   // false en desarrollo
});
```

3. **Verificar que js-cookie esté instalado:**
```bash
npm install js-cookie
npm install --save-dev @types/js-cookie
```

### Problema 4: Request no aparece en Network tab

**Síntomas:**
- Al hacer login, no aparece request en Network tab
- No hay errores en consola

**Solución:**

1. **Verificar que el form hace submit:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // IMPORTANTE

  try {
    const response = await authAPI.login(email, password);
    console.log('Login exitoso:', response);
  } catch (error) {
    console.error('Error en login:', error);
  }
};
```

2. **Verificar que la URL del API sea correcta:**
```typescript
// En tu archivo .env.local del frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Problema 5: Token expirado constantemente

**Síntomas:**
- Cada pocos minutos pierdes la sesión
- Tienes que hacer login de nuevo

**Solución:**

Implementa el refresh automático de tokens usando el interceptor de Axios (ver sección "Interceptor de Axios" arriba).

---

## 📊 Checklist de Verificación

### Backend ✅

- [ ] Backend corriendo en `http://localhost:3001`
- [ ] MongoDB conectado exitosamente
- [ ] Variables de entorno configuradas (`.env`)
- [ ] CORS habilitado para `http://localhost:3003`
- [ ] Swagger docs accesible en `/api/docs`
- [ ] Endpoint `/auth/login` responde con `token` y `refreshToken`
- [ ] Endpoint `/auth/me` funciona con token válido

### Frontend ✅

- [ ] Frontend corriendo en `http://localhost:3003`
- [ ] `NEXT_PUBLIC_API_URL` configurado correctamente
- [ ] `js-cookie` instalado
- [ ] Axios client configurado con `withCredentials: true`
- [ ] Interceptor inyecta token en headers
- [ ] Cookies se guardan después del login
- [ ] Cookies visibles en DevTools → Application
- [ ] Requests a `/auth/me` incluyen header `Authorization`

---

## 🎉 Testing Final

### Test Completo de Flujo

1. **Iniciar Backend:**
```bash
cd ISIS3710_202520_S1_E01_Back
npm run start:dev
```

2. **Verificar Backend:**
   - Abre `http://localhost:3001/api/docs`
   - Deberías ver Swagger UI

3. **Test desde Postman:**
   - Login: `POST http://localhost:3001/api/auth/login`
   - Copia el token
   - Me: `GET http://localhost:3001/api/auth/me` con header `Authorization: Bearer <token>`
   - Deberías recibir tu usuario

4. **Test desde Frontend:**
   - Inicia tu frontend Next.js
   - Ve a la página de login
   - Abre DevTools → Network
   - Haz login
   - Deberías ver:
     - Request a `/api/auth/login` → Status 200
     - Response con `user`, `token`, `refreshToken`
   - Abre DevTools → Application → Cookies
   - Deberías ver:
     - `accessToken`
     - `refreshToken`
     - `currentUser`
   - Ve a tu página de perfil
   - Deberías ver:
     - Request a `/api/auth/me` → Status 200
     - Tu información de usuario cargada

---

## 📞 Soporte

Si sigues teniendo problemas después de seguir esta guía:

1. Verifica los logs del backend en la terminal
2. Verifica la consola del navegador para errores
3. Verifica la pestaña Network para ver requests/responses
4. Compara tu implementación con el código de ejemplo en esta guía

¡Buena suerte con tu proyecto StyleBox! 🎨👗
