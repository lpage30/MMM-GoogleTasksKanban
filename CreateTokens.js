const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const RO_SCOPES = ['https://www.googleapis.com/auth/tasks.readonly'];
const RW_SCOPES = ['https://www.googleapis.com/auth/tasks'];
const CREDENTIALS_PATH = 'credentials.json';
const RO_TOKEN_PATH = 'rotoken.json';
const RW_TOKEN_PATH = 'rwtoken.json';

function createOAuth2Client () {
    const credentials = require(CREDENTIALS_PATH);
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    return new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);
}
function createNewToken(oauth2Client, scope, successCallback, failureCallback) {
  const isReadOnly = scope[0] === RO_SCOPES[0];
  const type = isReadOnly ? 'ReadOnly' : 'ReadWrite';
  const tokenPath = isReadOnly ? RO_TOKEN_PATH : RW_TOKEN_PATH;
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope,
  });
  console.log(`Authorize for ${type} access token by loading this URL and copying the code it presents> \n\t`, authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question(`Paste/Enter Code for ${type} access Token> `, (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
      if (err) return failureCallback(`Error Fetching ${type} Token. ${err}`);
      // Store the token to disk for later program executions
      fs.writeFile(tokenPath, JSON.stringify(token), (err) => {
        if (err) failureCallback.error(err);
      });
      successCallback(`${type} Token stored to ${tokenPath}`);
    });
  });
}

if (typeof module != 'undefined' && !module.parent) {
  console.log('Loading Credentials to create OAuth2 Google Client...');
  const oauth2Client = createOAuth2Client();
  console.log('Applying OAuth2 client to obtain RO Authorization URL for RO Token generation.');
  createNewToken(oauth2Client, RO_SCOPES, console.log, console.error);
  console.log('Applying OAuth2 client to obtain RW Authorization URL for RW Token generation.');
  createNewToken(oauth2Client, RW_SCOPES, console.log, console.error);
  console.log('Finished! copy these files to your MagicMirror/config directory. Rename them if there is a collision.');
} else {
  module.exports = {
    RW_SCOPES, RO_SCOPES,
    createOAuth2Client, createNewToken,
  };
}

