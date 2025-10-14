(function() {
  Fliplet.RecordContainer = Fliplet.RecordContainer || {};

  const recordContainerInstances = {};
  const isInteract = Fliplet.Env.get('interact');
  const sampleData = isInteract ? { id: 1, data: {} } : undefined;
  const columnsForSocialDataSource = [
    'Email', 'Data Source Id', 'Data Source Entry Id', 'Datetime', 'Type', 'Device Uuid'
  ];
  const accessRulesObj = {
    accessRulesBookmarks: [
      { 'type': ['insert'], 'allow': 'all', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Bookmark' } }
        ]
      },
      { 'type': ['delete'], 'allow': 'loggedIn', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Bookmark' } },
          { 'Email': { 'equals': '{{user.[Email]}}' } }
        ]
      },
      { 'type': ['delete'], 'allow': 'all', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Bookmark' } },
          { 'Device Uuid': { 'equals': '{{session.uuid}}' } }
        ]
      },
      { 'type': ['select'], 'allow': 'all', 'enabled': true, 'require': [
        { 'Type': { 'equals': 'Bookmark' } },
        { 'Email': { 'equals': '{{user.[Email]}}' } }
      ]
      },
      // TODO remove this condition when we agree on the security rules
      { 'type': ['select'], 'allow': 'all', 'enabled': true },
      { 'type': ['select'], 'allow': 'all', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Bookmark' } },
          { 'Device Uuid': { 'equals': '{{session.uuid}}' } }
        ]
      }
    ],
    accessRulesLikes: [
      { 'type': ['insert'], 'allow': 'loggedIn', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Like' } }
        ]
      },
      { 'type': ['delete'], 'allow': 'loggedIn', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Like' } },
          { 'Email': { 'equals': '{{user.[Email]}}' } }
        ]
      },
      { 'type': ['select'], 'allow': 'loggedIn', 'enabled': true,
        'require': [
          { 'Type': { 'equals': 'Like' } }
        ]
      }
    ]
  };

  function getHtmlKeyFromPath(path) {
    return `data${CryptoJS.MD5(path).toString().substr(-6)}`;
  }

  function normalizePath(path) {
    return path.startsWith('$') ? path.substr(1) : `entry.data.${path}`;
  }

  class RecordContainer {
    constructor(element, data) {
      this.element = element;
      this.data = data;
      this.id = data.id;
      this.name = data.name;
      this.isLoading = false;
      this.error = undefined;
      this.entry = undefined;
      this.noDataTemplate = data.noDataContent || T('widgets.recordContainer.noDataContent');
      this.testMode = data.testMode;
      this.parent = undefined;
      this.pendingUpdates = {
        updated: [],
        deleted: []
      };
      this.recordTemplatePaths = [];
      this.testDataObject = {};
      this.dataSourceId = undefined;

      this.init();
    }

    async init() {
      // Initialize templates
      this.$recordTemplate = $(this.element).find('template[name="record"]').eq(0);
      this.$emptyTemplate = $(this.element).find('template[name="empty"]').eq(0);

      // Process record template
      this.processRecordTemplate();

      // Find parent
      [this.parent] = await Fliplet.Widget.findParents({
        instanceId: this.data.id,
        filter: { package: 'com.fliplet.dynamic-container' }
      });


      if (!this.parent) {
        Fliplet.UI.Toast('Please add this component inside a Data container');

        return Promise.reject('Single record container must be placed inside a Data container');
      }

      this.parent = await Fliplet.DynamicContainer.get(this.parent.id);

      if (!this.parent || !this.parent.connection) {
        Fliplet.UI.Toast('Please configure the Data container with a data source');

        return Promise.reject('Data container is not properly configured');
      }

      // Initialize container
      await this.initializeContainer();

      // Setup event listeners
      this.setupEventListeners();
    }

    processRecordTemplate() {
      const recordTemplate = $('<div></div>').html(this.$recordTemplate.html() || '');

      recordTemplate.find('fl-prop[data-path]').each((i, el) => {
        const path = normalizePath(el.getAttribute('data-path'));
        let pathObject = Fliplet.Utils.get(this.testDataObject, path);

        if (!pathObject) {
          pathObject = { path, key: getHtmlKeyFromPath(path) };
          Fliplet.Utils.set(this.testDataObject, path, pathObject);
          this.recordTemplatePaths.push(pathObject);
        }

        el.setAttribute('data-html-key', pathObject.key);
      });

      this.recordTemplate = recordTemplate.html();
      this.emptyTemplate = this.$emptyTemplate.html();
    }

    async initializeContainer() {
      this.showLoading();

      try {
        if (isInteract) {
          this.entry = sampleData;
        } else if (this.parent && typeof this.parent.connection === 'function') {
          const connection = await this.parent.connection();
          const dataSourceEntryId = Fliplet.Navigate.query.dataSourceEntryId;
          this.dataSourceId = connection.id;

          await this.retrieveEntryData(connection, dataSourceEntryId);
          if (this.entry && ['informed', 'live'].includes(this.data.updateType)) {
            this.setupDataSubscription(connection);
          }
        }

        this.render();

        await Fliplet.Hooks.run('recordContainerDataRetrieved', {
          container: this.element,
          entry: this.entry,
          instance: this
        });
      } catch (error) {
        this.error = error;
        console.error('[RECORD CONTAINER] Error fetching data', error);

        await Fliplet.Hooks.run('recordContainerDataRetrieveError', {
          instance: this,
          error
        });
      } finally {
        this.hideLoading();
        $(this.element).translate();
      }
    }

    setupDataSubscription(connection) {
      if (this.subscription) {
        this.subscription.unsubscribe();
      }
      const events = ['update', 'delete'];

      this.subscription = connection.subscribe(
        { id: this.entry.id, events },
        (bundle) => {
          if (events.includes('update')) {
            this.onUpdate(bundle.updated);
          }

          if (events.includes('delete')) {
            this.onDelete(bundle.deleted);
          }

          if (this.data.updateType === 'live') {
            this.applyUpdates();
          } else if (this.hasPendingUpdates()) {
            Fliplet.UI.Toast({
              message: 'New data available',
              duration: false,
              actions: [
                {
                  label: 'Refresh',
                  action: () => this.applyUpdates()
                },
                {
                  icon: 'fa-times',
                  title: 'Ignore',
                  action: () => {}
                }
              ]
            });
          }
        }
      );
    }

    render() {
      if (this.isLoading) {
        this.element.innerHTML = '<p class="text-center"><i class="fa fa-refresh fa-spin fa-2x fa-fw"></i></p>';

        return;
      }

      if (this.error) {
        this.element.innerHTML = `
          <div class="record-container-load-error">
            <p data-translate="widgets.recordContainer.errors.loadingData"></p>
            <p><small>${Fliplet.parseError(this.error)}</small></p>
          </div>
        `;

        return;
      }

      if (!this.entry) {
        this.element.innerHTML = `<p class="text-center">${this.noDataTemplate}</p>`;

        return;
      }

      const recordElement = document.createElement('fl-record');

      recordElement.setAttribute('data-entry-id', this.entry.id);
      recordElement.setAttribute('data-view', 'content');
      recordElement.setAttribute('data-node-name', 'Content');

      recordElement.innerHTML = this.recordTemplate || (isInteract ? this.emptyTemplate : '');

      // Update template data
      if (!isInteract) {
        this.recordTemplatePaths.forEach((pathObject) => {
          const elements = recordElement.querySelectorAll(`[data-html-key="${pathObject.key}"]`);

          elements.forEach(el => {
            el.innerHTML = Fliplet.Utils.get(this.entry, pathObject.path) || '';
          });
        });
      }

      this.element.innerHTML = '';
      this.element.appendChild(recordElement);

      if (isInteract) {
        this.viewContainer = new Fliplet.Interact.ViewContainer(recordElement, {
          placeholder: this.emptyTemplate
        });
      }

      Fliplet.Widget.initializeChildren(this.element, this).then(() => {
        Fliplet.Widget.autosize();
      });

      requestAnimationFrame(async () => {
        const hasSocialIcons = Boolean(this.element.querySelector('[data-widget-package="com.fliplet.social-icons"]'));
        if (!hasSocialIcons) return;
        await Promise.all([
          this.getGlobalSocialActionsDS(),
          this.getCachedSessionData()
        ]);
      });
    }

    async getGlobalSocialActionsDS() {
      const appId = Fliplet.Env.get('appId');
      let dataSources = [];
      try {
        dataSources = await Fliplet.DataSources.get({
          attributes: ['id', 'name', 'appId'],
          where: { appId },
        });
      } catch (error) {
        console.error('[RecordContainer] Failed to get data sources', error);
        dataSources = [];
      }

      const accessRules = [...accessRulesObj.accessRulesBookmarks, ...accessRulesObj.accessRulesLikes];
      const globalSocialActionsDSName = 'Global Data interactive icon';

      let globalSocialActionsDS = dataSources.find(el => el.name === globalSocialActionsDSName);
      if(!globalSocialActionsDS) {
        try {
          globalSocialActionsDS = await Fliplet.DataSources.create({
            name: globalSocialActionsDSName,
            appId,
            columns: columnsForSocialDataSource,
            accessRules
          });
        } catch (error) {
          console.error('[RecordContainer] Failed to create Social Actions data source', error);
          return;
        }
      }
      this.globalSocialActionsDSId = globalSocialActionsDS.id;

      let globalSocialActionsDSConnection;
      try {
        globalSocialActionsDSConnection = await Fliplet.DataSources.connect(globalSocialActionsDS.id);
      } catch (error) {
        console.error('[RecordContainer] Failed to connect to Social Actions data source', error);
        return;
      }

      const where = {
        'Data Source Id': this.dataSourceId,
      };

     let globalSocialActionsDSData = [];
     try {
       globalSocialActionsDSData = await globalSocialActionsDSConnection.find({
          where
        });
     } catch (error) {
       console.error('[RecordContainer] Failed to fetch Social Actions data source entries', error);
       globalSocialActionsDSData = [];
     }

      this.globalSocialActionsDS = globalSocialActionsDSData;
    }

    async getCachedSessionData() {
      try {
        const cachedSessionData = await Fliplet.User.getCachedSession();
        this.cachedSessionData = cachedSessionData;
      } catch (error) {
        console.error('[RecordContainer] Failed to get cached session data', error);
        this.cachedSessionData = undefined;
      }
    }

    showLoading() {
      this.isLoading = true;
      this.render();
    }

    hideLoading() {
      this.isLoading = false;
      this.render();
    }

    hasPendingUpdates() {
      return Object.values(this.pendingUpdates).some(value => value.length);
    }

    onUpdate(updates = []) {
      updates.forEach(update => {
        const existingIndex = this.pendingUpdates.updated.findIndex(row => row.id === update.id);

        if (existingIndex !== -1) {
          this.pendingUpdates.updated[existingIndex] = update;
        } else {
          this.pendingUpdates.updated.push(update);
        }
      });
    }

    onDelete(deletions = []) {
      deletions.forEach(deletion => {
        const updatedIndex = this.pendingUpdates.updated.findIndex(row => row.id === deletion.id);

        if (updatedIndex !== -1) {
          this.pendingUpdates.updated.splice(updatedIndex, 1);
        }

        if (!this.pendingUpdates.deleted.includes(deletion.id)) {
          this.pendingUpdates.deleted.push(deletion.id);
        }
      });
    }

    async retrieveEntryData(connection, dataSourceEntryId) {
      const hookResult = await Fliplet.Hooks.run('recordContainerBeforeRetrieveData', {
        container: this.element,
        connection: connection,
        instance: this,
        dataSourceId: connection.id,
        dataSourceEntryId
      });

      const query = Object.assign({}, ...hookResult);

      if (Object.keys(query).length) {
        this.entry = await connection.findOne(query);
      } else if (dataSourceEntryId) {
        this.entry = await connection.findById(dataSourceEntryId);
      } else if (this.testMode) {
        this.entry = await connection.findOne();
      }
    }

    async applyUpdates() {
      this.pendingUpdates.updated.forEach(update => {
        if (update.id === this.entry.id) {
          this.entry = update;
        }
      });

      for (const deletedId of this.pendingUpdates.deleted) {
        if (deletedId === this.entry.id) {
          if (this.parent && typeof this.parent.connection === 'function') {
            if (this.subscription && typeof this.subscription.unsubscribe === 'function') {
            this.subscription.unsubscribe();
            }

            if (!isInteract && Fliplet && Fliplet.Navigate && typeof Fliplet.Navigate.back === 'function') {
              Fliplet.Navigate.back();
            }

            this.setupDataSubscription(connection);
          }
        }
      }

      this.pendingUpdates = {
        updated: [],
        deleted: []
      };

      this.render();
    }

    setupEventListeners() {
      // Add any necessary event listeners here
    }
  }

  Fliplet.Widget.instance('record-container', function(data) {
    const container = new RecordContainer(this, data);

    recordContainerInstances[data.id] = container;

    return container;
  }, {
    supportsDynamicContext: true
  });

  Fliplet.RecordContainer.get = function(filter, options) {
    if (typeof filter === 'string') {
      filter = { name: filter };
    }

    options = options || { ts: 10 };

    return Fliplet().then(function() {
      return Promise.all(Fliplet.Utils.values(recordContainerInstances)).then(function(containers) {
        let container;

        if (typeof filter === 'undefined') {
          container = containers.length ? containers[0] : undefined;
        } else {
          container = Fliplet.Utils.find(containers, filter);
        }

        if (!container) {
          if (options.ts > 5000) {
            return Promise.reject('Single data record not found after ' + Math.ceil(options.ts / 1000) + ' seconds.');
          }

          return new Promise(function(resolve) {
            setTimeout(function() {
              options.ts = options.ts * 1.5;
              Fliplet.RecordContainer.get(filter, options).then(resolve);
            }, options.ts);
          });
        }

        return container;
      });
    });
  };

  Fliplet.RecordContainer.getAll = function(filter) {
    if (typeof filter === 'string') {
      filter = { name: filter };
    }

    return Fliplet().then(function() {
      return Promise.all(Fliplet.Utils.values(recordContainerInstances)).then(function(containers) {
        if (typeof filter === 'undefined') {
          return containers;
        }

        return Fliplet.Utils.filter(containers, filter);
      });
    });
  };
})();
