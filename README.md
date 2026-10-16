# 🏋️‍♂️ Gym Rutinas Pro — Planificador Android (Lunes a Sábado + Excepción Domingo)

Aplicación Android (Capacitor 7 + PWA Offline) diseñada para gestionar y registrar tu rutina semanal de gimnasio de **Lunes a Sábado**, con soporte para **reprogramar al día Domingo** aquellos días que por excepción no se pueda entrenar.

---

## 🎯 Marcas Base Configuradas (4 Series × 12 Repeticiones)

| Ejercicio | Modo de Carga | Valor Inicial | Series × Reps | Días Asignados |
| :--- | :--- | :--- | :--- | :--- |
| **Espalda en polea con agarre estrecho** | `Nivel / Placa` *(sin peso visible)* | **Nivel 6** | **4 × 12** | Lunes y Viernes |
| **Espalda con agarre amplio en máquina** | `Kilogramos (kg)` | **20 kg** | **4 × 12** | Lunes y Viernes |
| **Bíceps en press / curl en polea** | `Kilogramos (kg)` | **10 kg** | **4 × 12** | Lunes y Viernes |

---

## 📅 Distribución Semanal por Grupos Musculares

- **Lunes — Espalda y Bíceps (Tracción / Pull)**:
  1. Espalda en polea con agarre estrecho — **Nivel 6** (4 × 12)
  2. Espalda con agarre amplio en máquina — **20 kg** (4 × 12)
  3. Bíceps en press / curl en polea — **10 kg** (4 × 12)
  4. Remo horizontal sentado en polea baja — **Nivel 6** (4 × 12)
  5. Pull-over en polea alta con cuerda — **Nivel 4** (4 × 12)
  6. Curl martillo con mancuernas o cuerda — **8 kg** (4 × 12)
- **Martes — Pecho y Tríceps (Empuje / Push)**:
  1. Press de pecho sentado en máquina — **20 kg** (4 × 12)
  2. Press inclinado en máquina o mancuernas — **15 kg** (4 × 12)
  3. Aperturas en máquina Contractora (Pec Deck) — **Nivel 5** (4 × 12)
  4. Extensión de tríceps en polea alta (Pushdown) — **10 kg** (4 × 12)
  5. Extensión de tríceps sobre la cabeza en polea — **Nivel 4** (4 × 12)
  6. Fondos de tríceps en máquina sentada — **20 kg** (4 × 12)
- **Miércoles — Pierna Completa (Cuádriceps, Femoral y Gemelos)**:
  1. Prensa de piernas inclinada (Leg Press) — **40 kg** (4 × 12)
  2. Extensión de cuádriceps en máquina — **20 kg** (4 × 12)
  3. Curl femoral tumbado o sentado en máquina — **15 kg** (4 × 12)
  4. Sentadilla Hack en máquina o Goblet — **15 kg** (4 × 12)
  5. Aductores en máquina sentada — **Nivel 5** (4 × 12)
  6. Elevación de talones en máquina (Gemelos) — **25 kg** (4 × 12)
- **Jueves — Hombro y Core (Deltoides, Trapecio y Abdomen)**:
  1. Press militar de hombros en máquina — **15 kg** (4 × 12)
  2. Elevaciones laterales en polea o mancuernas — **5 kg** (4 × 12)
  3. Face Pull en polea alta con cuerda — **Nivel 4** (4 × 12)
  4. Vuelos posteriores en máquina (Rear Delt) — **Nivel 4** (4 × 12)
  5. Encogimientos de hombros (Trapecio) — **12 kg** (4 × 12)
  6. Crunch abdominal en polea alta — **Nivel 5** (4 × 12)
- **Viernes — Torso Completo (Frecuencia 2 Espalda, Pecho y Brazos)**:
  1. Espalda en polea con agarre estrecho — **Nivel 6** (4 × 12)
  2. Espalda con agarre amplio en máquina — **20 kg** (4 × 12)
  3. Press de pecho convergente en máquina — **20 kg** (4 × 12)
  4. Cruces de pecho en polea alta — **Nivel 4** (4 × 12)
  5. Bíceps en press / curl en polea — **10 kg** (4 × 12)
  6. Extensión de tríceps en polea con cuerda — **10 kg** (4 × 12)
- **Sábado — Pierna y Glúteo (Cadena Posterior)**:
  1. Hip Thrust en máquina o multipower — **30 kg** (4 × 12)
  2. Peso muerto rumano con mancuernas — **20 kg** (4 × 12)
  3. Prensa de piernas (Pies en parte alta) — **35 kg** (4 × 12)
  4. Abducción de cadera en máquina — **Nivel 5** (4 × 12)
  5. Curl femoral sentado en máquina — **15 kg** (4 × 12)
  6. Elevación de talones sentado (Sóleo) — **20 kg** (4 × 12)
- **Domingo — Día Comodín / Recuperación (Excepciones)**:
  - Permite trasladar cualquier día no entrenado de la semana directamente al Domingo, recorrer la fila de días (+1 día hasta el Domingo) o intercambiar días.

---

## 📱 Despliegue en Android (Antigravity CLI / GitHub Actions / Local)

### 1. Despliegue desde Antigravity CLI en Android
```bash
git clone https://github.com/P4UL92/gimnasio-rutinas.git
cd gimnasio-rutinas
npm install
npm test
npm run android:prepare
```

### 2. Descarga directa del APK desde GitHub Actions
Cada `git push` a la rama `main` ejecuta automáticamente el flujo `.github/workflows/build_apk.yml` que compila el instalador `app-debug.apk` con Java 21 + Capacitor 7 y lo publica en la sección **Actions** (`GymRutinasPro-Android-APK`) y en **Releases**.

### 3. Compilación local de APK
```bash
npm run android:build -- --java-home "D:/AndroidRETools/jdk/jdk-21.0.12.1+1" --sdk-dir "D:/Desarrollo - Android/lex-peru-rpg/tmp/android-sdk"
```
