const { execFile } = require("child_process");

execFile(
    "./ParamXML",
    ["--help"],
    (err, stdout, stderr) => {
        console.log(stdout);
        console.log(stderr);
    }
);
