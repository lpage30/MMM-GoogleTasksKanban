const BACKLOG_CATEGORY = 'backlog';
const INPROGRESS_CATEGORY = 'inprogress';
const ISDONE_CATEGORY = 'isdone';
const CATEGORIES = [BACKLOG_CATEGORY, INPROGRESS_CATEGORY, ISDONE_CATEGORY];
const isTaskCategory = (task, categoryName) => {
	let category = BACKLOG_CATEGORY;
	if (task.status !== 'completed' && task.due) {
		category = INPROGRESS_CATEGORY;
	} else if(task.status === 'completed') {
		category = ISDONE_CATEGORY;
	}
	for(let index = 0; index < task.subTasks.length; index += 1) {
		if (isTaskCategory(task.subTasks[index], categoryName)) return true;
	}
	return categoryName === category;
}
Module.register("MMM-GoogleTasksKanban",{
	// Default module config.
	defaults: {

		listName: '', // List Name resolves to listID
		listID: '', // List ID resolves to list Name
		reloadInterval: 5 * 60 * 1000, // every 10 minutes
        updateInterval: 10 * 1000, // every 10 seconds
		animationSpeed: 2.5 * 1000, // 2.5 seconds
		credentialsRelativeFilepath: './credentials.json',
		roTokenRelativeFilepath: './rotoken.json',
		rwTokenRelativeFilepath: ''
	},
	
	// Define required scripts
	getScripts: function () {
		return ["moment.js", "node_helper.js", "googleTasksAPI.js"];
	},

	// Define required scripts.
	getStyles: function () {
		return ["font-awesome.css", "MMM-GoogleTasksKanban.css"];
	},
	/* requestUpdate()
	* request a list content update
	*/
   requestUpdate: function () {
	    var self = this;
	    Log.log('REQUESTING UPDATE');
		this.sendSocketNotification('GET_GOOGLE_TASKS', { identifier: self.identifier, config: self.config });
   },
   /* scheduleVisualUpdateInterval()
     * Schedule visual update.
     */
    scheduleVisualUpdateInterval: function () {
        var self = this;

        self.updateDom(self.config.animationSpeed);

        setInterval(function () {
            if (self.pause) {
                return;
            }
            self.activeItem++;
            self.updateDom(self.config.animationSpeed);
        }, self.config.updateInterval);
    },

    /* scheduleUpdateRequestInterval()
     * Schedule visual update.
     */
    scheduleUpdateRequestInterval: function () {
        var self = this;

        setInterval(function () {
            if (self.pause) {
                return;
            }

            if (self.retry) {
                self.requestUpdate();
            }
        }, self.config.reloadInterval);
    },
	// Define start sequence
	start: function() {

		Log.log("Starting module: " + this.name);
		this.tasks = [];
		this.activeItem = 0;
		if (this.config.listName) {
			this.data.header = this.config.listName;
		}
		this.canUpdate = Boolean(config.rwTokenRelativeFilepath);
        this.loaded = false;
        this.error = false;
        this.errorMessage = '';
        this.retry = true;
		this.config.updateInterval = this.config.reloadInterval;
		this.requestUpdate();
		this.pause = false;
		this.scheduleUpdateRequestInterval();			
	},
	extractTask: function (payloadItem) {
		return Object.assign({ subTasks: [] }, payloadItem);
	},
	createTaskTree: function (payloadItems) {
		var self = this;
		const newTasks = [];
		if (!payloadItems) {
			Log.log("No tasks found.")
			return newTasks;
		}
		const taskMap = new Map();
		payloadItems.forEach(function (payloadItem) {
			if (payloadItem.parent) {
				return;
			}
			const task = self.extractTask(payloadItem);
			newTasks.push(task);
			taskMap.set(task.id, task);
		});
		let orphanedSubTasksCount = 1;
		while (orphanedSubTasksCount > 0) {
			// go through list culling out subtasks and adding them to their parent, until they all are accounted for.
			orphanedSubTasksCount = 0;
			payloadItems.forEach(function (payloadItem) {
				if (!payloadItem.parent || taskMap.has(payloadItem.id)) {
					return;
				}
				const task = taskMap.get(payloadItem.parent);
				if (task) {
					const subTask = self.extractTask(payloadItem);
					task.subTasks.push(subTask);
					taskMap.set(subTask.id, subTask);
				} else {
					orphanedSubTasksCount += 1;
				}
			});
		}
		return newTasks;
	},
	socketNotificationReceived: function(notification, payload) {
		var self = this;
		const updateEvent = `UPDATE_GOOGLE_TASKS_${self.identifier}`;
		const failedEvent = `FAILED_GOOGLE_TASKS_${self.identifier}`;
		if (notification === updateEvent) {
			self.config = Object.assign({}, self.config, payload.config || {});
			self.data.header = self.config.listName;
			self.loaded = true;
			self.tasks = self.createTaskTree(payload.tasks);
			self.updateDom(self.config.animationSpeed);
		}
		if (notification === failedEvent) {
			self.error = true;
			self.loaded = false;
			self.errorMessage = payload;
			self.updateDom(self.config.animationSpeed);
		}
	},

	addSubTaskToCard: function(wrapper, subTask, categoryName) {
		var self = this;

		var subtaskElem = document.createElement('div');
		subtaskElem.className = 'input-group overflow';

		var titleElement = document.createElement('span');
		titleElement.innerHTML = subTask.title;
		subtaskElem.appendChild(titleElement);

		if (subTask.subTasks.length > 0) {
			var subTasksWrapper = document.createElement('div');
			subTask.subTasks.forEach(function (subSubTask) {
				if (isTaskCategory(subSubTask, categoryName)) {
					self.addSubTaskToCard(subTasksWrapper, subSubTask, categoryName);
				}
			});
			if (subTasksWrapper.childElementCount > 0) {
				subtaskElem.appendChild(subTasksWrapper);
			}
		}
		wrapper.append(subtaskElem);
	},
	addTaskAsCard: function (wrapper, task, categoryName) {
		var self = this;

		var card = document.createElement('div');
		card.className = 'input-group overflow';
		var title = document.createElement('span');
		title.innerHTML = task.title
		if (task.due) {
			title.innerHTML += ` (${moment(task.due).fromNow()})`;
		}
		card.appendChild(title);
		if (task.notes) {
			var desc = document.createElement('div');
			var lines = task.notes.split('\n');
			if (lines.length > 1) {
				lines.forEach(function (line) {
					var lineElement = document.createElement('div');
					lineElement.innerHTML = `- ${line}`;
					desc.appendChild(lineElement);
				});
			} else {
				desc.innerHTML = lines[0];
			}
			card.appendChild(desc);
		}
		if (task.subTasks.length > 0) {
			var subTasksWrapper = document.createElement('div');
			task.subTasks.forEach(function (subTask) {
				if (isTaskCategory(subTask, categoryName)) {
					self.addSubTaskToCard(subTasksWrapper, subTask, categoryName);
				}
			});
			if (subTasksWrapper.childElementCount > 0) {
				card.appendChild(subTasksWrapper);
			}
		}
		wrapper.appendChild(card);
	},
	categoryToClassName: function (categoryName) {
		if(categoryName === BACKLOG_CATEGORY) return 'scrum-board backlog';
		if(categoryName === INPROGRESS_CATEGORY) return 'scrum-board in-progress';
		if(categoryName === ISDONE_CATEGORY) return 'scrum-board done';
		return 'scrum-board';
	},
	categoryToHeadingName: function (categoryName) {
		if(categoryName === BACKLOG_CATEGORY) return 'Backlog';
		if(categoryName === INPROGRESS_CATEGORY) return 'In Progress';
		if(categoryName === ISDONE_CATEGORY) return 'Done';
		return categoryName;
	},
	addCategorizedTasks: function (scrumBoard, categoryName) {
		var self = this;

		var category = document.createElement('div');
		category.className = self.categoryToClassName(categoryName);
		var heading = document.createElement('h2');
		heading.innerHTML = self.categoryToHeadingName(categoryName);
		category.appendChild(heading);

		self.tasks.forEach(function (task) {
			if (isTaskCategory(task, categoryName)) {
				self.addTaskAsCard(category, task, categoryName);
			}
		});
		scrumBoard.appendChild(category);
	},
	getDom: function() {
		var self = this;
		var page = document.createElement('div');
		page.className = 'form';
		var heading = document.createElement('h1');
		heading.innerHTML = self.config.listName;
		page.appendChild(heading);
		var scrumBoard = document.createElement('div');
		scrumBoard.className = 'flex';
		if (self.activeItem >= self.tasks.length) {
            self.activeItem = 0;
        }
		if (self.loaded) {
            if (self.tasks.length === 0) {
                scrumBoard.innerHTML = "NO_CARDS";
				return scrumBoard;
			}
			CATEGORIES.forEach(function (categoryName) {
				self.addCategorizedTasks(scrumBoard, categoryName);
			});
			return scrumBoard;
		}
		if (self.error) {
			scrumBoard.innerHTML = "Please check your config file, an error occured: " + self.errorMessage;
			scrumBoard.className = "xsmall dimmed";
		} else {
			scrumBoard.innerHTML = "<span class='small fa fa-refresh fa-spin fa-fw'></span>";
			scrumBoard.className = "small dimmed";
		}
		page.append(scrumBoard);
		return page;
	}
});
