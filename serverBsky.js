// serverBsky.js

import 'dotenv/config';
import express from 'express';
import pkg from '@atproto/api';
import fsPromises from 'fs/promises'; 
import cors from 'cors';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import RedisStore from "connect-redis";
import { createClient } from 'redis';
import { randomBytes } from 'crypto';
import cookieParser from 'cookie-parser';

// logging
const logMessage = async (message, error) => { 
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    let logMsg = `${timestamp} - ${message}`;
  
    if (error instanceof Error) {
      logMsg += `\n${error.stack.startsWith('Error:') ? '' : 'Error: '}${error.stack}`;
    }
  
    try {
      await fsPromises.appendFile('server.log', logMsg + '\n'); 
    } catch (err) {
      console.error('Error writing to the log file:', err);
    }
  };

// set up express
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(cookieParser());

// set up redis
const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(logMessage);
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'M31nS3ss10nG3h31mn1s',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'none'
    }
}));

let dataStore = false;

redisClient.on('ready', () => {
    dataStore = true;
});

redisClient.on('error', () => {
    dataStore = false;
});

// set up bsky agent
const { BskyAgent } = pkg;
const agent = new BskyAgent({ service: 'https://bsky.social' });

// generate server hash
let serverHash = randomBytes(64).toString('hex');

// validate app password
const isValidAppPassword = appPassword => /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(appPassword);

// validate session
const validateSession = (req, res, next) => {
    // check for server restart
    const clientHash = req.cookies.serverHash;
    if (clientHash && clientHash !== serverHash) {
        return res.status(200).json({
            loggedIn: false,
            serverRestarted: true,
            dataStore: dataStore
        });
    }

    // check for tokens
    const accessToken = req.session.accessToken;
    jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (!err) {
            req.user = decoded;
            return next();
        }

        const refreshToken = req.session.refreshToken;

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                if (req.session.userCreated) {
                    return res.status(200).json({
                        allTokensExpired: true,
                        dataStore: dataStore,
                        loggedIn: false
                    });
                } else {
                    return res.status(200).json({
                        noUserFound: true,
                        dataStore: dataStore,
                        loggedIn: false
                    });
                }
            }

            req.user = decoded;
            res.locals.tokenExpired = true;
            next();
        });
    });
};

// redis status check middleware
const checkRedisStatus = (_, res, next) => {
    if (!dataStore) {
        return res.status(200).json({
            loggedIn: false,
            dataStore: false
        });
    }
    next();
};

// generate tokens
const generateTokens = (handle) => {
    const accessToken = jwt.sign({ handle }, process.env.JWT_SECRET, { expiresIn: '2m' });
    const refreshToken = jwt.sign({ handle }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '10m' });
    return { accessToken, refreshToken };
};

// check-login-route
app.get('/check-login', checkRedisStatus, validateSession, async (req, res) => {
    // check for server restart
    const clientHash = req.cookies.serverHash;
    if (clientHash && clientHash !== serverHash) {
        return res.status(200).json({
            loggedIn: false,
            serverRestarted: true,
            dataStore: dataStore
        });
    }

    // check for tokens
    if (req.user) {
        if (res.locals.tokenExpired) {
            const newTokens = generateTokens(req.user.handle);
            req.session.accessToken = newTokens.accessToken;
            return res.status(200).json({
                loggedIn: true,
                accessToken: newTokens.accessToken,
                dataStore: true
            });
        }

        return res.status(200).json({
            loggedIn: true,
            accessToken: req.session.accessToken,
            dataStore: true
        });
    }
});

// login route
app.post('/login', async (req, res) => {
    const { handle, appPassword } = req.body;
    if (!isValidAppPassword(appPassword)) return res.status(400).send('Ungültiges App-Passwort.');

    try {
        await agent.login({ identifier: `${handle}`, password: appPassword });
        res.cookie('serverHash', serverHash, { httpOnly: true, sameSite: 'strict' });
        const { accessToken, refreshToken } = generateTokens(handle);
        req.session.accessToken = accessToken;
        req.session.refreshToken = refreshToken;
        req.session.userCreated = true;
        res.status(200).json({ message: `Login erfolgreich für: ${handle}`, accessToken });
    } catch (error) {
        logMessage('Login fehlgeschlagen:', error);
        res.status(401).send('Login fehlgeschlagen.');
    }
});

// search route
app.post('/search', validateSession, async (req, res) => {
    try {
        const { handles } = req.body;
        const handleCount = handles.length;
        const results = await Promise.all(handles.map(async handle => {
            const fullHandle = `${handle}.bsky.social`;
            try {
                const response = await agent.getProfile({ actor: fullHandle });
                return response.data ? handle : null;
            } catch (error) {
                return null;
            }
        }));
        res.json({ message: `Suchanfrage für ${handleCount} Handles blockierter Accounts von Twitter wird auf Bluesky durchgeführt...`, results: results.filter(handle => handle !== null) });
    } catch (error) {
        logMessage('Fehler bei der Suchanfrage:', error.message);
        res.status(500).send('Interner Serverfehler');
    }
});

// get-my-blocks-route
app.post('/get-my-blocks', validateSession, async (req, res) => {
    const { cursor } = req.body;
    try {
        const response = await agent.app.bsky.graph.getBlocks({ limit: 100, cursor });
        const myBlocks = response.data.blocks;
        const nextCursor = response.data.cursor;
        res.json({ blocks: myBlocks, cursor: nextCursor });
    } catch (error) {
        logMessage('Fehler beim Abrufen blockierter Accounts:', error);
        res.status(500).send('Interner Serverfehler');
    }
});

// logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            logMessage('Fehler beim Logout:', err);
            return res.status(500).send('Logout fehlgeschlagen.');
        }

        res.clearCookie('connect.sid');
        res.clearCookie('serverHash');
        res.status(200).send('Logout erfolgreich.');
    });
});

// error handling
app.use((err, _, res) => {
    logMessage('Serverfehler', err);
    res.status(500).send('Ein interner Serverfehler ist aufgetreten');
});

// run
app.listen(3001, () => {
    logMessage('Bluesky Port 3001');
});
