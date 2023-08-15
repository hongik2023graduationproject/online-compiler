const express = require("express");
const app = express();

app.use(express.static(__dirname));
app.listen(8080, () => console.log("listening on 8080"));

app.get("/editor", (req, res) => {
    res.sendFile(__dirname + "/editor.html");
});
