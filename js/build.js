Fliplet.RecordContainer = Fliplet.RecordContainer || {};

const recordContainerInstances = [];

Fliplet().then(function() {
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

      if (data.dataSourceId) {
        loadData = Fliplet.DataSources.connect(data.dataSourceId).then((connection) => {
          return Fliplet.Hooks.run('recordContainerBeforeRetrieveData', {
            container: this,
            connection: connection,
            vm: vm,
            dataSourceId: data.dataSourceId,
            dataSourceEntryId: dataSourceEntryId
          }).then((result) => {
            // Merge all results into a single object
            result = _.extend.apply(this, [{}].concat(result));

            // If the result is an object and it has keys, we assume it's a query
            if (typeof result === 'object' && Object.keys(result).length) {
              return connection.findOne(result);
            }

            // Load the entry by ID
            if (dataSourceEntryId) {
              return connection.findById(dataSourceEntryId);
            }
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
});

Fliplet.RecordContainer.get = function(name, options) {
  options = options || { ts: 10 };

  return Fliplet().then(function() {
    return Promise.all(recordContainerInstances).then(function(containers) {
      var container;

      if (typeof name === 'undefined') {
        container = containers.length ? containers[0] : undefined;
      } else {
        containers.some(function(vm) {
          if (vm.name === name) {
            container = vm;

            return true;
          }
        });
      }

      if (!container) {
        if (options.ts > 5000) {
          return Promise.reject('Record container not found after ' + Math.ceil(options.ts / 1000) + ' seconds.');
        }

        // Containers can render over time, so we need to retry later in the process
        return new Promise(function(resolve) {
          setTimeout(function() {
            options.ts = options.ts * 1.5;

            Fliplet.RecordContainer.get(name, options).then(resolve);
          }, options.ts);
        });
      }

      return container;
    });
  });
};

Fliplet.RecordContainer.getAll = function(name) {
  return Fliplet().then(function() {
    return Promise.all(recordContainerInstances).then(function(containers) {
      if (typeof name === 'undefined') {
        return containers;
      }

      return containers.filter(function(container) {
        return container.name === name;
      });
    });
  });
};
