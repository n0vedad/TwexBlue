// TwexBlue.gethandles.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import terminalStyle from './modules/TwexBlue.terminal.module.css';
import pageStyle from './modules/TwexBlue.gethandles.module.css';

const GetHandles = () => {
  // constants
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState([]);
  const [fileUploaded, setFileUploaded] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef();

  // check if file was already uploaded
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      setFileUploaded(true);
      setOutput(['Data has already been uploaded.', ...(JSON.parse(userData) || [])]); 
    }
  }, []);

  // handle file upload
  const handleFileChange = (event) => {
    const newFile = event.target.files[0];
    if (newFile) {
      setFile(newFile);
      setOutput([`File ${newFile.name} selected.`]);
    } else {
      setOutput(["No file selected."]);
    }
  };

  // upload file
  const handleUpload = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('http://localhost:3000/upload', formData, {
          responseType: 'text',

          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setOutput([`Upload started... Progress: ${percentCompleted}%`]);
          }
        });

        const handles = extractHandles(response.data);
        console.log(handles)
        localStorage.setItem('userData', JSON.stringify(handles));
        setOutput(["Upload and processing completed successfully.", response.data]);
        setFileUploaded(true);
      } catch (error) {
        const errorMessage = error.response && error.response.data ? `Processing error: ${error.response.data}` : `Processing error: ${error.message}`;
        setOutput([`Upload failed. ${errorMessage}`]);
      }
    } else {
      setOutput(["No file selected."]);
    }
  };

  // reset page
  const resetPage = () => {
    localStorage.removeItem('userData');
    setFileUploaded(false);
    setOutput([]);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // go to search accounts
  const goToSearchAccounts = () => {
    navigate('/searchaccounts');
  };

  // helper function for extracting handles from response
  const extractHandles = (responseString) => {
    const handlesStart = responseString.indexOf("Handles:\n") + "Handles:\n".length;
    const handlesEnd = responseString.indexOf("\n\n", handlesStart);
    const handlesString = responseString.substring(handlesStart, handlesEnd);
    return handlesString.split('\n').map(handle => handle.substring(1));
  };

  // instructions
  const instructions = (
    <>
      <p>Uploading a file is required to proceed. This file should be the X/Twitter data archive or the file containing the block list.</p>
      <p>The block list is located in the data archive at the path "data/block.js". Only files in .zip or .js format are accepted.</p>
      <p>After selecting the file, it will be uploaded and processed. The results will then be displayed and stored locally for further use.</p>
      <p>After a successful upload, you can proceed to check the block list on Bluesky.</p>
    </>
  );

  // render JSX
  return (
    <div className={pageStyle.container}>
      <div className={pageStyle.instructions}>
        {instructions}
      </div>

      <div className={pageStyle.terminalContainer}>
        <div className={terminalStyle.terminal}>
          {output.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </div>

      {!fileUploaded && (
        <div className={pageStyle.buttonContainer}>
          <label htmlFor="fileInput" className={pageStyle.fileInputLabel}>
            Select data archive
          </label>
          <input
            type="file"
            id="fileInput"
            ref={fileInputRef}
            onChange={handleFileChange}
            className={pageStyle.hiddenFileInput}
          />
          <button onClick={handleUpload} className={pageStyle.button}>
            Upload data archive
          </button>
        </div>
      )}

      {fileUploaded && (
        <div className={pageStyle.buttonContainer}>
          <button onClick={resetPage} className={pageStyle.button}>Reset</button>
          <button onClick={goToSearchAccounts} className={pageStyle.button}>Next</button>
        </div>
      )}
    </div>
  );
};

export default GetHandles;