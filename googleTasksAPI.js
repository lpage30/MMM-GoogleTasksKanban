const { google } = require('googleapis');
const clientServiceMap = new Map();

function getClientService (identifier, credentials, token) {
    const {client_secret, client_id, redirect_uris} = credentials;
    const clientKey = identifier;
    let clientService = clientServiceMap.get(clientKey);
    if (!client) {
        const client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        client.setCredentials(token);
        const service = google.tasks({version: 'v1', auth: client });
        clientService = { client, service };
        clientServiceMap.set(clientKey,clientService);
    }
    return clientService;
}
module.exports = {
    getTasks: function (identifier, config, successCallback, failureCallback) {
        const self = this;
        const { credentials, token } = config;
        let clientService = null;
        try {
            clientService = getClientService(identifier, credentials, token);
        } catch (err) {
            failureCallback(`Failed to acquire authorized client. Reset token, or client credentials`);
            return;
        }
        if (!config.listID || !config.listName) {
            // resolve id -> name or Name -> id
            clientService.service.tasklists.list({
                maxResults: 100,
              }, (err, res) => {
                if (err) {
                    failureCallback(`The tasklists.list API returned an error: ${err}`);
                    return;
                }
                const taskLists = res.data.items;
                if (taskLists && taskLists.length > 0) {
                    taskLists.forEach((taskList) => {
                        if (config.listID && taskList.id === config.listID) {
                            config.listName = taskList.title;
                        } else if (config.listName && taskList.title === config.listName) {
                            config.listID = taskList.id;
                        }
                    });
                    if (!config.listID || !config.listName) {
                        console.error(`Failed to find list ID or Name. Using 1st list`);
                        config.listID = taskLists[0].id;
                        config.listName = taskLists[0].title;
                    }
                    self.getTasks(identifier, config, successCallback, failureCallback);
                } else {
                    failureCallback('No task lists found.');
                }
              });
        } else {
            // resolve id to list of tasks
            self.service.tasks.list({
                tasklist: config.listID,
            }, (err, res) => {
                if (err) {
                    failureCallback(`The tasks.list (${config.listID}) API returned an error: ${err}`);
                    return;
                }
                var payload = {config, tasks: res.data.items};
                successCallback(payload);
            });            
        }
    }
};
