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
let { all: tabs } = await chrome.storage.local.get('all');

if (divs) {
    divs = JSON.parse(divs);
    RenderSavedNodesRecursive(divs);

    CompareTreesAndAddMissingElements();

    RedrawAllLines();
} else {
    divs = [];
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

chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") {
        return;
    }

    const tabs = changes.all.newValue;

    divs = JSON.parse(localStorage.getItem("divs"));

    main.innerHTML = '<svg id="line-container"></svg>';

    RenderSavedNodesRecursive(divs);

    CompareTreesAndAddMissingElements(divs, tabs);

    RedrawAllLines();
});

addEventListener("resize", () => {
    RedrawAllLines()
})

addEventListener("scroll", () => {
    RedrawAllLines()
})

// ===================================================================================================

function CreateNode(title, url, tabId, parent = null, existingId = null, savedTop = null, savedLeft = null, savedKids = []) {
    const node = document.createElement("div");
    node.id = existingId || crypto.randomUUID();
    node.className = "node";

    if (savedTop === null || savedLeft === null) {
        ({ top: savedTop, left: savedLeft } = FindPosition(parent));
    }

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
        const kid = CreateNode(tab.title, tab.url, tab.tabId, parent);

        DrawLine(parent, kid)

        parent.kids.push(kid)
        window.localStorage.setItem('divs', JSON.stringify(divs));

        if (tab.tabs.length > 0) {
            CreateNodeRecursive(tab.title, tab.url, tab.tabId, tab.tabs, kid);
        }
    }
}

function DrawLine(parent, kid) {
    const svg = document.getElementById('line-container');
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
        CreateNode(div.title, div.url, div.tabId, null, div.divId, div.top, div.left, div.kids);

        if (div.kids && div.kids.length > 0) {
            RenderSavedNodesRecursive(div.kids);
        }
    }
}

function CompareTreesAndAddMissingElements(divsBranch = divs, tabsBranch = tabs, parent = null) {
    const divMap = new Map();
    divsBranch.forEach(div => divMap.set(div.tabId, div));

    const tabMap = new Map();
    tabsBranch.forEach(tab => tabMap.set(tab.tabId, tab));

    for (let i = divsBranch.length - 1; i >= 0; i--) {
        const currentDiv = divsBranch[i];
        if (!tabMap.has(currentDiv.tabId)) {
            DestroyBranch(currentDiv);
            divsBranch.splice(i, 1);
        }
    }

    tabsBranch.forEach((tab) => {
        const existingDiv = divMap.get(tab.tabId);

        if (existingDiv) {
            if (existingDiv.title !== tab.title || existingDiv.url !== tab.url) {
                existingDiv.title = tab.title;
                existingDiv.url = tab.url;
                const domEl = document.getElementById(existingDiv.divId);
                if (domEl) {
                    const p = domEl.querySelector('p');
                    if (p) p.textContent = tab.title;
                }
            }
            if (!existingDiv.kids) {
                existingDiv.kids = [];
            }
            CompareTreesAndAddMissingElements(existingDiv.kids, tab.tabs || [], existingDiv);
        } else {
            CreateNewBranch(divsBranch, tab, parent);
        }
    });

    window.localStorage.setItem('divs', JSON.stringify(divs));
}

function CreateNewBranch(parentKidsArray, tab, parent = null) {
    let newDiv = CreateNode(tab.title, tab.url, tab.tabId, parent);
    parentKidsArray.push(newDiv);

    if (parent !== null) {
        DrawLine(parent, newDiv);
    }

    if (tab.tabs && tab.tabs.length > 0) {
        tab.tabs.forEach(kidTab => {
            CreateNewBranch(newDiv.kids, kidTab, newDiv);
        });
    }
}

function FindPosition(parent) {
    if (!parent) {
        return {top: 100, left: 100};
    }

    const offset = 280;
    const step = 130;

    const left = parent.left + offset;

    for (let i = 0; i < 100; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        const distance = Math.ceil(i / 2) * step;

        const top = parent.top + direction * distance;

        if (IsPositionFree(top, left)) {
            return {top, left};
        }
    }

    return {top: parent.top, left};
}

function IsPositionFree(top, left, width = 200, height = 100) {
    const margin = 10;

    const allNodes = document.getElementsByClassName('node')

    for (const node of allNodes) {
        const rect = node.getBoundingClientRect();

        if (left < node.offsetLeft + rect.width + margin &&
            left + width > node.offsetLeft - margin &&
            top < node.offsetTop + rect.height + margin &&
            top + height > node.offsetTop - margin) {
            return false;
        }
    }
    return true;
}

function DestroyBranch(div) {
    const domEl = document.getElementById(div.divId);
    if (domEl) {
        domEl.remove();
    }
    if (div.kids && div.kids.length > 0) {
        div.kids.forEach(kid => DestroyBranch(kid));
    }
}
