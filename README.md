# TravelSplit

TravelSplit es una aplicación web para administrar gastos compartidos en viajes y actividades grupales. Su objetivo es centralizar la información del grupo, registrar gastos, dividir montos entre participantes y calcular balances de forma clara, transparente y accesible.

El proyecto nace como una alternativa a métodos informales como hojas de cálculo, notas compartidas o aplicaciones no especializadas, los cuales pueden dificultar el seguimiento de deudas, pagos y responsabilidades dentro de un viaje. TravelSplit automatiza estos cálculos y ofrece una experiencia enfocada en organización, colaboración y accesibilidad.

## Descripción

TravelSplit permite que un grupo de usuarios cree viajes, agregue participantes, registre gastos y visualice balances individuales. Cada gasto puede asociarse a una categoría, un pagador, una fecha y un método de división. El sistema calcula automáticamente quién debe pagar o recibir dinero, reduciendo errores manuales y mejorando la transparencia entre los participantes.

La aplicación también incorpora principios de accesibilidad web para facilitar su uso por personas con discapacidad visual. Se han considerado aspectos como navegación por teclado, etiquetas descriptivas, estructura semántica, mensajes accesibles y compatibilidad con lectores de pantalla.

## Objetivo

Desarrollar una aplicación web que permita a grupos de usuarios registrar, organizar y dividir gastos compartidos de manera sencilla, precisa y transparente, facilitando el seguimiento de pagos y deudas entre los participantes.

Adicionalmente, el sistema está diseñado bajo principios de accesibilidad para que personas con discapacidad visual puedan utilizar la aplicación de forma autónoma y eficaz mediante lectores de pantalla, navegación accesible y una estructura clara de la información.

## Alcance

La aplicación permite crear y administrar múltiples viajes de forma independiente. Cada viaje puede tener una categoría, participantes asociados y gastos registrados. Los gastos incluyen información como monto, fecha, categoría, persona que pagó y forma de división entre participantes.

El sistema calcula automáticamente los balances del grupo, permitiendo identificar quién debe dinero y quién debe recibirlo. También incluye administración de participantes, historial de gastos, edición de información del viaje, finalización de viajes y consulta de viajes activos o finalizados.

Desde el punto de vista funcional, TravelSplit se enfoca exclusivamente en la gestión de gastos compartidos. No incluye integración con entidades bancarias, pasarelas de pago ni transferencias reales de dinero.

## Funcionalidades Principales

### Gestión de viajes

- Crear, consultar, editar y finalizar viajes.
- Asociar cada viaje a una categoría.
- Gestionar múltiples viajes por usuario.
- Filtrar viajes por estado: todos, iniciados o finalizados.
- Mostrar los viajes finalizados como vistas de solo lectura.

### Gestión de participantes

- Agregar participantes a un viaje.
- Consultar participantes y balances individuales.
- Gestionar la participación dentro de cada gasto.
- Restringir acciones de edición cuando el viaje está finalizado.

### Gestión de gastos

- Registrar gastos por viaje.
- Definir nombre, monto, fecha, categoría y persona que realizó el pago.
- Consultar historial de gastos recientes.
- Evitar duplicados por envíos repetidos.
- Validar campos numéricos para impedir valores no válidos.

### Gestión de divisiones de gastos

- División igualitaria.
- División por partes.
- División por porcentaje.
- División personalizada por montos.
- Guardado de divisiones frecuentes por viaje.
- Aplicación, edición y eliminación de divisiones guardadas.

### Gestión de categorías

- Categorías de viaje.
- Categorías de gasto.
- Categorías del sistema disponibles para todos los usuarios.
- Categorías creadas por el usuario visibles solo para ese usuario.
- Administración de categorías desde la interfaz.

### Accesibilidad

- Navegación por teclado.
- Etiquetas accesibles en campos, botones y acciones.
- Mensajes claros para lectores de pantalla.
- Uso de regiones semánticas y títulos por pantalla.
- Balances negativos anunciados de forma explícita para lectores de pantalla.

## Tecnologías Utilizadas

### Frontend

- React 19
- Vite 7
- JavaScript
- CSS
- HTML semántico
- Variables de entorno con Vite

