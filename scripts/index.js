const main = document.getElementsByTagName("main")[0];

// todo listen for changes
let { all: tabs} = await chrome.storage.local.get('all');
console.log("onstorage", tabs);

// first level
// todo find and implement tree drawing algorithm
for (const tab of tabs) {
    CreateNode(tab.title, tab.url, tab.tabId);
    if (tab.tabs.count > 0) {
        // all next levels
        CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs);
    }
}

function CreateNode(title, url, tabId) {
    let node = document.createElement("div");
    node.className = "node";
    node.innerText = title;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    node.addEventListener("click", (e) => {
        chrome.tabs.update(tabId, { active: true });
    })

    node.onmousedown = dragMouseDown;

    main.appendChild(node);

    return node;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        node.style.top = (node.offsetTop - pos2) + "px";
        node.style.left = (node.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// todo implement kids creation
function CreateNodeRecursive(title, url, tabId, tabs)
{
    for (const tab in tabs) {
        // todo add lines between parents and kids
        let kid = CreateNode(tab.title, tab.url, tab.tabId);



        if (tab.tabs.count > 0) {
            CreateNodeRecursive(tab.title, tab.url, tab.tabId);
        }
    }
}