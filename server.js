const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();

app.use(express.static("public"));

const upload = multer({
    dest: "uploads/"
});

app.post("/convert-to-xml", upload.single("file"), (req, res) => {
    const input = req.file.path;
    const output = input + ".xml";

    execFile(
        "./ParamXML",
        [input, "-d", "-o", output],
        (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                return res.status(500).send(stderr);
            }

            res.download(output, "output.xml", () => {
                fs.rmSync(input, { force: true });
                fs.rmSync(output, { force: true });
            });
        }
    );
});

app.post("/convert-to-prc", upload.single("file"), (req, res) => {
    const input = req.file.path;
    const output = input + ".prc";

    execFile(
        "./ParamXML",
        [input, "-a", "-o", output],
        (err, stdout, stderr) => {
            if (err) {
                console.error(stderr);
                return res.status(500).send(stderr);
            }

            res.download(output, "output.prc", () => {
                fs.rmSync(input, { force: true });
                fs.rmSync(output, { force: true });
            });
        }
    );
});

app.listen(process.env.PORT || 3000);