### Backend

- Python 3.11
- FastAPI
- SQLAlchemy
- Pydantic
- Uvicorn
- python-dotenv
- psycopg2-binary

### Base de datos

- PostgreSQL
- Scripts SQL para creación y reinicio de tablas
- Inicialización de categorías del sistema

### Servicios complementarios

- SMTP para recuperación de contraseña por correo electrónico
- Variables de entorno centralizadas en un único archivo `.env` en la raíz del proyecto

## Estructura del Proyecto

```text
TravelSplit/
+-- backend/              # API REST construida con FastAPI
|   +-- app/
|   |   +-- database/     # Conexión, modelos y configuración de base de datos
|   |   +-- routes/       # Endpoints de la API
|   |   +-- schemas/      # Esquemas de validación con Pydantic
|   |   +-- services/     # Lógica de negocio
|   +-- main.py           # Punto de entrada del backend
|   +-- pyproject.toml    # Dependencias y configuración de Python
+-- frontend/             # Aplicación web en React
|   +-- src/
|   |   +-- components/   # Componentes reutilizables
|   |   +-- pages/        # Pantallas principales
|   |   +-- services/     # Cliente HTTP y servicios del frontend
|   +-- package.json      # Scripts y dependencias del frontend
|   +-- vite.config.js    # Configuración de Vite
+-- database/             # Scripts SQL del proyecto
|   +-- schema.sql
|   +-- init_categorias.sql
|   +-- delete_tables.sql
+-- docs anteriores/      # Documentación previa de análisis y diseño
+-- .env                  # Variables de entorno del proyecto
+-- README.md
```

## Documentación de pasos anteriores al desarrollo

La carpeta `docs anteriores/` contiene documentación previa del proyecto, incluyendo:

- Descripción del proyecto.
- Arquitectura de información.
- Diseño de base de datos.
- Diagrama de arquitectura.
- Diagrama de procesos.
- Prototipo de Figma.

Este README consolida la descripción general, el alcance funcional y las instrucciones operativas actuales del proyecto.


## Configuración de Variables de Entorno

El proyecto utiliza un único archivo `.env` ubicado en la raíz. Este archivo es leído por el backend y por el frontend.


## Configuración de Base de Datos

1. Crea una base de datos en PostgreSQL:

```sql
CREATE DATABASE travelsplit;
```

2. Ejecuta el script principal:

```bash
psql -U postgres -d travelsplit -f database/schema.sql
```

3. Carga las categorías iniciales del sistema:

```bash
psql -U postgres -d travelsplit -f database/init_categorias.sql
```

Si necesitas reiniciar las tablas durante desarrollo, puedes usar `database/delete_tables.sql` con precaución.

## Cómo Ejecutar el Backend

Desde la raíz del proyecto:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

La API quedará disponible en:

```text
http://localhost:8000
```

La documentación interactiva de Swagger de FastAPI estará disponible en:

```text
http://localhost:8000/docs
```

## Cómo Ejecutar el Frontend

En otra terminal, desde la raíz del proyecto:

```bash
cd frontend
corepack pnpm install
corepack pnpm dev
```

La aplicación quedará disponible en:

```text
http://localhost:5173
```

## Principios de Diseño y Calidad

TravelSplit prioriza:

- Claridad en la gestión de gastos.
- Transparencia en balances y deudas.
- Separación entre frontend, backend y base de datos.
- Validaciones en formularios y datos numéricos.
- Accesibilidad para usuarios con lector de pantalla.
- Interfaz consistente para viajes activos y finalizados.
- Mantenimiento de categorías del sistema y categorías propias del usuario.

## Limitaciones Actuales

- No realiza pagos reales.
- No se integra con bancos de pago.
- El registro de deudas y balances es informativo.
- Las fotos de perfil solo están demostrativas en los viajes y no en el perfil.

## Estado actual del Proyecto

El proyecto cuenta con módulos funcionales para autenticación, viajes, participantes, gastos, categorías, divisiones de gasto y balances. También se han incorporado mejoras de accesibilidad, manejo de variables de entorno desde la raíz y soporte para ejecución local o mediante reenvío de puertos.
