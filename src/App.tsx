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

let messages: string[] = [];
const maxMessageLength = 1000;

ws.addEventListener("message", (ev) => {
    if (typeof ev.data !== "string") return;

    try {
        const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
        const text = m.commit.record.text;
        if (isIgnored.test(text) || franc(text) !== "eng") return;
        messages.push(text);
        if (messages.length > maxMessageLength) {
            messages = messages.slice(-maxMessageLength);
        }
    } catch {}
});

function getSentence(): string {
    let sentence = messages.at(0);
    if (!sentence) return " ";
    messages = messages.slice(1);

    // sanitize to just regular word characters, punctuation, numbers, etc
    // should allow accents and such, using regex unicode classes
    sentence = sentence.replace(/[^\p{L}\p{N}\p{P}\s]/gu, "");
    // remove extra whitespace
    sentence = sentence.replace(/\s+/g, " ");

    // remove URLs
    sentence = sentence.replace(/https?:\/\/\S+/g, "");

    return sentence + " ";
}

function App() {
    let canvas!: HTMLCanvasElement;

    onMount(() => {
        const ctx = canvas.getContext("2d");

        // making the canvas full screen
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;

        const font_size = 16;
        const columns = Math.floor(canvas.width / font_size); // number of columns for the rain
        // an array of drops - one per column
        const drops: { y: number; sentence: string; charIndex: number; }[] = [];
        // x below is the x coordinate
        // 1 = y co-ordinate of the drop(same for every drop initially)
        for (let x = 0; x < columns; x++) {
            drops[x] = { y: 1, sentence: getSentence(), charIndex: 0 };
        }

        // drawing the sentences
        function draw() {
            if (!ctx) return;

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
                    drop.sentence = getSentence();
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
        }

        const interval = setInterval(draw, 33);

        onCleanup(() => {
            clearInterval(interval);
        });
    });

    return <canvas ref={canvas} />;
}

export default App;
