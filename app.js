import fs from 'fs';
import chalk from 'chalk';
import https from 'https';
import express from 'express';
import expressBodyParserErrorHandler from 'express-body-parser-error-handler';
import cors from 'cors';
import mysql from 'mysql';

const app = express();
const jsonParser = express.json();

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