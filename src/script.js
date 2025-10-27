// Direct navigation without sound (sound will play on the destination page)
document.querySelectorAll('.xp-button').forEach(button => {
    button.addEventListener('click', (e) => {
        // No sound here, it will play in desktop.html

        // No need for delays anymore, just navigate directly
        if (!e.target.href.includes('javascript:void(0)')) {
            // No need to prevent default
        }
    });
});

// Simulate CRT scan line effect
function scanLines() {
    const scanLine = document.createElement('div');
    scanLine.style.position = 'fixed';
    scanLine.style.top = '0';
    scanLine.style.left = '0';
    scanLine.style.width = '100%';
    scanLine.style.height = '2px';
    scanLine.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    scanLine.style.zIndex = '9999';
    scanLine.style.pointerEvents = 'none';
    document.body.appendChild(scanLine);

    let position = 0;
    const interval = setInterval(() => {
        position += 2;
        if (position > window.innerHeight) {
            position = 0;
        }
        scanLine.style.top = `${position}px`;
    }, 10);
}

// Start scan effect
scanLines();
