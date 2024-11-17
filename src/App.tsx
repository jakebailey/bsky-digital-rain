import { For } from "solid-js";
// import "./App.css";
import * as v from "@badrap/valita";
import { createPolled } from "@solid-primitives/timer";
import { createReconnectingWS } from "@solid-primitives/websocket";
import { franc } from "franc-all";
import englishWords from "most-common-words-by-language/build/resources/english.txt?raw";
import { createStore } from "solid-js/store";

const commonWords = new Set(englishWords.split("\n").slice(0, 100));

const isOnlyPunctuation = /^\p{P}+$/u;

const Message = v.object({
    commit: v.object({
        record: v.object({
            text: v.string(),
        }),
    }),
});

const segmenter = new Intl.Segmenter("eng", { granularity: "word" });

const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");

const [words, setWords] = createStore<Record<string, number>>({});

ws.addEventListener("message", (ev) => {
    if (typeof ev.data !== "string") return;

    try {
        const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
        const text = m.commit.record.text;
        const language = franc(text);
        if (language !== "eng") return;

        const newWordsMap: Record<string, number> = {};
        for (const segment of segmenter.segment(text)) {
            const word = segment.segment.trim().toLowerCase();
            if (!word || isOnlyPunctuation.test(word) || commonWords.has(word)) continue;
            newWordsMap[word] = (newWordsMap[word] ?? 0) + 1;
        }

        setWords((prev) => {
            const next = { ...prev };
            for (const word in newWordsMap) {
                next[word] = (next[word] ?? 0) + newWordsMap[word];
            }
            return next;
        });
    } catch {}
});

const sortedWords = createPolled(() => Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 50), 1000);

function App() {
    return (
        <>
            <div class="card">
                <ul>
                    <For each={sortedWords()}>
                        {([word, count]) => <li>{word} - {count}</li>}
                    </For>
                </ul>
            </div>
        </>
    );
}

export default App;
