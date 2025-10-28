let colors;
let currentColor;
let lastChange = 0;
const tempo = 165; // BPM
const beatInterval = 60000 / tempo; // ms per beat

let song;
let playButton = null;
let hintDiv = null; // added: top hint element

let penguinImage;
let penguinW = 60;
let penguinH = 60;

// PENGUIN MITOSIS
let penguins = [];
const mitosisTempo = 41.25; // BPM for mitosis
const mitosisInterval = 60000 / mitosisTempo; // ms per mitosis beat
let mitosisLast = 0;
const maxPenguins = 256;
const splitShrink = 0.90; // child size = parent size

let baseMaxDim;

function preload() {
    song = loadSound('musicjam.mp3');
    penguinImage = loadImage('club-penguin.gif');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    imageMode(CENTER);

    // penguin size based on canvas and image aspect
    baseMaxDim = min(windowWidth, windowHeight) * 0.10; 
    const maxDim = baseMaxDim;
    if (penguinImage && penguinImage.width && penguinImage.height) {
        const aspect = penguinImage.width / penguinImage.height;
        if (aspect >= 1) {
            penguinW = maxDim;
            penguinH = maxDim / aspect;
        } else {
            penguinH = maxDim;
            penguinW = maxDim * aspect;
        }
    }

    // start with a single penguin in the center
    penguins = [{ x: width / 2, y: height / 2, w: penguinW, h: penguinH }];

    colors = [
        '#FF3B30', // red
        '#FF9500', // orange
        '#FFCC00', // yellow
        '#34C759', // green
        '#0a1effff', // blue
        '#821ffaff', // purple
        '#ff2de3ff'  // pink
    ];
    currentColor = random(colors);
    lastChange = millis();
    mitosisLast = millis();
    frameRate(60);

    // small clickable hint at top of page
    hintDiv = createDiv("If you can't hear audio, click!");
    hintDiv.style('position', 'absolute');
    hintDiv.style('top', '10px');
    hintDiv.style('left', '50%');
    hintDiv.style('transform', 'translateX(-50%)');
    hintDiv.style('background', 'rgba(0,0,0,0.45)');
    hintDiv.style('color', '#ffffff');
    hintDiv.style('padding', '6px 10px');
    hintDiv.style('border-radius', '6px');
    hintDiv.style('font-size', '16px'); // increased from 14px
    hintDiv.style('cursor', 'pointer');
    hintDiv.mousePressed(() => {
        if (hintDiv) {
            hintDiv.remove();
            hintDiv = null;
        }
    });

    // Attempt to autoplay; if browser blocks, show a play button
    userStartAudio().then(() => {
        if (song && song.isLoaded()) {
            song.setLoop(true);
            song.loop();
        }
        if (playButton) {
            playButton.remove();
            playButton = null;
        }
        if (hintDiv) { // remove hint when audio starts
            hintDiv.remove();
            hintDiv = null;
        }
    }).catch(() => {
        showPlayButton();
    });
}

function showPlayButton() {
    if (playButton) return;
    playButton = createButton('Play Audio');
    playButton.style('position', 'absolute');
    playButton.style('left', '50%');
    playButton.style('top', '50%');
    playButton.style('transform', 'translate(-50%,-50%)');
    playButton.style('padding', '12px 20px');
    playButton.style('font-size', '16px');
    playButton.mousePressed(() => {
        userStartAudio().then(() => {
            if (song && song.isLoaded()) {
                song.setLoop(true);
                song.loop();
            }
            if (playButton) {
                playButton.remove();
                playButton = null;
            }
            if (hintDiv) { // also remove hint when user clicks play
                hintDiv.remove();
                hintDiv = null;
            }
        });
    });
}

function doMitosis() {
    if (penguins.length >= maxPenguins) return;
    let children = [];
    for (let p of penguins) {
        // child size
        const w = max(4, p.w * splitShrink);
        const h = max(4, p.h * splitShrink);

        // place two penguins on opposite sides at a distance that avoids overlap
        const angle = random(TWO_PI);
        const padding = 4; // extra gap between images
        const minDist = (p.w + w) * 0.6 + padding; // heuristic distance
        const dx = cos(angle) * minDist;
        const dy = sin(angle) * minDist;

        const c1 = {
            x: constrain(p.x + dx, w / 2, width - w / 2),
            y: constrain(p.y + dy, h / 2, height - h / 2),
            w: w,
            h: h
        };
        const c2 = {
            x: constrain(p.x - dx, w / 2, width - w / 2),
            y: constrain(p.y - dy, h / 2, height - h / 2),
            w: w,
            h: h
        };

        children.push(c1, c2);
        if (children.length >= maxPenguins) break;
    }

    // separate penguins to resolve overlaps
    separatePenguins(children);

    // replace current generation with children (mitosis)
    penguins = children.slice(0, maxPenguins);
}

