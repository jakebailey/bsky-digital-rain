import viteLogo from "/vite.svg";
import { createSignal, For } from "solid-js";
import solidLogo from "./assets/solid.svg";
// import "./App.css";
import * as v from "@badrap/valita";
import { createReconnectingWS } from "@solid-primitives/websocket";
import { franc } from "franc-all";

const Message = v.object({
    commit: v.object({
        record: v.object({
            text: v.string(),
        }),
    }),
});

interface Data {
    text: string;
    words: string[];
}

const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");
const [data, setData] = createSignal<Data | undefined>();

const segmenter = new Intl.Segmenter("eng", { granularity: "word" });

ws.addEventListener("message", (ev) => {
    if (typeof ev.data === "string") {
        try {
            const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
            const text = m.commit.record.text;
            const language = franc(text);
            if (language !== "eng") return;
            const words = [...segmenter.segment(text)].map((v) => v.segment.trim()).filter((v) => !!v);
            setData({ text, words });
        } catch {}
    }
});

function App() {
    return (
        <>
            <div class="card">
                <p>
                    {data()?.text}
                </p>
                <ul>
                    <For each={data()?.words}>
                        {(item) => <li>{item}</li>}
                    </For>
                </ul>
            </div>
        </>
    );
}

export default App;
