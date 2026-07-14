class Div {
    constructor(divId, title, url, tabId, top, left, kids) {
        this.divId = divId;
        this.title = title;
        this.url = url;
        this.tabId = tabId;
        this.top = top;
        this.left = left;
        this.kids = kids;
    }
}

// ===================================================================================================

const main = document.getElementsByTagName("main")[0];

let divs = window.localStorage.getItem("divs");
const { all: tabs } = await chrome.storage.local.get('all');

// todo find and implement tree drawing algorithm
if (divs) {
    divs = JSON.parse(divs);
    RenderSavedNodesRecursive(divs);

    // todo check if two trees are equal if no add missing elements
    CompareTreesAndAddMissingElements();


    RedrawAllLines();
} else {
    divs = [];
    // todo listen for changes
    const { all: tabs } = await chrome.storage.local.get('all');
    console.log("onstorage", tabs);

    for (const tab of tabs) {
        let head = CreateNode(tab.title, tab.url, tab.tabId);
        divs.push(head);

        if (tab.tabs && tab.tabs.length > 0) {
            CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs, head);
        }
    }
    window.localStorage.setItem('divs', JSON.stringify(divs));
}

addEventListener("resize", () => {
    RedrawAllLines()
})

addEventListener("scroll", () => {
    RedrawAllLines()
})

// ===================================================================================================

function CreateNode(title, url, tabId, existingId = null, savedTop = 0, savedLeft = 0, savedKids = []) {
    const node = document.createElement("div");
    node.id = existingId || (new Date().getTime() + Math.floor(Math.random() * 10000000000000000)).toString();
    node.className = "node";
    node.style.top = savedTop + "px";
    node.style.left = savedLeft + "px";
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

    return new Div(node.id, title, url, tabId, savedTop, savedLeft, savedKids);

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

        // update divs
        let foundDiv = FindDiv(node.id);
        if (foundDiv) {
            foundDiv.top = (node.offsetTop - pos2);
            foundDiv.left = (node.offsetLeft - pos1);
            window.localStorage.setItem('divs', JSON.stringify(divs));
        }

        RedrawAllLines();

        window.localStorage.setItem('divs', JSON.stringify(divs));
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function FindDiv(divId, currentDivs = divs) {
    for (const div of currentDivs) {
        if (div.divId === divId) {
            return div;
        }

        if (div.kids && div.kids.length > 0) {
            const found = FindDiv(divId, div.kids);
            if (found) {
                return found;
            }
        }
    }
    return null;
}

function CreateNodeRecursive(title, url, tabId, tabs, parent) {
    for (const tab of tabs) {
        const kid = CreateNode(tab.title, tab.url, tab.tabId);

        DrawLine(parent, kid)

        parent.kids.push(kid)
        window.localStorage.setItem('divs', JSON.stringify(divs));

        if (tab.tabs.length > 0) {
            CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs, kid);
        }
    }
}

function DrawLine(parent, kid) {
    const svg = document.getElementById('line-container');``
    parent = document.getElementById(parent.divId);
    kid = document.getElementById(kid.divId);
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

function RedrawAllLines() {
    const svg = document.getElementById('line-container');

    svg.innerHTML = '';

    for (const div of divs) {
        for (const kid of div.kids) {
            DrawLine(div, kid);
            iterate(kid)
        }
    }

    function iterate(div) {
        for (const kid of div.kids) {
            DrawLine(div, kid);
            iterate(kid)
        }
    }
}

function RenderSavedNodesRecursive(currentDivs) {
    for (const div of currentDivs) {
        CreateNode(div.title, div.url, div.tabId, div.divId, div.top, div.left);

        if (div.kids && div.kids.length > 0) {
            RenderSavedNodesRecursive(div.kids);
        }
    }
}

function CompareTreesAndAddMissingElements(divsBranch = divs, tabsBranch = tabs) {
    let max = Math.max(divs.length, tabs.length)
    for (let i = 0; i < max; i++) {
        let div = divsBranch[i];
        let tab = tabsBranch[i];

        if (div === undefined) { // tab added
            CreateNewBranch(div, tab);
        } else if (tab === undefined) { // tab removed
            DestroyBranch(div, tab);
        } else if (div.tabId !== tab.tabId) { // tab updated
            DestroyBranch(div, tab);
            CreateNewBranch(div, tab);
        }
    }
}

function CreateNewBranch(divsBranch, tabsBranch) {
    for (const tab of tabsBranch) {
        let div = new Div(tab.id, ta.title, tab.url, tab.tabId, 0, 0);
        divsBranch.push(div);
        CreateNewBranch(div.kids, tab.tabs);
    }
}

function DestroyBranch(divsBranch, tabsBranch) {
    divsBranch.clear();
}
