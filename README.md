# StyleBox API – Backend NestJS

<p align="center">
  <a href="http://nestjs.com/" target="_blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  API desarrollada en Node.js usando el framework NestJS para gestionar usuarios, posts, likes, seguidores, colecciones y funcionalidades sociales de la plataforma StyleBox.
</p>

---

# Integrantes del Equipo

| Estudiante                       | Rol                               | Responsabilidades                                                                 |
|----------------------------------|------------------------------------|-----------------------------------------------------------------------------------|
| Carlos Felipe Vargas Morales     | Backend & Integración API          | Likes, módulo PostLikes, endpoints REST, middleware, pruebas con Postman          |
| Silvana Echeverry                | Frontend & UI/UX                   | Integración con API, diseño UI/UX, pantallas del feed y detalle de post           |
| Alejandra Fruto                  | Base de Datos & Documentación      | MongoDB Atlas, validación de datos, estructura de colecciones, documentación      |
| Daniel Bolívar                   | Funcionalidades Adicionales        | Validaciones, pruebas, optimización, soporte en backend/frontend                  |

---

# Descripción del Proyecto

StyleBox es una plataforma social enfocada en moda, donde los usuarios pueden subir outfits, descubrir estilos, seguir a otros usuarios, guardar prendas favoritas y visualizar un feed personalizado.

---

# Este backend administra

- Gestión de usuarios  
- Publicación de posts y outfits  
- Relaciones sociales (seguidores / seguidos)  
- Likes y comentarios  
- Colecciones y elementos guardados  
- Feed global y feed personalizado  
- Persistencia en MongoDB Atlas mediante Mongoose  

---

# Historias de Usuario y Funcionalidades

A continuación se presentan las historias de usuario implementadas, con la indicación de quién fue responsable de cada una.

---

# Historia de Usuario 1  
**Responsable: Alejandra Fruto**

## Funcionalidad 1. Botón de seguir / dejar de seguir  
Botón dinámico según estado actual: “Seguir” o “Siguiendo”.  
Actualización en tiempo real.  
Confirmación antes de dejar de seguir.

## Funcionalidad 2. Listado de seguidores y seguidos  
Lista de seguidos con opción de buscarlos o dejarlos de seguir.  
Lista de seguidores con opción de seguir de vuelta.

## Funcionalidad 3. Notificaciones de nuevas publicaciones  
Notificaciones cuando un usuario seguido sube un nuevo outfit.  
Indicador de publicaciones no vistas.

## Funcionalidad 4. Visualización desde seguidores/seguidos  
Vista del perfil.  
Galería de publicaciones.  
Botón seguir/dejar de seguir desde el perfil.  
Indicadores de estilo del usuario.

---

# Historia de Usuario 2  
**Responsable: Silvana Echeverry**

## Funcionalidad 1. Visualización del feed de prendas y outfits  
Tarjetas con rating y botón de guardar.

## Funcionalidad 2. Botón de guardar  
Guardar prendas en colecciones personalizadas.

## Funcionalidad 3. Página de guardados  
Vista agrupada por colecciones creadas por el usuario.

## Funcionalidad 4. Gestión de colecciones  
Crear, editar y eliminar colecciones.  
Ver cantidad de items y categorías.

---

# Historia de Usuario 3  
**Responsable: Carlos Vargas**

## Funcionalidad 1. Visualización del outfit subido  
Imagen principal del outfit.  
Listado de prendas con nombre y marca.

## Funcionalidad 2. Metadatos del outfit  
Tags (Casual, Streetwear, Summer).  
Caption descriptivo opcional.

## Funcionalidad 3. Interacciones sociales  
Botones de like, comentario y compartir.  
Conteo visible de acciones.  
Comentarios con avatar, nombre y tiempo.

## Funcionalidad 4. Accesibilidad y diseño consistente  
Jerarquía visual clara.  
Tipografías diferenciadas.  
Botones con iconografía intuitiva.

---

# Historia de Usuario 4  
**Responsable: Daniel Bolivar**

## Funcionalidad 1. Feed personalizado  
Orden basado en afinidad (estilos seguidos y talla).  
Alternativa: orden por fecha.

## Funcionalidad 2. Filtros por ocasión  
Chips: Fiesta, Oficina, Viaje.  
Filtrado manteniendo relevancia.

## Funcionalidad 3. Pestaña Discover  
Mosaico con tendencias, estilos, categorías y ocasiones.

## Funcionalidad 4. Sub-feed Discover  
Vista filtrada con scroll vertical.  
Acceso a detalle de prendas/outfits.  
Posibilidad de guardar directamente.

---

# Tecnologías Utilizadas

- NestJS  
- Node.js + TypeScript  
- MongoDB Atlas + Mongoose  
- JWT  
- Docker  

---

# Project Setup

```
npm install
```

---

# Run the Project

```
npm run start
npm run start:dev
npm run start:prod
```

---

# Run Tests

```
npm run test
npm run test:e2e
npm run test:cov
```

---

# Deployment

NestJS puede desplegarse fácilmente en:

- Vercel (serverless)  
- Render  
- Railway  
- Google Cloud Platform (GCP)  
- Docker  
- MongoDB Atlas como base de datos administrada  

---
