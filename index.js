const express = require("express");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

var fs = require("fs");
const os = require("os-utils");
const { exec } = require("child_process");

app.use(express.static(__dirname));
app.listen(8080, () => console.log("listening on 8080"));

app.get("/editor", (req, res) => {
    res.sendFile(__dirname + "/editor.html");
});

app.post("/run", (req, res) => {
    console.log(req.body);
    console.log(Object.values(req.body)[0]); //source
    console.log(Object.values(req.body)[1]); //input
    console.log("===========================");

    fs.writeFile("main.py", Object.values(req.body)[0], function (err) {
        if (err) throw err;
        console.log("source saved!");
    });
    fs.writeFile("input.txt", Object.values(req.body)[1], function (err) {
        if (err) throw err;
        console.log("input saved!");
    });

    const pythonCommand = `python main.py`;
    let pythonErrorCommand = `${pythonCommand} 2> error.txt`;

    if (Object.values(req.body)[1].trim()) {
        pythonErrorCommand = `${pythonCommand} < input.txt 2> error.txt`;
    }

    const startTime = new Date();
    exec(pythonErrorCommand, (error, stdout, stderr) => {
        const endTime = new Date();
        const executionTime = (endTime - startTime) / 1000; // in seconds

        let errorData = "";
        if (error) {
            console.error(`exec error: ${error}`);
            errorData = fs.readFileSync("error.txt", "utf-8");
            console.error(`stderr: ${errorData}`);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }

        const memoryUsage = (os.freememPercentage() * os.totalmem()) / 1024; // in KB
        os.cpuUsage((cpuUsage) => {
            console.log(`Execution Time: ${executionTime} seconds`);
            console.log(`Estimated Memory Usage: ${memoryUsage.toFixed(2)} KB`);
        });

        res.send(
            JSON.stringify(
                `${stdout}\n\nExecution Time: ${executionTime} seconds\nEstimated Memory Usage: ${memoryUsage.toFixed(
                    2
                )} KB`
            )
        );

        //파일 삭제
        fs.unlinkSync("main.py");
        fs.unlinkSync("input.txt");
        fs.unlinkSync("error.txt");
    });
});
