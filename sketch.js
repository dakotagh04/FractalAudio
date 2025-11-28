let mic;
let fft;
let amplitude;

// Parámetros de la curva del dragón
let dragonPoints = [];
let currentIteration = 0;
let lastUpdateTime = 0;
let updateInterval = 1000;
let baseInterval = 1000;

// Parámetros de audio
let audioThreshold = 0.05;
let isAudioActive = false;
let audioLevel = 0;

// Parámetros de visualización
let isColorMode = false;
let colorHue = 0;

// Sistema de zoom INVERTIDO
let zoomLevel = 1;
let targetZoom = 1;
let zoomSpeed = 0.005;
let panX = 0, panY = 0;

// Animación de duplicación y rotación
let animationProgress = 0;
let animationSpeed = 0.02;
let isAnimating = false;
let rotatingCopy = [];
let pivotPoint = { x: 0, y: 0 };
let rotationDirection = 1;

// Estado del fractal
let isGenerating = false;
let lastAudioTime = 0;
let audioTimeout = 500;

function setup() {
    // Crear canvas
    let canvas = createCanvas(1000, 600);
    canvas.parent('canvas-container');
    
    // Configurar audio
    try {
        mic = new p5.AudioIn();
        mic.start();
        
        // Configurar FFT para análisis de frecuencia
        fft = new p5.FFT();
        fft.setInput(mic);
        
        // Configurar amplitud
        amplitude = new p5.Amplitude();
        amplitude.setInput(mic);
        amplitude.smooth(0.8);
    } catch (e) {
        console.log("Error configurando audio:", e);
    }
    
    // Inicializar puntos de la curva del dragón
    initializeDragon();
    
    // Configurar botón para iniciar audio
    let startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            userStartAudio().then(function() {
                console.log('Audio iniciado');
            }).catch(function(err) {
                console.log('Error iniciando audio:', err);
            });
        });
    }
    
    colorMode(HSB, 360, 100, 100, 100);
}

function initializeDragon() {
    // Puntos iniciales para la curva del dragón
    dragonPoints = [
        { x: -80, y: 0 },
        { x: 80, y: 0 }
    ];
    currentIteration = 0;
    animationProgress = 0;
    zoomLevel = 0.3;
    targetZoom = 0.3;
    panX = 0;
    panY = 0;
    isGenerating = false;
    isAnimating = false;
    rotatingCopy = [];
}

function draw() {
    background(0);
    
    // Actualizar análisis de audio
    updateAudioAnalysis();
    
    // Actualizar estado de generación basado en audio
    updateGenerationState();
    
    // Actualizar parámetros según el audio
    updateParametersFromAudio();
    
    // Actualizar sistema de zoom INVERTIDO
    updateZoom();
    
    // Aplicar transformaciones de cámara
    applyCameraTransform();
    
    // Actualizar y dibujar curva del dragón
    if (isGenerating) {
        updateDragonCurve();
        updateRotationAnimation();
    }
    
    drawDragonCurve();
    
    // Restaurar transformaciones
    resetMatrix();
    
    // Dibujar gráfico de audio
    drawAudioGraph();
    
    // Dibujar información
    drawInfo();
}

function updateAudioAnalysis() {
    if (amplitude) {
        try {
            audioLevel = amplitude.getLevel();
            isAudioActive = audioLevel > audioThreshold;
            
            if (isAudioActive) {
                lastAudioTime = millis();
            }
        } catch (e) {
            console.log("Error en análisis de audio:", e);
            audioLevel = 0;
            isAudioActive = false;
        }
    }
}

function updateGenerationState() {
    let currentTime = millis();
    let timeSinceLastAudio = currentTime - lastAudioTime;
    
    if (isAudioActive && !isGenerating) {
        isGenerating = true;
        console.log("Iniciando generación por audio");
    } else if (!isAudioActive && isGenerating && timeSinceLastAudio > audioTimeout) {
        isGenerating = false;
        console.log("Deteniendo generación por silencio");
    }
}

function updateParametersFromAudio() {
    if (isAudioActive && isGenerating) {
        let speedFactor = map(audioLevel, audioThreshold, 0.3, 1, 8, true);
        updateInterval = baseInterval / speedFactor;
        animationSpeed = 0.03 * speedFactor;
        
        // ZOOM INVERTIDO: Con audio, el zoom disminuye (nos alejamos)
        targetZoom = max(0.1, zoomLevel - 0.001 * speedFactor);
        
        zoomSpeed = 0.01 * speedFactor;
        
        isColorMode = true;
        colorHue = (colorHue + 3 * speedFactor) % 360;
    } else {
        updateInterval = baseInterval;
        animationSpeed = 0.02;
        
        // ZOOM INVERTIDO: Sin audio, el zoom aumenta lentamente (nos acercamos)
        targetZoom = min(2.0, zoomLevel + 0.0001);
        
        if (!isAudioActive) {
            isColorMode = false;
        }
    }
}

