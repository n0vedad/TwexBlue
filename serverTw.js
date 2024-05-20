// serverTw.js

import 'dotenv/config';
import fs from 'fs';
import fsPromises from 'fs/promises'; 
import vm from 'vm';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import StreamZip from 'node-stream-zip';
import path from 'path';
import api from 'api'; 
const sdk = api('@utools/v1.0#1siwz3blrlsew2x');

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

// express middleware
const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));

// set up multer
const fileFilter = (_, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension === '.zip' || fileExtension === '.js') {
    cb(null, true);
  } else {
    cb(new Error('Ungültige Dateiendung beim Upload. Nur .zip und .js Dateien sind erlaubt.'), false);
  }
};
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage, fileFilter: fileFilter });

// extract user IDs from block.js file
const extractUserIds = async (filePath) => {
  try {
    let data;
    logMessage(`Verarbeitete Datei: ${filePath}`);

    if (filePath.endsWith('.zip')) {
      logMessage('Verarbeite als ZIP-Datei');
      const zip = new StreamZip.async({ file: filePath });
      data = await zip.entryData('data/block.js').catch(() => {
        throw new Error('block.js wurde im ZIP-Archiv nicht gefunden.');
      });
      await zip.close();

    } else if (filePath.endsWith('.js')) {
      logMessage('Verarbeite als JS-Datei');
      data = await fsPromises.readFile(filePath, 'utf8');
    }

    const context = vm.createContext({
      window: { YTD: new Proxy({}, { get: (target, name) => target[name] || (target[name] = {}) }) }
    });

    vm.runInContext(data.toString(), context);

    if (!context.window.YTD.block || !context.window.YTD.block.part0) {
      throw new Error('Die Struktur der block.js Datei ist ungültig oder die Datei ist leer.');
    }

    const userIds = context.window.YTD.block.part0.map(entry => entry.blocking.accountId);
    return userIds;
  } catch (err) {
    logMessage('Fehler bei der Dateiverarbeitung:', err);
    throw err
  }
}

// call Twitter API to fetch user details
const fetchUserDetails = async (idsForLookup) => {
  let allUserDetails = {
    handles: [],
  };

  try {
    // Look up userIds in batches of up to 100 (due to Twitter API limits)
    for (let i = 0; i < idsForLookup.length; i += 100) {
      const idSubset = idsForLookup.slice(i, i + 100);

      const response = await sdk.getUserByIdOrNameLookUpUsingGET({
        apiKey: process.env.APIKEY,
        userId: idSubset.join(','), 
        accept: '*/*'
      });

      if (response.data) {
        const users = JSON.parse(response.data.data);
        users.forEach(user => {
          allUserDetails.handles.push(user.screen_name);
        });
      }
    }
  } catch (error) {
    logMessage("Fehler beim Abrufen der Benutzerdetails: ", error);
  }

  return allUserDetails;
};

// main
const main = async () => {
  app.post('/upload', async (req, res) => {
    const uploadMiddleware = upload.single('file');

    uploadMiddleware(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).send(err.message);

      } else if (err) {
        logMessage(err.message)
        return res.status(500).send(err.message);
      }

      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }

      try {
        const filePath = req.file.path;
        const userIds = await extractUserIds(filePath);
        const userDetails = await fetchUserDetails(userIds);

        const responseMessage = `Processed ${userDetails.handles.length} user IDs.\n\n` +
          `Handles:\n${userDetails.handles.map(handle => '@' + handle).join('\n')}\n\n`;

        res.send(responseMessage);
        
      } catch (error) {
        if (!res.headersSent) {
          res.status(500).send(error.message || 'Error processing file.');
        }
      } finally {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          logMessage(`File deleted: ${req.file.path}`);
        }
      }
    });
  });

  // error handling
  app.use((err, _, res) => {
    logMessage('Serverfehler', err);
    res.status(500).send('Ein interner Serverfehler ist aufgetreten');
  });

  // run
  app.listen(3000, () => {
    logMessage('Twitter Port 3000');
  });
}

main().catch(error => logMessage('Fehler beim Starten des Servers', error));

