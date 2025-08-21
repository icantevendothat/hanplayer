const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};
const sources = {};
const gainNodes = {}; // For muting/unmuting
let isInitialized = false;

async function loadStems() {
    const buttons = document.querySelectorAll('.stem-button');
    const promises = Array.from(buttons).map(async (button) => {
        const src = button.dataset.src;
        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[src] = await audioContext.decodeAudioData(arrayBuffer);
            console.log(`Successfully loaded: ${src}`);
        } catch (e) {
            console.error(`Failed to load or decode audio at ${src}:`, e);
        }
    });
    await Promise.all(promises);
    console.log("All stems loaded successfully.");
}

async function initializeAudio(firstSrc) {
    if (isInitialized) return;
    
    // Resume audio context if needed
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    // Load stems if not loaded yet
    if (Object.keys(audioBuffers).length === 0) {
        await loadStems();
    }
    
    // Start all stems playing, but mute all except the first one pressed
    startAllStems(firstSrc);
    isInitialized = true;
}

function startAllStems(firstSrc = null) {
    const buttons = document.querySelectorAll('.stem-button');
    const startTime = audioContext.currentTime + 0.1; // Small delay to sync perfectly
    
    buttons.forEach(button => {
        const src = button.dataset.src;
        
        if (!audioBuffers[src]) return;
        
        // Create source
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[src];
        source.loop = true;
        
        // Create gain node for muting/unmuting
        const gainNode = audioContext.createGain();
        
        // If this is the first stem pressed, start it unmuted, otherwise muted
        if (src === firstSrc) {
            gainNode.gain.value = 1; // Start unmuted
            button.classList.add('active');
        } else {
            gainNode.gain.value = 0; // Start muted
        }
        
        // Connect: source -> gain -> destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Start at the exact same time
        source.start(startTime);
        
        // Store references
        sources[src] = source;
        gainNodes[src] = gainNode;
    });
}

function toggleStem(src, button) {
    if (!gainNodes[src]) {
        console.warn(`Gain node for ${src} is not available.`);
        return;
    }
    
    const gainNode = gainNodes[src];
    const isActive = button.classList.contains('active');
    
    if (isActive) {
        // Mute the stem
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        button.classList.remove('active');
    } else {
        // Unmute the stem
        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
        button.classList.add('active');
    }
}

// Optional: Smooth fade in/out instead of instant mute
function toggleStemSmooth(src, button) {
    if (!gainNodes[src]) {
        console.warn(`Gain node for ${src} is not available.`);
        return;
    }
    
    const gainNode = gainNodes[src];
    const isActive = button.classList.contains('active');
    const now = audioContext.currentTime;
    const fadeTime = 0.05; // 50ms fade
    
    if (isActive) {
        // Fade out
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);
        button.classList.remove('active');
    } else {
        // Fade in
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeTime);
        button.classList.add('active');
    }
}

// Stop all stems (useful for cleanup or reset)
function stopAllStems() {
    Object.values(sources).forEach(source => {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            // Source might already be stopped
        }
    });
    
    Object.values(gainNodes).forEach(gainNode => {
        gainNode.disconnect();
    });
    
    // Clear references
    Object.keys(sources).forEach(key => delete sources[key]);
    Object.keys(gainNodes).forEach(key => delete gainNodes[key]);
}

const buttonsContainer = document.querySelector('.stem-buttons-container');
buttonsContainer.addEventListener('click', async (e) => {
    const button = e.target.closest('.stem-button');
    if (button) {
        const src = button.dataset.src;
        
        if (!isInitialized) {
            // First click - initialize audio with this stem as the active one
            await initializeAudio(src);
        } else {
            // Subsequent clicks - toggle mute/unmute
            toggleStem(src, button);
            // toggleStemSmooth(src, button); // Alternative with fade
        }
    }
});

// Handle page visibility to avoid audio context issues
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause if needed
    } else {
        // Page is visible, ensure audio context is running
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
});

// Remove the window load event listener since we'll init on first click
// window.addEventListener('load', loadStems);