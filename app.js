import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import https from 'https';
import express from 'express';
import expressBodyParserErrorHandler from 'express-body-parser-error-handler';
import cors from 'cors';
import mysql from 'mysql';
import { createHash } from 'node:crypto'

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

function getTime(unformatted) {
    let options = {
        hour: 'numeric',
        minute: 'numeric',
        seconds: 'numeric',
        fractionalSecondDigits: 3,
        hour12: true
    };
    let date = new Date().toLocaleDateString('ja');
    let timezone = new Date().toLocaleTimeString('en', {timeZoneName: 'short'}).split(' ').pop();
    if (unformatted === true) {
        options.hour12 = false;
        let time = new Date().toLocaleTimeString('en', options);
        return `${date} ${time}`;
    }
    let time = new Date().toLocaleTimeString('en', options);
    return chalk.bgWhite.black(`${date}-${time} `)+chalk.bold.bgBlue.white(timezone);
};
function logWithTime(message, ip) {
    if (ip) {
        return console.log(`${getTime()} ${chalk.bold(ip)} ${message}`);
    };
    console.log(`${getTime()} ${message}`);
};

function errorResAndLog(ip, type, message) {
    logWithTime(message, ip);
    switch (type) {
        case 'auth':
            return {status: "error", auth_message: message};
        case 'ln':
            return {status: "error", ln_message: message};
    };
};

// Create web server
https.globalAgent = new https.Agent({
    keepAlive: true
})
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
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)}`, ip);
    const passwordHash = createHash('sha512').update(req.body.password).digest('hex');
    let userQueryRes = await query(`SELECT * FROM users WHERE username = ?;`, [req.body.username]);
    if (userQueryRes[0] === undefined) {
        return res.json(errorResAndLog(ip, 'auth', 'User does not exist.'));
    };
    if (userQueryRes[0].password !== passwordHash) {
        return res.json(errorResAndLog(ip, 'auth', 'Password incorrect.'));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE owner = ?', [req.body.username]);
    logWithTime('ln returned', ip)
    res.json({status: "ok", links: lnQueryRes});
});

app.post('/api/create', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)} Path: ${chalk.bold(req.body.path)} Dest: ${chalk.bold(req.body.destination)}`, ip);
    const passwordHash = createHash('sha512').update(req.body.password).digest('hex');
    let userQueryRes = await query(`SELECT * FROM users WHERE username = ?;`, [req.body.username]);
    if (userQueryRes[0] === undefined) {
        return res.json(errorResAndLog(ip, 'auth', 'User does not exist.'));
    };
    if (userQueryRes[0].password !== passwordHash) {
        return res.json(errorResAndLog(ip, 'auth', 'Password incorrect.'));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE path = ?', [req.body.path]);
    if (lnQueryRes[0] !== undefined) {
        return res.json(errorResAndLog(ip, 'ln', 'Path already exist.'));
    };
    let newID = crypto.randomUUID().toUpperCase();
    await query('INSERT INTO ln (id, owner, path, destination, creation_time) VALUES (?, ?, ?, ?, ?)',[newID, req.body.username, req.body.path, req.body.destination, getTime(true)]);
    logWithTime('ln created', ip)
    res.json({status: "ok"});
});

app.post('/api/delete', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)} ID: ${chalk.bold(req.body.id)}`, ip);
    const passwordHash = createHash('sha512').update(req.body.password).digest('hex');
    let userQueryRes = await query(`SELECT * FROM users WHERE username = ?;`, [req.body.username]);
    if (userQueryRes[0] === undefined) {
        return res.json(errorResAndLog(ip, 'auth', 'User does not exist.'));
    };
    if (userQueryRes[0].password !== passwordHash) {
        return res.json(errorResAndLog(ip, 'auth', 'Password incorrect.'));
    };
    logWithTime('ln deleted', ip)
    res.json({status: "ok"});
});

function checkAuth(user, hash) {

}

