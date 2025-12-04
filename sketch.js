// Variables para audio
let mic;
let fft;
let amplitude;
let audioStarted = false;

// Variables para el fractal
let recursionLevel = 0;
let branchAngle = 0;
let branchLength = 0;
let colorHue = 0;

// Parámetros base del fractal
const BASE_RECURSION = 6;
const BASE_ANGLE = Math.PI / 6; // 30 grados
const BASE_LENGTH = 120;
const BASE_HUE = 120; // Verde

// Elementos DOM
let startBtn, resetBtn, infoBtn;
let audioLevelEl, audioValueEl;
let lowFreqEl, midFreqEl, highFreqEl;
let recursionLevelEl, branchAngleEl, branchLengthEl, colorHueEl;

// Modal
let infoModal, closeBtn;

function setup() {
    // Crear canvas
    const canvas = createCanvas(800, 800);
    canvas.parent('canvas-container');
    
    // Configurar elementos DOM
    setupDOM();
    
    // Configurar audio
    setupAudio();
    
    // Configurar estilo visual
    colorMode(HSB, 360, 100, 100, 100);
    angleMode(RADIANS);
    
    // Configurar texto
    textAlign(CENTER, CENTER);
}

function setupDOM() {
    // Botones
    startBtn = document.getElementById('start-btn');
    resetBtn = document.getElementById('reset-btn');
    infoBtn = document.getElementById('info-btn');
    
    // Elementos de visualización
    audioLevelEl = document.getElementById('audio-level');
    audioValueEl = document.getElementById('audio-value');
    lowFreqEl = document.getElementById('low-freq');
    midFreqEl = document.getElementById('mid-freq');
    highFreqEl = document.getElementById('high-freq');
    recursionLevelEl = document.getElementById('recursion-level');
    branchAngleEl = document.getElementById('branch-angle');
    branchLengthEl = document.getElementById('branch-length');
    colorHueEl = document.getElementById('color-hue');
    
    // Modal
    infoModal = document.getElementById('info-modal');
    closeBtn = document.getElementsByClassName('close')[0];
    
    // Event listeners
    startBtn.addEventListener('click', startAudio);
    resetBtn.addEventListener('click', resetFractal);
    infoBtn.addEventListener('click', () => {
        infoModal.style.display = 'block';
    });
    
    closeBtn.addEventListener('click', () => {
        infoModal.style.display = 'none';
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === infoModal) {
            infoModal.style.display = 'none';
        }
    });
}

function setupAudio() {
    // Crear objetos de audio
    mic = new p5.AudioIn();
    fft = new p5.FFT(0.8, 64); // Suavizado y 64 bandas de frecuencia
    amplitude = new p5.Amplitude(0.8); // Suavizado
    
    // Configurar micrófono
    mic.start();
    fft.setInput(mic);
    amplitude.setInput(mic);
    
    // Inicialmente pausar el contexto de audio
    getAudioContext().suspend();
    
    // Actualizar texto del botón
    startBtn.innerHTML = '<i class="fas fa-microphone"></i> Activar Micrófono';
}

function startAudio() {
    if (!audioStarted) {
        // Reanudar el contexto de audio (requiere interacción del usuario)
        userStartAudio().then(() => {
            getAudioContext().resume();
            audioStarted = true;
            startBtn.innerHTML = '<i class="fas fa-microphone-alt"></i> Micrófono Activado';
            startBtn.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        }).catch(err => {
            console.log("Error al iniciar audio:", err);
            alert("Por favor, permite el acceso al micrófono para que el proyecto funcione correctamente.");
        });
    }
}

function resetFractal() {
    // Reiniciar parámetros a sus valores base
    recursionLevel = BASE_RECURSION;
    branchAngle = BASE_ANGLE;
    branchLength = BASE_LENGTH;
    colorHue = BASE_HUE;
    
    // Actualizar visualizaciones
    updateVisualizations(0, [0, 0, 0]);
}

function draw() {
    // Fondo con efecto de desenfoque de movimiento
    background(15, 20, 40, 20);
    
    // Si el audio está activo, analizar y actualizar parámetros
    if (audioStarted && mic.enabled) {
        analyzeAudio();
    }
    
    // Dibujar el fractal
    drawFractal();
    
    // Dibujar información en pantalla
    drawInfo();
}

