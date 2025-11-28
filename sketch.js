let mic;
let amplitude;
let audioLevel = 0;
let isAudioActive = false;
let audioThreshold = 0.02;

// Parámetros del Triángulo de Sierpinski
let maxLevels = 20;
let baseTriangleSize = 500;
let currentDepth = 0;
let targetDepth = 0;

// Sistema de cámara - ZOOM MÁS LENTO Y CONTINUO
let cameraZoom = 1;
let targetZoom = 1;
let zoomSpeed = 0.02; // Reducido significativamente
let cameraOffset = { x: 0, y: 0 };
let targetOffset = { x: 0, y: 0 };
let panSpeed = 0.05;

// Control de generación progresiva
let lastDepthIncrease = 0;
let depthIncreaseInterval = 800; // Intervalo entre niveles
let zoomThresholdForNextLevel = 1.5; // Zoom necesario para generar siguiente nivel
let nextLevelZoomThreshold = 1.5;

// Colores
let colorHue = 0;
let isColorMode = false;

// Historial de zoom para suavizar transiciones
let zoomHistory = [];
const zoomHistorySize = 10;

function setup() {
  createCanvas(1000, 600);
  colorMode(HSB, 360, 100, 100, 100);
  
  // Configurar audio
  try {
    mic = new p5.AudioIn();
    mic.start();
    
    amplitude = new p5.Amplitude();
    amplitude.setInput(mic);
    amplitude.smooth(0.7);
  } catch (e) {
    console.log("Error configurando audio:", e);
  }
  
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
  
  // Inicializar historial de zoom
  for (let i = 0; i < zoomHistorySize; i++) {
    zoomHistory.push(1);
  }
}

function draw() {
  background(0);
  
  // Actualizar análisis de audio
  updateAudioAnalysis();
  
  // Actualizar estado de navegación basado en audio
  updateNavigationState();
  
  // Controlar aumento de profundidad basado en zoom
  controlDepthByZoom();
  
  // Actualizar parámetros según el audio
  updateParametersFromAudio();
  
  // Actualizar sistema de cámara
  updateCamera();
  
  // Aplicar transformaciones de cámara
  applyCameraTransform();
  
  // Dibujar Triángulo de Sierpinski
  drawSierpinski();
  
  // Restaurar transformaciones
  resetMatrix();
  
  // Dibujar información
  drawInfo();
}

function updateAudioAnalysis() {
  if (amplitude) {
    try {
      audioLevel = amplitude.getLevel();
      isAudioActive = audioLevel > audioThreshold;
    } catch (e) {
      console.log("Error en análisis de audio:", e);
      audioLevel = 0;
      isAudioActive = false;
    }
  }
}

function updateNavigationState() {
  if (isAudioActive) {
    // Con audio, aumentamos el zoom continuamente
    let zoomIntensity = map(audioLevel, audioThreshold, 0.3, 0.005, 0.03, true);
    targetZoom += zoomIntensity; // Sin límite superior
    
    // Calcular el punto central del triángulo superior para navegar hacia él
    let triangleHeight = baseTriangleSize * sqrt(3) / 2;
    targetOffset = { x: 0, y: -triangleHeight / 3 };
    
    isColorMode = true;
    colorHue = (colorHue + 2) % 360;
  } else {
    // Sin audio, mantenemos el zoom actual (no retrocedemos)
    // targetZoom se mantiene igual
    isColorMode = false;
  }
}

function controlDepthByZoom() {
  let currentTime = millis();
  
  // Calcular zoom promedio suavizado
  zoomHistory.push(cameraZoom);
  if (zoomHistory.length > zoomHistorySize) {
    zoomHistory.shift();
  }
  let smoothedZoom = zoomHistory.reduce((a, b) => a + b, 0) / zoomHistory.length;
  
  // Aumentar profundidad cuando alcanzamos el umbral de zoom
  if (smoothedZoom >= nextLevelZoomThreshold && currentDepth < maxLevels) {
    if (currentTime - lastDepthIncrease > depthIncreaseInterval) {
      targetDepth += 1;
      nextLevelZoomThreshold = smoothedZoom * 1.8; // Aumentar umbral para siguiente nivel
      lastDepthIncrease = currentTime;
      console.log(`Aumentando profundidad a: ${targetDepth}, próximo umbral: ${nextLevelZoomThreshold.toFixed(2)}`);
    }
  }
}

function updateParametersFromAudio() {
  if (isAudioActive) {
    let speedFactor = map(audioLevel, audioThreshold, 0.3, 1, 2, true);
    zoomSpeed = 0.03 * speedFactor; // Velocidad de zoom reducida
    panSpeed = 0.08 * speedFactor;
  } else {
    zoomSpeed = 0.01; // Muy lento cuando no hay audio
    panSpeed = 0.02;
  }
}

function updateCamera() {
  // Suavizar transiciones de zoom y posición
  cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
  cameraOffset.x = lerp(cameraOffset.x, targetOffset.x, panSpeed);
  cameraOffset.y = lerp(cameraOffset.y, targetOffset.y, panSpeed);
  
  // Actualizar profundidad actual - transición suave
  currentDepth = lerp(currentDepth, targetDepth, 0.03);
}

function applyCameraTransform() {
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(cameraOffset.x, cameraOffset.y);
  
  // Rotación sutil cuando el zoom es alto
  if (cameraZoom > 3) {
    rotate(sin(millis() * 0.0005) * 0.05);
  }
}

