// js/app.js
// Aplicación principal: carga, procesamiento con OpenCV, OCR y ensamblaje

// Esperar a que OpenCV y Tesseract estén listos
let cvReady = false;
let tesseractReady = false;

// Elementos DOM
const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let currentImageData = null;

// Configuración de detección de rectángulos
const MIN_RECT_AREA = 800;      // Área mínima en píxeles cuadrados (aprox 30x30)
const MAX_RECT_AREA = 10000;    // Área máxima
const ASPECT_RATIO_TOLERANCE = 0.4; // Tolerancia para considerar cuadrado (ratio entre 0.6 y 1.4)

// Inicialización: esperar a que OpenCV cargue
function onOpenCvReady() {
    cvReady = true;
    showStatusMessage('✅ OpenCV listo. Ahora puedes subir una imagen.', 'info');
}

// Si OpenCV ya está cargado (por si el script se ejecuta después)
if (typeof cv !== 'undefined' && cv.Mat) {
    onOpenCvReady();
} else {
    // Esperar al evento global de OpenCV
    window.onOpenCvReady = onOpenCvReady;
}

// Función para mostrar estado mientras se procesa
function updateStatus(text) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = text;
    statusDiv.style.backgroundColor = '#e2e3e5';
    statusDiv.style.color = '#383d41';
}

/**
 * Detecta rectángulos (posibles chips de color) usando OpenCV.js.
 * @param {HTMLImageElement} img - Imagen cargada
 * @returns {Promise<Array>} Lista de rectángulos { x, y, w, h }
 */
function detectColorChips(img) {
    return new Promise((resolve, reject) => {
        if (!cvReady) {
            reject('OpenCV no está listo');
            return;
        }
        
        // Configurar canvas con la imagen
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Obtener imagen como Mat
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        let blurred = new cv.Mat();
        let edges = new cv.Mat();
        let hierarchy = new cv.Mat();
        let contours = new cv.MatVector();
        
        try {
            // Convertir a escala de grises
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            // Suavizado para reducir ruido
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
            // Detección de bordes Canny
            cv.Canny(blurred, edges, 50, 150);
            // Encontrar contornos
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            const rectangles = [];
            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                if (area > MIN_RECT_AREA && area < MAX_RECT_AREA) {
                    // Aproximar polígono
                    const peri = cv.arcLength(contour, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, 0.02 * peri, true);
                    
                    // Si tiene 4 vértices, es candidato
                    if (approx.rows === 4) {
                        const rect = cv.boundingRect(contour);
                        const aspect = rect.width / rect.height;
                        // Filtrar por proporción (cuadrados o rectángulos casi cuadrados)
                        if (aspect > (1 - ASPECT_RATIO_TOLERANCE) && aspect < (1 + ASPECT_RATIO_TOLERANCE)) {
                            rectangles.push({
                                x: rect.x,
                                y: rect.y,
                                w: rect.width,
                                h: rect.height
                            });
                        }
                    }
                    approx.delete();
                }
            }
            
            // Ordenar rectángulos por Y (fila) y luego por X (columna)
            rectangles.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 20) return a.x - b.x; // Misma fila
                return a.y - b.y;
            });
            
            resolve(rectangles);
        } catch (err) {
            reject(err);
        } finally {
            // Liberar memoria
            src.delete();
            gray.delete();
            blurred.delete();
            edges.delete();
            hierarchy.delete();
            contours.delete();
        }
    });
}