/**
 * Separate overlapping penguins using simple iterative relaxation.
 * Modifies the array in place.
 */
function separatePenguins(list) {
    if (list.length < 2) return;
    const iterations = 30;
    for (let it = 0; it < iterations; it++) {
        let moved = false;
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i];
                const b = list[j];
                // desired minimum center distance
                const minDist = (max(a.w, a.h) + max(b.w, b.h)) * 0.5 * 0.95;
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = sqrt(dx * dx + dy * dy);
                if (dist === 0) {
                    // random small nudge
                    dx = random(-1, 1);
                    dy = random(-1, 1);
                    dist = sqrt(dx * dx + dy * dy) || 0.001;
                }
                if (dist < minDist) {
                    // push each away from the other proportionally
                    const overlap = (minDist - dist) * 0.5;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // move b and a opposite directions
                    b.x += nx * overlap;
                    b.y += ny * overlap;
                    a.x -= nx * overlap;
                    a.y -= ny * overlap;
                    // constrain to canvas
                    b.x = constrain(b.x, b.w / 2, width - b.w / 2);
                    b.y = constrain(b.y, b.h / 2, height - b.h / 2);
                    a.x = constrain(a.x, a.w / 2, width - a.w / 2);
                    a.y = constrain(a.y, a.h / 2, height - a.h / 2);
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }

    // final pass: if still overcrowded, fall back to a grid layout for neatness
    if (list.length > 1) {
        // detect any remaining overlaps
        let anyOverlap = false;
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const a = list[i], b = list[j];
                const minDist = (max(a.w, a.h) + max(b.w, b.h)) * 0.5 * 0.95;
                if (dist(a.x, a.y, b.x, b.y) < minDist) {
                    anyOverlap = true;
                    break;
                }
            }
            if (anyOverlap) break;
        }

        if (anyOverlap) {
            // compute a compact grid centered on the parent area
            const cols = ceil(sqrt(list.length));
            const rows = ceil(list.length / cols);
            const cellW = width / (cols + 1);
            const cellH = height / (rows + 1);
            let idx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (idx >= list.length) break;
                    list[idx].x = (c + 1) * cellW;
                    list[idx].y = (r + 1) * cellH;
                    // ensure within bounds
                    list[idx].x = constrain(list[idx].x, list[idx].w / 2, width - list[idx].w / 2);
                    list[idx].y = constrain(list[idx].y, list[idx].h / 2, height - list[idx].h / 2);
                    idx++;
                }
            }
        }
    }
}

function draw() {
    // background strobe existing behavior
    if (millis() - lastChange >= beatInterval) {
        let nextColor;
        do {
            nextColor = random(colors);
        } while (nextColor === currentColor);
        currentColor = nextColor;
        lastChange = millis();
    }

    // mitosis timing
    if (millis() - mitosisLast >= mitosisInterval) {
        doMitosis();
        mitosisLast = millis();
    }

    background(currentColor);

    // draw all penguins
    if (penguinImage) {
        for (let p of penguins) {
            image(penguinImage, p.x, p.y, p.w, p.h);
        }
    }
}

function windowResized() {
    const oldBase = baseMaxDim;
    resizeCanvas(windowWidth, windowHeight);

    // recompute penguin size for new canvas size
    baseMaxDim = min(windowWidth, windowHeight) * 0.10;
    const ratio = oldBase > 0 ? baseMaxDim / oldBase : 1;

    if (penguinImage && penguinImage.width && penguinImage.height) {
        // scale existing penguins so layout remains proportional
        for (let p of penguins) {
            p.x = constrain(p.x * (width / (width || 1)), p.w / 2, width - p.w / 2);
            p.y = constrain(p.y * (height / (height || 1)), p.h / 2, height - p.h / 2);
            p.w *= ratio;
            p.h *= ratio;
        }
    }
}