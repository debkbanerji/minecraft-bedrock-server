const REFRESH_RATE = 5000;
document.getElementById("refresh-frequency").innerHTML = REFRESH_RATE / 1000;

function formatBytes(a, b = 3) {
    if (0 === a) return "0 Bytes";
    const c = 0 > b ? 0 : b,
        d = Math.floor(Math.log(a) / Math.log(1024));
    return (
        parseFloat((a / Math.pow(1024, d)).toFixed(c)) +
        " " +
        ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    );
}

function sec2time(timeInSeconds) {
    var pad = function(num, size) {
            return ("000" + num).slice(size * -1);
        },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 3600),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return (
        pad(hours, 2) +
        ":" +
        pad(minutes, 2) +
        ":" +
        pad(seconds, 2) +
        "." +
        pad(milliseconds, 3)
    );
}

let inputAdminCodeHash;
function updateCurrentAdminCodeHash() {
    inputAdminCodeHash = sjcl.codec.hex
        .fromBits(
            sjcl.hash.sha256.hash(
                document.getElementById("admin-code").value || ""
            )
        )
        .toUpperCase();
}
document
    .getElementById("admin-code")
    .addEventListener("input", updateCurrentAdminCodeHash);
updateCurrentAdminCodeHash();

const interactionButtons = [
    "toggle-restore-backup-controls-button",
    "stop-server-button",
    "trigger-manual-backup-button",
    "print-resource-usage-button",
    "restore-backup-dropdown-button",
    "trigger-restore-backup-button"
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
    setSelectedBackup(document.getElementById("selected-backup").innerHTML);
}

function refreshTerminalOutput() {
    fetch("/terminal-out")
        .then(response => response.text())
        .then(text => {
            document.getElementById("server-terminal-output").innerHTML = text;
        });
}

function refreshServerResourceUsageInfo() {
    fetch("/resource-usage")
        .then(response => response.json())
        .then(stats => {
            const statsText = [];
            statsText.push(
                `Resource Usage as of ${new Date().toLocaleString()}:`
            );
            statsText.push(
                `CPU Percentage (from 0 to 100*vcore): ${stats.cpu.toFixed(3)}%`
            );
            statsText.push(`RAM: ${formatBytes(stats.memory)}`);
            statsText.push(
                `Wrapped Server Uptime : ${sec2time(
                    Math.round(stats.elapsed / 1000)
                )} (hh:mm:ss)`
            );
            document.getElementById(
                "server-resource-usage-text"
            ).innerHTML = statsText.join("\n");
        });
}

function refreshServerInfo() {
    refreshTerminalOutput();
    refreshServerResourceUsageInfo();
}

refreshServerInfo();
setInterval(refreshServerInfo, REFRESH_RATE);

function stopServer() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/stop", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify({
                    adminCodeHash: sjcl.codec.hex.fromBits(
                        sjcl.hash.sha256.hash(
                            inputAdminCodeHash + salt.toUpperCase()
                        )
                    )
                })
            );
            xhr.onload = () => {
                setSelectedBackup(null);
                enableInteraction();
            };
        });
}

function triggerManualBackup() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-manual-backup", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify({
                    adminCodeHash: sjcl.codec.hex.fromBits(
                        sjcl.hash.sha256.hash(
                            inputAdminCodeHash + salt.toUpperCase()
                        )
                    )
                })
            );
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function triggerPrintResourceUsage() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-print-resource-usage", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify({
                    adminCodeHash: sjcl.codec.hex.fromBits(
                        sjcl.hash.sha256.hash(
                            inputAdminCodeHash + salt.toUpperCase()
                        )
                    )
                })
            );
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function triggerRestoreBackup() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-restore-backup", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(
                JSON.stringify({
                    adminCodeHash: sjcl.codec.hex.fromBits(
                        sjcl.hash.sha256.hash(
                            inputAdminCodeHash + salt.toUpperCase()
                        )
                    ),
                    backup: document.getElementById("selected-backup").innerHTML
                })
            );
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function getBackupTimestampString(backup) {
    const numberPrefixRegex = /^\d*/;
    const timestamp = (backup || "").match(numberPrefixRegex)[0];
    return timestamp
        ? ` (Likely created on ${new Date(timestamp * 1000).toLocaleString()})`
        : "";
}

function refreshBackupList() {
    setSelectedBackup(null);
    fetch("/backup-list")
        .then(response => response.json())
        .then(backups => {
            const dropdownOptions = document.getElementById(
                "restore-backup-options"
            );
            dropdownOptions.innerHTML = "";
            backups.forEach(backup => {
                const option = document.createElement("a");
                option.className = "dropdown-item";
                option.textContent = backup + getBackupTimestampString(backup);
                option.value = backup;
                option.addEventListener("click", () =>
                    setSelectedBackup(backup)
                );
                dropdownOptions.appendChild(option);
            });
        });
}

function setSelectedBackup(backup) {
    document.getElementById("selected-backup").innerHTML = backup;
    document.getElementById(
        "selected-backup-timestamp"
    ).innerHTML = getBackupTimestampString(backup);
    if (!backup) {
        document.getElementById(
            "trigger-restore-backup-button"
        ).disabled = true;
    } else {
        document.getElementById(
            "trigger-restore-backup-button"
        ).disabled = false;
    }
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

document
    .getElementById("trigger-restore-backup-button")
    .addEventListener("click", triggerRestoreBackup);
