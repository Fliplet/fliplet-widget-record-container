(function() {
  Fliplet.RecordContainer = Fliplet.RecordContainer || {};

  const recordContainerInstances = {};
  const isInteract = Fliplet.Env.get('interact');

  const sampleData = isInteract
    ? { id: 1, data: {} }
    : undefined;

  function getHtmlKeyFromPath(path) {
    return `data${CryptoJS.MD5(path).toString().substr(-6)}`;
  }

  function normalizePath(path) {
    return path.startsWith('$') ? path.substr(1) : `entry.data.${path}`;
  }

  Fliplet.Widget.instance('record-container', function(data, parent) {
    const $recordTemplate = $(this).find('template[name="record"]').eq(0);
    const $emptyTemplate = $(this).find('template[name="empty"]').eq(0);
    const templateViewName = 'content';
    const templateNodeName = 'Content';
    const recordTemplatePaths = [];
    const testDataObject = {};
    let compiledRecordTemplate;

    let recordTemplate = $('<div></div>').html($recordTemplate.html() || '').find('fl-prop[data-path]').each(function(i, el) {
      const path = normalizePath(el.getAttribute('data-path'));
      let pathObject = _.get(testDataObject, path);

      if (!pathObject) {
        // Provide a unique alphanumeric key for the path suitable for v-html
        pathObject = { path, key: getHtmlKeyFromPath(path) };
        _.set(testDataObject, path, pathObject);
        recordTemplatePaths.push(pathObject);
      }

      el.setAttribute('v-html', `data.${ pathObject.key }`);
    }).end().html();
    const emptyTemplate = $emptyTemplate.html();

    $recordTemplate.remove();
    $emptyTemplate.remove();

    const container = new Promise((resolve) => {
      let loadData;

      function getTemplateForHtml() {
        const recordTag = document.createElement('fl-record');

        recordTag.setAttribute(':data-entry-id', 'entry.id');
        recordTag.setAttribute('v-bind', 'attrs');

        $(recordTag).html(recordTemplate || (isInteract ? emptyTemplate : ''));

        return recordTag.outerHTML;
      }

      compiledRecordTemplate = Vue.compile(getTemplateForHtml());

      // Get the current data source entry ID from the URL
      let dataSourceEntryId = Fliplet.Navigate.query.dataSourceEntryId;

      // Record component
      const recordComponent = Vue.component(data.content, {
        props: ['entry'],
        data() {
          const result = {
            attrs: {
              'data-view': templateViewName,
              'data-node-name': templateNodeName
            },
            data: {},
            viewContainer: undefined
          };

          return result;
        },
        watch: {
          entry() {
            this.setData();
          }
        },
        methods: {
          setData() {
            if (isInteract) {
              return;
            }

            // Loop through the record template paths and set the data for v-html
            recordTemplatePaths.forEach((pathObject) => {
              this.$set(this.data, pathObject.key, _.get(this, pathObject.path));
            });
          }
        },
        render(createElement) {
          return compiledRecordTemplate.render.call(this, createElement);
        },
        mounted() {
          this.setData();

          Fliplet.Widget.initializeChildren(this.$el, this);

          if (!isInteract) {
            return;
          }

          /* Edit mode only */

          this.viewContainer = new Fliplet.Interact.ViewContainer(this.$el, {
            placeholder: emptyTemplate
          });
        }
      });

      // Find child props
      const vm = new Vue({
        el: this,
        id: data.id,
        name: data.name,
        data: {
          isLoading: false,
          error: undefined,
          entry: undefined,
          noDataTemplate: data.noDataContent || T('widgets.recordContainer.noDataContent'),
          parent
        },
        components: {
          record: recordComponent
        },
        filters: {
          parseError(error) {
            return Fliplet.parseError(error);
          }
        },
        methods: {
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
          }
        }
      });

      if (isInteract) {
        loadData = Promise.resolve(sampleData);
      } else if (parent && typeof parent.connection === 'function') {
        vm.isLoading = true;
        vm.error = undefined;

        loadData = parent.connection().then((connection) => {
          return Fliplet.Hooks.run('recordContainerBeforeRetrieveData', {
            container: this,
            connection: connection,
            instance: vm,
            dataSourceId: connection.id,
            dataSourceEntryId
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
          }).catch((error) => {
            if (error && error.status === 404) {
              return Promise.resolve();
            }

            return Promise.reject(error);
          });
        });
      } else {
        loadData = Promise.resolve();
      }

      loadData.then((entry) => {
        vm.isLoading = false;

        // Set the entry data
        vm.entry = entry;

        // Resolve the promise and return the Vue instance
        resolve(vm);

        Fliplet.Hooks.run('recordContainerDataRetrieved', {
          container: this,
          entry,
          instance: vm
        });
      }).catch((error) => {
        vm.isLoading = false;
        vm.error = error;

        Fliplet.Hooks.run('recordContainerDataRetrieveError', { instance: vm, error });

        vm.$nextTick(() => {
          $(vm.$el).find('.record-container-load-error').translate();
        });

        // eslint-disable-next-line no-console
        console.error('[RECORD CONTAINER] Error fetching data', error);
        resolve(vm);
      });

      resolve(vm);
    });

    container.id = data.id;
    recordContainerInstances[data.id] = container;
  }, {
    supportsDynamicContext: true
  });

  Fliplet.RecordContainer.get = function(filter, options) {
    if (typeof filter === 'string') {
      filter = { name: filter };
    }

    options = options || { ts: 10 };

    return Fliplet().then(function() {
      return Promise.all(_.values(recordContainerInstances)).then(function(containers) {
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
      return Promise.all(_.values(recordContainerInstances)).then(function(containers) {
        if (typeof filter === 'undefined') {
          return containers;
        }

        return _.filter(containers, filter);
      });
    });
  };
})();
