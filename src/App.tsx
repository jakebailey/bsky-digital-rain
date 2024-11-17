import { createSignal, For } from "solid-js";
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

const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");

interface WordCount {
    word: string;
    count: number;
}

const words = new Map<string, WordCount>();
const wordsByCount: WordCount[] = [];

let messageCount = 0;

ws.addEventListener("message", (ev) => {
    if (typeof ev.data !== "string") return;

    try {
        const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
        const text = m.commit.record.text;
        messageCount++;
        const language = franc(text);
        if (language !== "eng") return;
        const segmenter = getSegmenter(language);

        const newWordsMap = new Map<string, number>();
        for (const segment of segmenter.segment(text)) {
            const word = segment.segment.trim().toLowerCase();
            if (word.length <= 0 || isIgnored.test(word)) continue;

            const count = newWordsMap.get(word) ?? 0;
            newWordsMap.set(word, count + 1);

            // newWordsMap.set(word, 1); // Count each word only once per message
        }

        for (const [word, count] of newWordsMap) {
            const existing = words.get(word);
            if (existing) {
                existing.count += count;
            } else {
                const wc: WordCount = { word, count };
                words.set(word, wc);
                wordsByCount.push(wc);
            }
        }
    } catch {}
});

const useInsertionSort = false;

function sort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
    if (!useInsertionSort) {
        return arr.sort(compareFn);
    }

    // Hand-written insertion sort could be better for nearly sorted data...
    for (let i = 1; i < arr.length; i++) {
        let key = arr[i];
        let j = i - 1;

        while (j >= 0 && compareFn(arr[j], key) > 0) {
            arr[j + 1] = arr[j];
            j = j - 1;
        }

        arr[j + 1] = key;
    }

    return arr;
}

const data = createPolled(() => {
    const before = performance.now();

    const sortedWords = sort(wordsByCount, (a, b) => b.count - a.count).slice(0, 50).map((word) =>
        [word.word, word.count] as const
    );

    const after = performance.now();

    return {
        messageCount,
        sortedWords,
        time: after - before,
    };
}, 250);

function App() {
    return (
        <>
            <p>
                {data().messageCount} messages processed
            </p>
            <p>
                {data().time.toFixed(2)} ms to sort
            </p>
            <div class="card">
                <ul>
                    <For each={data().sortedWords}>
                        {([word, count]) => <li>{word} - {count}</li>}
                    </For>
                </ul>
            </div>
        </>
    );
}

export default App;
