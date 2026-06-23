const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();

app.use(express.static("public"));

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

const upload = multer({
    dest: "uploads/"
});

const hashToName = new Map();
const nameToHash = new Map();

if (fs.existsSync("ParamLabels.csv")) {
    const csv = fs.readFileSync(
        "ParamLabels.csv",
        "utf8"
    );

    for (const line of csv.split(/\r?\n/)) {
        const comma = line.indexOf(",");

        if (comma === -1) continue;

        const hash = line.slice(0, comma).trim();
        const name = line.slice(comma + 1).trim();

        if (!hash) continue;

        hashToName.set(hash.toLowerCase(), name);

        if (name) {
            nameToHash.set(name, hash);
        }
    }

    console.log(
        `[ParamLabels] Loaded ${hashToName.size} labels`
    );
}

function applyLabels(xml) {
    xml = xml.replace(
        /(hash=")(0x[0-9a-fA-F]+)(")/g,
        (_, p1, hash, p3) => {
            const label =
                hashToName.get(hash.toLowerCase());

            return label
                ? `${p1}${label}${p3}`
                : `${p1}${hash}${p3}`;
        }
    );

    xml = xml.replace(
        /<hash40([^>]*)>(0x[0-9a-fA-F]+)<\/hash40>/g,
        (_, attrs, hash) => {
            const label =
                hashToName.get(hash.toLowerCase());

            return label
                ? `<hash40${attrs}>${label}</hash40>`
                : `<hash40${attrs}>${hash}</hash40>`;
        }
    );

    return xml;
}

function removeLabels(xml) {
    xml = xml.replace(
        /(hash=")([^"]+)(")/g,
        (_, p1, value, p3) => {
            const hash =
                nameToHash.get(value);

            return hash
                ? `${p1}${hash}${p3}`
                : `${p1}${value}${p3}`;
        }
    );

    xml = xml.replace(
        /<hash40([^>]*)>([^<]+)<\/hash40>/g,
        (_, attrs, value) => {
            const hash =
                nameToHash.get(value.trim());

            return hash
                ? `<hash40${attrs}>${hash}</hash40>`
                : `<hash40${attrs}>${value}</hash40>`;
        }
    );

    return xml;
}

app.post(
    "/convert-to-xml",
    upload.single("file"),
    (req, res) => {
        const input = req.file.path;
        const output = `${input}.xml`;

        execFile(
            "./ParamXML",
            [
                input,
                "-d",
                "-o",
                output
            ],
            (err, stdout, stderr) => {
                if (err) {
                    console.error(stderr);

                    fs.rmSync(input, {
                        force: true
                    });

                    return res
                        .status(500)
                        .send(stderr);
                }

                try {
                    let xml =
                        fs.readFileSync(
                            output,
                            "utf8"
                        );

                    xml =
                        applyLabels(xml);

                    const labeled =
                        `${output}.labeled.xml`;

                    fs.writeFileSync(
                        labeled,
                        xml
                    );

                    res.download(
                        labeled,
                        "output.xml",
                        () => {
                            [
                                input,
                                output,
                                labeled
                            ].forEach(file => {
                                if (
                                    fs.existsSync(file)
                                ) {
                                    fs.rmSync(file, {
                                        force: true
                                    });
                                }
                            });
                        }
                    );
                } catch (e) {
                    console.error(e);

                    res.status(500)
                        .send(e.toString());
                }
            }
        );
    }
);

app.post(
    "/convert-to-prc",
    upload.single("file"),
    (req, res) => {
        const input = req.file.path;

        try {
            let xml =
                fs.readFileSync(
                    input,
                    "utf8"
                );

            xml =
                removeLabels(xml);

            const cleanXml =
                `${input}.clean.xml`;

            fs.writeFileSync(
                cleanXml,
                xml
            );

            const output =
                `${input}.prc`;

            execFile(
                "./ParamXML",
                [
                    cleanXml,
                    "-a",
                    "-o",
                    output
                ],
                (err, stdout, stderr) => {
                    if (err) {
                        console.error(stderr);

                        return res
                            .status(500)
                            .send(stderr);
                    }

                    res.download(
                        output,
                        "output.prc",
                        () => {
                            [
                                input,
                                cleanXml,
                                output
                            ].forEach(file => {
                                if (
                                    fs.existsSync(file)
                                ) {
                                    fs.rmSync(file, {
                                        force: true
                                    });
                                }
                            });
                        }
                    );
                }
            );
        } catch (e) {
            console.error(e);

            res.status(500)
                .send(e.toString());
        }
    }
);

app.get("/labels", (req, res) => {
    res.json({
        labels: hashToName.size
    });
});

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});
