let mic;
let amplitude;
let audioLevel = 0;
let isAudioActive = false;
let audioThreshold = 0.02;
let lastAudioTime = 0;
let audioTimeout = 800;

// Parámetros del Triángulo de Sierpinski
let sierpinskiLevels = 5;
let maxLevels = 15;
let baseTriangleSize = 500;
let currentDepth = 0;
let targetDepth = 0;

// Sistema de cámara - ZOOM MÁS RÁPIDO
let cameraZoom = 1;
let targetZoom = 1;
let zoomSpeed = 0.3; // Aumentado significativamente
let cameraOffset = { x: 0, y: 0 };
let targetOffset = { x: 0, y: 0 };
let panSpeed = 0.2; // Aumentado para seguir el zoom rápido

// Control de generación - MÁS LENTO
let lastDepthIncrease = 0;
let depthIncreaseInterval = 1500; // Aumentado a 1.5 segundos entre niveles
let isIncreasingDepth = false;

// Colores
let colorHue = 0;
let isColorMode = false;

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
}

function draw() {
  background(0);
  
  // Actualizar análisis de audio
  updateAudioAnalysis();
  
  // Actualizar estado de navegación basado en audio
  updateNavigationState();
  
  // Controlar aumento de profundidad (MÁS LENTO)
  controlDepthIncrease();
  
  // Actualizar parámetros según el audio
  updateParametersFromAudio();
  
  // Actualizar sistema de cámara (ZOOM RÁPIDO)
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

function updateNavigationState() {
  let currentTime = millis();
  let timeSinceLastAudio = currentTime - lastAudioTime;
  
  if (isAudioActive) {
    // Con audio, nos preparamos para aumentar profundidad (pero lo controlamos separadamente)
    isIncreasingDepth = true;
    
    // Calcular el punto central del triángulo superior para navegar hacia él
    let triangleHeight = baseTriangleSize * sqrt(3) / 2;
    targetOffset = { x: 0, y: -triangleHeight / 3 };
    
    // ZOOM MUCHO MÁS RÁPIDO - Aumentado exponencialmente
    let zoomIntensity = map(audioLevel, audioThreshold, 0.3, 0.8, 2.5, true);
    targetZoom = min(20.0, cameraZoom + zoomIntensity); // Límite aumentado a 20x
    
    isColorMode = true;
    colorHue = (colorHue + 5) % 360; // Rotación de color más rápida
  } else if (timeSinceLastAudio > audioTimeout) {
    // Sin audio, retrocedemos
    isIncreasingDepth = false;
    targetDepth = max(0, currentDepth - 0.005); // Retroceso muy lento
    
    // Volver al centro
    targetOffset = { x: 0, y: 0 };
    
    // Zoom para alejarse - más rápido también
    targetZoom = max(1.0, cameraZoom - 0.3);
    
    if (!isAudioActive) {
      isColorMode = false;
    }
  }
}

function controlDepthIncrease() {
  let currentTime = millis();
  
  // SOLO aumentar profundidad si ha pasado el intervalo y hay audio activo
  if (isIncreasingDepth && currentTime - lastDepthIncrease > depthIncreaseInterval) {
    if (targetDepth < maxLevels) {
      targetDepth += 1; // Aumentar un nivel completo
      lastDepthIncrease = currentTime;
      console.log(`Aumentando profundidad a: ${targetDepth}`);
    }
  }
}

function updateParametersFromAudio() {
  if (isAudioActive) {
    let speedFactor = map(audioLevel, audioThreshold, 0.3, 1, 4, true);
    zoomSpeed = 0.4 * speedFactor; // Velocidad de zoom muy alta
    panSpeed = 0.3 * speedFactor; // Velocidad de pan alta
  } else {
    zoomSpeed = 0.2; // Retroceso rápido también
    panSpeed = 0.1;
  }
}

function updateCamera() {
  // Suavizar transiciones de zoom y posición - pero más rápido
  cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
  cameraOffset.x = lerp(cameraOffset.x, targetOffset.x, panSpeed);
  cameraOffset.y = lerp(cameraOffset.y, targetOffset.y, panSpeed);
  
  // Actualizar profundidad actual - transición suave pero visible
  currentDepth = lerp(currentDepth, targetDepth, 0.05); // Más lento para notar la transición
}

function applyCameraTransform() {
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(cameraOffset.x, cameraOffset.y);
  
  // Pequeña rotación sutil cuando el zoom es alto
  if (cameraZoom > 3) {
    rotate(sin(millis() * 0.001) * 0.1);
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
    if (point.x >= -100 && point.x <= width + 100 && point.y >= -100 && point.y <= height + 100) {
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
    hue = (colorHue + depth * 40) % 360;
    saturation = map(audioLevel, audioThreshold, 0.3, 70, 100, true);
    brightness = map(depth, 0, maxLevels, 60, 95);
  } else {
    hue = 200;
    saturation = 0;
    brightness = map(depth, 0, maxLevels, 40, 85);
  }
  
  let alpha = map(depth, 0, maxLevels, 100, 30);
  
  // Dibujar triángulo relleno
  fill(hue, saturation, brightness, alpha);
  noStroke();
  
  beginShape();
  vertex(x1, y1);
  vertex(x2, y2);
  vertex(x3, y3);
  endShape(CLOSE);
  
  // Dibujar bordes en niveles más bajos o cuando el zoom es alto
  if (depth <= 4 || cameraZoom > 8) {
    stroke(0, 0, 100, 20);
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
  text(`Zoom: ${cameraZoom.toFixed(1)}x`, 20, 50);
  text(`Nivel de audio: ${(audioLevel * 100).toFixed(1)}%`, 20, 70);
  text(`Umbral: ${(audioThreshold * 100).toFixed(1)}%`, 20, 90);
  
  let state = isAudioActive ? 
             (isIncreasingDepth ? "ADENTRÁNDOSE ⚡" : "ESPERANDO SIG. NIVEL") : 
             "RETROCEDIENDO";
  text(`Estado: ${state}`, 20, 110);
  
  text(`Modo: ${isColorMode ? "COLOR 🌈" : "GRIS"}`, 20, 130);
  
  // Mostrar tiempo hasta siguiente nivel
  if (isAudioActive && isIncreasingDepth && targetDepth < maxLevels) {
    let timeLeft = depthIncreaseInterval - (millis() - lastDepthIncrease);
    let secondsLeft = ceil(timeLeft / 1000);
    text(`Siguiente nivel en: ${secondsLeft}s`, 20, 150);
  }
  
  // Instrucciones
  textSize(12);
  text("⚡ HAZ SONIDO PARA ACERCARTE RÁPIDAMENTE", 20, height - 70);
  text("🐌 LA GENERACIÓN DE TRIÁNGULOS ES LENTA", 20, height - 50);
  text("Silencio = RETROCEDER automáticamente", 20, height - 30);
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
    lastDepthIncrease = millis();
    console.log("Reiniciado");
  }
}