/*
Web Audio API:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

Simple tutorial:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API

Advanced tutorial:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques

Basic concepts:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Basic_concepts_behind_Web_Audio_API

Samsung info:
https://medium.com/samsung-internet-dev/web-audio-on-different-platforms-67fc9ffc2c4e
*/

let audioCtx = null;
let mediaElem = null;
let gainNode = null;
let analyserNode = null;
let dataArray = null;
let bufferLength = null;

const audioCanvas = document.querySelector("canvas");
const audioaudioCanvasCtx = audioCanvas.getContext("2d");
const [WIDTH, HEIGHT] = [audioCanvas.width, audioCanvas.height];

const evalsCanvas = document.querySelector("#evals");
const evalsCtx = evalsCanvas.getContext("2d");
const [evalsWIDTH, evalsHEIGHT] = [evalsCanvas.width, evalsCanvas.height];

const evecsCanvas = document.querySelector("#evecs");
const evecsCtx = evecsCanvas.getContext("2d");
const [evecsWIDTH, evecsHEIGHT] = [evecsCanvas.width, evecsCanvas.height];

/** Learning rate */
const alpha = 1e-2;

/** Forget rate */
const beta = 1e-5;

/** Number of neurones */
const nNeurones = 10;

/** Number of synapses per neurone */
const nSynapses = 40;

/** Synaptic weights for all neurones */
const neurones = [];

/** Eigenvalue for each neurone's eigenvector */
const evals = [];

/** length of the vector*/
const norm = (vector) => {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
        sum += vector[i] ** 2;
    }
    return Math.sqrt(sum);
}

/** dot product */
const dot = (v1, v2) => {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
};

/** multiply vector by scalar */
const scale = (vector, scalar) => {
    const result = [];
    for (let i = 0; i < vector.length; i++) {
        result[i] = vector[i] * scalar;
    }
    return result;
};

/** normalise vector in place */
const normalise = (vector) => {
    let sum = 0;
    for (let i=0; i<vector.length; i++) {
        sum += vector[i]**2;
    }
    const norm = Math.sqrt(sum);
    for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
    }
};

/** Adjust the network
 * Each neurone is fed with a slice of the input
*/
let maxindex = -1;
const networkStep = (input) => {
    const shift = Math.floor((input.length - nSynapses) / nNeurones);

    // compute the alignment of each neurone's eigenvector with the input
    // and keep track of the one with the highest alignment
    let maxalign = -1;
    let sign = 1;
    let maxx;
    for (let i = 0; i < nNeurones; i++) {
        const xraw = input.slice(i * shift, i * shift + nSynapses); // raw input
        const xnorm = norm(xraw) + 1e-6;
        const x = scale(xraw, 1/xnorm); // normalised input
        let d = dot(neurones[i], x);
        if (d < 0) {
            d = -d;
            sign = -1;
        }
        const absd = sign * d;
        if (absd > maxalign) {
            maxalign = d;
            maxindex = i;
            maxx = x;
        }

        // forget
        const beta2 = beta; // * (1 - absd);
        for (let j = 0; j < nSynapses; j++) {
            neurones[i][j] = (1 - beta2) * neurones[i][j] + beta2 * Math.random();
        }
    }

    // adjust the neurone with the highest alignment in the direction of the input
    const alpha2 = alpha * sign * maxalign;
    for (let i = 0; i < nSynapses; i++) {
        neurones[maxindex][i] = (1 - alpha2) * neurones[maxindex][i] + alpha2 * sign * maxx[i];
    }

    // update the neurone's eigenvalue
    evals[maxindex] = (1 - alpha2) * evals[maxindex] + alpha2 * maxalign**2;
};

const initNeurones = () => {
    for (let i = 0; i < nNeurones; i++) {
        const synapses = [];
        for (let j = 0; j < nSynapses; j++) {
            synapses.push(Math.random());
        }
        neurones.push(synapses);

        evals.push(0);
    }
};

