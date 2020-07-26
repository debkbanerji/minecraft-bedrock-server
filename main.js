const fs = require("fs");
const assert = require("assert");
const {Readable, Writable} = require("stream");
const readline = require("readline");
let {spawn} = require("child_process");
const pidusage = require("pidusage");
const express = require("express");
const {
    CONFIG_FILE_PATH,
    UNZIPPED_SERVER_FOLDER_NAME,
    UNZIPPED_SERVER_FOLDER_PATH,
    BACKUP_TYPES,
    MS_IN_MIN,
    MS_IN_SEC,
    platform
} = require("./utils.js");
if (platform === "win32") {
    spawn = require("cross-spawn");
}
const {downloadServerIfNotExists} = require("./download-server.js");
const {createServerProperties} = require("./create-server-properties.js");
const {
    createBackupBucketIfNotExists,
    downloadRemoteBackups,
    createBackup,
    restoreLocalBackup,
    restoreLatestLocalBackup,
    createUnscheduledBackup,
    getBackupList
} = require("./backup.js");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
const configFile = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
const config = JSON.parse(configFile);
assert(
    config["accept-official-minecraft-server-eula"],
    "You must accept the minecraft EULA on https://www.minecraft.net/en-us/download/server/bedrock/ by setting the flag in the config file to true in order to use this software"
);

const backupConfig = config.backup;
assert(backupConfig, `Could not find field 'backup' at root of config`);

const backupFrequencyMS = backupConfig["backup-frequency-minutes"] * MS_IN_MIN;
const minBackupFrequencyMinutes = 10;
assert(
    backupFrequencyMS > MS_IN_MIN * minBackupFrequencyMinutes,
    `Expected backup['backup-frequency-min'] to be greater than ${minBackupFrequencyMinutes}`
);
let isCurrentlyBackingUp = false;
let hasSentStopCommand = false;
const SAVE_QUERY_FREQUENCY = MS_IN_SEC * 5;
const UI_COMMAND_DELAY = MS_IN_SEC * 1;

let currentBackupType = null;

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

const MAX_STORED_LINES = 20;
const consoleLogBuffer = [];
const originalConsoleLog = console.log;

console.log = text => {
    originalConsoleLog(text);
    consoleLogBuffer.push((text || "").toString().replace(/\n/, "<br>"));
    if (consoleLogBuffer.length > MAX_STORED_LINES) {
        consoleLogBuffer.shift(); // delete first item.
    }
};

const uiConfig = config.ui;
if ((uiConfig || {}).enabled) {
    console.log("Starting express server");

    const expressApp = express();
    const router = express.Router();
    expressApp.use(express.json());

    router.get("/terminal-out", (req, res) => {
        res.send(
            [`${MAX_STORED_LINES} latest lines of terminal output:`]
                .concat(consoleLogBuffer)
                .join("<br>")
        );
    });

    router.get("/resource-usage", (req, res) => {
        pidusage(bs.pid, (err, stats) => {
            res.send({
                cpu: stats.cpu,
                elapsed: stats.elapsed,
                memory: stats.memory
            });
        });
    });

    router.post("/stop", (req, res) => {
        const {body} = req;
        const {passCodeHash} = {body};
        setTimeout(() => {
            rl.write("stop\n");
            res.sendStatus(200);
        }, UI_COMMAND_DELAY);
    });

    router.post("/trigger-manual-backup", (req, res) => {
        const {body} = req;
        const {passCodeHash} = {body};
        setTimeout(() => {
            rl.write("backup\n");
            res.sendStatus(200);
        }, UI_COMMAND_DELAY);
    });

    router.post("/trigger-print-resource-usage", (req, res) => {
        const {body} = req;
        const {passCodeHash} = {body};
        setTimeout(() => {
            rl.write("resource-usage\n");
            res.sendStatus(200);
        }, UI_COMMAND_DELAY);
    });

    router.post("/trigger-restore-backup", async (req, res) => {
        const {body} = req;
        const {passCodeHash} = {body};
        setTimeout(async () => {
            const backup = body.backup;
            const backups = await getBackupList();
            if (backups.includes(backup)) {
                // do this check to avoid weird injection errors
                rl.write(`force-restore ${body.backup}\n`);
            } else {
                console.log(`Backup ${body.backup} not found`);
            }
            res.sendStatus(200);
        }, UI_COMMAND_DELAY);
    });

    router.get("/backup-list", async (req, res) => {
        const backups = await getBackupList();
        res.send(backups);
    });

    expressApp.use("/", router);
    expressApp.use(express.static("static"));
    expressApp.listen(uiConfig.port);

    console.log(`Running UI for server on port ${uiConfig.port}\n`);
} else {
    console.log("Running server without UI\n");
}

let bs = null;