function drawSierpinski() {
  // Calcular el triángulo base centrado
  let x1 = 0;
  let y1 = -baseTriangleSize * sqrt(3) / 3;
  let x2 = -baseTriangleSize / 2;
  let y2 = baseTriangleSize * sqrt(3) / 6;
  let x3 = baseTriangleSize / 2;
  let y3 = baseTriangleSize * sqrt(3) / 6;
  
  // Dibujar el triángulo de Sierpinski con la profundidad actual
  drawSierpinskiTriangle(x1, y1, x2, y2, x3, y3, floor(currentDepth));
}

function drawSierpinskiTriangle(x1, y1, x2, y2, x3, y3, depth) {
  // Verificar si el triángulo está fuera de la pantalla
  if (isTriangleOffscreen(x1, y1, x2, y2, x3, y3)) {
    return;
  }
  
  if (depth === 0) {
    // Caso base: dibujar el triángulo
    drawTriangle(x1, y1, x2, y2, x3, y3, depth);
  } else {
    // Calcular puntos medios
    let mid12x = (x1 + x2) / 2;
    let mid12y = (y1 + y2) / 2;
    let mid23x = (x2 + x3) / 2;
    let mid23y = (y2 + y3) / 2;
    let mid31x = (x3 + x1) / 2;
    let mid31y = (y3 + y1) / 2;
    
    // Llamadas recursivas para los tres triángulos más pequeños
    drawSierpinskiTriangle(x1, y1, mid12x, mid12y, mid31x, mid31y, depth - 1);
    drawSierpinskiTriangle(mid12x, mid12y, x2, y2, mid23x, mid23y, depth - 1);
    drawSierpinskiTriangle(mid31x, mid31y, mid23x, mid23y, x3, y3, depth - 1);
  }
}

function isTriangleOffscreen(x1, y1, x2, y2, x3, y3) {
  // Transformar puntos a coordenadas de pantalla
  let screenPoints = [
    transformPoint(x1, y1),
    transformPoint(x2, y2),
    transformPoint(x3, y3)
  ];
  
  // Verificar si todos los puntos están fuera de la pantalla
  let allOffscreen = true;
  for (let point of screenPoints) {
    if (point.x >= -200 && point.x <= width + 200 && point.y >= -200 && point.y <= height + 200) {
      allOffscreen = false;
      break;
    }
  }
  
  return allOffscreen;
}

function transformPoint(x, y) {
  // Aplicar transformaciones de cámara a un punto
  let transformedX = (x + cameraOffset.x) * cameraZoom + width / 2;
  let transformedY = (y + cameraOffset.y) * cameraZoom + height / 2;
  return { x: transformedX, y: transformedY };
}

function drawTriangle(x1, y1, x2, y2, x3, y3, depth) {
  // Calcular color basado en profundidad y modo de color
  let hue, saturation, brightness;
  
  if (isColorMode) {
    hue = (colorHue + depth * 30) % 360;
    saturation = map(audioLevel, audioThreshold, 0.3, 70, 100, true);
    brightness = map(depth, 0, maxLevels, 70, 95);
  } else {
    hue = 200;
    saturation = 0;
    brightness = map(depth, 0, maxLevels, 50, 85);
  }
  
  let alpha = map(depth, 0, maxLevels, 100, 40);
  
  // Dibujar triángulo relleno
  fill(hue, saturation, brightness, alpha);
  noStroke();
  
  beginShape();
  vertex(x1, y1);
  vertex(x2, y2);
  vertex(x3, y3);
  endShape(CLOSE);
  
  // Dibujar bordes en niveles más bajos o cuando el zoom es alto
  if (depth <= 4 || cameraZoom > 5) {
    stroke(0, 0, 100, 30);
    strokeWeight(0.5);
    noFill();
    
    beginShape();
    vertex(x1, y1);
    vertex(x2, y2);
    vertex(x3, y3);
    endShape(CLOSE);
  }
}

function drawInfo() {
  fill(255);
  noStroke();
  textSize(14);
  
  text(`Profundidad: ${floor(currentDepth)}/${maxLevels}`, 20, 30);
  text(`Zoom: ${cameraZoom.toFixed(2)}x`, 20, 50);
  text(`Nivel de audio: ${(audioLevel * 100).toFixed(1)}%`, 20, 70);
  text(`Umbral: ${(audioThreshold * 100).toFixed(1)}%`, 20, 90);
  
  let state = isAudioActive ? "AVANZANDO 🎵" : "PAUSADO 🔇";
  text(`Estado: ${state}`, 20, 110);
  
  text(`Modo: ${isColorMode ? "COLOR 🌈" : "GRIS"}`, 20, 130);
  
  // Mostrar próximo umbral de zoom
  if (currentDepth < maxLevels) {
    text(`Siguiente nivel en zoom: ${nextLevelZoomThreshold.toFixed(2)}x`, 20, 150);
  }
  
  // Instrucciones
  textSize(12);
  text("🎵 HAZ SONIDO PARA AVANZAR CONTINUAMENTE", 20, height - 70);
  text("🌌 EL ZOOM ES LENTO Y PROGRESIVO", 20, height - 50);
  text("🔇 SILENCIO = PAUSA (NO RETROCEDE)", 20, height - 30);
  text("Haz clic en el canvas para reiniciar", 20, height - 10);
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    // Reiniciar parámetros
    currentDepth = 0;
    targetDepth = 0;
    cameraZoom = 1;
    targetZoom = 1;
    cameraOffset = { x: 0, y: 0 };
    targetOffset = { x: 0, y: 0 };
    colorHue = 0;
    nextLevelZoomThreshold = 1.5;
    lastDepthIncrease = millis();
    
    // Reiniciar historial de zoom
    zoomHistory = [];
    for (let i = 0; i < zoomHistorySize; i++) {
      zoomHistory.push(1);
    }
    
    console.log("Reiniciado");
  }
}