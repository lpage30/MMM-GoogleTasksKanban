var NodeHelper = require('node_helper');
const { getTasks } = require('./googleTasksAPI');

const node_helper = {
    
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'GET_GOOGLE_TASKS') {
            getTasks(payload.identifier, payload.config, function (config_payload) {
                self.sendSocketNotification(`UPDATE_GOOGLE_TASKS_${payload.identifier}`, config_payload);
            }, function (failureMessage) {
                self.sendSocketNotification(`FAILED_GOOGLE_TASKS_${payload.identifier}`, failureMessage);
            });
        }
    }
};

module.exports = NodeHelper.create(node_helper);