const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
var fs = require("fs");
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
    //res.send(JSON.stringify("컴파일 결과"));

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

    exec(pythonErrorCommand, (error, stdout, stderr) => {
        let errorData = "";
        if (error) {
            console.error(`exec error: ${error}`);
            errorData = fs.readFileSync("error.txt", "utf-8");
            console.error(`stderr: ${errorData}`);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        res.send(JSON.stringify(`${stdout}`));
        // res.send(
        //     `${errorData}<br>${stderr}<br>${stdout}`
        // );

        //파일 삭제
        fs.unlinkSync("main.py");
        fs.unlinkSync("input.txt");
        fs.unlinkSync("error.txt");
    });
});
