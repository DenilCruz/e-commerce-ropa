# Manual del Punto de Venta (POS) sin conexión y sincronización

Proyecto AURA, SI2, segundo examen parcial. Dirigido al vendedor (usuario administrador de una tienda).
Cubre el punto 3.3 del plan de trabajo. Describe la web; la sección 7 explica la aplicación móvil.

## 1. Qué permite

Vender prendas en efectivo desde el mostrador aunque no haya internet. Las ventas quedan guardadas en el equipo y se
envían solas, en el orden en que se hicieron, cuando vuelve la conexión. Una venta nunca se registra dos veces y
nunca se vende stock que otro vendedor ya vendió.

**No funciona sin conexión:** el cobro con tarjeta y con QR (necesitan validar con el banco o la pasarela en ese
momento). Para esos cobros se usa la tienda normal, con internet.

## 2. Antes de la primera venta (con internet)

1. Inicia sesión en la tienda con tu usuario administrador.
2. Entra a **Punto de Venta** (menú lateral, `/admin/ventas`). El equipo descarga una copia del catálogo y de las
   fotos. Mientras ocurre, el indicador dice "Catálogo guardado en este equipo: hace un momento".
3. Opcional: instala la aplicación desde el navegador ("Instalar AURA" en la barra de direcciones). Así se abre
   como una aplicación y también funciona sin conexión tras recargar.
4. Opcional: pulsa **Activar notificaciones** y acepta el permiso del navegador. Recibirás un aviso cuando se registre
   una venta que se hizo sin conexión. **Enviar prueba** comprueba que llegan.

Hazlo en cada equipo que vayas a usar sin conexión. Si nunca descargaste el catálogo, la pantalla te lo indica.

## 3. Vender

1. Busca la prenda por nombre, SKU, talla o color y pulsa **+** para agregarla a "Venta actual".
2. Ajusta las cantidades con **+** y **−**. No puedes pasar del stock que queda en este equipo.
3. Si quieres, escribe el nombre del cliente.
4. Pulsa **Registrar venta** (con conexión) o **Guardar venta en este equipo** (sin conexión).

El indicador superior muestra **En línea** o **Sin conexión**, y cuántas ventas están por enviar. Sin conexión, la
venta queda en la cola con el estado "Pendiente de sincronización" y el stock de esa prenda baja en este equipo para
que no vendas dos veces la misma unidad.

Pulsar el botón varias veces seguidas no crea varias ventas.

## 4. La cola de sincronización

Está al final de la pantalla. Cada venta muestra su estado:

| Estado | Qué significa | Qué hacer |
|---|---|---|
| Pendiente de sincronización | Guardada en este equipo, aún no enviada | Nada: se envía sola al volver la conexión. Puedes cancelarla. |
| Sincronizando | Se está enviando | Esperar. |
| Sincronizada | El servidor la registró; se muestra el número de pedido | Nada. "Quitar sincronizadas" limpia la lista. |
| Venta en conflicto / quiebre de stock | Otra venta se llevó el stock antes | Ver la sección 5. |
| Rechazada por el servidor | El servidor no aceptó la venta; el motivo aparece en pantalla | Reintentar o cancelar. |

También puedes pulsar **Sincronizar ahora**. Si el servidor o la red fallan, el equipo reintenta solo, esperando cada
vez más (5 segundos, luego 10, 20, 40 y hasta 60) para no saturar.

## 5. Cuando hay un conflicto de stock

Ejemplo: tú y otro vendedor vendieron la última prenda estando sin conexión. El primero que llega al servidor la
vende; la segunda venta **no se cobra ni se descuenta** y queda como "Venta en conflicto / quiebre de stock", con el
detalle de cuánto pediste y cuánto quedaba. Elige una salida:

- **Vender solo lo disponible:** la venta se ajusta a lo que queda (si no queda nada, se cancela) y se vuelve a enviar.
- **Reintentar (ya repuse stock):** vuelve a enviar la misma venta. Úsalo cuando repusiste mercadería.
- **Cancelar venta:** descarta la venta y devuelve el stock reservado en este equipo.

Si el cliente quiere otra prenda, cancela la venta y registra una nueva.

## 6. Cuánto tiempo se guardan los datos sin conexión

Los datos del equipo no se guardan para siempre. El límite es de **7 días** (configurable por el negocio):

- Si la copia del catálogo tiene más de 7 días, **sin conexión no se pueden registrar ventas nuevas**: conéctate para
  renovarla (con conexión se renueva sola). El indicador te avisa con "vencido".
- Las ventas guardadas que llevan más de 7 días sin enviarse se marcan "Antigua", pero **no se borran**: se envían
  igual al conectarse.

Conviene conectar el equipo al menos una vez al día para que las ventas lleguen y el catálogo esté al día.

## 7. Aplicación móvil

La aplicación móvil tiene la misma pantalla en **Perfil, Punto de venta (funciona sin internet)**, visible solo para
administradores. Guarda los datos en SQLite y funciona igual: catálogo local, cola, conflictos y el límite de 7
días. **Estado de verificación:** se probó en un emulador Android (Pixel 6): vender sin red, sincronizar al volver, un conflicto
de stock, "Reintentar" y que la cola sobreviva a cerrar la aplicación. Falta probarla en un teléfono físico y comprobar
en el dispositivo el límite de 7 días (cubierto solo con pruebas automáticas). Para ejecutarla hay que compilar la aplicación
con `expo-sqlite` (`expo run:android` o un nuevo cliente de desarrollo).

## 8. Problemas frecuentes

| Problema | Causa probable | Solución |
|---|---|---|
| "Este equipo todavía no tiene el catálogo guardado" | Nunca se abrió el punto de venta con conexión | Conéctate y abre `/admin/ventas`. |
| No deja guardar la venta sin conexión y menciona "más de 7 día(s)" | El catálogo guardado venció | Conéctate para renovarlo. |
| "No hay stock suficiente en este dispositivo" | Pediste más de lo que queda en este equipo | Baja la cantidad o espera a conectarte. |
| Una venta sigue "Pendiente" aunque hay internet | Sesión vencida o servidor sin respuesta | Vuelve a iniciar sesión; se enviará sola. |
| No aparece el botón de notificaciones | El navegador no las admite o las bloqueaste | Permítelas desde el candado de la barra de direcciones. |
| Ventas de otra tienda o de otro usuario en la cola | Se guardaron con otra sesión en este equipo | No se envían desde tu sesión; inicia sesión con esa tienda y usuario para que salgan. |
