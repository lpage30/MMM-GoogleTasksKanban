var NodeHelper = require('node_helper');
const { fetchTasks } = require('./googleTasksAPI');

const node_helper = {
    
    socketNotificationReceived: function (notification, payload) {
        const self = this;
        if (notification === 'GET_GOOGLE_TASKS') {
            fetchTasks(payload.identifier, payload.config, 
                function (config_payload) {
                    self.sendSocketNotification(`UPDATE_GOOGLE_TASKS_${payload.identifier}`, config_payload);
                },
                function (failureMessage) {
                    self.sendSocketNotification(`FAILED_GOOGLE_TASKS_${payload.identifier}`, failureMessage);
                }
            );
        }
    }
};

module.exports = NodeHelper.create(node_helper);