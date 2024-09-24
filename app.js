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
    managementPath: process.env.APP_MANAGEMENT_PATH,
    lnPrefix: process.env.LN_PREFIX,
    maxUsernameLength: 100,
    maxPasswordLength: 512,
    maxPathLength: 2000,
    maxDestinationLength: 65536
}
const IPToken = process.env.IP2LOCATION_API_KEY;
const SSL = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
};
const disallowedCharaters = new RegExp('[^\x00-\x7F]|[<>#%{}|^~\\[\\]]');
const disallowedPathCharaters = new RegExp('[;?@=&]+');
const corsOption = {
    origin: '*',
};
const fullPrefix = `${appConfig.url}/${appConfig.lnPrefix}/`;

const allowedFiles = ['index.css', 'index.js']
const blacklistedUserAgent = ['Go-http-client/1.1'];

const db = mysql.createPool(dbConfig);

function query(SQLquery, data) {
    return new Promise((resolve, reject) => {
        db.query(SQLquery, data, (err, response) => {
            if (err) reject(err);
            resolve(response);
        });
    });
};

async function getIPInfo(ip) {
    let response = await fetch(`https://api.ip2location.io/?key=${IPToken}&ip=${ip}`);
    return await response.json();
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

function formatTime(date, log) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    let millisecond = date.getMilliseconds();
    let timezone = date.toLocaleTimeString('en', {timeZoneName: 'short'}).split(' ').pop();;
    if (log === true) {
        return `${chalk.bold.bgWhiteBright.black(`${year}/${month}/${day}-${hour}:${minute}:${second}.${millisecond}`)}${chalk.bold.bgBlue.white(timezone)}`
    }
    return `${year}/${month}/${day}-${hour}:${minute}:${second}.${millisecond}`;
}

function getTime(log) {
    const date = new Date();
    return formatTime(date, log);
};

function logWithTime(message, ip) {
    if (ip) {
        return console.log(`${getTime(true)} ${chalk.bold(ip)} ${message}`);
    };
    console.log(`${getTime(true)} ${message}`);
};

function errorResAndLog(ip, type, message) {
    logWithTime(chalk.bgWhite.red(message), ip);
    switch (type) {
        case 'auth':
            return {status: "error", auth_message: message};
        case 'ln':
            return {status: "error", ln_message: message};
        case 'delete':
            return {status: "error", delete_message: message};
        case 'plaintext':
            return message;
    };
};

function authInputCheck(name, pass) {
    if (disallowedCharaters.test(name)) {
        return 'Invalid character(s) in username.';
    };
    if (name.length > appConfig.maxUsernameLength) {
        return 'Invalid username.';
    };
    if (pass.length > appConfig.maxPasswordLength) {
        return 'Invalid password.';
    }
    return false;
};

function pathAndDestinationCheck(path, destination) {
    if (disallowedCharaters.test(path) || disallowedPathCharaters.test(path)) {
        return 'Invalid character(s) in path.';
    };
    if (disallowedCharaters.test(destination)) {
        return 'Invalid character(s) in destination.';
    };
    if (path === '') {
        return 'Path cannot be blank.';
    };
    if (path.length > (appConfig.maxPathLength - fullPrefix.length)) {
        return 'Path length exceeded limit.';
    };
    if (destination.length > appConfig.maxDestinationLength) {
        return 'Destination length exceeded limit.';
    };
    return false;
};

async function authCheck(user, pass) {
    let userQueryRes = await query(`SELECT * FROM users WHERE username = ?;`, [user]);
    if (userQueryRes[0] === undefined) {
        return 'User does not exist.';
    };
    const passwordHash = createHash('sha512').update(pass).digest('hex');
    if (userQueryRes[0].password !== passwordHash) {
        return 'Password incorrect.';
    };
    return false;
};

async function updateUser(username, ip) {
    await query('UPDATE users SET last_seen = ?, last_seen_ip = ? WHERE username = ?', [getTime(), ip, username]);
};

function checkAllowedFiles(url) {
    let match = false
    allowedFiles.forEach((file) => {
        if (url.slice(1) === file) { match = true };
    });
    return match;
};

