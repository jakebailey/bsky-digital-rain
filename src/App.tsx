import { createSignal, For, onCleanup, onMount } from "solid-js";
// import "./App.css";
import * as v from "@badrap/valita";
import { createPolled } from "@solid-primitives/timer";
import { createReconnectingWS } from "@solid-primitives/websocket";
import { franc } from "franc-all";
import englishWords from "most-common-words-by-language/build/resources/english.txt?raw";

const commonWords = new Set(englishWords.split("\n").slice(0, 100));

const isIgnored = /^(?:\p{P}+|\d+|.)$/u;

const Message = v.object({
    commit: v.object({
        record: v.object({
            text: v.string(),
        }),
    }),
});

const segmenters = new Map<string, Intl.Segmenter>();
function getSegmenter(language: string) {
    let segmenter = segmenters.get(language);
    if (!segmenter) {
        segmenter = new Intl.Segmenter(language, { granularity: "word" });
        segmenters.set(language, segmenter);
    }
    return segmenter;
}

// const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");

// interface WordCount {
//     word: string;
//     count: number;
// }

// const words = new Map<string, WordCount>();
// const wordsByCount: WordCount[] = [];

// let messageCount = 0;

// ws.addEventListener("message", (ev) => {
//     if (typeof ev.data !== "string") return;

//     try {
//         const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
//         const text = m.commit.record.text;
//         messageCount++;
//         const language = franc(text);
//         if (language !== "eng") return;
//         const segmenter = getSegmenter(language);

//         const newWordsMap = new Map<string, number>();
//         for (const segment of segmenter.segment(text)) {
//             const word = segment.segment.trim().toLowerCase();
//             if (word.length <= 0 || isIgnored.test(word)) continue;

//             const count = newWordsMap.get(word) ?? 0;
//             newWordsMap.set(word, count + 1);

//             // newWordsMap.set(word, 1); // Count each word only once per message
//         }

//         for (const [word, count] of newWordsMap) {
//             const existing = words.get(word);
//             if (existing) {
//                 existing.count += count;
//             } else {
//                 const wc: WordCount = { word, count };
//                 words.set(word, wc);
//                 wordsByCount.push(wc);
//             }
//         }
//     } catch {}
// });

// const useInsertionSort = false;

// function sort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
//     if (!useInsertionSort) {
//         return arr.sort(compareFn);
//     }

//     // Hand-written insertion sort could be better for nearly sorted data...
//     for (let i = 1; i < arr.length; i++) {
//         let key = arr[i];
//         let j = i - 1;

//         while (j >= 0 && compareFn(arr[j], key) > 0) {
//             arr[j + 1] = arr[j];
//             j = j - 1;
//         }

//         arr[j + 1] = key;
//     }

//     return arr;
// }

// const data = createPolled(() => {
//     const before = performance.now();

//     const sortedWords = sort(wordsByCount, (a, b) => b.count - a.count).slice(0, 50).map((word) =>
//         [word.word, word.count] as const
//     );

//     const after = performance.now();

//     return {
//         messageCount,
//         sortedWords,
//         time: after - before,
//     };
// }, 250);

function App() {
    let canvas!: HTMLCanvasElement;

    onMount(() => {
        const ctx = canvas.getContext("2d");

        // making the canvas full screen
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;

        // chinese characters - taken from the unicode charset
        const chars = "田由甲申甴电甶男甸甹町画甼甽甾甿畀畁畂畃畄畅畆畇畈畉畊畋界畍畎畏畐畑";
        // converting the string into an array of single characters
        const chinese = chars.split("");

        const font_size = 16;
        const columns = Math.floor(canvas.width / font_size); // number of columns for the rain
        // an array of drops - one per column
        const drops: number[] = [];
        // x below is the x coordinate
        // 1 = y co-ordinate of the drop(same for every drop initially)
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }

        // drawing the characters
        function draw() {
            if (!ctx) return;

            // Black BG for the canvas
            // translucent BG to show trail
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#0F0"; // green text
            ctx.font = font_size + "px arial";
            // looping over drops
            for (let i = 0; i < drops.length; i++) {
                // a random chinese character to print
                const text = chinese[Math.floor(Math.random() * chinese.length)];
                // x = i*font_size, y = value of drops[i]*font_size
                ctx.fillText(text, i * font_size, drops[i] * font_size);

                // sending the drop back to the top randomly after it has crossed the screen
                // adding a randomness to the reset to make the drops scattered on the Y axis
                if (drops[i] * font_size > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                // incrementing Y coordinate
                drops[i]++;
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
