const main = document.getElementsByTagName("main")[0];

// todo listen for changes
const { all: tabs} = await chrome.storage.local.get('all');
console.log("onstorage", tabs);

// first level
// todo find and implement tree drawing algorithm
for (const tab of tabs) {
    const head = CreateNode(tab.title, tab.url, tab.tabId);
    if (tab.tabs.length > 0) {
        // all next levels
        CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs, head);
    }
}

function CreateNode(title, url, tabId) {
    const node = document.createElement("div");
    node.className = "node";
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    const p = document.createElement('p');
    p.textContent = title;
    node.appendChild(p);

    const button = document.createElement('button');
    button.textContent = "Go to page";

    button.addEventListener('click', () => {
        chrome.tabs.update(tabId, { active: true });
    });

    node.appendChild(button);

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

function CreateNodeRecursive(title, url, tabId, tabs, parent)
{
    for (const tab of tabs) {
        // todo add lines between parents and kids
        const kid = CreateNode(tab.title, tab.url, tab.tabId);

        drawLine(parent, kid)

        if (tab.tabs.length > 0) {
            CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs, kid);
        }
    }
}

function drawLine(parent, kid) {
    const svg = document.getElementById('line-container');

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute('style', 'stroke:red;stroke-width:2');
    svg.appendChild(line);

    const rect1 = parent.getBoundingClientRect();
    const rect2 = kid.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const x1 = rect1.left - svgRect.left + rect1.width / 2;
    const y1 = rect1.top - svgRect.top + rect1.height / 2;
    const x2 = rect2.left - svgRect.left + rect2.width / 2;
    const y2 = rect2.top - svgRect.top + rect2.height / 2;

    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
}
