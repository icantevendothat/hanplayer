const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};
const sources = {};
const gainNodes = {}; 
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
    
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    if (Object.keys(audioBuffers).length === 0) {
        await loadStems();
    }
    
    startAllStems(firstSrc);
    isInitialized = true;
}

function startAllStems(firstSrc = null) {
    const buttons = document.querySelectorAll('.stem-button');
    const startTime = audioContext.currentTime + 0.1; 
    
    buttons.forEach(button => {
        const src = button.dataset.src;
        
        if (!audioBuffers[src]) return;
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[src];
        source.loop = true;
        
        const gainNode = audioContext.createGain();
        
        if (src === firstSrc) {
            gainNode.gain.value = 1; 
            button.classList.add('active');
        } else {
            gainNode.gain.value = 0;
        }
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(startTime);
        
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
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        button.classList.remove('active');
    } else {
        gainNode.gain.setValueAtTime(1, audioContext.currentTime);
        button.classList.add('active');
    }
}

function toggleStemSmooth(src, button) {
    if (!gainNodes[src]) {
        console.warn(`Gain node for ${src} is not available.`);
        return;
    }
    
    const gainNode = gainNodes[src];
    const isActive = button.classList.contains('active');
    const now = audioContext.currentTime;
    const fadeTime = 0.05; 
    
    if (isActive) {
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + fadeTime);
        button.classList.remove('active');
    } else {
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeTime);
        button.classList.add('active');
    }
}

function stopAllStems() {
    Object.values(sources).forEach(source => {
        try {
            source.stop();
            source.disconnect();
        } catch (e) {
            
        }
    });
    
    Object.values(gainNodes).forEach(gainNode => {
        gainNode.disconnect();
    });
    
    Object.keys(sources).forEach(key => delete sources[key]);
    Object.keys(gainNodes).forEach(key => delete gainNodes[key]);
}

const buttonsContainer = document.querySelector('.stem-buttons-container');
buttonsContainer.addEventListener('click', async (e) => {
    const button = e.target.closest('.stem-button');
    if (button) {
        const src = button.dataset.src;
        
        if (!isInitialized) {
            await initializeAudio(src);
        } else {
            toggleStem(src, button);
        }
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
    } else {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
});