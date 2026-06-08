console.log("🔥 BACKGROUND LOADED");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    console.log("📩 MESSAGE REÇU:", message);

    if (message.type === "ANALYZE") {

   fetch("http://localhost:3000/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(message.data)
        })
        .then(async (res) => {
            console.log("STATUS BACKEND:", res.status);

            const data = await res.json();

            console.log("DATA BACKEND:", data);

            sendResponse(data);
        })
        .catch(err => {
            console.log("❌ FETCH ERROR:", err);
            sendResponse({ error: err.message });
        });

        return true;
    }
});