class Tab {
    constructor(title, url, tabId) {
        this.title = title;
        this.url = url;
        this.tabId = tabId;
        this.tabs = [];
    }

    static fromObject(obj) {
        const tab = new Tab(obj.title, obj.url, obj.tabId);
        tab.tabs = (obj.tabs || []).map(Tab.fromObject);
        return tab;
    }

    addTab(tab) {
        this.tabs.push(tab);
    }

    removeTab(tabId) {
        const index = this.tabs.findIndex(tab => tab.tabId === tabId);

        if (index !== -1) {
            const childTabs = this.tabs[index].tabs;
            this.tabs.splice(index, 1);
            this.tabs.push(...childTabs);
            return;
        }

        for (const tab of this.tabs) {
            tab.removeTab(tabId);
        }
    }

    findTab(tabId) {
        if (this.tabId === tabId)
            return this;

        for (const tab of this.tabs) {
            const found = tab.findTab(tabId);
            if (found)
                return found;
        }

        return undefined;
    }
}

class Tabs {
    constructor() {
        this.tabs = [];
    }

    render(){}

    addTab(tab) {
        this.tabs.push(tab);
        this.saveToStorage()

        if (fullDebug) {
            console.log(tab)
        }
    }

    removeTab(tabId) {
        const index = this.tabs.findIndex(tab => tab.tabId === tabId);

        if (index !== -1) {
            const childTabs = this.tabs[index].tabs;
            this.tabs.splice(index, 1);
            this.tabs = this.tabs.concat(childTabs);
        }
        else {
            for (let tab of this.tabs) {
                tab.removeTab(tabId);
            }
        }

        this.saveToStorage()
    }

    saveToStorage() {
        if (fullDebug) {
            console.log("saveToStorage", this.tabs);
        }
        chrome.storage.local.set({"all": this.tabs});
    }

    clear() {
        this.tabs = [];
        this.saveToStorage();

        if (fullDebug){
            console.log("clear all tabs");
        }
    }

    findTab(tabId) {
        const index = this.tabs.findIndex(tab => tab.tabId === tabId)

        if (index !== -1) {
            return this.tabs[index];
        }

        for (let tab of this.tabs) {
            const found = tab.findTab(tabId);
            if (found !== undefined) {
                return found;
            }
        }

        return undefined;
    }

    async getTabInfo(tabId) {
        const tab = await chrome.tabs.get(tabId);

        return {
            title: tab.title,
            url: tab.url
        };
    }

    async loadFromStorage() {
        const result = await chrome.storage.local.get("all");

        if (!result.all) {
            this.tabs = [];
            return;
        }

        this.tabs = result.all.map(Tab.fromObject);

        if (fullDebug) {
            console.log("Loaded", this.tabs);
        }
    }
}

const allTabs = new Tabs();

(async () => {
    await allTabs.loadFromStorage();

    if (fullDebug) {
        console.log("Storage restored");
    }
})();

const fullDebug = true;

function shouldIgnoreTab(tab) {
    const url = tab.pendingUrl || tab.url || "";

    // ignore chrome special tabs
    return (url.startsWith("chrome-extension://") || url.startsWith(chrome.runtime.getURL("")) || url.startsWith("chrome://"));
}

chrome.tabs.onCreated.addListener( async tab => {
    if (shouldIgnoreTab(tab)) {
        return;
    }

    console.log("onCreated", tab)

    const url = tab.pendingUrl || tab.url || "";
    const newTab = new Tab(tab.title, url, tab.id);
    if (url === "chrome://newtab/"){
        allTabs.addTab(newTab)
    }
    else {
        if (tab.openerTabId === undefined) {
            allTabs.addTab(newTab);
            return;
        }
        const parent = allTabs.findTab(tab.openerTabId);

        if (parent) {
            parent.addTab(newTab);
        } else {
            // add parent
            let parentInfo;

            try {
                parentInfo = await allTabs.getTabInfo(tab.openerTabId);
            }
            catch (e) {
                if (fullDebug){
                    console.log("Parent tab not found:", tab.openerTabId);
                }

                allTabs.addTab(newTab);
                return;
            }
            const newParent = new Tab(parentInfo.title, parentInfo.url, tab.openerTabId);
            allTabs.addTab(newParent);

            // add new tab to parent
            newParent.addTab(newTab);
        }

        allTabs.saveToStorage();
    }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (shouldIgnoreTab(tab)) {
        return;
    }

    if (fullDebug) {
        console.log("update")
        console.log(tabId);
        console.log(changeInfo);
        console.log(tab);
        console.log(tab.openerTabId);
        console.log("end update")
    }

    if (changeInfo.status === "complete") {
        const existing = allTabs.findTab(tabId);

        if (existing) {
            existing.title = tab.title;
            existing.url = tab.url;
            allTabs.saveToStorage();
        }
        else {
            let newTab = new Tab(tab.title, tab.url, tabId);
            allTabs.addTab(newTab);
        }
    }
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (fullDebug) {
        console.log("remove")
        console.log(tabId);
        console.log(removeInfo);
        console.log("end remove")
    }
    allTabs.removeTab(tabId);
    allTabs.saveToStorage();
})

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "open") {
        let extenionUrl = chrome.runtime.getURL("index.html");
        chrome.tabs.create({url: extenionUrl});
    }
});

chrome.runtime.onStartup.addListener(async () => {
    await allTabs.loadFromStorage();

    const openedTabs = await chrome.tabs.query({});

    for (const tab of openedTabs) {
        if (shouldIgnoreTab(tab)) {
            return;
        }

        if (!allTabs.findTab(tab.id)) {
            allTabs.addTab(new Tab(tab.title, tab.url, tab.id));
        }
    }

    console.log("Startup sync finished");
});
