// Sistema de archivo de blog - Windows XP Style
// Sushiminis Personal Blog

// Toggle para expandir/colapsar años
function toggleYear(yearId) {
    const yearElement = document.getElementById(yearId);
    const icon = document.getElementById('icon-' + yearId);
    
    if (yearElement.style.display === 'none') {
        yearElement.style.display = 'block';
        icon.textContent = '▼';
    } else {
        yearElement.style.display = 'none';
        icon.textContent = '▶';
    }
}

// Filtrar entradas por año y mes
function filterByMonth(year, month) {
    const entries = document.querySelectorAll('.blog-entry:not(.permanent-entry)');
    const endGif = document.querySelector('.blog-end-gif');
    let visibleCount = 0;
    
    entries.forEach(entry => {
        const entryYear = parseInt(entry.getAttribute('data-year'));
        const entryMonth = parseInt(entry.getAttribute('data-month'));
        
        if (entryYear === year && entryMonth === month) {
            entry.style.display = 'block';
            visibleCount++;
        } else {
            entry.style.display = 'none';
        }
    });
    
    // Scroll suave al inicio del contenido
    document.getElementById('box2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Mostrar mensaje si no hay entradas
    if (visibleCount === 0) {
        showNoEntriesMessage();
    } else {
        removeNoEntriesMessage();
    }
    
    // Highlight del mes seleccionado
    highlightSelectedMonth(year, month);
}

// Mostrar todas las entradas
function showAllPosts() {
    const entries = document.querySelectorAll('.blog-entry:not(.permanent-entry)');
    
    entries.forEach(entry => {
        entry.style.display = 'block';
    });
    
    removeNoEntriesMessage();
    removeHighlight();
    
    // Scroll suave al inicio
    document.getElementById('box2').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Highlight del mes seleccionado
function highlightSelectedMonth(year, month) {
    // Remover highlights previos
    const allLinks = document.querySelectorAll('.month-link');
    allLinks.forEach(link => link.classList.remove('active'));
    
    // Agregar highlight al mes actual
    const monthLinks = document.querySelectorAll('.month-link');
    monthLinks.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick.includes(`${year}, ${month}`)) {
            link.classList.add('active');
        }
    });
}

// Remover highlight
function removeHighlight() {
    const allLinks = document.querySelectorAll('.month-link');
    allLinks.forEach(link => link.classList.remove('active'));
}

// Mostrar mensaje de "no hay entradas"
function showNoEntriesMessage() {
    removeNoEntriesMessage(); // Remover mensaje previo si existe
    
    const box2 = document.getElementById('box2');
    const welcomeEntry = document.querySelector('.permanent-entry');
    
    const message = document.createElement('div');
    message.className = 'no-entries-message';
    message.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #666;">
            <strong>No entries found for this month.</strong><br>
            <small>Try selecting another month or click "Show All"</small>
        </p>
    `;
    
    // Insertar después del welcome
    welcomeEntry.parentNode.insertBefore(message, welcomeEntry.nextSibling);
}

// Remover mensaje de "no hay entradas"
function removeNoEntriesMessage() {
    const message = document.querySelector('.no-entries-message');
    if (message) {
        message.remove();
    }
}

// Inicialización cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Blog archive system loaded - Sushiminis');
    
    // Contar entradas por mes para actualizar automáticamente
    updateEntryCounts();
});

// Actualizar contadores de entradas (opcional, para futuro uso)
function updateEntryCounts() {
    const entries = document.querySelectorAll('.blog-entry:not(.permanent-entry)');
    const counts = {};
    
    entries.forEach(entry => {
        const year = entry.getAttribute('data-year');
        const month = entry.getAttribute('data-month');
        const key = `${year}-${month}`;
        
        if (!counts[key]) {
            counts[key] = 0;
        }
        counts[key]++;
    });
    
    console.log('Entry counts:', counts);
}