function analyzeAudio() {
    // Obtener nivel de amplitud
    let level = amplitude.getLevel();
    
    // Obtener análisis de frecuencia
    let spectrum = fft.analyze();
    
    // Dividir espectro en bajos, medios y altos
    let lowFreq = fft.getEnergy(20, 250);    // Bajos: 20-250 Hz
    let midFreq = fft.getEnergy(250, 2000);  // Medios: 250-2000 Hz
    let highFreq = fft.getEnergy(2000, 5000); // Altos: 2000-5000 Hz
    
    // Normalizar valores
    let normLevel = map(level, 0, 0.5, 0, 1, true);
    let normLow = map(lowFreq, 0, 255, 0, 1, true);
    let normMid = map(midFreq, 0, 255, 0, 1, true);
    let normHigh = map(highFreq, 0, 255, 0, 1, true);
    
    // Mapear valores de audio a parámetros del fractal
    recursionLevel = int(map(normLevel, 0, 1, 3, 10, true)); // Niveles de recursión: 3-10
    branchAngle = map(normLow, 0, 1, Math.PI / 12, Math.PI / 3, true); // Ángulo: 15-60 grados
    branchLength = map(normMid, 0, 1, 60, 180, true); // Longitud: 60-180
    colorHue = map(normHigh, 0, 1, 0, 360, true); // Hue: 0-360 (todo el espectro)
    
    // Actualizar visualizaciones en DOM
    updateVisualizations(level, [normLow, normMid, normHigh]);
}

function updateVisualizations(level, freqs) {
    // Actualizar medidor de nivel de audio
    let levelPercent = map(level, 0, 0.5, 0, 100, true);
    audioLevelEl.style.width = levelPercent + '%';
    audioValueEl.textContent = level.toFixed(3);
    
    // Actualizar valores de frecuencia
    lowFreqEl.textContent = freqs[0].toFixed(2);
    midFreqEl.textContent = freqs[1].toFixed(2);
    highFreqEl.textContent = freqs[2].toFixed(2);
    
    // Actualizar parámetros del fractal
    recursionLevelEl.textContent = recursionLevel;
    branchAngleEl.textContent = nf(degrees(branchAngle), 0, 1) + '°';
    branchLengthEl.textContent = nf(branchLength, 0, 1);
    colorHueEl.textContent = nf(colorHue, 0, 0);
}

function drawFractal() {
    // Configurar para dibujar desde el centro inferior
    push();
    translate(width / 2, height * 0.85);
    
    // Dibujar el árbol fractal
    strokeWeight(2);
    drawBranch(branchLength, recursionLevel);
    
    pop();
}

function drawBranch(len, depth) {
    if (depth <= 0) return;
    
    // Calcular color basado en la profundidad y el hue
    let sat = map(depth, 0, recursionLevel, 30, 100);
    let bri = map(depth, 0, recursionLevel, 80, 60);
    let alpha = map(depth, 0, recursionLevel, 100, 80);
    
    stroke(colorHue % 360, sat, bri, alpha);
    
    // Grosor de línea basado en la profundidad
    let sw = map(depth, 0, recursionLevel, 1, 8);
    strokeWeight(sw);
    
    // Dibujar la rama actual
    line(0, 0, 0, -len);
    
    // Mover al final de la rama
    translate(0, -len);
    
    // Reducir la longitud para las siguientes ramas
    let nextLen = len * 0.7;
    
    // Dibujar ramas izquierda y derecha si aún hay profundidad
    if (depth > 1) {
        // Rama izquierda
        push();
        rotate(-branchAngle);
        drawBranch(nextLen, depth - 1);
        pop();
        
        // Rama derecha
        push();
        rotate(branchAngle);
        drawBranch(nextLen, depth - 1);
        pop();
        
        // A veces agregar una rama central (probabilidad basada en nivel de audio)
        let level = amplitude.getLevel();
        if (random() < map(level, 0, 0.5, 0, 0.3, true)) {
            push();
            rotate(random(-0.1, 0.1));
            drawBranch(nextLen * 0.8, depth - 1);
            pop();
        }
    }
    
    // Dibujar hojas en el último nivel
    if (depth === 1) {
        noStroke();
        fill(colorHue % 360, 70, 80, 60);
        ellipse(0, 0, 8, 8);
    }
}

function drawInfo() {
    // Dibujar información en la esquina superior izquierda
    push();
    fill(200, 200, 255, 180);
    noStroke();
    textSize(16);
    textAlign(LEFT, TOP);
    
    let infoY = 20;
    let infoX = 20;
    
    text("Árbol Fractal Audio-Reactivo", infoX, infoY);
    textSize(14);
    
    let status = audioStarted ? "ACTIVADO" : "DESACTIVADO";
    let statusColor = audioStarted ? [100, 255, 100] : [255, 100, 100];
    
    fill(statusColor[0], statusColor[1], statusColor[2], 200);
    text("Micrófono: " + status, infoX, infoY + 30);
    
    fill(200, 200, 255, 180);
    text("Nivel de recursión: " + recursionLevel, infoX, infoY + 55);
    text("Ángulo: " + nf(degrees(branchAngle), 0, 1) + "°", infoX, infoY + 80);
    
    pop();
}

function windowResized() {
    // Ajustar tamaño del canvas si es necesario
    resizeCanvas(800, 800);
}