function animate() {
    analyserNode.getByteFrequencyData(dataArray);

    // sonogram display
    audioaudioCanvasCtx.fillStyle = "rgb(0 0 0)";
    audioaudioCanvasCtx.fillRect(0, 0, WIDTH, HEIGHT);  
    const barWidth = WIDTH / bufferLength;
    let barHeight;
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        audioaudioCanvasCtx.fillStyle = `rgb(${barHeight + 100} 50 50)`;
        audioaudioCanvasCtx.fillRect(barWidth * i, HEIGHT - barHeight / 2, barWidth - 1, barHeight / 2);
    }

    // network step
    networkStep(dataArray);

    // eigenvalues display
    evalsCtx.fillStyle = "rgb(0 0 0)";
    evalsCtx.fillRect(0, 0, evalsWIDTH, evalsHEIGHT);
    const evalsBarWidth = evalsWIDTH / nNeurones;
    const maxEval = Math.max(...evals);
    for (let i = 0; i < nNeurones; i++) {
        evalBarHeight = evals[i] / maxEval * evalsHEIGHT;
        evalsCtx.fillStyle = `rgb(50 50 ${evalBarHeight + 100})`;
        evalsCtx.fillRect(evalsBarWidth * i, evalsHEIGHT - evalBarHeight, evalsBarWidth - 1, evalBarHeight);
    }

    // eigenvectors display
    evecsCtx.fillStyle = "rgb(0 0 0)";
    evecsCtx.fillRect(0, 0, evecsWIDTH, evecsHEIGHT);
    const evecsBarWidth = evecsWIDTH / nSynapses;
    const evecsBarHeight = evecsHEIGHT / nNeurones;
    for (let i = 0; i < nNeurones; i++) {
        const maxLoading = Math.max(...neurones[i]);
        for (let j = 0; j < nSynapses; j++) {
            const height = neurones[i][j] / maxLoading * evecsBarHeight;
            if (i === maxindex) {
                evecsCtx.fillStyle = `rgb(${height + 100} 50 50)`;
            } else {
                evecsCtx.fillStyle = `rgb(50 50 ${height + 100})`;
            }
            evecsCtx.fillRect(evecsBarWidth * j, evecsBarHeight * i - height + 1 +evecsBarHeight, evecsBarWidth - 1, height - 1);
        }
    }

    requestAnimationFrame(animate);
}
  
const main = async () => {

    if (mediaElem === null) {
        console.log('Audio context starting');

        audioCtx = new AudioContext();
        gainNode = audioCtx.createGain();
        analyserNode = audioCtx.createAnalyser();

        // input
        mediaElem = document.querySelector('audio');
        const stream = audioCtx.createMediaElementSource(mediaElem);
        stream.connect(analyserNode);

        // analyser
        analyserNode.fftSize = 256;
        bufferLength = analyserNode.frequencyBinCount;
        console.log(bufferLength);
        dataArray = new Uint8Array(bufferLength);
        analyserNode.connect(gainNode);

        // output
        gainNode.connect(audioCtx.destination);

        // configure freq bands
        const sampleRate = audioCtx.sampleRate;
        const nyquist = sampleRate / 2;
        const freqCtx = document.querySelector("#freq").getContext("2d");
        const dx = WIDTH / bufferLength * 1.5;
        freqCtx.font = "14px Helvetica Neue";
        for (let i = 0; i <= bufferLength; i+=4) {
            let freq = i * nyquist / bufferLength;
            // format to closest Hz of kHz
            if (freq < 1000) {
                freq = Math.round(freq*10)/10 + " Hz";
            } else {
                freq = Math.round(freq*10 / 1000)/10 + " kHz";
            }
            // write frequency with vertical orientation
            freqCtx.save();
            freqCtx.translate(i * dx, 10);
            freqCtx.rotate(-Math.PI / 2);
            freqCtx.textAlign = "right";
            freqCtx.fillText(`${freq}`, 0, 0);
            freqCtx.restore();
        }

        // init network
        initNeurones();

        // launch the animation
        animate();
    }
    mediaElem.play();
};

document.querySelector('#start').addEventListener('click', main);

document.querySelector("#pause").addEventListener("click", function() {
    mediaElem.pause();
});

document.querySelector("#volume").addEventListener("change", function(ev) {
    console.log(ev.target.value);
    gainNode.gain.value = Number(ev.target.value);
});
