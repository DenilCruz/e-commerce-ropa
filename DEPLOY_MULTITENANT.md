# Deploy del multi-tenant: orden de pasos

Hay dos tareas independientes: el correo (Mailtrap y DNS) y este deploy. El orden importa:
**no reinicies la API con el código nuevo antes de aplicar las migraciones.**

## 0. Antes de empezar

- Haz un respaldo de la base: `pg_dump -U <superusuario> <base> > respaldo_antes_multitenant.sql`.
- Las migraciones `01` y `02` ya están aplicadas. Faltan `03`, `04`, `05` y `06`, en `database/`.

## 1. Aplicar las migraciones (superusuario de Postgres, en este orden)

```bash
psql -U <superusuario> -d <base> -f database/03_multi_tenant.sql
psql -U <superusuario> -d <base> -f database/04_tienda_slug.sql
psql -U <superusuario> -d <base> -f database/05_rls.sql
psql -U <superusuario> -d <base> -f database/06_tienda_plan.sql
psql -U <superusuario> -d <base> -f database/07_idempotencia.sql
```

Los datos actuales (productos, pedidos, usuarios) quedan asignados a la tienda "AURA".
`05` crea el rol `aura_app`, que es el que usará la API.

## 2. Cambiar la contraseña del rol `aura_app`

La que trae `05` es la de desarrollo:

```sql
ALTER ROLE aura_app PASSWORD '<contraseña-nueva>';
```

## 3. Variables del `api.env` de producción

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DB_USER` | `aura_app` |
| `DB_PASSWORD` | la contraseña nueva del paso 2 |
| `EXPOSE_VERIFICATION_LINK` | `false` (ver la nota sobre el correo) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | valores propios, no los de ejemplo |
| `MAIL_FROM` | `AURA <noreply@daches.dev>`, solo cuando el DNS esté verificado en Mailtrap |

Si falta algo de esto, la API se niega a arrancar en producción a propósito:

- si `DB_PASSWORD` sigue siendo la contraseña de desarrollo, o
- si el rol con el que se conecta omite la seguridad por fila (por ejemplo, `postgres`).

## 4. Subir el código y reiniciar

- `actualizar-azure.sh` copia los archivos de la carpeta local con `rsync`, no desde git. Apunta a la VM
  anterior (`52.233.82.87`); si el deploy es en otra cuenta de Azure, hay que cambiar esa IP.
- Después: `pm2 restart aura-api --update-env`.

## 5. Comprobar

- `pm2 logs aura-api`: debe decir "Nest application successfully started" y no mostrar errores de RLS ni de contraseña.
- `curl https://<dominio>/api/v1/productos` debe devolver los 21 productos de AURA.
- Inicia sesión y crea una tienda desde el selector.

## Notas

- **Todos los usuarios tendrán que volver a iniciar sesión.** Los tokens viejos no traen la tienda y se rechazan
  con "Tu sesión es de una versión anterior".
- **Correo y verificación:** mientras el DNS de `daches.dev` no esté verificado en Mailtrap, a nadie más le llega
  el enlace. Con `EXPOSE_VERIFICATION_LINK=false`, un usuario nuevo no puede verificar su email ni crear una
  tienda. Para una demo sin DNS se puede poner `true` de forma temporal, sabiendo que expone el enlace en la
  respuesta del registro.
- **Correo, pasos del DNS:** en Mailtrap, Sending Domains, añadir `daches.dev`; crear en el DNS los registros que
  muestre (CNAME de verificación, 2 CNAME de DKIM, CNAME de tracking y TXT de DMARC); esperar la verificación
  (de 15 minutos a 24 horas).
- **Para volver atrás:** restaurar el respaldo del paso 0 y la versión anterior del código.
- **La app móvil** no tiene selector de tienda todavía; usa la tienda AURA por defecto.
- Estas migraciones se probaron en una base local; este procedimiento no se probó contra una copia de producción.
