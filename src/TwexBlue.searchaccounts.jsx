// TwexBlue.searchaccounts.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import terminalStyle from './modules/TwexBlue.terminal.module.css';
import pageStyle from './modules/TwexBlue.searchaccounts.module.css';

const SearchAccounts = () => {
  // constants
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [results, setResults] = useState([]);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [dataStore, setDataStore] = useState(true);
  const navigate = useNavigate();

  // check login status on mount
  useEffect(() => {
    checkLoginStatus();
  }, [isLoggedIn]);

  // validate app password
  const isValidAppPassword = (appPassword) => {
    const regexPattern = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
    return regexPattern.test(appPassword);
  };

  // login
  const handleLogin = async () => {
    if (!handle || !appPassword) {
      setLoginMessage('Handle and app password must not be empty.');
      return;
    }

    if (!isValidAppPassword(appPassword)) {
      setLoginMessage('Invalid app password.');
      return;
    }

    try {
      await axios.post('http://localhost:3001/login', { handle, appPassword }, { withCredentials: true });
      setTerminalOutput(`Login successful for: ${handle}`);
      setIsLoggedIn(true);
    } catch (error) {
      setLoginMessage('Login failed. Please check your data.');
      setHandle('');
      setAppPassword('');
    }
  };

  // check login status
  const checkLoginStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/check-login', { withCredentials: true });
      const { dataStore, serverRestarted, allTokensExpired, loggedIn, accessToken, noUserFound } = response.data;

      switch (true) {
        case !dataStore:
          setDataStore(false);
          setLoginMessage('Session management not available. Please try again later.');
          setIsLoggedIn(false);
          break;
        case serverRestarted:
          setLoginMessage('Server restarted. Please log in again.');
          setIsLoggedIn(false);
          break;
        case noUserFound:
          setLoginMessage('Please log in.');
          setIsLoggedIn(false);
          break;
        case allTokensExpired:
          setLoginMessage('Session expired. Please log in again.');
          setHandle('');
          setAppPassword('');
          setIsLoggedIn(false);
          break;
        default:
          setIsLoggedIn(loggedIn);
          if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          }
      }

      return loggedIn;
    } catch (error) {
      setLoginMessage('Error checking login status. Please try again later.');
      setIsLoggedIn(false);
      return false;
    }
  };

  // check handles
  const checkHandles = async () => {
    const userData = localStorage.getItem('userData');
    if (!userData) {
      navigate('/gethandles');
      return;
    }

    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      return;
    }

    let cursor;
    let allBlockedHandles = [];

    try {
      const storedHandles = JSON.parse(localStorage.getItem('userData')) || [];
      const searchResponse = await axios.post('http://localhost:3001/search', { handles: storedHandles }, { withCredentials: true });
      const { message } = searchResponse.data;
      setTerminalOutput(prevOutput => `${prevOutput}\n${message}`);

      do {
        const blockData = await fetchBlockedHandles(cursor);
        const blockedHandles = blockData.blocks.map(user => user.handle.split('.')[0]);
        allBlockedHandles = allBlockedHandles.concat(blockedHandles);
        cursor = blockData.cursor;
      } while (cursor);

      const updatedResults = searchResponse.data.results.map(handle => ({
        handle,
        isBlocked: allBlockedHandles.includes(handle.toLowerCase()),
      }));

      const blockedCount = updatedResults.filter(result => result.isBlocked).length;
      const notBlockedCount = updatedResults.filter(result => !result.isBlocked).length;

      setResults(updatedResults);
      setTerminalOutput(prevOutput => `${prevOutput}\n${updatedResults.length} handles found on Bluesky, of which ${blockedCount} are already blocked and ${notBlockedCount} are not blocked.\n\n`);

    } catch (error) {
      setTerminalOutput('')
      setTerminalOutput('Error checking handles:', error);
    }
  };

  // get blocked handles
  const fetchBlockedHandles = async (cursor) => {
    try {
      const blockResponse = await axios.post('http://localhost:3001/get-my-blocks', { cursor }, { withCredentials: true });
      return blockResponse.data;
    } catch (error) {
      setTerminalOutput('')
      setTerminalOutput('Error fetching blocked accounts:', error);
      throw error;
    }
  };

  // logout
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3001/logout', {}, { withCredentials: true });
      setIsLoggedIn(false);
    } catch (error) {
      setTerminalOutput('')
      setTerminalOutput('Error logging out:', error);
    } finally {
      setResults([]);
      setHandle('');
      setAppPassword('');
    }
  };

  // reset results
  const resetResults = () => {
    setTerminalOutput('');
    setResults([]);
  };

  // instructions
  const instructions_before_login = (
    <>
      <p>The next step requires logging in with a Bluesky account. Login by entering the handle and the app password generated in Bluesky,<br></br>
        which can only be used for this site.</p>
      <p>After successful login, it can be checked if the handles of the X/Twitter block list saved in the previous step also exist on Bluesky.</p>
      <p>The results will be displayed and can be used for further actions such as blocking or adding to a new list on Bluesky.</p>
    </>
  );

  // render JSX
  return (
    <div className={pageStyle.container}>
      {!isLoggedIn ? (
        <>
          <div className={pageStyle.instructions}>
            {instructions_before_login}
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}>
            {loginMessage && <p className={pageStyle.loginMessage}>{loginMessage}</p>}
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="user@bsky.social"
              className={pageStyle.inputField}
              disabled={!dataStore}
            />
            <input
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="App password"
              className={pageStyle.inputField}
              disabled={!dataStore}
            />
            <button type="submit" className={`${pageStyle.button} ${!dataStore ? pageStyle.buttonDisabled : ''}`} disabled={!dataStore}>
              Log in
            </button>
          </form>
        </>
      ) : (
        <div>
          <div className={pageStyle.terminalContainer}>
            <div className={terminalStyle.terminal}>
              <pre>
                {terminalOutput}
                {results.sort((a, b) => (a.isBlocked === b.isBlocked) ? 0 : a.isBlocked ? -1 : 1).map((item, index, arr) => {
                  let output = (
                    <div key={index}>
                      Handle:
                      <a href={`https://bsky.app/profile/${item.handle}.bsky.social`} target="_blank" rel="noopener noreferrer">
                        {item.handle}
                      </a> - {item.isBlocked ? 'Blocked' : 'Not blocked'}
                    </div>
                  );
                  if (index > 0 && arr[index - 1].isBlocked && !item.isBlocked) {
                    output = <React.Fragment key={index}><br />{output}</React.Fragment>;
                  } else {
                    output = <React.Fragment key={index}>{output}</React.Fragment>;
                  }
                  return output;
                })}
              </pre>
            </div>
          </div>
          <div className={pageStyle.buttonContainer}>
            <button onClick={checkHandles} className="button">Check handles</button>
            {results.length > 0 && <button onClick={resetResults} className="button">Reset</button>}
            <button onClick={handleLogout} className="button">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchAccounts;