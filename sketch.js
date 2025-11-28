let mic;
let amplitude;
let audioLevel = 0;
let isAudioActive = false;
let audioThreshold = 0.02;
let lastAudioTime = 0;
let audioTimeout = 1000;

// Parámetros del Triángulo de Sierpinski
let sierpinskiLevels = 5;
let maxLevels = 12;
let baseTriangleSize = 500;
let currentDepth = 0;
let targetDepth = 0;

// Sistema de cámara
let cameraZoom = 1;
let targetZoom = 1;
let zoomSpeed = 0.05;
let cameraOffset = { x: 0, y: 0 };
let targetOffset = { x: 0, y: 0 };
let panSpeed = 0.1;

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
    // Con audio, nos adentramos en el triángulo superior
    targetDepth = min(maxLevels, currentDepth + 1);
    
    // Calcular el punto central del triángulo superior para navegar hacia él
    let triangleHeight = baseTriangleSize * sqrt(3) / 2;
    targetOffset = { x: 0, y: -triangleHeight / 3 };
    
    // Zoom para acercarse (adentrarse)
    targetZoom = min(5.0, cameraZoom + 0.1);
    
    isColorMode = true;
    colorHue = (colorHue + 2) % 360;
  } else if (timeSinceLastAudio > audioTimeout) {
    // Sin audio, retrocedemos lentamente
    targetDepth = max(0, currentDepth - 0.01);
    
    // Volver al centro
    targetOffset = { x: 0, y: 0 };
    
    // Zoom para alejarse
    targetZoom = max(1.0, cameraZoom - 0.01);
    
    if (!isAudioActive) {
      isColorMode = false;
    }
  }
}

function updateParametersFromAudio() {
  if (isAudioActive) {
    let speedFactor = map(audioLevel, audioThreshold, 0.3, 1, 3, true);
    zoomSpeed = 0.08 * speedFactor;
    panSpeed = 0.15 * speedFactor;
  } else {
    zoomSpeed = 0.03;
    panSpeed = 0.05;
  }
}

function updateCamera() {
  // Suavizar transiciones de zoom y posición
  cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
  cameraOffset.x = lerp(cameraOffset.x, targetOffset.x, panSpeed);
  cameraOffset.y = lerp(cameraOffset.y, targetOffset.y, panSpeed);
  
  // Actualizar profundidad actual
  currentDepth = lerp(currentDepth, targetDepth, panSpeed);
}

function applyCameraTransform() {
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(cameraOffset.x, cameraOffset.y);
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
    if (point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height) {
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
    saturation = map(audioLevel, audioThreshold, 0.3, 60, 100, true);
    brightness = map(depth, 0, maxLevels, 70, 100);
  } else {
    hue = 200;
    saturation = 0;
    brightness = map(depth, 0, maxLevels, 50, 90);
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
  
  // Dibujar bordes en niveles más bajos
  if (depth <= 3) {
    stroke(0, 0, 100, 30);
    strokeWeight(1);
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
  
  let state = isAudioActive ? "ADENTRÁNDOSE" : "RETROCEDIENDO";
  text(`Estado: ${state}`, 20, 110);
  
  text(`Modo: ${isColorMode ? "COLOR" : "GRIS"}`, 20, 130);
  
  // Instrucciones
  textSize(12);
  text("Haz sonido para ADENTRARTE en el fractal", 20, height - 50);
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
  }
}