downloadServerIfNotExists(platform)
    .then(() => {
        createServerProperties().then(async () => {
            await createBackupBucketIfNotExists();
            await downloadRemoteBackups();
            await restoreLatestLocalBackup();

            console.log("\nStarting Minecraft Bedrock server...\n");
            console.log(
                `!!!!!!!!!!\nWARNING: Use the 'stop' command to stop the server gracefully, or you may lose non backed up up data\n!!!!!!!!!!\n`
            );

            const spawnServer = () => {
                bs = spawn("./bedrock_server", [], {
                    stdio: ["pipe", "pipe", "pipe", "ipc"],
                    cwd: UNZIPPED_SERVER_FOLDER_PATH
                });

                bs.stderr.on("data", error => {
                    console.error(`SERVER STDERROR: ${error}`);
                });

                bs.on("error", data => {
                    console.log(`SERVER ERROR: ${data}`);
                });

                bs.on("close", code => {
                    console.log(
                        `Minecraft server child process exited with code ${code}`
                    );
                });

                bs.stdout.on("data", async data => {
                    if (
                        /^(A previous save has not been completed\.|Saving\.\.\.|Changes to the level are resumed\.)/i.test(
                            data
                        )
                    ) {
                        // do nothing
                    } else if (
                        /^(Data saved\. Files are now ready to be copied\.)/i.test(
                            data
                        )
                    ) {
                        isCurrentlyBackingUp = true;

                        const backupStartTime = Math.floor(new Date() / 1000);
                        const backupType = currentBackupType;
                        console.log(
                            `Files ready for backup! Creating backup of server state at ${new Date(
                                backupStartTime * MS_IN_SEC
                            ).toLocaleString()} with type ${backupType}...`
                        );

                        const dataSplit = data
                            .toString()
                            .split(
                                "Data saved. Files are now ready to be copied."
                            );
                        backupFileListString = dataSplit[
                            dataSplit.length - 1
                        ].replace(/(\n|\r|\\n|\\r)/g, "");
                        await createBackup(
                            backupFileListString,
                            backupStartTime,
                            backupType
                        );
                        isCurrentlyBackingUp = false;
                        bs.stdin.write("save resume\r\n");
                        // stop here, since the backup before stop has completed;
                        if (hasSentStopCommand) {
                            clearInterval(saveQueryInterval);
                            clearInterval(saveHoldInterval);
                            bs.stdin.write("stop\r\n");
                            setTimeout(() => {
                                process.exit(0);
                            }, MS_IN_SEC);
                        }
                    } else {
                        console.log(`${data.toString().replace(/\n$/, "")}`);
                    }
                });
            };

            if (platform === "linux") {
                spawnServer();
            } else {
                throw "Unsupported platform - must be Ubuntu 18.3+ based";
            }

            let lastQueryWasSaveSucccessful = false;

            const saveQueryInterval = setInterval(() => {
                if (!isCurrentlyBackingUp && bs) {
                    bs.stdin.write("save query\r\n");
                }
            }, SAVE_QUERY_FREQUENCY);

            const triggerBackup = backupType => {
                if (!hasSentStopCommand && !isCurrentlyBackingUp) {
                    // don't backup if hasSentStopCommand is true
                    console.log(`\nTelling server to prepare for backup...`);
                    currentBackupType = backupType;
                    bs.stdin.write("save hold\r\n");
                }
            };
            const saveHoldInterval = setInterval(
                triggerBackup,
                backupFrequencyMS,
                BACKUP_TYPES.SCHEDULED
            );

            const printResourceUsage = () => {
                pidusage(bs.pid, function(err, stats) {
                    console.log(
                        `Resource Usage as of ${new Date().toLocaleString()}:`
                    );
                    console.log(
                        `CPU Percentage (from 0 to 100*vcore): ${stats.cpu.toFixed(
                            3
                        )}%`
                    );
                    console.log(`RAM: ${formatBytes(stats.memory)}`);
                    console.log(
                        `Wrapped Server Uptime : ${sec2time(
                            Math.round(stats.elapsed / 1000)
                        )} (hh:mm:ss)`
                    );
                });
            };

            const triggerGracefulExit = () => {
                console.log("\nBacking up, then killing Minecraft server...");
                hasSentStopCommand = true;
                currentBackupType = BACKUP_TYPES.ON_STOP;
                bs.stdin.write("save hold\r\n");
            };

            process.on("SIGINT", async () => {
                bs = null;
                await createUnscheduledBackup(Math.floor(new Date() / 1000));
                process.exit(1);
            });

            rl.on("line", async line => {
                if (/^(stop|exit)$/i.test(line)) {
                    triggerGracefulExit();
                } else if (/^(save.*)/i.test(line)) {
                    // intercept saves
                    console.log(
                        `Please use the 'backup' command to create a manual backup`
                    );
                } else if (/^(backup)/i.test(line)) {
                    triggerBackup(BACKUP_TYPES.MANUAL);
                } else if (/^(resource-usage)$/i.test(line)) {
                    printResourceUsage();
                } else if (/^(force-restore)/i.test(line)) {
                    const lineSplit = line.split("force-restore ");
                    if (lineSplit.length > 0) {
                        console.log(
                            "\n!!!!!!!!!!\nForcefully killing server and overwriting world state with specified backup - current world state will be lost"
                        );
                        bs.stdin.write("stop\r\n");
                        bs = null;
                        setTimeout(async () => {
                            await createUnscheduledBackup(
                                Math.floor(new Date() / 1000)
                            );
                            const didSuccessfulyRestore = await restoreLocalBackup(
                                lineSplit[1]
                            );
                            if (!didSuccessfulyRestore) {
                                console.log(
                                    "Unable to restore backup - restarting server as is"
                                );
                            }
                            spawnServer();
                        }, 2 * MS_IN_SEC);
                    } else {
                        console.error("USAGE: restore <BACKUP_FILE_NAME>");
                    }
                } else {
                    console.log(
                        "Recognized commands: backup, force-restore <BACKUP_FILE_NAME>, resource-usage, stop"
                    );
                    console.log(
                        "Piping the command directly to the underlying base Minecraft server since this command was not recognized by the node wrapper\n"
                    );
                    bs.stdin.write(`${line}\r\n`);
                }
            });
        });
    })
    .catch(error => {
        console.error(error);
    });
