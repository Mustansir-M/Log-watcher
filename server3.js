const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const LOG_FILE = path.join(__dirname, './test.txt');
const PORT = 8080;

class FileMonitor {

    constructor(logFile) {
        this.logFile = logFile;
        this.lastModified = fs.statSync(logFile).mtime;  //last modified time
        this.lastReadPosition = 0; //// position upto which it is read
    }

    getLast10Lines() {
        const data = fs.readFileSync(this.logFile, 'utf8');  // to treat it as a string
        const lines = data.trim().split('\n'); // any whitespace is removed and data is split 
        this.lastReadPosition = data.length;
        return lines.slice(-10);  // to extract the last 10 lines
    }

    getNewLines() {
        const currentModified = fs.statSync(this.logFile).mtime; //current modification time
        if (currentModified > this.lastModified) {
            const data = fs.readFileSync(this.logFile, 'utf8');
            // const newLines = data.slice(this.lastReadPosition).split('\n').filter(line => line);
            const newLines = data.slice(this.lastReadPosition).split('\n');
            this.lastReadPosition = data.length;
            this.lastModified = currentModified;
            return newLines;
        }
        return [];
    }


    // getLast10Lines() {
    //     const fd = fs.openSync(this.logFile, 'r');
    //     const bufferSize = 1024;
    //     const buffer = Buffer.alloc(bufferSize);
    //     let filePos = fs.statSync(this.logFile).size; //to read the file backwards
    //     let lines = [];
    //     let remainingData = '';

    //     while (lines.length < 10 && filePos > 0) { //This loop continues until at least 10 lines are found or the beginning of the file is reached
    //         const readSize = Math.min(bufferSize, filePos);
    //         filePos -= readSize;
    //         fs.readSync(fd, buffer, 0, readSize, filePos);
    //         const chunk = buffer.toString('utf8', 0, readSize);
    //         remainingData = chunk + remainingData;
    //         lines = remainingData.split('\n');
    //     }

    //     fs.closeSync(fd);

    //     // If we have more lines than needed, take the last 10
    //     lines = lines.filter(line => line);  // Remove any empty lines
    //     this.lastReadPosition = fs.statSync(this.logFile).size;
    //     return lines.slice(-10);
    // }

    // getNewLines() {
    //     const currentModified = fs.statSync(this.logFile).mtime; // current modification time
    //     if (currentModified > this.lastModified) {
    //         const data = fs.readFileSync(this.logFile, 'utf8');
    //         const newLines = data.slice(this.lastReadPosition).split('\n').filter(line => line);
    //         this.lastReadPosition = data.length;
    //         this.lastModified = currentModified;
    //         return newLines;
    //     }
    //     return [];
    // }
}

const fileMonitor = new FileMonitor(LOG_FILE);

const server = http.createServer((req, res) => {
    if (req.url === '/log' && req.method === 'GET') {
        // res.writeHead(200, { 'Content-Type': 'text/html' });
        // res.end(`./index.html`);
        const filePath = path.join(__dirname, 'index.html');

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    }
});

const wss = new WebSocket.Server({ server, path: '/ws' });  //new WebSocket server (wss) that listens for WebSocket connections.
//server => allows web socket to be on the same port as http

wss.on('connection', (ws) => {
    const last10Lines = fileMonitor.getLast10Lines();  //as soon as the client connects we get the last 10 lines
    ws.send(last10Lines.join('\n')); //


    // to periodically send the new lines of code every 1000ms  
    const interval = setInterval(() => {
        const newLines = fileMonitor.getNewLines();
        if (newLines.length > 0) {  //checking if any new lines are there
            ws.send(newLines.join('\n'));
        }
    }, 1000);

    // when client disconnects
    ws.on('close', () => {
        clearInterval(interval);
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
