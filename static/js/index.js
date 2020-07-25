const REFRESH_RATE = 500;
document.getElementById("refresh-frequency").innerHTML = REFRESH_RATE / 1000;

const interactionButtons = [
    "stop-server-button",
    "trigger-manual-backup-button",
    "print-resource-usage-button"
].map(id => document.getElementById(id));
function disableInteraction() {
    interactionButtons.forEach(button => {
        button.disabled = true;
    });
}
function enableInteraction() {
    interactionButtons.forEach(button => {
        button.disabled = false;
    });
}

function refreshTerminalOutput() {
    fetch("/terminal-out")
        .then(response => response.text())
        .then(text => {
            document.getElementById("server-terminal-output").innerHTML = text;
        });
}

refreshTerminalOutput();
setInterval(refreshTerminalOutput, REFRESH_RATE);

function stopServer() {
    disableInteraction();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/stop", true);
    xhr.send(JSON.stringify({}));
    xhr.onload = () => {
        enableInteraction();
    };
}

function triggerManualBackup() {
    disableInteraction();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/trigger-manual-backup", true);
    xhr.send(JSON.stringify({}));
    xhr.onload = () => {
        enableInteraction();
    };
}

function triggerPrintResourceUsage() {
    disableInteraction();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/trigger-print-resource-usage", true);
    xhr.send(JSON.stringify({}));
    xhr.onload = () => {
        enableInteraction();
    };
}

function refreshBackupList() {
    fetch("/backup-list")
        .then(response => response.json())
        .then(backups => {
            const dropdownOptions = document.getElementById(
                "restore-backup-options"
            );
            dropdownOptions.innerHTML = "";
            backups.forEach(backup => {
                const option = document.createElement("option");
                option.textContent = backup;
                option.value = backup;
                dropdownOptions.appendChild(option);
            });
        });
}

document
    .getElementById("stop-server-button")
    .addEventListener("click", stopServer);

document
    .getElementById("trigger-manual-backup-button")
    .addEventListener("click", triggerManualBackup);

document
    .getElementById("print-resource-usage-button")
    .addEventListener("click", triggerPrintResourceUsage);

document
    .getElementById("toggle-restore-backup-controls-button")
    .addEventListener("click", refreshBackupList); // also refreshes it on close, but nbd
