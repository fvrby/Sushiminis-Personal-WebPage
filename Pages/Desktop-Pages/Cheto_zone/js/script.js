document.addEventListener('DOMContentLoaded', () => {
    const movingImage = document.getElementById('moving-image');
    const mouseFollower = document.getElementById('mouse-follower');
    let imagePosition = 0;
    let mouseX = 0;
    let mouseY = 0;
    const trails = [];
    const maxTrails = 20;
    let speed = 2;

    // Create the heart shape with sparkles
    movingImage.innerHTML = `
        <div class="heart animate-heart-beat">
            <div class="sparkle sparkle-top-left animate-corner-sparkle"></div>
            <div class="sparkle sparkle-top-right animate-rotate-sparkle"></div>
            <div class="sparkle sparkle-bottom-left animate-corner-sparkle"></div>
            <div class="sparkle sparkle-bottom-right animate-rotate-sparkle"></div>
        </div>
    `;

    function updateMouseFollower(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    function animateMouseFollower() {
        const followerRect = mouseFollower.getBoundingClientRect();
        const followerX = followerRect.left + followerRect.width / 2;
        const followerY = followerRect.top + followerRect.height / 2;

        const dx = mouseX - followerX;
        const dy = mouseY - followerY;

        const newX = followerX + dx * 0.1;
        const newY = followerY + dy * 0.1;

        mouseFollower.style.transform = `translate(${newX - followerRect.width / 2}px, ${newY - followerRect.height / 2}px)`;

        requestAnimationFrame(animateMouseFollower);
    }

    function createTrail(x) {
        // Create a heart trail element with sparkles
        const trail = document.createElement('div');
        trail.className = 'heart heart-trail animate-fade-out';
        trail.style.left = `${x}px`;
        
        // Randomize vertical position slightly for more dynamic effect
        const yOffset = Math.random() * 10 - 5;
        trail.style.top = `${50 + yOffset}px`;
        
        // Add a small random sparkle to some trails
        if (Math.random() > 0.7) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle sparkle-top-right animate-corner-sparkle';
            trail.appendChild(sparkle);
        }
        
        // Add the trail to the document and to our array
        document.body.appendChild(trail);
        trails.push({
            element: trail,
            created: Date.now()
        });
        
        // Check if we need to remove old trails
        if (trails.length > maxTrails) {
            const oldestTrail = trails.shift();
            if (oldestTrail && oldestTrail.element.parentNode) {
                oldestTrail.element.parentNode.removeChild(oldestTrail.element);
            }
        }
    }

    function removeOldTrails() {
        const now = Date.now();
        while (trails.length > 0 && now - trails[0].created > 2000) {
            const oldTrail = trails.shift();
            if (oldTrail.element.parentNode) {
                oldTrail.element.parentNode.removeChild(oldTrail.element);
            }
        }
    }

    function moveImage() {
        // Clean up old trails
        removeOldTrails();
        
        // Create a new trail at a certain interval
        if (imagePosition % 5 === 0) {
            createTrail(imagePosition);
        }
        
        // Move the heart at a constant speed
        imagePosition = (imagePosition + speed) % window.innerWidth;
        movingImage.style.left = `${imagePosition}px`;
        
        requestAnimationFrame(moveImage);
    }

    document.addEventListener('mousemove', updateMouseFollower);
    requestAnimationFrame(moveImage);
    requestAnimationFrame(animateMouseFollower);
});