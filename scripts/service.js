class Tab {
    constructor(title, url, tabId) {
        this.title = title;
        this.url = url;
        this.tabId = tabId;
        this.tabs = []
    }

    addTab(tab) {
        this.tabs.push(tab);
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
}

allTabs = new Tabs();
const fullDebug = true;

chrome.tabs.onCreated.addListener( async tab => {
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
            const parentInfo = await allTabs.getTabInfo(tab.openerTabId);
            const newParent = new Tab(parentInfo.title, parentInfo.url, newTab.openerTabId);
            allTabs.addTab(newParent);

            // add new tab to parent
            newParent.addTab(newTab);
        }

        allTabs.saveToStorage();
    }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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
