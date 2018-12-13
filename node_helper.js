var NodeHelper = require('node_helper');
const { fetchTasks, putTask, deleteTask } = require('./googleTasksAPI');

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
        if (notification === 'PUT_GOOGLE_TASKS') {
            putTask(payload.identifier, payload.config, payload.item,
                function (successMessage) {
                    self.sendSocketNotification(`TRANSITIONED_GOOGLE_TASKS_${payload.identifier}`, successMessage);
                },
                function (failureMessage) {
                    self.sendSocketNotification(`FAILED_GOOGLE_TASKS_${payload.identifier}`, failureMessage);
                }
            );
        }
        if (notification === 'DELETE_GOOGLE_TASKS') {
            deleteTask(payload.identifier, payload.config, payload.item,
                function (successMessage) {
                    self.sendSocketNotification(`TRANSITIONED_GOOGLE_TASKS_${payload.identifier}`, successMessage);
                },
                function (failureMessage) {
                    self.sendSocketNotification(`FAILED_GOOGLE_TASKS_${payload.identifier}`, failureMessage);
                }
            );
        }
    }
};

module.exports = NodeHelper.create(node_helper);