function checkBlacklistedUserAgent(useragent) {
    let match = false
    blacklistedUserAgent.forEach((ua) => {
        if (useragent === ua) { match = true };
    });
    return match;
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

app.post('/api/get', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)}`, ip);
    let message;
    if (message = authInputCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    if (message = await authCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE owner = ?', [req.body.username]);
    updateUser(req.body.username, ip);
    logWithTime('ln returned', ip);
    res.json({status: "ok", url: appConfig.url, prefix: appConfig.lnPrefix, links: lnQueryRes});
});

app.post('/api/create', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)} Path: ${chalk.bold(req.body.path)} Dest: ${chalk.bold(req.body.destination)}`, ip);
    let message;
    if (message = authInputCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    if (message = pathAndDestinationCheck(req.body.path, req.body.destination)) {
        return res.json(errorResAndLog(ip, 'ln', message));
    };
    if (message = await authCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE path = ?', [req.body.path]);
    if (lnQueryRes[0] !== undefined) {
        return res.json(errorResAndLog(ip, 'ln', 'Path already exist.'));
    };
    let newID = crypto.randomUUID().toUpperCase();
    switch (req.body.enableUseLimit) {
        case true:
            await query('INSERT INTO ln (id, owner, path, destination, creation_time, use_limit) VALUES (?, ?, ?, ?, ?, ?)',[newID, req.body.username, req.body.path, req.body.destination, getTime(), req.body.useLimit]);
            break;
        case false:
            await query('INSERT INTO ln (id, owner, path, destination, creation_time) VALUES (?, ?, ?, ?, ?)',[newID, req.body.username, req.body.path, req.body.destination, getTime()]);
            break;
    };
    updateUser(req.body.username, ip);
    logWithTime(chalk.green(`${newID} created`), ip);
    res.json({status: "ok"});
});

app.post('/api/delete', jsonParser, bodyParserErrorHandler, async (req, res) => {
    const ip = getIP(req);
    logWithTime(`${req.method} ${req.url}`, ip);
    logWithTime(`Username: ${chalk.bold(req.body.username)} ID: ${chalk.bold(req.body.id)}`, ip);
    if (disallowedCharaters.test(req.body.username)) {
        return res.json(errorResAndLog(ip, 'auth', 'Invalid character(s) in username.'));
    };
    let message;
    if (message = authInputCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    if (message = await authCheck(req.body.username, req.body.password)) {
        return res.json(errorResAndLog(ip, 'auth', message));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE id = ?', [req.body.id]);
    if (lnQueryRes[0] === undefined) {
        return res.json(errorResAndLog(ip, 'delete', 'ln does not exist.'));
    };
    await query('DELETE FROM ln WHERE id = ?', [req.body.id]);
    updateUser(req.body.username, ip);
    logWithTime(chalk.red(`${req.body.id} deleted`), ip);
    res.json({status: "ok"});
});

app.get(`/${appConfig.lnPrefix}/*`, async (req, res) => {
    const ip = getIP(req);
    const prefix = '/' + appConfig.lnPrefix + '/';
    logWithTime(`${req.method} ${req.url} Referer: ${req.headers.referer}`, ip);
    if (checkBlacklistedUserAgent(req.headers['user-agent'])) {
        res.status(403);
        return res.end(errorResAndLog(ip, 'plaintext', 'Forbidden User Agent.'));
    };
    let lnQueryRes = await query('SELECT * FROM ln WHERE path = ?', [req.url.slice(prefix.length)]);
    if (lnQueryRes[0] === undefined) {
        res.status(404);
        return res.end(errorResAndLog(ip, 'plaintext', 'ln not found.'));
    };
    if (lnQueryRes[0].use_limit > 0 && lnQueryRes[0].use_count >= lnQueryRes[0].use_limit) {
        res.status(403);
        return res.end(errorResAndLog(ip, 'plaintext', 'ln use limit exceeded.'));
    };
    let ipQueryRes = await query('SELECT * FROM ip WHERE ip = ?', [ip]);
    let ipInfo;
    if (!ipQueryRes[0]) {
        ipInfo = await getIPInfo(ip);
        await query('INSERT INTO ip SET ip = ?, country_code = ?, country_name = ?, region_name = ?, city_name = ?, is_proxy = ?',[ip, ipInfo.country_code, ipInfo.country_name, ipInfo.region_name, ipInfo.city_name, ipInfo.is_proxy]);
        ipQueryRes = await query('SELECT * FROM ip WHERE ip = ?', [ip]);
    };
    await query('UPDATE ln SET use_count = ?, last_used = ? WHERE id = ?', [lnQueryRes[0].use_count + 1, getTime(), lnQueryRes[0].id]);
    query('INSERT INTO log (time, path, ip, user_agent, referer, country_code, country_name, region_name, city_name) VALUES (?, ?, ? ,? ,? ,? ,? ,? ,?)',[getTime(), req.url.slice(prefix.length), ip, req.headers['user-agent'], req.headers.referer, ipQueryRes[0].country_code, ipQueryRes[0].country_name, ipQueryRes[0].region_name, ipQueryRes[0].city_name]);
    logWithTime(chalk.cyan(`Redirected to ${lnQueryRes[0].destination}`), ip);
    res.redirect(307, lnQueryRes[0].destination);
});

app.get(`/*`, async (req, res) => {
    const ip = getIP(req);
    if (!checkAllowedFiles(req.url)) {
        res.status(404);
        return res.end();
    };
    logWithTime(`${req.method} ${req.url}`, ip);
    res.status(200);
    res.sendFile(path.resolve() + '/src/' + req.url.slice(1));
});