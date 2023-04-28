Fliplet.RecordContainer = Fliplet.RecordContainer || {};

const recordContainerInstances = [];

Fliplet().then(function() {
  Fliplet.Widget.instance('record-container', function(data, parent) {
    const renderingOption = data.renderingOption || 'default';

    const container = new Promise((resolve) => {
      let loadData;
      let _dataSourceConnection;
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
          renderingOption,
          parent: parent
        },
        methods: {
          _setData(key, data) {
            return Fliplet.Hooks.run('containerDataRetrieved', { container: this, key, data }).then(() => {
              if (!data) {
                return;
              }

              if (typeof this[key] === 'undefined') {
                return this.$set(this.context, key, data);
              }

              if (Array.isArray(data) && typeof data.update !== 'function') {
                this.context.length = 0;
                this.context.push(...data);
              } else {
                this.context = data;
              }

              this._updateVisibility();
              this._updatePropTags();
            });
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
              key = 'context';
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
            if (result) {
              return connection.findOne(result);
            }

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
          Fliplet.Hooks.run('recordContainerAfterRetrieveData', {
            container: this,
            entry: entry,
            vm: vm
          });
        }

        vm._setData('entry', entry).then(() => {
          if (renderingOption === 'wait') {
            Fliplet.Widget.initializeChildren(this, vm);
          }

          resolve(vm);
        });
      }).catch((err) => {
        console.error('[RECORD CONTAINER] Error fetching data', err);
        resolve(vm);
      });

      Fliplet.Widget.initializeChildren(this, vm);
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
