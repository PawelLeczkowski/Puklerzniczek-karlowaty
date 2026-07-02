const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

draw()

function draw() {
    tabs = chrome.storage.local.set({"all": this.tabs});
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(95, 50, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "blue";
    ctx.stroke();
}