function updateZoom() {
    // Suavizar la transición de zoom
    if (abs(zoomLevel - targetZoom) > 0.001) {
        zoomLevel = lerp(zoomLevel, targetZoom, zoomSpeed);
    }
    
    // Pan automático INVERTIDO: cuando el zoom es pequeño (lejos), más movimiento
    if (zoomLevel < 0.8) {
        panX = sin(millis() * 0.0005) * 100 * (1/zoomLevel);
        panY = cos(millis() * 0.0003) * 60 * (1/zoomLevel);
    } else {
        panX = 0;
        panY = 0;
    }
}

function applyCameraTransform() {
    translate(width / 2 + panX, height / 2 + panY);
    scale(zoomLevel);
    
    // Rotación sutil cuando estamos cerca
    if (zoomLevel > 1.0) {
        rotate(sin(millis() * 0.0002) * 0.05);
    }
}

function updateDragonCurve() {
    let currentTime = millis();
    if (currentTime - lastUpdateTime > updateInterval && isGenerating && !isAnimating) {
        // Solo generar si no hemos llegado a un límite razonable
        if (currentIteration < 15) {
            prepareRotationAnimation();
            lastUpdateTime = currentTime;
        }
    }
}

function prepareRotationAnimation() {
    // Crear una copia de la figura actual
    rotatingCopy = JSON.parse(JSON.stringify(dragonPoints));
    
    // El punto de pivote es el último punto de la figura original
    pivotPoint = { 
        x: dragonPoints[dragonPoints.length - 1].x, 
        y: dragonPoints[dragonPoints.length - 1].y 
    };
    
    // Dirección de rotación alterna para el algoritmo del dragón
    rotationDirection = (currentIteration % 2 === 0) ? -1 : 1;
    
    // Iniciar animación
    isAnimating = true;
    animationProgress = 0;
    
    console.log(`Preparando iteración ${currentIteration + 1}, dirección: ${rotationDirection > 0 ? 'derecha' : 'izquierda'}`);
}

function updateRotationAnimation() {
    if (!isAnimating) return;
    
    animationProgress += animationSpeed;
    
    if (animationProgress >= 1) {
        // Animación completada - unir las figuras
        completeIteration();
        animationProgress = 1;
        isAnimating = false;
    }
}

function completeIteration() {
    // Rotar la copia 90° (posición final)
    let rotatedCopy = rotatePoints(rotatingCopy, pivotPoint, rotationDirection * PI / 2);
    
    // Para la curva del dragón, combinamos la figura original con la copia rotada
    let newPoints = [...dragonPoints];
    
    // Añadir todos los puntos de la copia rotada excepto el primero (que es el pivote)
    for (let i = 1; i < rotatedCopy.length; i++) {
        newPoints.push(rotatedCopy[i]);
    }
    
    dragonPoints = newPoints;
    currentIteration++;
    
    console.log(`Iteración ${currentIteration} completada. Puntos: ${dragonPoints.length}`);
}

function rotatePoints(points, pivot, angle) {
    let cosA = cos(angle);
    let sinA = sin(angle);
    let rotatedPoints = [];
    
    for (let point of points) {
        // Trasladar al sistema de coordenadas del pivote
        let x = point.x - pivot.x;
        let y = point.y - pivot.y;
        
        // Rotar
        let newX = x * cosA - y * sinA;
        let newY = x * sinA + y * cosA;
        
        // Trasladar de vuelta
        rotatedPoints.push({
            x: newX + pivot.x,
            y: newY + pivot.y
        });
    }
    
    return rotatedPoints;
}

