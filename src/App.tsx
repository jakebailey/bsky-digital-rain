import * as v from "@badrap/valita";
import { createReconnectingWS } from "@solid-primitives/websocket";
import { franc } from "franc-all";
import { onCleanup, onMount } from "solid-js";

const isIgnored = /^(?:\p{P}+|\d+|.)$/u;

const Message = v.object({
    commit: v.object({
        record: v.object({
            text: v.string(),
        }),
    }),
});

const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");

class RingBuffer<T> {
    private buffer: T[];
    private size: number;
    private start: number;
    private end: number;
    private count: number;

    constructor(size: number) {
        this.size = size;
        this.buffer = new Array(size);
        this.start = 0;
        this.end = 0;
        this.count = 0;
    }

    push(item: T) {
        this.buffer[this.end] = item;
        this.end = (this.end + 1) % this.size;
        if (this.count === this.size) {
            this.start = (this.start + 1) % this.size;
        } else {
            this.count++;
        }
    }

    shift(): T | undefined {
        if (this.count === 0) return undefined;
        const item = this.buffer[this.start];
        this.start = (this.start + 1) % this.size;
        this.count--;
        return item;
    }

    isEmpty(): boolean {
        return this.count === 0;
    }
}

const messages = new RingBuffer<string>(1000);

ws.addEventListener("message", (ev) => {
    if (typeof ev.data !== "string") return;

    const m = Message.try(JSON.parse(ev.data), { mode: "passthrough" });
    if (m.ok) {
        const text = m.value.commit.record.text;
        if (isIgnored.test(text) || franc(text) !== "eng") return;
        messages.push(text);
    }
});

function getMessage(): string {
    let message = messages.shift();
    if (!message) return " ";

    // sanitize to just regular word characters, punctuation, numbers, etc
    // should allow accents and such, using regex unicode classes
    message = message.replace(/[^\p{L}\p{N}\p{P}\s]/gu, "");

    // remove URLs
    message = message.replace(/https?:\/\/\S+/g, "");

    // remove extra whitespace
    message = message.replace(/\s+/g, " ");

    return message + " ";
}

// based on:
// - https://jsfiddle.net/w5wsudd0/
// - https://www.solidjs.com/tutorial/bindings_refs
function App() {
    let canvas!: HTMLCanvasElement;

    onMount(() => {
        const ctx = canvas.getContext("2d");

        // making the canvas full screen
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;

        const font_size = 20;
        const columns = Math.floor(canvas.width / font_size); // number of columns for the rain
        // an array of drops - one per column
        const drops: { y: number; sentence: string; charIndex: number; }[] = [];
        // x below is the x coordinate
        // 1 = y co-ordinate of the drop(same for every drop initially)
        for (let x = 0; x < columns; x++) {
            drops[x] = { y: 1, sentence: getMessage(), charIndex: 0 };
        }

        let lastTime = 0;
        const frameDuration = 33; // 33ms for approximately 30fps

        // drawing the sentences
        function draw(time: number) {
            if (!ctx) return;

            const deltaTime = time - lastTime;
            if (deltaTime < frameDuration) {
                requestAnimationFrame(draw);
                return;
            }
            lastTime = time;

            // Black BG for the canvas
            // translucent BG to show trail
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#0F0"; // green text
            ctx.font = font_size + "px monospace";
            // looping over drops
            for (let i = 0; i < drops.length; i++) {
                const drop = drops[i];
                const text = drop.sentence[drop.charIndex];

                // x = i*font_size, y = value of drops[i].y*font_size
                ctx.fillText(text, i * font_size, drop.y * font_size);

                // sending the drop back to the top randomly after it has crossed the screen
                // adding a randomness to the reset to make the drops scattered on the Y axis
                if (drop.y * font_size > canvas.height && Math.random() > 0.975) {
                    drop.y = 0;
                    drop.sentence = getMessage();
                    drop.charIndex = 0;
                }

                // incrementing Y coordinate
                drop.y++;

                // incrementing character index
                drop.charIndex++;
                if (drop.charIndex >= drop.sentence.length) {
                    drop.charIndex = 0;
                }
            }

            requestAnimationFrame(draw);
        }

        requestAnimationFrame(draw);

        onCleanup(() => {
            // No need to clear interval since we're using requestAnimationFrame
        });
    });

    return <canvas ref={canvas} />;
}

export default App;
