#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de Especificación Técnica en PDF para Gym Rutinas Pro
Arquitectura de Información, Estructura de Pantallas, Modelo de Datos y Funciones.
"""

import sys
import os
from fpdf import FPDF, XPos, YPos

FONT_REGULAR = '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf'
FONT_BOLD = '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'
FONT_OBLIQUE = '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Oblique.ttf'
FONT_MONO = '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSansMono.ttf'
FONT_MONO_BOLD = '/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSansMono-Bold.ttf'

class TechDocPDF(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font('DejaVu', '', FONT_REGULAR)
        self.add_font('DejaVu', 'B', FONT_BOLD)
        self.add_font('DejaVu', 'I', FONT_OBLIQUE)
        self.add_font('DejaVuMono', '', FONT_MONO)
        self.add_font('DejaVuMono', 'B', FONT_MONO_BOLD)

    def header(self):
        if self.page_no() == 1:
            return  # Portada sin cabecera repetitiva
        self.set_font('DejaVu', 'B', 8)
        self.set_text_color(100, 116, 139) # #64748B
        self.cell(0, 7, 'GYM RUTINAS PRO · ESPECIFICACIÓN DE ESTRUCTURA Y FUNCIONES v2.1', align='L')
        self.set_font('DejaVu', '', 8)
        self.cell(0, 7, 'DOCUMENTO TÉCNICO', align='R', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(self.l_margin, 15, self.w - self.r_margin, 15)
        self.ln(3)

    def footer(self):
        self.set_y(-14)
        self.set_font('DejaVu', '', 8)
        self.set_text_color(148, 163, 184)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y() - 2, self.w - self.r_margin, self.get_y() - 2)
        self.cell(0, 7, 'Gym Rutinas Pro · Arquitectura Web Modular (0% SVG · Vanilla JS)', align='L')
        self.cell(0, 7, f'Página {self.page_no()}', align='R')

    def chapter_title(self, num, title):
        self.ln(4)
        self.set_fill_color(15, 23, 42) # Dark Slate #0F172A
        self.set_text_color(255, 255, 255)
        self.set_font('DejaVu', 'B', 11)
        self.cell(0, 8, f'  {num}. {title.upper()}', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(30, 41, 59)
        self.ln(3)

    def section_title(self, title):
        self.ln(2)
        self.set_font('DejaVu', 'B', 10)
        self.set_text_color(2, 132, 199) # Sky Blue #0284C7
        self.cell(0, 6, f'▶ {title}', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(30, 41, 59)
        self.ln(1)

    def body_p(self, text):
        self.set_font('DejaVu', '', 8.8)
        self.set_text_color(51, 65, 85) # Slate #334155
        self.multi_cell(0, 4.8, text)
        self.ln(2)

    def bullet(self, label, text):
        self.set_font('DejaVu', 'B', 8.8)
        self.set_text_color(15, 23, 42)
        bullet_prefix = '  • '
        w_prefix = self.get_string_width(bullet_prefix + label + ': ')
        self.write(4.8, bullet_prefix + label + ': ')
        self.set_font('DejaVu', '', 8.8)
        self.set_text_color(51, 65, 85)
        self.write(4.8, text + '\n')
        self.ln(1)

    def function_box(self, name, scope, desc, params=None, returns=None):
        self.set_fill_color(248, 250, 252) # Slate #F8FAFC
        self.set_draw_color(203, 213, 225) # Border Slate #CBD5E1
        self.set_line_width(0.2)
        
        y_start = self.get_y()
        # Header of function
        self.set_font('DejaVuMono', 'B', 8.5)
        self.set_text_color(194, 65, 12) # Rust/Orange #C2410C
        self.cell(0, 6, f' [FUNC] {name}', border='LTR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.set_font('DejaVu', 'I', 7.5)
        self.set_text_color(100, 116, 139)
        self.cell(0, 4.5, f'   Alcance: {scope}', border='LR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.set_font('DejaVu', '', 8)
        self.set_text_color(51, 65, 85)
        self.cell(0, 4.5, f'   Descripción: {desc}', border='LR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        if params:
            self.set_font('DejaVu', 'B', 7.5)
            self.set_text_color(71, 85, 105)
            self.cell(0, 4, f'   Parámetros: {params}', border='LR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        if returns:
            self.set_font('DejaVu', 'B', 7.5)
            self.set_text_color(5, 150, 105) # Green
            self.cell(0, 4, f'   Retorna: {returns}', border='LBR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        else:
            self.cell(0, 2, '', border='LBR', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            
        self.ln(2.5)

def build_pdf(output_path):
    pdf = TechDocPDF()
    pdf.add_page()
    
    # =========================================================================
    # PORTADA / ENCABEZADO PRINCIPAL
    # =========================================================================
    pdf.set_fill_color(15, 23, 42) # Slate oscuro
    pdf.rect(0, 0, 210, 42, 'F')
    
    pdf.set_y(8)
    pdf.set_font('DejaVu', 'B', 18)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 8, 'GYM RUTINAS PRO', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font('DejaVu', '', 10)
    pdf.set_text_color(56, 189, 248) # Sky blue
    pdf.cell(0, 6, 'ARQUITECTURA DE INFORMACIÓN, ESTRUCTURA Y CATÁLOGO DE FUNCIONES', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_font('DejaVu', 'I', 8)
    pdf.set_text_color(203, 213, 225)
    pdf.cell(0, 5, 'Especificación Técnica Integral de Sistema · Versión 2.1.0 · Noviembre 2026', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    pdf.set_y(48)
    
    # =========================================================================
    # CAPÍTULO 1: RESUMEN EJECUTIVO & PRINCIPIOS DE DISEÑO
    # =========================================================================
    pdf.chapter_title(1, 'Resumen Ejecutivo y Filosofía Arquitectural')
    pdf.body_p(
        'Gym Rutinas Pro es una Progressive Web App (PWA) de alto rendimiento orientada a la periodización '
        'del entrenamiento de fuerza, la hipertrofia muscular y la rehabilitación biomecánica. El sistema está '
        'concebido bajo principios de diseño de máxima fluidez táctil y cero dependencias pesadas:'
    )
    pdf.bullet('0% SVG en Tiempo de Ejecución', 'Eliminación absoluta de elementos vectoriales <svg> y librerías externas. La iconografía se resuelve mediante caracteres Unicode enriquecidos, texturas rasterizadas de alta fidelidad e insignias renderizadas por CSS.')
    pdf.bullet('Vanilla JS y Estado Centralizado Reactivo', 'Arquitectura libre de frameworks (React, Angular o Vue). Toda la lógica se gobierna desde un objeto State inmutable almacenado de forma atómica en localStorage y sincronizado mediante un dispatcher renderAll().')
    pdf.bullet('Filosofía de Información Colapsable', 'Todas las funciones puramente informativas (Resumen semanal, análisis de volumen, mapas anatómicos, centro de rehabilitación y cuidados articulares) residen en elementos nativos <details class="overview-accordion"> y se presentan contraídas por defecto para no saturar la vista.')
    pdf.bullet('Enfoque Biomecánico y Rehabilitador', 'Integración de protocolos clínicos específicos (Pie Plano / Fascitis Plantar, Dolor Lumbar McGill, Manguito Rotador, Tendinopatía Rotuliana y Túnel Carpiano) que se aplican desde el Onboarding y se integran en el calentamiento diario.')

    # =========================================================================
    # CAPÍTULO 2: SISTEMA DE PANTALLAS (SCREENS) Y NAVEGACIÓN
    # =========================================================================
    pdf.chapter_title(2, 'Estructura de Pantallas (Screens) y Experiencia de Usuario')
    pdf.body_p(
        'La interfaz de usuario implementa un patrón de navegación multiventana independiente, donde cada pantalla '
        'posee sus propias funciones sin compartir botones redundantes ni menús inferiores:'
    )

    pdf.section_title('1. Pantalla Principal (#screen-home)')
    pdf.bullet('Avatar del Atleta (Superior Izquierda)', 'Insignia interactiva (#home-user-avatar-badge) que muestra el avatar estilizado en arte 9-bits suave, nombre del atleta y peso corporal. Al hacer clic, navega a la pantalla de Perfil (#screen-profile).')
    pdf.bullet('Título Central (#home-brand-title)', 'Nombre central de la aplicación "Gym Rutinas Pro" con subtítulo de sincronización biomecánica.')
    pdf.bullet('Copa de Progresión (#home-trophy-badge)', 'Acceso directo a la vitrina de medallas y trofeos (#trophy-cabinet-dialog), con cálculo de meses de disciplina y animación pendular.')
    pdf.bullet('Botonera Central Hero', 'Tres accesos únicos con arte visual estilizado: Entrenamiento (botón central de mayor jerarquía visual), Estadísticas y Configuración (Opciones extras).')

    pdf.section_title('2. Pantalla de Entrenamiento (#screen-plan)')
    pdf.bullet('Barra Superior Exclusiva', 'Botón de retorno al Menú Principal en la esquina superior izquierda ("<-- Menú Principal"), acompañado del ícono oficial y el título de pantalla "Entrenamiento".')
    pdf.bullet('Hero Card del Día (#day-hero-card)', 'Selector de días de la semana (Lunes a Domingo), cálculo de series (0/24), duración estimada (~55 min) y tonelaje acumulado en tiempo real.')
    pdf.bullet('Resumen Semanal (#header-metrics-drawer)', 'Acordeón informativo exclusivo de la pantalla de entrenamiento, de tipo collapse y contraído por defecto.')
    pdf.bullet('Calentamiento Articular (#warmup-checklist-card)', 'Protocolo específico de activación muscular según el grupo del día.')
    pdf.bullet('Panel de Ejercicios Correctivos (#corrective-therapy-collapsible)', 'Elemento <details> contraído por defecto con prescripciones biomecánicas (Pie Plano, Rodillas, Lumbares, etc.) y botón directo de integración al calentamiento diario.')
    pdf.bullet('Lista de Ejercicios (#exercises-list)', 'Tarjetas interactivas con sprites de 3 fases biomecánicas (inicial, contracción y final), contador de series, RIR y botones de variación por máquina ocupada.')

    pdf.section_title('3. Pantalla de Modo Entrenamiento Activo (#workout-focus-screen)')
    pdf.bullet('Modo Enfoque / Focus', 'Interfaz a pantalla completa que aísla al usuario de distracciones durante la sesión.')
    pdf.bullet('Cronómetro Activo & Temporizador de Descanso', 'Alternancia fluida entre la ejecución de la serie y el temporizador regresivo de descanso (60s, 75s, 90s, 120s) con pitido sonoro y vibración háptica.')
    pdf.bullet('Control de Series & Parámetros Dinámicos', 'Registro de repeticiones completadas, selector de técnica (Dropset, Rest-Pause, Isometría), calibración de RIR y cálculo de 1RM.')

    pdf.section_title('4. Pantalla de Estadísticas (#screen-stats)')
    pdf.bullet('Drawer Analítico (#stats-analytics-drawer)', 'Panel informativo de tipo collapse contraído por defecto que agrupa los gráficos de volumen, tonelaje diario acumulado y comparativa semanal.')
    pdf.bullet('Mapa Semanal de Frecuencia Muscular', 'Visualización de la distribución armónica de estímulo por grupo muscular.')
    pdf.bullet('Historial de PRs (Personal Records)', 'Listado de récords personales logrados con sobrecarga progresiva.')

    pdf.section_title('5. Pantalla de Configuración & Extras (#screen-hub)')
    pdf.bullet('Centro de Rehabilitación & Terapia (#therapeutic-rehab-accordion)', 'Acordeón contraído por defecto con guías clínicas, biblioteca biomecánica y selector de condición física activa.')
    pdf.bullet('Ajustes de Perfil Biométrico', 'Reconfiguración de estatura, peso, edad, objetivo y días semanales.')
    pdf.bullet('Herramientas Avanzadas', 'Calculadora de discos olímpicos / pilas de poleas y restaurador de distribución semanal de días.')
    pdf.bullet('Módulos de Nutrición y Recuperación', 'Control de hidratación (meta diaria de agua), consumo de creatina y readiness de sueño.')

    pdf.section_title('6. Pantalla de Mi Perfil (#screen-profile)')
    pdf.bullet('Retrato Dinámico de Evolución (Arte 9-Bits)', 'Ilustración del físico del atleta con musculatura y atuendo deportivo que evoluciona a través de 5 etapas progresivas según la constancia.')
    pdf.bullet('Cuadrícula de Métricas Biométricas', 'Tarjetas para Peso Corporal, Estatura, Edad, Índice IMC, Frecuencia semanal, Objetivo principal y Condición Articular / Podal activa.')

    # =========================================================================
    # CAPÍTULO 3: MODELO DE DATOS Y ESTRUCTURA DE LA INFORMACIÓN
    # =========================================================================
    pdf.chapter_title(3, 'Modelo de Datos y Esquema de Entidades')
    pdf.body_p(
        'El estado de la aplicación se centraliza en el objeto global "state", el cual encapsula todos '
        'los dominios de información requeridos para el funcionamiento fuera de línea:'
    )

    pdf.section_title('1. Entidad: state.userProfile (Perfil del Atleta)')
    pdf.bullet('name', 'String · Nombre público del atleta (ej. "Carlos Atleta").')
    pdf.bullet('gender', 'Enum ("male" | "female") · Determina los coeficientes de fuerza y las imágenes de avatar.')
    pdf.bullet('age / weightKg / heightCm', 'Number · Parámetros para el cálculo de IMC y gasto metabólico.')
    pdf.bullet('fitnessLevel', 'Enum ("beginner" | "intermediate" | "advanced") · Calibra el RIR y porcentaje de carga.')
    pdf.bullet('primaryGoal', 'Enum ("hypertrophy" | "strength" | "fat_loss" | "health") · Determina series y descansos.')
    pdf.bullet('daysPerWeek', 'Number (3, 4, 5, 6) · Define la matriz de días activos y días de descanso.')
    pdf.bullet('physicalCondition', 'Enum ("flat_feet_fasciitis" | "knees" | "lower_back" | "shoulders" | "wrists" | "none") · Define las precauciones articulares y activa protocolos terapéuticos.')
    pdf.bullet('limitations', 'String · Sincronizado para retrocompatibilidad con las adaptaciones de ejercicios.')

    pdf.section_title('2. Entidad: state.schedule[dayId] (Calendario Semanal)')
    pdf.bullet('id / dayName / shortName', 'String · Identificadores únicos ("lunes", "martes", etc.).')
    pdf.bullet('title / subtitle / muscleGroup', 'String · Grupo muscular principal y enfoque biomecánico.')
    pdf.bullet('accentHue', 'Number · Tonalidad HSL para dinamismo visual de la tarjeta hero.')
    pdf.bullet('status', 'Enum ("normal" | "skipped_to_sunday" | "shifted" | "completed") · Gestión de imprevistos.')
    pdf.bullet('exercises[]', 'Array<Exercise> · Listado de 5 a 6 ejercicios diarios.')

    pdf.section_title('3. Sub-Entidad: Exercise (Ejercicio de Entrenamiento)')
    pdf.bullet('id / name / muscle / equipment', 'Identificadores nominales y mecánicos.')
    pdf.bullet('sets / targetSets', 'Number · Número de series programadas.')
    pdf.bullet('reps / repsScheme', 'String/Array · Rango de repeticiones (ej. "10-12 reps").')
    pdf.bullet('restSeconds', 'Number · Tiempo asignado de descanso entre series (ej. 75s).')
    pdf.bullet('targetRir', 'String · Repeticiones en reserva recomendadas (ej. "RIR 1-2").')
    pdf.bullet('completedSets[]', 'Array<Boolean> · Checkbox de culminación por serie.')
    pdf.bullet('loadType / loadValue', 'Tipo de sobrecarga (peso en kg o nivel de placas).')

    pdf.section_title('4. Catálogo: THERAPEUTIC_CONDITIONS (Investigación Biomecánica)')
    pdf.body_p(
        'Diccionario estructurado que almacena el sustento clínico y la prescripción técnica para afecciones podales '
        'y articulares:'
    )
    pdf.bullet('flat_feet_fasciitis (Pie Plano / Fascitis)', 'Diagnóstico: Colapso del arco longitudinal medial y valgo de retropié por déficit del músculo tibial posterior y fascia plantar. 5 ejercicios correctivos: 1) Short Foot de Janda, 2) Liberación Miofascial con pelota, 3) Elevación de talones con pelota entre maléolos, 4) Estiramiento DiGiovanni de hallux, 5) Toe curls con toalla.')
    pdf.bullet('knees (Rodillas / Tendinopatía)', 'Isometrías analgésicas con Spanish Squat, activación de glúteo medio con monster walks y puente unipodal.')
    pdf.bullet('lower_back (Lumbar / Espalda Baja)', 'Protocolo McGill Big 3 (Bird-Dog, Side Plank y Curl-Up modificado) para rigidez espinal.')
    pdf.bullet('shoulders (Hombros / Manguito)', 'Rotaciones externas con toalla axilar, wall slides escapulares y face pulls en plano escapular a 30°.')
    pdf.bullet('wrists (Muñecas / Túnel Carpiano)', 'Deslizamientos neurodinámicos del nervio mediano, estiramientos de flexores y prensión neutra.')

    # =========================================================================
    # CAPÍTULO 4: CATÁLOGO DE FUNCIONES JAVASCRIPT
    # =========================================================================
    pdf.chapter_title(4, 'Catálogo Detallado de Funciones del Sistema')
    pdf.body_p(
        'A continuación se detalla la signatura, alcance y comportamiento de las principales funciones que '
        'componen la lógica operativa en app.js y los módulos de soporte:'
    )

    pdf.section_title('A. Funciones de Núcleo, Ciclo de Vida y Estado')
    pdf.function_box(
        'saveState()',
        'Global / app.js',
        'Serializa el objeto state en formato JSON y lo persiste de forma atómica en localStorage.',
        params='Ninguno',
        returns='void'
    )
    pdf.function_box(
        'loadState()',
        'Global / app.js',
        'Recupera y valida la integridad del estado almacenado; si no existe, invoca createInitialState().',
        params='Ninguno',
        returns='Object (state completo)'
    )
    pdf.function_box(
        'renderAll()',
        'Dispatcher Central / app.js',
        'Sincroniza la visibilidad de pantallas, renderiza tarjetas de ejercicios, actualiza analíticas, avatares y paneles colapsables.',
        params='Ninguno',
        returns='void'
    )
    pdf.function_box(
        'switchAppScreen(screenKey)',
        'Navegación / app.js',
        'Alterna la visualización entre "home", "plan", "workout", "stats", "hub" y "profile", gestionando clases activas y atributos hidden.',
        params='screenKey: String ("home" | "plan" | "workout" | "stats" | "hub" | "profile")',
        returns='void'
    )

    pdf.section_title('B. Funciones de Perfil, Onboarding y Condición Articular')
    pdf.function_box(
        'openProfileOnboardingDialog(isFirstTime)',
        'Onboarding / app.js',
        'Abre el diálogo modal de perfil, precargando la biometría y el selector de condiciones físicas.',
        params='isFirstTime: Boolean (indica si es el primer arranque de la app)',
        returns='void'
    )
    pdf.function_box(
        'saveUserProfile(profileData)',
        'Perfil / app.js',
        'Guarda los parámetros biométricos y la condición física, recalcula el calendario personalizado con visual-engine y refresca el DOM.',
        params='profileData: Object (name, gender, weightKg, heightCm, physicalCondition, etc.)',
        returns='Object (state.userProfile actualizado)'
    )
    pdf.function_box(
        'updateProfilePreviewFromInputs()',
        'Perfil / app.js',
        'Calcula en tiempo real el IMC, el RIR y despliega la explicación biomecánica de la condición física seleccionada.',
        params='Ninguno (lee directamente del DOM)',
        returns='void'
    )
    pdf.function_box(
        'setPhysicalCondition(condKey)',
        'Terapia / app.js',
        'Actualiza directamente la condición articular activa ("flat_feet_fasciitis", "knees", etc.) y reajusta las sustituciones biomecánicas.',
        params='condKey: String (identificador de condición en THERAPEUTIC_CONDITIONS)',
        returns='Object (state.userProfile)'
    )

    pdf.section_title('C. Funciones de Terapia Articular y Rehabilitación Biomecánica')
    pdf.function_box(
        'renderCorrectiveTherapyPanel()',
        'Terapia / app.js',
        'Puebla el panel colapsable #corrective-therapy-collapsible con las 5 tarjetas clínicas, técnicas y precauciones de la lesión activa.',
        params='Ninguno',
        returns='void'
    )
    pdf.function_box(
        'applyTherapyWarmupAction(forcedDayId)',
        'Terapia / app.js',
        'Integra los ejercicios correctivos al protocolo de calentamiento del día seleccionado y actualiza el botón de confirmación.',
        params='forcedDayId: String opcional (id del día, ej. "lunes")',
        returns='void'
    )
    pdf.function_box(
        'renderTherapeuticRehabHub()',
        'Terapia / app.js',
        'Renderiza en la pantalla Hub la biblioteca interactiva con pestañas para explorar cualquier lesión y su base científica.',
        params='Ninguno',
        returns='void'
    )
    pdf.function_box(
        'getTherapeuticConditions()',
        'API / app.js',
        'Retorna una copia profunda e inmutable del catálogo clínico THERAPEUTIC_CONDITIONS para pruebas e integraciones.',
        params='Ninguno',
        returns='Object (Diccionario de condiciones)'
    )

    pdf.section_title('D. Funciones del Planificador y Entrenamiento Activo')
    pdf.function_box(
        'selectDay(dayId)',
        'Planificador / app.js',
        'Cambia el día seleccionado en la vista de entrenamiento, adaptando acentos de color, anatomía y calentamiento.',
        params='dayId: String ("lunes", "martes", etc.)',
        returns='void'
    )
    pdf.function_box(
        'startDayWorkoutSession(dayId)',
        'Entrenamiento / app.js',
        'Inicializa el cronómetro de sesión, prepara el stepper de ejercicios y transiciona a la pantalla de enfoque (#workout-focus-screen).',
        params='dayId: String',
        returns='void'
    )
    pdf.function_box(
        'swapExerciseAlternative(dayId, exerciseId, alternativeId)',
        'Sustitución / app.js',
        'Sustituye un ejercicio por su alternativa biomecánica equivalente ante máquina ocupada o molestia muscular localizada.',
        params='dayId: String, exerciseId: String, alternativeId: String|null',
        returns='void'
    )
    pdf.function_box(
        'switchRestDayToToday()',
        'Periodización / app.js',
        'Mueve el día de descanso obligatorio al día presente ante fatiga o imprevistos y reorganiza la semana manteniendo el balance muscular.',
        params='Ninguno',
        returns='void'
    )

    pdf.section_title('E. Funciones de Gamificación, Avatares y Trofeos')
    pdf.function_box(
        'checkAndTriggerTrophyUnlock(prevCount, newCount)',
        'Gamificación / app.js',
        'Comprueba si el nuevo conteo de sesiones completadas supera el umbral mensual para desbloquear un nuevo nivel de trofeo.',
        params='prevCount: Number, newCount: Number',
        returns='Boolean (true si hubo nuevo desbloqueo)'
    )
    pdf.function_box(
        'openTrophyCelebrationDialog(tier)',
        'Gamificación / app.js',
        'Despliega el diálogo modal festivo de trofeo con animación pendular y efectos de destello.',
        params='tier: Object (definición de nivel en TROPHY_TIERS)',
        returns='void'
    )
    pdf.function_box(
        'getUserAvatarProgressionStatus()',
        'Avatar / app.js',
        'Calcula la etapa de evolución estética (1 a 5) y atuendo del atleta en base a los meses de entrenamiento continuado.',
        params='Ninguno',
        returns='Object (currentStage, nextStage, progressPercent)'
    )

    # =========================================================================
    # CAPÍTULO 5: GARANTÍA DE CALIDAD Y TEST SUITES (63 SUITES)
    # =========================================================================
    pdf.chapter_title(5, 'Aseguramiento de Calidad y Verificación Automatizada')
    pdf.body_p(
        'El proyecto cuenta con una exhaustiva suite de integración ejecutada con JSDOM y Node.js '
        '(tools/test_app.cjs), que garantiza cero regresiones a lo largo de 63 suites de pruebas:'
    )
    pdf.bullet('Suites 1 a 31', 'Validación del motor de rutinas, sprites rasterizados, almacenamiento atómico y persistencia en localStorage.')
    pdf.bullet('Suites 32 a 45', 'Auditoría de implementos de gimnasio, sustitución por máquina ocupada, temporizador dinámico de descanso y transiciones fluidas.')
    pdf.bullet('Suites 46 a 54', 'Calentamiento biomecánico, control dominical de descanso, bloqueo anti-sobreentrenamiento y rebalanceo armónico.')
    pdf.bullet('Suites 55 a 61', 'Reestructuración de pantalla principal independiente, avatares progresivos de género en arte 9-bits suave, vitrina de trofeos y navegación con botón de retorno.')
    pdf.bullet('Suite 62', 'Auditoría estricta de elementos informativos tipo collapse: verificación de que Resumen Semanal, Día de descanso y Gráficos de Tonelaje estén contraídos por defecto (open=false).')
    pdf.bullet('Suite 63', 'Verificación integral del módulo de condiciones físicas: presencia del selector en onboarding, persistencia de pie plano / fascitis plantar, panel clínico de 5 ejercicios correctivos, botón de integración al calentamiento diario y auditoría de 0% <svg>.')

    # Guardar archivo
    pdf.output(output_path)
    print(f"PDF generado con éxito en: {output_path}")

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else '/data/data/com.termux/files/home/gimnasio-rutinas/ESTRUCTURA_Y_FUNCIONES_GYM_RUTINAS_PRO.pdf'
    build_pdf(out)
