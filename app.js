import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import https from 'https';
import express from 'express';
import expressBodyParserErrorHandler from 'express-body-parser-error-handler';
import cors from 'cors';
import mysql from 'mysql';
import { dirname } from 'path';

const app = express();
const jsonParser = express.json();
const bodyParserErrorHandler = expressBodyParserErrorHandler({
    onError: (err, req, res) => {
        const ip = chalk.bold(getIP(req));
        const country = chalk.bgBlue.bold(req.headers['cf-ipcountry']);
        logWithTime(`${ip} ${country} ${req.method} ${decodeURI(req.url)} Mode: ${chalk.bold(req.headers['sec-fetch-mode'])}`);
        logWithTime(`${ip} ${country} ${chalk.bgRed(err)}`);
    },
    errorMessage: (err) => {
        return "stinky request";
    }
});

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
const serverConfig = {
    ip: process.env.SERVER_LISTEN_IP,
    port: process.env.SERVER_LISTEN_PORT
};
const appConfig = {
    url: process.env.APP_URL,
    managementPath: process.env.APP_MANAGEMENT_PATH
}
const SSL = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
};
const disallowedCharaters = new RegExp('[^\x00-\x7F]+');
const corsOption = {
    origin: '*',
};

const db = mysql.createConnection(dbConfig);

function query(SQLquery, data) {
    return new Promise((resolve, reject) => {
        db.query(SQLquery, data, (err, response) => {
            if (err) reject(err);
            resolve(response);
        });
    });
};

function getIP(req){
    if (process.env.IP_MODE === 'live') {
        return req.headers['cf-connecting-ip'];
    };
    if (process.env.IP_MODE === 'dev') {
        return req.socket.remoteAddress;
    };
    return '0.0.0.0';
};

function getTime() {
    let options = {
        hour: 'numeric',
        minute: 'numeric',
        seconds: 'numeric',
        fractionalSecondDigits: 3
    };
    let date = new Date().toLocaleDateString('ja');
    let time = new Date().toLocaleTimeString('en', options);
    let timezone = new Date().toLocaleTimeString('en', {timeZoneName: 'short'}).split(' ').pop();
    return chalk.bgWhite.black(`${date}-${time} `)+chalk.bold.bgBlue.white(timezone);
};
function logWithTime(message) {
    console.log(`${getTime()} ${message}`);
};

// Create web server
const webServer = https.createServer(SSL, app);
webServer.listen(serverConfig.port, serverConfig.ip, () => {
    logWithTime(`Listening on ${serverConfig.ip}:${serverConfig.port}`);
});

app.use(cors(corsOption));

// Handle OPTIONS requests
// app.options('/', (req, res) => {
//     res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
//     res.end();
// });

// Handle /favicon.ico GET requests
app.get('/favicon.ico', (req, res) => {
    res.status(403);
    res.end();
});

app.get('/', async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    res.status(200);
    res.send(':3');
});

app.get(`/${appConfig.managementPath}`, async (req, res) => {
    const ip = getIP(req);
    const pathPrefix = '/' + appConfig.managementPath;
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    res.status(200);
    res.sendFile(path.resolve() + '/src/' + req.url.slice(pathPrefix.length));
});

app.get(`/*`, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    res.status(200);
    res.sendFile(path.resolve() + '/src/' + req.url.slice(1));
});

app.post('/api/get', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    logWithTime(`Username: ${chalk.bold(req.body.username)}`);
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify({test: "1234", test2: "54522"}));
});

app.post('/api/create', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    logWithTime(`Username: ${chalk.bold(req.body.username)} Path: ${chalk.bold(req.body.path)} Dest: ${chalk.bold(req.body.destination)}`);
    res.set('Content-Type', 'application/json');
    res.end();
});

app.post('/api/delete', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${chalk.bold(ip)} ${req.method} ${req.url}`);
    logWithTime(`Username: ${chalk.bold(req.body.username)} ID: ${chalk.bold(req.body.id)}`);
    res.set('Content-Type', 'application/json');
    res.end();
});