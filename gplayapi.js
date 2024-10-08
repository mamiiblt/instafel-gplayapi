const path = require("path");
const javaManager = require("./functions/javaManager")
const fs = require("fs");
const { spawn } = require("child_process");
const express = require("express")
const { exit } = require("process");
require("dotenv").config()
var javaDir;

const server = express()

let val = 0;
server.get("/keep_alive", async (req, res) => {
    val++;
    res.send({ time: val })
})

server.listen(3000, () => {
    console.log("GPlayAPI's Keep-alive server started on port 3000")
})

javaManager.installJava().then(methodResponse => {
    if (methodResponse.status == "SUCCESFULLY_INSTALLED" || methodResponse.status == "ALREADY_INSTALLED") {
        javaManager.getJavaExec().then(javaDirectory => {
            javaDir = javaDirectory;

            // read .env file and add into gplayapi.properties

            var propFile = [];
            propFile.push("email = " + process.env.email)
            propFile.push("aas_token = " + process.env.aas_token)
            propFile.push("github_releases_link = " + process.env.github_releases_link)
            propFile.push("github_pat = " + process.env.github_pat)

            fs.writeFileSync(path.join('src/main/resources', 'gplayapi.properties'), propFile.join("\n"))
            console.log("L > Properties file succesfully saved.")

            // remove old build if exists

            if (fs.existsSync('build')) {
                fs.rmSync('build', { recursive: true, force: true });
                console.log("L > Old build deleted")
            }

            // build jar
            console.log("L > Building jar")
            const command = `JAVA_HOME=${process.cwd()}/java_runtime/jdk-21.0.4/ ./gradlew jar`
            const process1 = spawn(command, [], { shell: true})

            process1.stdout.on('data', (data) => {
                data = data.toString().trim();
                console.log(data);
            });
            process1.stderr.on('data', (data) => {
                data = data.toString();
                console.log(data);
            });

            process1.on('close', async (code) => {
                if (code == 0) {
                    console.log("L > Starting GPlayAPI")
                    const command2 = `${javaDir} -jar ${path.join('build', 'libs', 'instafel-gplayapi.jar')}`
                    const process2 = spawn(command2, [], { shell: true})

                    process2.stdout.on('data', (data) => {
                        data = data.toString().trim();
                        console.log(data);
                    });
                    process2.stderr.on('data', (data) => {
                        data = data.toString();
                        console.log(data);
                    });

                    process2.on('close', async (code) => {
                        if (code == 0) {
                            console.log("L > GplayAPI exited, code " + code)
                        } else {
                            console.log("L > GplayAPI crashed, code " + code)
                            exit(-1)
                        }
                    })
                } else {
                    console.log("E > Build failed")
                    exit(-1)
                }
            })

        });
    } else if (methodResponse.status == "ERROR") {
        console.error("Error while running installJava function. err: " + methodResponse.err)
    }
})