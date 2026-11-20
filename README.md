# Préstamos Web (Vercel + Neon + Cloudinary)

Sistema seguro de gestión de préstamos con autenticación JWT, hash bcrypt, auditoría y control de roles.

## Stack
- Next.js 16 (App Router)
- PostgreSQL en Neon
- Cloudinary para fotos
- bcrypt + JWT para auth
- Sin TypeScript en frontend (HTML estático)

## Roles
- **owner** (Dueño): acceso completo a todo + usuarios + auditoría
- **admin** (Administrador): clientes, préstamos, pagos, garantías, gastos
- **collector** (Cobrador): clientes, préstamos, pagos

## Seguridad implementada
1. Contraseñas hasheadas con bcrypt (salt 10 rondas)
2. JWT firmado con secret (expira en 8h)
3. Validación de rol en CADA petición al backend
4. Rate limit: 5 intentos de login por IP cada 15 min
5. Sanitización de inputs (XSS prevention)
6. Parámetros SQL parametrizados (SQL injection prevention)
7. Headers HTTP de seguridad (HSTS, X-Frame-Options, etc.)
8. Logs de auditoría de cada acción sensible
9. Validación de tipo y tamaño de archivos (5 MB max, solo imágenes)
10. Sin contraseñas en código (variables de entorno)

## Instalación local
```bash
npm install
cp .env.example .env.local  # editar valores
node scripts/init-db.js     # crea las tablas
npm run dev
```

## Despliegue en Vercel
1. Subir este repo a GitHub
2. En Vercel: "New Project" → importar el repo
3. Variables de entorno en Vercel:
   - DATABASE_URL
   - JWT_SECRET
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
4. Deploy
5. Ejecutar `node scripts/init-db.js` con las variables cargadas (o usar el SQL Editor de Neon para crear las tablas)

## Usuarios por defecto (solo la primera vez que se hace login)
Se crean automáticamente al primer login si la tabla users está vacía. Las contraseñas seguras se te entregan por separado.
