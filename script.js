const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};
const activeSources = {};
const loopDurationInSeconds = 11; 


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

function playStem(src, button) {
    if (!audioBuffers[src]) {
        console.warn(`Audio buffer for ${src} is not loaded.`);
        return;
    }

    if (activeSources[src]) {
        activeSources[src].stop();
        activeSources[src].disconnect();
        delete activeSources[src];
        button.classList.remove('active');
    } else {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[src];
        source.loop = true;
        source.connect(audioContext.destination);

        const now = audioContext.currentTime;
        const timeInLoop = now % loopDurationInSeconds;
        source.start(0, timeInLoop);

        activeSources[src] = source;
        button.classList.add('active');
    }
}

const buttonsContainer = document.querySelector('.stem-buttons-container');
buttonsContainer.addEventListener('click', (e) => {
    const button = e.target.closest('.stem-button');
    if (button) {
        const src = button.dataset.src;
        playStem(src, button);
    }
});

window.addEventListener('load', loadStems);