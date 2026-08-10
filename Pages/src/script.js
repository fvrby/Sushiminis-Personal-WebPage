// Initialize
        document.addEventListener('DOMContentLoaded', function() {
            // Play Windows XP startup sound immediately when page loads
            const startupSound = new Audio('https://www.myinstants.com/media/sounds/windows-xp-startup.mp3');
            startupSound.volume = 0.3;
            startupSound.play();
            
            // Check device type from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const viewParam = urlParams.get('view');
            
            if (viewParam === 'mobile') {
                document.body.classList.add('mobile-view');
                // Adjust some settings for mobile
                document.querySelectorAll('.window').forEach(window => {
                    window.style.width = '95%';
                    window.style.maxWidth = '400px';
                });
                
                // Improved touch handling for mobile devices
                document.body.classList.add('touch-device');
            }
            
            // Detect if it's a touch device
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                document.body.classList.add('touch-device');
            }
            
            // Set up the clock
            updateClock();
            setInterval(updateClock, 1000);
            
            // Window Management
            setupWindows();
            
            // Add scan line effect
            scanLines();
        });
        
        // Update the taskbar clock
        function updateClock() {
            const now = new Date();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // hour '0' should be '12'
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const timeString = hours + ':' + minutes + ' ' + ampm;
            document.getElementById('current-time').textContent = timeString;
        }
        
        // Window Management
        function setupWindows() {
            // Desktop icons open windows
            document.querySelectorAll('.desktop-icon').forEach(icon => {
                icon.addEventListener('click', function() {
                    const windowId = this.getAttribute('data-window');
                    openWindow(windowId + '-window');
                });
                
                // Double click effect with single click (for mobile)
                icon.addEventListener('click', function(e) {
                    // Highlight effect
                    this.querySelector('span').style.backgroundColor = 'rgba(49, 106, 197, 0.9)';
                    setTimeout(() => {
                        this.querySelector('span').style.backgroundColor = '';
                    }, 200);
                    
                    // Play click sound
                    const audio = new Audio('https://www.myinstants.com/media/sounds/windows-xp-error.mp3');
                    audio.volume = 0.2;
                    audio.play();
                });
            });
            
            // Prevent event propagation from control buttons
            document.querySelectorAll('.window-button').forEach(button => {
                button.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                });
                button.addEventListener('touchstart', function(e) {
                    e.stopPropagation();
                }, { passive: false });
            });
            
            // Make windows draggable
            document.querySelectorAll('.window').forEach(makeWindowDraggable);
            
            // Window controls
            document.querySelectorAll('.window-close').forEach(button => {
                // Add handlers for click and touch
                const closeWindow = function() {
                    const window = this.closest('.window');
                    window.style.display = 'none';
                    pauseWindowMedia(window);

                    // Play close sound
                    const audio = new Audio('https://www.myinstants.com/media/sounds/error.mp3');
                    audio.volume = 0.2;
                    audio.play();
                };
                
                button.addEventListener('click', closeWindow);
                button.addEventListener('touchend', function(e) {
                    e.preventDefault(); // Prevent default behavior
                    closeWindow.call(this);
                });
            });
            
            document.querySelectorAll('.window-maximize').forEach(button => {
                const maximizeWindow = function() {
                    const window = this.closest('.window');
                    if (window.style.width === '100%' && window.style.height === 'calc(100vh - 40px)') {
                        // Restore to previous size
                        window.style.width = window.getAttribute('data-prev-width') || '600px';
                        window.style.height = window.getAttribute('data-prev-height') || '400px';
                        window.style.top = window.getAttribute('data-prev-top') || '50px';
                        window.style.left = window.getAttribute('data-prev-left') || '50px';
                    } else {
                        // Save current size
                        window.setAttribute('data-prev-width', window.style.width);
                        window.setAttribute('data-prev-height', window.style.height);
                        window.setAttribute('data-prev-top', window.style.top);
                        window.setAttribute('data-prev-left', window.style.left);
                        
                        // Maximize
                        window.style.width = '100%';
                        window.style.height = 'calc(100vh - 40px)';
                        window.style.top = '0';
                        window.style.left = '0';
                    }
                    
                    // Play sound
                    const audio = new Audio('https://www.myinstants.com/media/sounds/windows-xp-ding.mp3');
                    audio.volume = 0.2;
                    audio.play();
                };
                
                button.addEventListener('click', maximizeWindow);
                button.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    maximizeWindow.call(this);
                });
            });
            
            document.querySelectorAll('.window-minimize').forEach(button => {
                const minimizeWindow = function() {
                    const window = this.closest('.window');
                    window.style.display = 'none';
                    pauseWindowMedia(window);

                    // Play minimize sound
                    const audio = new Audio('https://www.myinstants.com/media/sounds/windows-xp-ding.mp3');
                    audio.volume = 0.2;
                    audio.play();
                };
                
                button.addEventListener('click', minimizeWindow);
                button.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    minimizeWindow.call(this);
                });
            });
            
            // Start button
            document.querySelector('.start-button').addEventListener('click', function() {
                // Play sound
                const audio = new Audio('https://www.myinstants.com/media/sounds/windows-xp-startup.mp3');
                audio.volume = 0.2;
                audio.play();
                
                // Open a random window for now
                const windows = ['about-window', 'home-window', 'cheto-window', 'contact-window', 'browser-window'];
                const randomWindow = windows[Math.floor(Math.random() * windows.length)];
                openWindow(randomWindow);
            });
        }
        
        // Pausa la musica de una ventana (ej. Media Player) al cerrarla o minimizarla
        function pauseWindowMedia(win) {
            const frame = win.querySelector('iframe');
            if (!frame || !frame.contentWindow) return;
            try {
                frame.contentWindow.postMessage({ wmp: 'pause' }, '*');
            } catch (e) { /* iframe externo, se ignora */ }
        }

        function openWindow(windowId) {
            const window = document.getElementById(windowId);
            
            // Hide all windows
            document.querySelectorAll('.window').forEach(w => {
                w.style.zIndex = 10;
            });
            
            // Position window if not already positioned
            if (!window.style.top) {
                const offset = document.querySelectorAll('.window[style*="display: block"]').length * 20;
                
                // Get the current window width from its computed style
                const computedStyle = getComputedStyle(window);
                const windowWidth = parseInt(computedStyle.width, 10);
                
                // Center the window horizontally with a small offset
                const leftPosition = Math.max(20, (document.body.clientWidth - windowWidth) / 2 + offset);
                
                window.style.top = (50 + offset) + 'px';
                window.style.left = leftPosition + 'px';
            }
            
            // Show and bring to front
            window.style.display = 'block';
            window.style.zIndex = 20;
            
            // Play open sound
            const audio = new Audio('https://www.myinstants.com/media/sounds/windows-xp-ding.mp3');
            audio.volume = 0.2;
            audio.play();
        }
        
        function makeWindowDraggable(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            
            element.querySelector('.window-header').addEventListener('mousedown', dragMouseDown);
            element.querySelector('.window-header').addEventListener('touchstart', dragMouseDown, { passive: false });
            
            function dragMouseDown(e) {
                e.preventDefault();
                
                // Bring window to front
                document.querySelectorAll('.window').forEach(w => {
                    w.style.zIndex = 10;
                });
                element.style.zIndex = 20;
                
                // Get mouse position
                if (e.type === 'touchstart') {
                    pos3 = e.touches[0].clientX;
                    pos4 = e.touches[0].clientY;
                    document.addEventListener('touchmove', elementDrag, { passive: false });
                    document.addEventListener('touchend', closeDragElement);
                } else {
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    document.addEventListener('mousemove', elementDrag);
                    document.addEventListener('mouseup', closeDragElement);
                }
            }
            
            function elementDrag(e) {
                e.preventDefault();
                
                // Calculate new position
                if (e.type === 'touchmove') {
                    pos1 = pos3 - e.touches[0].clientX;
                    pos2 = pos4 - e.touches[0].clientY;
                    pos3 = e.touches[0].clientX;
                    pos4 = e.touches[0].clientY;
                } else {
                    pos1 = pos3 - e.clientX;
                    pos2 = pos4 - e.clientY;
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                }
                
                // Set new position
                element.style.top = (element.offsetTop - pos2) + "px";
                element.style.left = (element.offsetLeft - pos1) + "px";
            }
            
            function closeDragElement() {
                document.removeEventListener('mousemove', elementDrag);
                document.removeEventListener('mouseup', closeDragElement);
                document.removeEventListener('touchmove', elementDrag);
                document.removeEventListener('touchend', closeDragElement);
            }
        }
        
        // CRT scan lines effect
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