document.getElementById("clearButton").addEventListener("click", () => {
    chrome.runtime.sendMessage({
        action: "clearTabs"
    });
});