# PROTOCOLO DE CONTINUIDAD AUTOMÁTICA DE CONVERSACIONES

Este documento define la directiva establecida para el desarrollo continuo de **Gimnasio Rutinas Pro**.

## Procedimiento ante Límite de Conversación

Cuando la conversación actual se aproxime al límite de contexto o el usuario solicite abrir una nueva conversación para continuar desarrollando:

1. **Guardar y Verificar Estado**:
   - Asegurarse de que todos los archivos estén editados, sin errores de sintaxis (`node --check`).
   - Ejecutar la suite de pruebas completa: `npm test && npm run test:android-prepare`.
   - Realizar commit y push a la rama `main` en Git.
   - Confirmar que el servidor de depuración local en `http://localhost:8080` continúe activo.

2. **Generar el Prompt de Nueva Conversación**:
   Entregar al usuario el bloque listo para iniciar la nueva conversación con el siguiente formato estandarizado:

```markdown
Hola, continúa con el desarrollo de la aplicación Gimnasio Rutinas Pro en este dispositivo:
- Repositorio: /data/data/com.termux/files/home/gimnasio-rutinas (rama main)
- Servidor de pruebas activo en: http://127.0.0.1:8080 (localhost)
- Estado actual: Versión v1.9 completada (Perfil biométrico inicial obligatorio, cargas dinámicas basadas en sexo/edad/peso/objetivo, sustitución de ejercicios por máquina ocupada con 3 alternativas y acomodador inteligente de días perdidos).
- Pruebas pasando al 100%: npm test (28 módulos verificados, 0% SVGs).
- Siguiente objetivo: [Describir los siguientes pasos a realizar].
Verifica el estado con `git status` y `npm test`, y continúa directamente con la implementación.
```
