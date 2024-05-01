Fliplet.Widget.generateInterface({
  fields: [
    {
      type: 'provider',
      package: 'com.fliplet.data-source-provider',
      data: function() {
        return Fliplet.Widget.findParents({ filter: { package: 'com.fliplet.dynamic-container' } }).then((widgets) => {
          const dynamicContainer = widgets[0];

          return {
            readonly: true,
            dataSourceTitle: 'Get data from...',
            dataSourceId: dynamicContainer && dynamicContainer.dataSourceId,
            helpText: 'To change this data source, go to the parent <strong>Dynamic container</strong>'
          };
        });
      }
    },
    {
      type: 'html',
      html: '<div class="alert alert-info">Entry will be loaded based on the URL parameter <code>dataSourceEntryId</code>.</div>'
    },
    {
      type: 'toggle',
      name: 'testMode',
      label: 'Enable test mode',
      toggleLabel: 'Show the first entry found if no entry is specified'
    },
    {
      type: 'radio',
      name: 'updateType',
      label: 'Select data update mode',
      required: true,
      default: 'none',
      options: [
        {
          value: 'none',
          label: '<strong>No Update</strong> - Updates are not silently applied and users won\'t see the changes until they load the list for the next time.'
        },
        {
          value: 'informed',
          label: '<strong>Informed Update</strong> - Users are informed if an update is available. When the user chooses to apply it, changes are applied in-situ, i.e. without a complete reload.'
        },
        {
          value: 'live',
          label: '<strong>Real-time Update</strong> - Updates are automatically applied when they are available. Detail view can be directly loaded (via query parameter) without loading the list first.'
        }
      ]
    },
    {
      name: 'noDataContent',
      type: 'textarea',
      label: 'Text to show if no data loaded',
      placeholder: 'Default: No data found'
    }
  ]
});
