// js/color.js
// Funciones puras para manejo de color

/**
 * Convierte valores RGB a string HEX.
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Color en formato #RRGGBB
 */
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

/**
 * Calcula el brillo percibido de un color RGB.
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Brillo (0-255)
 */
function getBrightness(r, g, b) {
    // Fórmula de luminosidad para la percepción humana
    return (r * 0.299 + g * 0.587 + b * 0.114);
}

/**
 * Clasifica un color como claro u oscuro basado en el brillo.
 * @param {number} brightness - Valor de brillo (0-255)
 * @returns {string} 'Claro' o 'Oscuro'
 */
function classifyTone(brightness) {
    return brightness > 140 ? "Claro" : "Oscuro";
}

/**
 * Obtiene el color promedio de una región rectangular en un canvas.
 * Se toma una muestra del 70% central para evitar bordes.
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {number} x - Coordenada X del rectángulo
 * @param {number} y - Coordenada Y del rectángulo
 * @param {number} w - Ancho del rectángulo
 * @param {number} h - Alto del rectángulo
 * @returns {object} Objeto con r, g, b, hex, brightness, tone
 */
function getAverageColorFromRegion(ctx, x, y, w, h) {
    // Tomamos un área interior para evitar bordes oscuros o contornos
    const marginX = w * 0.15;
    const marginY = h * 0.15;
    const sampleX = Math.floor(x + marginX);
    const sampleY = Math.floor(y + marginY);
    const sampleW = Math.floor(w - (marginX * 2));
    const sampleH = Math.floor(h - (marginY * 2));
    
    if (sampleW <= 0 || sampleH <= 0) {
        // Si el rectángulo es muy pequeño, tomamos el centro
        const centerX = Math.floor(x + w/2);
        const centerY = Math.floor(y + h/2);
        const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
        return {
            r: pixel[0], g: pixel[1], b: pixel[2],
            hex: rgbToHex(pixel[0], pixel[1], pixel[2]),
            brightness: getBrightness(pixel[0], pixel[1], pixel[2]),
            tone: classifyTone(getBrightness(pixel[0], pixel[1], pixel[2]))
        };
    }
    
    // Obtener datos de la imagen en la región de muestra
    const imageData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
    const data = imageData.data;
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = sampleW * sampleH;
    
    for (let i = 0; i < data.length; i += 4) {
        totalR += data[i];
        totalG += data[i+1];
        totalB += data[i+2];
    }
    
    const avgR = Math.round(totalR / pixelCount);
    const avgG = Math.round(totalG / pixelCount);
    const avgB = Math.round(totalB / pixelCount);
    const brightness = getBrightness(avgR, avgG, avgB);
    
    return {
        r: avgR, g: avgG, b: avgB,
        hex: rgbToHex(avgR, avgG, avgB),
        brightness: brightness,
        tone: classifyTone(brightness)
    };
}
