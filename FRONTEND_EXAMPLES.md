# 🎨 StyleBox - Ejemplos de Código para Frontend (Next.js)

Este documento contiene código completo y listo para usar en tu frontend Next.js.

---

## 📁 Estructura de Archivos Sugerida

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts           # Cliente Axios configurado
│   │   ├── auth.ts             # API de autenticación
│   │   ├── posts.ts            # API de posts
│   │   └── collections.ts      # API de colecciones
│   └── types/
│       └── auth.types.ts       # Tipos TypeScript
├── app/
│   ├── login/
│   │   └── page.tsx            # Página de login
│   ├── register/
│   │   └── page.tsx            # Página de registro
│   └── profile/
│       └── page.tsx            # Página de perfil
└── components/
    ├── AuthProvider.tsx        # Context de autenticación
    └── ProtectedRoute.tsx      # HOC para rutas protegidas
```

---

## 1️⃣ Cliente Axios (`src/lib/api/client.ts`)

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// Crear instancia de Axios
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inyectar token de acceso
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('accessToken');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Manejar refresh automático de tokens
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si el error es 401 y no hemos intentado refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');

        if (!refreshToken) {
          // No hay refresh token, limpiar y redirigir a login
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          Cookies.remove('currentUser');

          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }

          return Promise.reject(error);
        }

        // Intentar refrescar el token
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { token, refreshToken: newRefreshToken } = response.data;

        // Guardar nuevos tokens
        Cookies.set('accessToken', token, {
          sameSite: 'Lax',
          secure: process.env.NODE_ENV === 'production',
          expires: 1 / 24, // 1 hora
        });

        Cookies.set('refreshToken', newRefreshToken, {
          sameSite: 'Lax',
          secure: process.env.NODE_ENV === 'production',
          expires: 7, // 7 días
        });

        // Reintentar la request original con el nuevo token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Si falla el refresh, limpiar todo y redirigir a login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        Cookies.remove('currentUser');

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 2️⃣ Tipos TypeScript (`src/lib/types/auth.types.ts`)

```typescript
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  style: string[];
  language: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  style?: string[];
  language?: string;
  isPrivate?: boolean;
}
```

---

## 3️⃣ API de Autenticación (`src/lib/api/auth.ts`)

```typescript
import apiClient from './client';
import Cookies from 'js-cookie';
import {
  User,
  AuthResponse,
  RegisterData,
  LoginData,
  UpdateProfileData,
} from '../types/auth.types';

const COOKIE_OPTIONS = {
  sameSite: 'Lax' as const,
  secure: process.env.NODE_ENV === 'production',
};