/**
 * Extrae texto de una región específica de la imagen usando Tesseract.js.
 * @param {HTMLImageElement} img - Imagen original
 * @param {Object} region - Región { x, y, w, h } donde buscar texto
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromRegion(img, region) {
    // Crear un canvas temporal para la región de texto
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const margin = 10;
    const textX = Math.max(0, region.x + region.w + margin);
    const textY = region.y;
    const textW = Math.min(img.width - textX, 400);
    const textH = region.h;
    
    if (textW <= 10 || textH <= 10) {
        return "Nombre no detectado";
    }
    
    tempCanvas.width = textW;
    tempCanvas.height = textH;
    tempCtx.drawImage(img, textX, textY, textW, textH, 0, 0, textW, textH);
    
    // Mejorar contraste para OCR
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.filter = 'contrast(1.2) brightness(1.1)';
    tempCtx.drawImage(tempCanvas, 0, 0);
    tempCtx.filter = 'none';
    
    try {
        const { data: { text } } = await Tesseract.recognize(tempCanvas, 'eng', {
            logger: m => console.log(m) // Opcional: ver progreso en consola
        });
        // Limpiar texto: eliminar saltos de línea y espacios extra
        let cleaned = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned === "") cleaned = "Nombre no detectado";
        return cleaned;
    } catch (err) {
        console.error('Error en OCR:', err);
        return "Error OCR";
    }
}

/**
 * Procesa la imagen subida: detecta rectángulos, extrae colores y texto.
 */
async function processImage(file) {
    if (!cvReady) {
        showStatusMessage('⏳ Esperando a que OpenCV termine de cargar...', 'info');
        return;
    }
    
    updateStatus('🖼️ Cargando imagen...');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    await new Promise((resolve) => {
        img.onload = resolve;
    });
    
    updateStatus('🔍 Detectando chips de color con OpenCV...');
    let rectangles;
    try {
        rectangles = await detectColorChips(img);
    } catch (err) {
        showStatusMessage(`❌ Error en detección: ${err}`, 'error');
        URL.revokeObjectURL(img.src);
        return;
    }
    
    if (rectangles.length === 0) {
        showStatusMessage('⚠️ No se detectaron chips de color. Intenta con una imagen más clara y con rectángulos definidos.', 'error');
        URL.revokeObjectURL(img.src);
        return;
    }
    
    updateStatus(`🎨 Extracción de colores y OCR para ${rectangles.length} chips...`);
    
    // Asegurar que el canvas tenga la imagen para getImageData
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const colorItems = [];
    
    // Procesar cada rectángulo
    for (let i = 0; i < rectangles.length; i++) {
        const rect = rectangles[i];
        // Extraer color promedio
        const color = getAverageColorFromRegion(ctx, rect.x, rect.y, rect.w, rect.h);
        
        // Extraer texto con OCR (zona derecha)
        const textRegion = {
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h
        };
        let name = `Chip ${i+1}`;
        try {
            name = await extractTextFromRegion(img, textRegion);
            // Limpiar nombres comunes erróneos
            name = name.replace(/[^a-zA-Z0-9\s\-]/g, '').substring(0, 50);
            if (name === "") name = `Chip ${i+1}`;
        } catch (ocrErr) {
            console.warn('OCR falló para chip', i, ocrErr);
        }
        
        colorItems.push({
            name: name,
            hex: color.hex,
            tone: color.tone
        });
        
        updateStatus(`📝 Procesando chip ${i+1}/${rectangles.length}...`);
        // Pequeña pausa para no saturar el OCR
        await new Promise(r => setTimeout(r, 200));
    }
    
    // Renderizar resultados en la UI
    renderResultsTable(colorItems);
    showStatusMessage(`✅ Procesamiento completado: ${colorItems.length} chips detectados. Revisa y edita los nombres si es necesario.`, 'success');
    URL.revokeObjectURL(img.src);
}

// Event Listeners
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp')) {
        processImage(file);
    } else {
        showStatusMessage('❌ Por favor selecciona una imagen válida (JPG, PNG, WEBP).', 'error');
    }
});

// Botones de exportación
document.getElementById('exportJsonBtn').addEventListener('click', () => {
    if (currentColorData.length > 0) exportToJSON();
    else showStatusMessage('No hay datos para exportar', 'error');
});
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (currentColorData.length > 0) exportToCSV();
    else showStatusMessage('No hay datos para exportar', 'error');
});
document.getElementById('copyJsonBtn').addEventListener('click', () => {
    if (currentColorData.length > 0) copyJSONToClipboard();
    else showStatusMessage('No hay datos para copiar', 'error');
});

// Mostrar mensaje inicial
showStatusMessage('🚀 Aplicación lista. Esperando imagen...');
