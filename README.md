# Trazo Espacio Gráfico (`@trazo.grafica`) — Tienda Online y Sistema de Pedidos Personalizados

Plataforma e-commerce full-stack diseñada y desarrollada a medida para **Trazo Espacio Gráfico** (también identificada como **Trazo Gráfica**), radicada en **Río Cuarto, Córdoba, Argentina** con envíos a todo el país.

---

## 1. Datos Reales Confirmados de la Marca Integrados

- **Nombre comercial:** Trazo Espacio Gráfico / Trazo Gráfica
- **Instagram:** [https://www.instagram.com/trazo.grafica/](https://www.instagram.com/trazo.grafica/) (`@trazo.grafica`)
- **Ubicación:** Río Cuarto, Córdoba, Argentina
- **Cobertura:** Envíos a todo el país y retiro coordinado en Río Cuarto
- **WhatsApp:** `+54 9 358 510 4732` ([https://wa.me/5493585104732](https://wa.me/5493585104732))
- **Correo electrónico:** `Trazoografica@gmail.com`
- **Catálogo de productos reales observados:**
  1. Imanes personalizados con fotos de **5 × 5 cm** (medida confirmada).
  2. Planchas de stickers personalizados.
  3. Pines personalizados.
  4. Tarjetas personales.
  5. Tarjetas de agradecimiento y para packaging.
  6. Tarjetas para eventos.
  7. Etiquetas de cartulina para ropa, **con corte y perforación** (material y terminación confirmados).
  8. Kits para emprendedores.
  9. Boxes de regalos personalizados.
  10. Stand creativo de tatuajes temporales para eventos.

---

## 2. Diferenciación Clara: Funcionalidades Operativas vs. Integraciones que Requieren Credenciales

### ✅ Funcionalidades 100% Operativas de Inmediato
- **Navegación, Catálogo y Buscador:** Filtros por las 7 categorías, búsqueda en tiempo real y ordenamiento por destacados, nombre y precio.
- **Modo Oficial Estricto vs. Modo Prueba Sandbox:**
  - En **Modo Oficial** (por defecto), los productos sin tarifa oficial confirmada muestran *"Solicitar presupuesto"* e impiden el cobro directo (nunca se inventan precios vigentes ficticios).
  - Con 1 clic en la barra superior o desde el Panel Admin se activa el **Modo Prueba Sandbox**, habilitando tarifas técnicas marcadas explícitamente para verificar todo el circuito de carrito y pago.
- **Personalizador de Imanes 5 × 5 cm:** Carga de múltiples fotos, recorte cuadrado interactivo (`HTML5 Canvas`), detector de resolución (`< 590×590 px`), reordenamiento, eliminación y asignación de copias por foto validada contra el total del pedido.
- **Personalizador de Stickers, Pines, Tarjetas y Etiquetas:** Carga de archivos privados validados por *magic bytes*, opción de *"Solicitar ayuda con el diseño"*, textos, colores y observaciones.
- **Carrito Persistente con Separación Estricta de Líneas:** Productos iguales con fotos o diseños distintos jamás se mezclan en una sola línea. Permite retomar y editar la personalización desde el carrito.
- **Revalidación Server-Side y Copia Inmutable (Snapshot):** El servidor recalcula todos los precios, escalas por cantidad y cupones, y congela una copia inmutable de los nombres, variantes y precios contratados en cada pedido.
- **Flujo de Aprobación de Diseño y Bloqueo de Producción:** El administrador sube versiones de muestra (`v1`, `v2`...) y el cliente aprueba o solicita cambios desde su enlace criptográfico `/pedidos/[access_token]`. El servidor bloquea el paso a *"En producción"* si el producto requiere aprobación y aún no fue registrada.
- **Almacenamiento Privado y Enlaces Temporales Firmados (HMAC-SHA256):** Los archivos de clientes se guardan fuera de `/public` y se sirven por `/api/files/[fileId]` verificando firma temporal y pertenencia, impidiendo que un cliente acceda a archivos de otro.
- **Panel Administrador Privado (`/admin`):** Gestión completa de productos, categorías, pedidos, transferencias, diseños, consultas del stand de eventos, métricas (excluyendo estrictamente pedidos impagos de las ventas cobradas) y exportación CSV.

### 🔑 Integraciones Preparadas que Requieren Credenciales del Comercio en Producción
1. **Mercado Pago (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`):**
   - El endpoint de preferencias (`/api/payments/mercadopago/preference`) y el webhook con verificación HMAC-SHA256 e idempotencia (`/api/payments/mercadopago/webhook`) están implementados. En ausencia de credenciales reales en `.env`, el sistema provee un simulador de webhook firmado en entorno local para comprobar la acreditación y deduplicación.
2. **Supabase PostgreSQL + Storage (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`):**
   - La migración completa con tablas, constraints y políticas RLS se encuentra en [`supabase/migrations/0001_trazo_schema.sql`](file:///e:/grafica%20trazo/supabase/migrations/0001_trazo_schema.sql). Mientras no se configuren las credenciales en `.env`, la aplicación opera automáticamente sobre el motor relacional persistente local (`data/trazo_db.runtime.json` y `data/private_storage/`).
3. **Correos Transaccionales (`RESEND_API_KEY`):**
   - Implementado en [`src/lib/notifications/email.ts`](file:///e:/grafica%20trazo/src/lib/notifications/email.ts) para los 5 eventos (*Pedido recibido*, *Pago confirmado*, *Diseño pendiente de aprobación*, *Pedido listo*, *Pedido despachado*). Si la clave no está configurada, el sistema informa honestamente que el envío por email está pendiente de configuración sin fingir `"correo enviado"`.

---

## 3. Lista de Contenido Real que Falta Cargar por el Comercio

Antes de salir en vivo con cobros automáticos, el equipo de **Trazo Espacio Gráfico** debe cargar desde `/admin`:
1. **Lista de precios vigentes en ARS** por producto, variante, escalas por cantidad y recargo por servicio de diseño.
2. **Cantidades mínimas y múltiplos de compra** específicos para stickers, pines, tarjetas y etiquetas.
3. **Medidas adicionales, materiales y gramajes** exactos habilitados para cada línea de papelería.
4. **Tiempos estimados de producción** expresados en días hábiles para cada categoría.
5. **Datos bancarios reales** (Banco, Titular, CBU/CVU, Alias y CUIT) para cobros por transferencia.
6. **Tarifas de envío por zona** o integración con el operador logístico elegido, y dirección exacta de retiro en Río Cuarto (si desean mostrarla públicamente).
7. **Fotografías reales autorizadas** de los productos y de la galería de trabajos realizados (y el archivo vectorial original del logo).
8. **Testimonios reales autorizados** por clientes (la sección permanece oculta mientras no existan reseñas reales autorizadas).
9. **Validación final de textos legales** (política de cambios/cancelaciones para productos personalizados, privacidad y términos).

---

## 4. Instalación, Ejecución y Verificación

```bash
# 1. Instalar dependencias
npm.cmd install

# 2. Copiar variables de entorno
cp .env.example .env.local

# 3. Iniciar servidor de desarrollo
npm.cmd run dev

# 4. Compilar para producción
npm.cmd run build
```