export const authAPI = {
  /**
   * Registrar un nuevo usuario
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);

    const { user, token, refreshToken } = response.data;

    // Guardar tokens en cookies
    Cookies.set('accessToken', token, {
      ...COOKIE_OPTIONS,
      expires: 1 / 24, // 1 hora
    });

    Cookies.set('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      expires: 7, // 7 días
    });

    Cookies.set('currentUser', JSON.stringify(user), {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    return response.data;
  },

  /**
   * Iniciar sesión
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);

    const { user, token, refreshToken } = response.data;

    // Guardar tokens en cookies
    Cookies.set('accessToken', token, {
      ...COOKIE_OPTIONS,
      expires: 1 / 24,
    });

    Cookies.set('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    Cookies.set('currentUser', JSON.stringify(user), {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    return response.data;
  },

  /**
   * Obtener usuario actual autenticado
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');

    // Actualizar cookie del usuario
    Cookies.set('currentUser', JSON.stringify(response.data), {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    return response.data;
  },

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiClient.patch<User>('/auth/me', data);

    // Actualizar cookie del usuario
    Cookies.set('currentUser', JSON.stringify(response.data), {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    return response.data;
  },

  /**
   * Refrescar access token
   */
  async refreshToken(): Promise<{ token: string; refreshToken: string }> {
    const refreshToken = Cookies.get('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{
      token: string;
      refreshToken: string;
    }>(
      '/auth/refresh',
      { refreshToken },
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    const { token, refreshToken: newRefreshToken } = response.data;

    // Guardar nuevos tokens
    Cookies.set('accessToken', token, {
      ...COOKIE_OPTIONS,
      expires: 1 / 24,
    });

    Cookies.set('refreshToken', newRefreshToken, {
      ...COOKIE_OPTIONS,
      expires: 7,
    });

    return response.data;
  },

  /**
   * Cerrar sesión
   */
  logout(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('currentUser');

    // Redirigir a login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!Cookies.get('accessToken');
  },

  /**
   * Obtener usuario almacenado en cookies (sin hacer request)
   */
  getStoredUser(): User | null {
    const userStr = Cookies.get('currentUser');

    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  },
};
```

---

## 4️⃣ Context Provider (`src/components/AuthProvider.tsx`)

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/lib/types/auth.types';
import { authAPI } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuario al iniciar
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Primero intentar cargar desde cookies
      const storedUser = authAPI.getStoredUser();

      if (storedUser) {
        setUser(storedUser);
      }

      // Si está autenticado, hacer fetch del usuario actualizado
      if (authAPI.isAuthenticated()) {
        const currentUser = await authAPI.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  const refetchUser = async () => {
    if (!authAPI.isAuthenticated()) {
      setUser(null);
      return;
    }

    try {
      const currentUser = await authAPI.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refetching user:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
```

---

## 5️⃣ Página de Login (`src/app/login/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);

      // Redirigir al feed o perfil
      router.push('/feed');
    } catch (err: any) {
      console.error('Login error:', err);

      if (err.response?.status === 401) {
        setError('Email o contraseña incorrectos');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al iniciar sesión. Por favor intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            StyleBox
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <a
                href="/register"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Regístrate
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 6️⃣ Página de Registro (`src/app/register/page.tsx`)

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authAPI.register(formData);

      // Redirigir al feed
      router.push('/feed');
    } catch (err: any) {
      console.error('Register error:', err);

      if (err.response?.status === 409) {
        setError('El email o nombre de usuario ya existe');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al registrarse. Por favor intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Crear cuenta en StyleBox
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium">
                Nombre de usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="firstName" className="block text-sm font-medium">
                Nombre
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium">
                Apellido
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-indigo-600 hover:text-indigo-500">
                Inicia sesión
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 7️⃣ Página de Perfil (`src/app/profile/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si no está autenticado, redirigir a login
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Mi Perfil</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Nombre de usuario</p>
              <p className="text-lg font-medium">@{user.username}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Nombre completo</p>
              <p className="text-lg">
                {user.firstName} {user.lastName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg">{user.email}</p>
            </div>

            {user.bio && (
              <div>
                <p className="text-sm text-gray-600">Bio</p>
                <p className="text-lg">{user.bio}</p>
              </div>
            )}

            <div className="flex gap-8 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">{user.followersCount}</p>
                <p className="text-sm text-gray-600">Seguidores</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{user.followingCount}</p>
                <p className="text-sm text-gray-600">Siguiendo</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{user.postsCount}</p>
                <p className="text-sm text-gray-600">Posts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 8️⃣ Layout Root con Provider (`src/app/layout.tsx`)

```typescript
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

export const metadata = {
  title: 'StyleBox',
  description: 'Fashion social network',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## 9️⃣ Variables de Entorno (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🔟 Instalar Dependencias

```bash
npm install axios js-cookie
npm install --save-dev @types/js-cookie
```

---

## ✅ Checklist de Implementación

- [ ] Crear archivo `src/lib/api/client.ts`
- [ ] Crear archivo `src/lib/api/auth.ts`
- [ ] Crear archivo `src/lib/types/auth.types.ts`
- [ ] Crear archivo `src/components/AuthProvider.tsx`
- [ ] Crear archivo `src/app/login/page.tsx`
- [ ] Crear archivo `src/app/register/page.tsx`
- [ ] Crear archivo `src/app/profile/page.tsx`
- [ ] Actualizar `src/app/layout.tsx` con AuthProvider
- [ ] Crear archivo `.env.local` con `NEXT_PUBLIC_API_URL`
- [ ] Instalar dependencias: `axios` y `js-cookie`
- [ ] Probar login y verificar que las cookies se guardan
- [ ] Probar navegación a `/profile` y que carga el usuario
- [ ] Probar logout

---

## 🎉 ¡Listo!

Con estos archivos, tu frontend debería estar completamente funcional con autenticación JWT.

### Próximos pasos:

1. Copia todos estos archivos a tu proyecto Next.js
2. Instala las dependencias
3. Inicia tu backend (`npm run start:dev`)
4. Inicia tu frontend (`npm run dev`)
5. Navega a `/login` y prueba el flujo completo

¡Buena suerte! 🚀
