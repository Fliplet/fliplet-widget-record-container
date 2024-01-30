Fliplet.Widget.generateInterface({
  fields: [
    {
      type: 'radio',
      name: 'updateType',
      label: 'Select data update mode',
      options: [
        {
          value: 'none',
          label: 'No Update - Updates are not silently applied and users won\'t see the changes until they load the list for the next time.'
        },
        {
          value: 'informed',
          label: 'Informed Update - Users are informed if an update is available. When the user chooses to apply it, changes are applied in-situ, i.e. without a complete reload.'
        },
        {
          value: 'live',
          label: 'Real-time Update - Updates are automatically applied when they are available. Detail view can be directly loaded (via query parameter) without loading the list first.'
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
