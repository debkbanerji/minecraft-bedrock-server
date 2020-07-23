const REFRESH_RATE = 5000;
document.getElementById('refresh-frequency').innerHTML = REFRESH_RATE/1000;

function refreshTerminalOutput() {
    fetch("/terminal-out")
        .then(response => response.text())
        .then(text => {
            console.log(text);
            document.getElementById("server-terminal-output").innerHTML = text;
        });
}

setInterval(refreshTerminalOutput, REFRESH_RATE);
