# DIRECTIVAS DE DESARROLLO Y CONTINUIDAD - GIMNASIO RUTINAS PRO

## 1. Directiva Mandatoria de Continuidad entre Conversaciones
> **REGLA CRÍTICA**: Cada vez que una conversación se acerque al límite de tokens/contexto, o se vaya a iniciar una nueva conversación para continuar el desarrollo, el agente DEBE proporcionar un **Prompt de Continuidad Estructurado** listo para copiar y pegar en la nueva sesión (o el usuario puede usarlo para retomar al instante).

El prompt de continuidad debe contener siempre:
1. **Ruta y Rama del Repositorio**: `/data/data/com.termux/files/home/gimnasio-rutinas` (rama `main`).
2. **Entorno de Ejecución Local**: Servidor Node `tools/serve.cjs` en `http://127.0.0.1:8080` (localhost).
3. **Versión y Módulos Activos**: Estado actual del software (v1.9 con perfil biométrico, cargas dinámicas, acomodador inteligente y 0% SVGs).
4. **Logros de la Sesión Previa**: Resumen conciso de cambios efectuados y tests pasando (`npm test`).
5. **Próximos Pasos Priorizados**: Lista numerada de tareas concretas a implementar inmediatamente.
6. **Comando de Arranque Inmediato**: Instrucción para ejecutar las pruebas, verificar el servidor y proseguir el desarrollo sin demoras ni preguntas innecesarias.

---

## 2. Pautas Técnicas del Proyecto
- **Zero SVGs**: Todo el proyecto utiliza exclusivamente imágenes rasterizadas WebP/JPG/PNG con sprites biomecánicos y CSS puro. No utilizar `<svg>`.
- **Desarrollo y Depuración Exclusivamente en Navegador (Localhost)**: El usuario prueba y depura en tiempo real únicamente a través del navegador en `http://localhost:8080`. **NO empaquetar la aplicación ni ejecutar builds/sync de Android** (`build_web_dist.cjs`, `npx cap sync android`, etc.).
- **Único Perfil Guardado**: El sistema maneja un único perfil biométrico persistente en almacenamiento interno (`localStorage`).
- **Cargas y Rangos Dinámicos**: Todo cálculo de peso (kg o nivel), repeticiones, series y descansos es calibrado dinámicamente según la biometría y los objetivos de la persona.
- **Sustitución Biomecánica**: Ante máquinas ocupadas o molestias articulares, ofrecer siempre alternativas equivalentes de los 3 grupos (polea, máquina guiada y peso libre).
- **Acomodación Flexible**: Si la persona no entrena un día, el sistema adapta la semana (mover al domingo, correr la cadena, fusión inteligente o compensación de volumen express) para mantener la adherencia óptima.
