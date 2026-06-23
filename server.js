const http = require("http");
const { execFile } = require("child_process");

const server = http.createServer((req, res) => {
    execFile("./ParamXML", [], (err, stdout, stderr) => {
        res.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        if (err) {
            res.end(String(err) + "\n" + stderr);
            return;
        }

        res.end(stdout || stderr);
    });
});

server.listen(process.env.PORT || 3000);
