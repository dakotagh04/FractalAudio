let mic;
let amplitude;
let audioLevel = 0;
let isAudioActive = false;
let audioThreshold = 0.02;

let maxLevels = 15;
let baseTriangleSize = 500;
let currentDepth = 0;
let targetDepth = 0;

let cameraZoom = 1;
let targetZoom = 1;
let zoomSpeed = 1.9;
let cameraOffset = { x: 0, y: 0 };
let targetOffset = { x: 0, y: 0 };
let panSpeed = 0.08;

let colorHue = 0;
let isColorMode = false;

let zoomFactor = 0;
let maxZoomFactor = 8;

function setup() {
  createCanvas(1000, 600);
  colorMode(HSB, 360, 100, 100, 100);
  mic = new p5.AudioIn();
  mic.start();
  amplitude = new p5.Amplitude();
  amplitude.setInput(mic);
  amplitude.smooth(0.7);
}

function draw() {
  background(0);
  updateAudioAnalysis();
  updateNavigationState();
  updateCamera();
  applyCameraTransform();
  drawSierpinski();
  resetMatrix();
  drawInfo();
}

function updateAudioAnalysis() {
  audioLevel = amplitude.getLevel();
  isAudioActive = audioLevel > audioThreshold;
}

function updateNavigationState() {
  if (isAudioActive && zoomFactor < maxZoomFactor) {
    targetDepth = min(currentDepth + 0.8, maxLevels);
    let triangleHeight = baseTriangleSize * sqrt(3) / 2;
    targetOffset = { x: 0, y: -triangleHeight / 3 };
    zoomFactor = min(zoomFactor + 0.02, maxZoomFactor);
    targetZoom = pow(1.5, zoomFactor);
    isColorMode = true;
    colorHue = (colorHue + 2) % 360;
  }
}

function updateCamera() {
  cameraZoom = lerp(cameraZoom, targetZoom, zoomSpeed);
  cameraOffset.x = lerp(cameraOffset.x, targetOffset.x, panSpeed);
  cameraOffset.y = lerp(cameraOffset.y, targetOffset.y, panSpeed);
  currentDepth = lerp(currentDepth, targetDepth, 0.1);
}

function applyCameraTransform() {
  translate(width / 2, height / 2);
  scale(cameraZoom);
  translate(cameraOffset.x, cameraOffset.y);
}

function drawSierpinski() {
  let x1 = 0;
  let y1 = -baseTriangleSize * sqrt(3) / 3;
  let x2 = -baseTriangleSize / 2;
  let y2 = baseTriangleSize * sqrt(3) / 6;
  let x3 = baseTriangleSize / 2;
  let y3 = baseTriangleSize * sqrt(3) / 6;
  drawSierpinskiTriangle(x1, y1, x2, y2, x3, y3, floor(currentDepth));
}

function drawSierpinskiTriangle(x1, y1, x2, y2, x3, y3, depth) {
  if (isTriangleOffscreen(x1, y1, x2, y2, x3, y3)) return;
  if (depth === 0) {
    drawTriangle(x1, y1, x2, y2, x3, y3, depth);
    return;
  }
  let mid12x = (x1 + x2) / 2;
  let mid12y = (y1 + y2) / 2;
  let mid23x = (x2 + x3) / 2;
  let mid23y = (y2 + y3) / 2;
  let mid31x = (x3 + x1) / 2;
  let mid31y = (y3 + y1) / 2;
  drawSierpinskiTriangle(x1, y1, mid12x, mid12y, mid31x, mid31y, depth - 1);
  drawSierpinskiTriangle(mid12x, mid12y, x2, y2, mid23x, mid23y, depth - 1);
  drawSierpinskiTriangle(mid31x, mid31y, mid23x, mid23y, x3, y3, depth - 1);
}

function isTriangleOffscreen(x1, y1, x2, y2, x3, y3) {
  let pts = [
    transformPoint(x1, y1),
    transformPoint(x2, y2),
    transformPoint(x3, y3)
  ];
  let minX = min(pts[0].x, pts[1].x, pts[2].x);
  let maxX = max(pts[0].x, pts[1].x, pts[2].x);
  let minY = min(pts[0].y, pts[1].y, pts[2].y);
  let maxY = max(pts[0].y, pts[1].y, pts[2].y);
  return maxX < 0 || minX > width || maxY < 0 || minY > height;
}

function transformPoint(x, y) {
  return {
    x: (x + cameraOffset.x) * cameraZoom + width / 2,
    y: (y + cameraOffset.y) * cameraZoom + height / 2
  };
}

function drawTriangle(x1, y1, x2, y2, x3, y3, depth) {
  let hue, sat, bright;
  if (isColorMode) {
    hue = (colorHue + depth * 20) % 360;
    sat = 100;
    bright = 100;
  } else {
    hue = 200;
    sat = 0;
    bright = 80;
  }
  fill(hue, sat, bright, 80);
  noStroke();
  beginShape();
  vertex(x1, y1);
  vertex(x2, y2);
  vertex(x3, y3);
  endShape(CLOSE);
}

function drawInfo() {
  fill(255);
  textSize(14);
  text(`Profundidad: ${floor(currentDepth)}/${maxLevels}`, 20, 30);
  text(`Zoom: ${cameraZoom.toFixed(2)}x`, 20, 50);
  text(`Nivel de audio: ${(audioLevel * 100).toFixed(1)}%`, 20, 70);
  text(`Modo: ${isColorMode ? "COLOR" : "GRIS"}`, 20, 90);
  text(`Factor zoom: ${zoomFactor.toFixed(2)}/${maxZoomFactor}`, 20, 110);
  textSize(12);
  text("Haz sonido para ADENTRARTE en el fractal", 20, height - 40);
  text("Haz clic en el canvas para reiniciar", 20, height - 20);
}

function mousePressed() {
  currentDepth = 0;
  targetDepth = 0;
  cameraZoom = 1;
  targetZoom = 1;
  cameraOffset = { x: 0, y: 0 };
  targetOffset = { x: 0, y: 0 };
  colorHue = 0;
  zoomFactor = 0;
}