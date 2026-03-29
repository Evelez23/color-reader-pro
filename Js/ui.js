// js/ui.js
// Manejo de la interfaz de usuario y renderizado de resultados

let currentColorData = []; // Almacena los datos actuales { name, hex, tone }

/**
 * Renderiza la tabla con los datos de colores.
 * @param {Array} colorItems - Lista de objetos { name, hex, tone }
 */
function renderResultsTable(colorItems) {
    const tbody = document.getElementById('resultsBody');
    const container = document.getElementById('resultsContainer');
    const controls = document.getElementById('controls');
    
    if (!colorItems || colorItems.length === 0) {
        container.style.display = 'none';
        controls.style.display = 'none';
        return;
    }
    
    currentColorData = colorItems.map(item => ({ ...item })); // Copia para edición
    
    tbody.innerHTML = '';
    colorItems.forEach((item, index) => {
        const row = tbody.insertRow();
        
        // Columna de color (preview)
        const cellColor = row.insertCell(0);
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-preview';
        colorDiv.style.backgroundColor = item.hex;
        colorDiv.title = `HEX: ${item.hex}`;
        cellColor.appendChild(colorDiv);
        
        // Columna de nombre (editable)
        const cellName = row.insertCell(1);
        const inputName = document.createElement('input');
        inputName.type = 'text';
        inputName.value = item.name;
        inputName.className = 'edit-name';
        inputName.addEventListener('change', (e) => {
            currentColorData[index].name = e.target.value;
        });
        cellName.appendChild(inputName);
        
        // Columna HEX (con copia)
        const cellHex = row.insertCell(2);
        const hexSpan = document.createElement('span');
        hexSpan.textContent = item.hex;
        hexSpan.className = 'hex-code';
        hexSpan.title = 'Click para copiar HEX';
        hexSpan.style.cursor = 'pointer';
        hexSpan.addEventListener('click', () => {
            navigator.clipboard.writeText(item.hex);
            showStatusMessage(`✅ HEX ${item.hex} copiado al portapapeles`, 'success');
        });
        cellHex.appendChild(hexSpan);
        
        // Columna de tono
        const cellTone = row.insertCell(3);
        const toneSpan = document.createElement('span');
        toneSpan.textContent = item.tone;
        toneSpan.className = `tone-badge tone-${item.tone.toLowerCase()}`;
        cellTone.appendChild(toneSpan);
    });
    
    container.style.display = 'block';
    controls.style.display = 'flex';
}

/**
 * Muestra un mensaje temporal en la barra de estado.
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'info', 'success', 'error'
 */
function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.style.backgroundColor = type === 'success' ? '#d4edda' : (type === 'error' ? '#f8d7da' : '#e2e3e5');
    statusDiv.style.color = type === 'success' ? '#155724' : (type === 'error' ? '#721c24' : '#383d41');
    setTimeout(() => {
        if (statusDiv.textContent === message) {
            statusDiv.style.backgroundColor = '#e2e3e5';
            statusDiv.style.color = '#383d41';
            statusDiv.textContent = '✅ Listo. Puedes editar los nombres y exportar.';
        }
    }, 3000);
}

/**
 * Exporta los datos actuales a JSON y los descarga.
 */
function exportToJSON() {
    const dataToExport = currentColorData.map(item => ({
        name: item.name,
        hex: item.hex,
        tone: item.tone
    }));
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colores_${new Date().toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatusMessage('📁 JSON exportado correctamente', 'success');
}

/**
 * Exporta los datos actuales a CSV y los descarga.
 */
function exportToCSV() {
    const headers = ['Nombre', 'HEX', 'Tono'];
    const rows = currentColorData.map(item => [
        `"${item.name.replace(/"/g, '""')}"`,
        item.hex,
        item.tone
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para UTF-8
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `colores_${new Date().toISOString().slice(0,19)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatusMessage('📊 CSV exportado correctamente', 'success');
}

/**
 * Copia los datos actuales en formato JSON al portapapeles.
 */
async function copyJSONToClipboard() {
    const dataToCopy = currentColorData.map(item => ({
        name: item.name,
        hex: item.hex,
        tone: item.tone
    }));
    const jsonString = JSON.stringify(dataToCopy, null, 2);
    try {
        await navigator.clipboard.writeText(jsonString);
        showStatusMessage('📋 JSON copiado al portapapeles', 'success');
    } catch (err) {
        showStatusMessage('❌ Error al copiar: ' + err, 'error');
    }
}
