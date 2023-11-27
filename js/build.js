Fliplet.RecordContainer = Fliplet.RecordContainer || {};

const recordContainerInstances = [];

Fliplet.Widget.instance('record-container', function(data, parent) {
  const container = new Promise((resolve) => {
    let loadData;
    let _dataSourceConnection;

    // Get the current data source entry ID from the URL
    let dataSourceEntryId = Fliplet.Navigate.query.dataSourceEntryId;

    // Find child props
    const $props = $(this).findUntil('fl-prop[data-engine]', 'fl-record-container, fl-helper, fl-list-repeater');

    function getConnection() {
      if (!_dataSourceConnection) {
        _dataSourceConnection = Fliplet.DataSources.connect(data.dataSourceId);
      }

      return _dataSourceConnection;
    }

    const vm = new Vue({
      id: data.id,
      name: data.name,
      data: {
        entry: {},
        parent: parent
      },
      methods: {
        _setData(key, data) {
          if (!data) {
            return;
          }

          this[key] = data;

          this._updateVisibility();
          this._updatePropTags();
        },
        _updateVisibility() {
          // Show/hide empty state containers
        },
        _updatePropTags() {
          const $vm = this;

          $props.each(function() {
            const $el = $(this);
            const path = $el.data('path');

            if (!path) {
              return;
            }

            let value = _.get($vm, path);

            if (typeof value === 'object') {
              value = JSON.stringify(value);
            }

            $el.html(value);
          });
        },
        /**
         * Schedules an update of the data source entry
         * @return {undefined}
         */
        _scheduleUpdate() {
          switch (data.updateType) {
            case 'informed':
            case 'live':
              // TODO: Update the data source entry in real time
              break;
            case 'none':
            default:
              break;
          }
        },
        /**
         * Loads data from a function and sets it to the specified key
         * @param {String} key The key to set the data to
         * @param {Function} fn The function to execute
         * @returns {Promise} A promise that resolves when the data is set
         */
        load(key, fn) {
          if (typeof key === 'function') {
            fn = key;
            key = 'entry';
          }

          let result = fn();

          if (!(result instanceof Promise)) {
            result = Promise.resolve(result);
          }

          return result.then(res => this._setData(key, res));
        },
        connection() {
          return getConnection();
        }
      }
    });

    if (parent && typeof parent.connection === 'function') {
      loadData = parent.connection().then((connection) => {
        return Fliplet.Hooks.run('recordContainerBeforeRetrieveData', {
          container: this,
          connection: connection,
          vm: vm,
          dataSourceId: connection.id,
          dataSourceEntryId: dataSourceEntryId
        }).then((result) => {
          // Merge all results into a single object
          result = _.extend.apply(this, [{}].concat(result));

          // If the result is an object and it has keys, we assume it's a query
          if (typeof result === 'object' && Object.keys(result).length) {
            return connection.findOne(result);
          }

          // Load the entry by ID if the option "loadSource" is set to "query" (this is the default mode)
          if (dataSourceEntryId && (!data.loadSource || data.loadSource === 'query')) {
            return connection.findById(dataSourceEntryId);
          }

          // Scheduled automated updates when set
          vm._scheduleUpdate();
        });
      });
    } else {
      loadData = Promise.resolve();
    }

    loadData.then((entry) => {
      if (typeof entry === 'object') {
        Fliplet.Hooks.run('recordContainerDataRetrieved', {
          container: this,
          entry: entry,
          vm: vm
        });
      }

      // Set the entry data
      vm._setData('entry', entry);

      // Initialize children
      Fliplet.Widget.initializeChildren(this, vm);

      // Resolve the promise and return the Vue instance
      resolve(vm);
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[RECORD CONTAINER] Error fetching data', err);
      resolve(vm);
    });

    resolve(vm);
  });

  recordContainerInstances.push(container);
}, {
  supportsDynamicContext: true
});

Fliplet.RecordContainer.get = function(filter, options) {
  if (typeof filter === 'string') {
    filter = { name: filter };
  }

  options = options || { ts: 10 };

  return Fliplet().then(function() {
    return Promise.all(recordContainerInstances).then(function(containers) {
      var container;

      if (typeof filter === 'undefined') {
        container = containers.length ? containers[0] : undefined;
      } else {
        _.find(containers, filter);
      }

      if (!container) {
        if (options.ts > 5000) {
          return Promise.reject('Record container not found after ' + Math.ceil(options.ts / 1000) + ' seconds.');
        }

        // Containers can render over time, so we need to retry later in the process
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
    return Promise.all(recordContainerInstances).then(function(containers) {
      if (typeof filter === 'undefined') {
        return containers;
      }

      return _.filter(containers, filter);
    });
  });
};
