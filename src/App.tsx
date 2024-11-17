import viteLogo from "/vite.svg";
import { createSignal } from "solid-js";
import solidLogo from "./assets/solid.svg";
import "./App.css";
import * as v from "@badrap/valita";
import { createReconnectingWS } from "@solid-primitives/websocket";

const Message = v.object({
    commit: v.object({
        record: v.object({
            text: v.string(),
        }),
    }),
});
type Message = v.Infer<typeof Message>;

const ws = createReconnectingWS("wss://jetstream2.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post");
const [message, setMessage] = createSignal<Message | undefined>();
ws.addEventListener("message", (ev) => {
    if (typeof ev.data === "string") {
        try {
            const m = Message.parse(JSON.parse(ev.data), { mode: "passthrough" });
            setMessage(m);
        } catch {}
    }
});

function App() {
    return (
        <>
            <div class="card">
                <p>
                    {message()?.commit.record.text}
                </p>
            </div>
        </>
    );
}

export default App;
