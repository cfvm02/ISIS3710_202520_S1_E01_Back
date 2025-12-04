# 🎨 StyleBox - Guía de Integración Frontend

Esta guía explica cómo consumir los endpoints del backend de StyleBox desde tu frontend Next.js.

---

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Cliente API (Axios)](#cliente-api-axios)
3. [Endpoints de Autenticación](#endpoints-de-autenticación)
4. [Endpoints de Posts](#endpoints-de-posts)
5. [Endpoints de Usuarios](#endpoints-de-usuarios)
6. [Endpoints de Colecciones](#endpoints-de-colecciones)
7. [Manejo de Errores](#manejo-de-errores)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
npm install axios js-cookie
npm install --save-dev @types/js-cookie
```

### 2. Variables de Entorno

Crea un archivo `.env.local` en tu proyecto Next.js:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🔌 Cliente API (Axios)

Crea el archivo `src/lib/api/client.ts`:

```typescript
import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
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

// Response interceptor: Manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no hemos intentado refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const { token, refreshToken: newRefreshToken } = response.data;

        Cookies.set('accessToken', token, { sameSite: 'Lax' });
        Cookies.set('refreshToken', newRefreshToken, { sameSite: 'Lax' });

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
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

---

## 🔐 Endpoints de Autenticación

### Archivo: `src/lib/api/auth.ts`

```typescript
import apiClient from './client';
import Cookies from 'js-cookie';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authAPI = {
  /**
   * Registrar nuevo usuario
   * POST /api/auth/register
   */
  async register(data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);

    // Guardar tokens en cookies
    Cookies.set('accessToken', response.data.token, { sameSite: 'Lax', expires: 1/24 });
    Cookies.set('refreshToken', response.data.refreshToken, { sameSite: 'Lax', expires: 7 });
    Cookies.set('currentUser', JSON.stringify(response.data.user), { sameSite: 'Lax', expires: 7 });

    return response.data;
  },

  /**
   * Iniciar sesión
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Guardar tokens en cookies
    Cookies.set('accessToken', response.data.token, { sameSite: 'Lax', expires: 1/24 });
    Cookies.set('refreshToken', response.data.refreshToken, { sameSite: 'Lax', expires: 7 });
    Cookies.set('currentUser', JSON.stringify(response.data.user), { sameSite: 'Lax', expires: 7 });

    return response.data;
  },

  /**
   * Obtener usuario actual
   * GET /api/auth/me
   * Requiere autenticación
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    Cookies.set('currentUser', JSON.stringify(response.data), { sameSite: 'Lax', expires: 7 });
    return response.data;
  },

  /**
   * Actualizar perfil
   * PATCH /api/auth/me
   * Requiere autenticación
   */
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatar?: string;
  }): Promise<User> {
    const response = await apiClient.patch<User>('/auth/me', data);
    Cookies.set('currentUser', JSON.stringify(response.data), { sameSite: 'Lax', expires: 7 });
    return response.data;
  },

  /**
   * Cerrar sesión
   */
  logout(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    Cookies.remove('currentUser');
    window.location.href = '/login';
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated(): boolean {
    return !!Cookies.get('accessToken');
  },
};
```

---

## 📝 Endpoints de Posts

### Archivo: `src/lib/api/posts.ts`

```typescript
import apiClient from './client';

export interface Post {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar: string | null;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
  imageUrl: string;
  description: string;
  tags: string[];
  occasion: string;
  style: string;
  status: 'published' | 'draft';
  likesCount: number;
  commentsCount: number;
  savedCount: number;
  viewsCount: number;
  isLiked: boolean;      // ← Siempre presente
  isSaved: boolean;      // ← Siempre presente
  userRating: number | null;  // ← Siempre presente
  createdAt: string;
}

export interface PostsResponse {
  posts: Post[];         // ← Campo "posts", NO "data"
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const postsAPI = {
  /**
   * Obtener feed de posts
   * GET /api/posts
   * Público (no requiere autenticación, pero recomienda estar autenticado para isLiked/isSaved)
   */
  async getPosts(params?: {
    page?: number;
    limit?: number;
    filter?: 'following' | 'all';
    sort?: 'recent' | 'popular';
    occasion?: string;
    style?: string;
    tags?: string;
  }): Promise<PostsResponse> {
    const response = await apiClient.get<PostsResponse>('/posts', { params });
    return response.data;
  },

  /**
   * Obtener un post por ID
   * GET /api/posts/:id
   * Público
   */
  async getPostById(postId: string): Promise<Post> {
    const response = await apiClient.get<Post>(`/posts/${postId}`);
    return response.data;
  },

  /**
   * Crear un nuevo post
   * POST /api/posts
   * Requiere autenticación
   */
  async createPost(data: {
    imageUrl: string;
    description: string;
    tags?: string[];
    occasion?: string;
    style?: string;
  }): Promise<Post> {
    const response = await apiClient.post<Post>('/posts', data);
    return response.data;
  },

  /**
   * Actualizar un post
   * PATCH /api/posts/:id
   * Requiere autenticación
   */
  async updatePost(postId: string, data: {
    description?: string;
    tags?: string[];
    occasion?: string;
    style?: string;
  }): Promise<Post> {
    const response = await apiClient.patch<Post>(`/posts/${postId}`, data);
    return response.data;
  },

  /**
   * Eliminar un post
   * DELETE /api/posts/:id
   * Requiere autenticación
   */
  async deletePost(postId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(`/posts/${postId}`);
    return response.data;
  },

  /**
   * Dar like a un post
   * POST /api/posts/:id/like
   * Requiere autenticación
   */
  async likePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const response = await apiClient.post<{ liked: boolean; likesCount: number }>(
      `/posts/${postId}/like`
    );
    return response.data;
  },

  /**
   * Quitar like de un post
   * DELETE /api/posts/:id/like
   * Requiere autenticación
   */
  async unlikePost(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const response = await apiClient.delete<{ liked: boolean; likesCount: number }>(
      `/posts/${postId}/like`
    );
    return response.data;
  },

  /**
   * Buscar posts
   * GET /api/posts/search
   * Público
   */
  async searchPosts(params: {
    q?: string;
    occasion?: string;
    style?: string;
    tags?: string;
  }): Promise<Post[]> {
    const response = await apiClient.get<Post[]>('/posts/search', { params });
    return response.data;
  },
};
```

---

## 👥 Endpoints de Usuarios

### Archivo: `src/lib/api/users.ts`

```typescript
import apiClient from './client';

export interface UserProfile {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    bio: string | null;
    isVerified: boolean;
  };
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
}

export interface UserPostsResponse {
  posts: any[];         // ← Campo "posts", NO "data"
  total: number;
}

export const usersAPI = {
  /**
   * Obtener perfil de usuario
   * GET /api/users/:userId
   * Público
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(`/users/${userId}`);
    return response.data;
  },

  /**
   * Obtener posts de un usuario
   * GET /api/users/:userId/posts
   * Público
   */
  async getUserPosts(userId: string, params?: {
    page?: number;
    limit?: number;
    status?: 'published' | 'draft';
  }): Promise<UserPostsResponse> {
    const response = await apiClient.get<UserPostsResponse>(
      `/users/${userId}/posts`,
      { params }
    );
    return response.data;
  },

  /**
   * Seguir a un usuario
   * POST /api/users/:userId/follow
   * Requiere autenticación
   */
  async followUser(userId: string): Promise<{
    isFollowing: boolean;
    followersCount: number;
  }> {
    const response = await apiClient.post(`/users/${userId}/follow`);
    return response.data;
  },

  /**
   * Dejar de seguir a un usuario
   * DELETE /api/users/:userId/follow
   * Requiere autenticación
   */
  async unfollowUser(userId: string): Promise<{
    isFollowing: boolean;
    followersCount: number;
  }> {
    const response = await apiClient.delete(`/users/${userId}/follow`);
    return response.data;
  },

  /**
   * Obtener seguidores de un usuario
   * GET /api/users/:userId/followers
   * Público
   */
  async getFollowers(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
  }> {
    const response = await apiClient.get(`/users/${userId}/followers`, { params });
    return response.data;
  },

  /**
   * Obtener usuarios seguidos
   * GET /api/users/:userId/following
   * Público
   */
  async getFollowing(userId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
  }> {
    const response = await apiClient.get(`/users/${userId}/following`, { params });
    return response.data;
  },

  /**
   * Buscar usuarios
   * GET /api/users
   * Público
   */
  async searchUsers(params?: {
    search?: string;
    style?: string;
  }): Promise<any[]> {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  /**
   * Bloquear usuario
   * POST /api/users/:userId/block
   * Requiere autenticación
   */
  async blockUser(userId: string): Promise<{ blocked: boolean }> {
    const response = await apiClient.post(`/users/${userId}/block`);
    return response.data;
  },

  /**
   * Desbloquear usuario
   * DELETE /api/users/:userId/block
   * Requiere autenticación
   */
  async unblockUser(userId: string): Promise<{ blocked: boolean }> {
    const response = await apiClient.delete(`/users/${userId}/block`);
    return response.data;
  },
};
```

---

## 📚 Endpoints de Colecciones

### Archivo: `src/lib/api/collections.ts`

```typescript
import apiClient from './client';

export interface Collection {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemsCount: number;
  createdAt: string;
}

export const collectionsAPI = {
  /**
   * Crear colección
   * POST /api/collections
   * Requiere autenticación
   */
  async createCollection(data: {
    name: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<Collection> {
    const response = await apiClient.post<Collection>('/collections', data);
    return response.data;
  },

  /**
   * Obtener todas las colecciones del usuario actual
   * GET /api/collections
   * Requiere autenticación
   */
  async getMyCollections(): Promise<Collection[]> {
    const response = await apiClient.get<Collection[]>('/collections');
    return response.data;
  },

  /**
   * Obtener una colección por ID
   * GET /api/collections/:id
   * Público (si la colección es pública)
   */
  async getCollectionById(collectionId: string): Promise<{
    _id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    items: any[];
    itemsCount: number;
  }> {
    const response = await apiClient.get(`/collections/${collectionId}`);
    return response.data;
  },

  /**
   * Actualizar colección
   * PATCH /api/collections/:id
   * Requiere autenticación
   */
  async updateCollection(collectionId: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<Collection> {
    const response = await apiClient.patch<Collection>(
      `/collections/${collectionId}`,
      data
    );
    return response.data;
  },

  /**
   * Eliminar colección
   * DELETE /api/collections/:id
   * Requiere autenticación
   */
  async deleteCollection(collectionId: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete(`/collections/${collectionId}`);
    return response.data;
  },

  /**
   * Agregar post a colección
   * POST /api/collections/:id/items
   * Requiere autenticación
   */
  async addPostToCollection(collectionId: string, postId: string): Promise<{
    saved: boolean;
    itemsCount: number;
  }> {
    const response = await apiClient.post(`/collections/${collectionId}/items`, {
      postId,
    });
    return response.data;
  },

  /**
   * Remover post de colección
   * DELETE /api/collections/:id/items/:postId
   * Requiere autenticación
   */
  async removePostFromCollection(
    collectionId: string,
    postId: string
  ): Promise<{
    removed: boolean;
    itemsCount: number;
  }> {
    const response = await apiClient.delete(
      `/collections/${collectionId}/items/${postId}`
    );
    return response.data;
  },
};
```

---

## ❌ Manejo de Errores

Todos los endpoints pueden lanzar errores. Manéjalos con try/catch:

```typescript
try {
  const posts = await postsAPI.getPosts({ page: 1, limit: 20 });
  console.log(posts);
} catch (error) {
  if (axios.isAxiosError(error)) {
    // Error de Axios
    if (error.response) {
      // El servidor respondió con un status fuera del rango 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);

      switch (error.response.status) {
        case 400:
          console.error('Bad Request');
          break;
        case 401:
          console.error('No autorizado - Debes iniciar sesión');
          break;
        case 403:
          console.error('Prohibido - No tienes permisos');
          break;
        case 404:
          console.error('No encontrado');
          break;
        case 409:
          console.error('Conflicto - El recurso ya existe');
          break;
        case 500:
          console.error('Error del servidor');
          break;
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('No response from server');
    } else {
      // Algo pasó al configurar la petición
      console.error('Error:', error.message);
    }
  }
}
```

---

## 🎯 Ejemplos de Uso

### Ejemplo 1: Feed de Posts (Usuario NO autenticado)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { postsAPI, Post } from '@/lib/api/posts';

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await postsAPI.getPosts({
          page: 1,
          limit: 50,
          sort: 'recent',
        });

        // ✅ response.posts (NO response.data)
        setPosts(response.posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {posts.map((post) => (
        <div key={post._id}>
          <img src={post.imageUrl} alt={post.description} />
          <p>{post.description}</p>
          <p>Likes: {post.likesCount}</p>
          {/* isLiked siempre está presente (false para usuarios no autenticados) */}
          <p>Me gusta: {post.isLiked ? 'Sí' : 'No'}</p>
        </div>
      ))}
    </div>
  );
}
```

### Ejemplo 2: Dar Like a un Post

```typescript
'use client';

import { useState } from 'react';
import { postsAPI } from '@/lib/api/posts';

export function LikeButton({ postId, initialLiked, initialCount }: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleLike() {
    setLoading(true);
    try {
      if (isLiked) {
        const response = await postsAPI.unlikePost(postId);
        setIsLiked(response.liked);
        setLikesCount(response.likesCount);
      } else {
        const response = await postsAPI.likePost(postId);
        setIsLiked(response.liked);
        setLikesCount(response.likesCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleLike} disabled={loading}>
      {isLiked ? '❤️' : '🤍'} {likesCount}
    </button>
  );
}
```

### Ejemplo 3: Login

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const response = await authAPI.login(email, password);
      console.log('Login exitoso:', response.user);

      // Redirigir al feed
      router.push('/feed');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Email o contraseña incorrectos');
      } else {
        setError('Error al iniciar sesión');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="error">{error}</p>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />

      <button type="submit">Iniciar Sesión</button>
    </form>
  );
}
```

### Ejemplo 4: Perfil de Usuario con Posts

```typescript
'use client';

import { useEffect, useState } from 'react';
import { usersAPI } from '@/lib/api/users';

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Obtener perfil
        const profileData = await usersAPI.getUserProfile(params.userId);
        setProfile(profileData);

        // Obtener posts del usuario
        const postsData = await usersAPI.getUserPosts(params.userId, {
          page: 1,
          limit: 20,
        });

        // ✅ postsData.posts (NO postsData.data)
        setPosts(postsData.posts);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    fetchUserData();
  }, [params.userId]);

  if (!profile) return <div>Cargando...</div>;

  return (
    <div>
      <h1>@{profile.user.username}</h1>
      <p>{profile.user.bio}</p>
      <p>Posts: {profile.postsCount}</p>
      <p>Seguidores: {profile.followersCount}</p>
      <p>Siguiendo: {profile.followingCount}</p>

      <div>
        <h2>Posts</h2>
        {posts.map((post) => (
          <div key={post._id}>
            <img src={post.imageUrl} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Ejemplo 5: Seguir/Dejar de Seguir Usuario

```typescript
'use client';

import { useState } from 'react';
import { usersAPI } from '@/lib/api/users';

export function FollowButton({ userId, initialFollowing }: {
  userId: string;
  initialFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleToggleFollow() {
    setLoading(true);
    try {
      if (isFollowing) {
        const response = await usersAPI.unfollowUser(userId);
        setIsFollowing(response.isFollowing);
      } else {
        const response = await usersAPI.followUser(userId);
        setIsFollowing(response.isFollowing);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleToggleFollow} disabled={loading}>
      {isFollowing ? 'Siguiendo' : 'Seguir'}
    </button>
  );
}
```

---

## 📝 Notas Importantes

### 1. **Formato de Respuesta de Posts**

⚠️ **IMPORTANTE**: El backend devuelve `posts` en lugar de `data`:

```typescript
// ✅ CORRECTO
const response = await postsAPI.getPosts();
const posts = response.posts;  // ← "posts"

// ❌ INCORRECTO
const posts = response.data;  // ← Esto NO existe
```

### 2. **Campos Siempre Presentes**

Los siguientes campos **siempre** están presentes en los posts, incluso para usuarios no autenticados:

- `isLiked`: `false` si no estás autenticado o no has dado like
- `isSaved`: `false` si no estás autenticado o no has guardado el post
- `userRating`: `null` si no estás autenticado o no has calificado

### 3. **Autenticación Opcional vs Requerida**

- **Endpoints públicos** (`@Public()`): No requieren token, pero funcionan mejor con token
  - `GET /api/posts` - Feed de posts
  - `GET /api/posts/:id` - Detalle de post
  - `GET /api/users/:userId` - Perfil de usuario
  - `GET /api/users/:userId/posts` - Posts de usuario
  - `GET /api/collections/:id` - Ver colección (si es pública)

- **Endpoints protegidos**: Requieren token obligatoriamente
  - `POST /api/posts` - Crear post
  - `POST /api/posts/:id/like` - Dar like
  - `POST /api/users/:userId/follow` - Seguir usuario
  - `POST /api/collections` - Crear colección

### 4. **Cookies y CORS**

Las cookies se manejan automáticamente gracias a:
- Backend: `credentials: true` en CORS
- Frontend: `withCredentials: true` en Axios

No necesitas hacer nada manualmente.

---

## 🎉 ¡Listo!

Con esta guía, tu frontend puede consumir completamente el backend de StyleBox. Los archivos API están listos para copiar y pegar en tu proyecto Next.js.

**Archivos a crear en tu frontend:**
- `src/lib/api/client.ts` - Cliente Axios
- `src/lib/api/auth.ts` - API de autenticación
- `src/lib/api/posts.ts` - API de posts
- `src/lib/api/users.ts` - API de usuarios
- `src/lib/api/collections.ts` - API de colecciones

---

**Happy Coding! 🚀**