function drawDragonCurve() {
    // Dibujar la figura base (siempre visible)
    drawFigure(dragonPoints, isColorMode ? colorHue : 200, 3, 90);
    
    // Dibujar la copia en rotación durante la animación
    if (isAnimating) {
        let currentRotation = animationProgress * (PI / 2) * rotationDirection;
        let currentRotatedCopy = rotatePoints(rotatingCopy, pivotPoint, currentRotation);
        
        // Dibujar la copia rotada con color diferente para destacarla
        let animationHue = (colorHue + 120) % 360;
        drawFigure(currentRotatedCopy, isColorMode ? animationHue : 150, 2, 70);
        
        // Dibujar el punto de pivote
        drawPivotPoint();
        
        // Dibujar línea guía desde el pivote hasta el primer punto de la copia
        if (currentRotatedCopy.length > 0) {
            stroke(255, 200, 0, 100);
            strokeWeight(1);
            line(pivotPoint.x, pivotPoint.y, currentRotatedCopy[0].x, currentRotatedCopy[0].y);
        }
    }
}

function drawFigure(points, hue, weight, alpha) {
    if (points.length < 2) return;
    
    // Configurar estilo
    if (isColorMode) {
        let saturation = map(audioLevel, audioThreshold, 0.3, 60, 100, true);
        let brightness = map(audioLevel, audioThreshold, 0.3, 80, 100, true);
        stroke(hue, saturation, brightness, alpha);
    } else {
        stroke(hue, alpha);
    }
    strokeWeight(weight);
    noFill();
    
    // Dibujar la figura
    beginShape();
    for (let point of points) {
        vertex(point.x, point.y);
    }
    endShape();
    
    // Dibujar puntos en los vértices (solo para las primeras iteraciones)
    if (points.length < 50 && zoomLevel > 0.5) {
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let pointAlpha = map(i, 0, points.length - 1, 30, 80);
            fill(isColorMode ? hue : 255, 100, 100, pointAlpha);
            noStroke();
            ellipse(point.x, point.y, 5);
        }
    }
}

function drawPivotPoint() {
    // Dibujar el punto de pivote destacado
    fill(255, 255, 0, 150);
    noStroke();
    ellipse(pivotPoint.x, pivotPoint.y, 15);
    
    // Dibujar un círculo alrededor del pivote
    noFill();
    stroke(255, 255, 0, 100);
    strokeWeight(2);
    ellipse(pivotPoint.x, pivotPoint.y, 25);
}

function drawAudioGraph() {
    let graphX = width * 0.85;
    let graphY = height * 0.1;
    let graphWidth = 30;
    let graphHeight = height * 0.8;
    
    fill(30);
    stroke(100);
    strokeWeight(1);
    rect(graphX, graphY, graphWidth, graphHeight);
    
    let audioHeight = map(audioLevel, 0, 0.5, 0, graphHeight, true);
    if (isAudioActive) {
        fill(colorHue, 100, 100, 80);
    } else {
        fill(200, 80);
    }
    noStroke();
    rect(graphX, graphY + graphHeight - audioHeight, graphWidth, audioHeight);
    
    let thresholdY = graphY + graphHeight - map(audioThreshold, 0, 0.5, 0, graphHeight);
    stroke(255, 0, 0);
    strokeWeight(2);
    line(graphX, thresholdY, graphX + graphWidth, thresholdY);
    
    fill(255);
    noStroke();
    textSize(12);
    text("Umbral", graphX + graphWidth + 5, thresholdY + 5);
}

function drawInfo() {
    fill(255);
    noStroke();
    textSize(14);
    
    text(`Iteración: ${currentIteration}`, 20, 30);
    text(`Zoom: ${zoomLevel.toFixed(2)}x`, 20, 50);
    text(`Nivel de audio: ${(audioLevel * 100).toFixed(1)}%`, 20, 70);
    text(`Umbral: ${(audioThreshold * 100).toFixed(1)}%`, 20, 90);
    
    let state = isGenerating ? 
               (isAnimating ? "ROTANDO COPIA" : "LISTO PARA DUPLICAR") : 
               "ESPERANDO AUDIO";
    text(`Estado: ${state}`, 20, 110);
    
    text(`Modo: ${isColorMode ? "COLOR" : "GRIS"}`, 20, 130);
    
    if (isAnimating) {
        text(`Rotación: ${floor(animationProgress * 100)}%`, 20, 150);
        text(`Dirección: ${rotationDirection > 0 ? "↻ 90°" : "↺ 90°"}`, 20, 170);
    }
    
    text(`Puntos: ${dragonPoints.length}`, 20, 190);
    
    // Instrucciones
    textSize(12);
    text("Haz sonido para ALEJARTE (zoom out) y generar fractal", 20, height - 50);
    text("Silencio = ACERCARTE (zoom in) automáticamente", 20, height - 30);
    text("Haz clic en el canvas para reiniciar", 20, height - 10);
}

function mousePressed() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        initializeDragon();
    }
}