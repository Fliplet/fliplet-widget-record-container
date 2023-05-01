# Fliplet Data Record Container Widget

## Development

This widget is meant to be used with the Fliplet platform.

Run for local development with the [`fliplet-cli`](https://github.com/Fliplet/fliplet-cli):

```
$ npm install
$ npm run watch
```

Then, keep the watcher running and on a new tab run the following command:

```
$ fliplet run
```

---

---

## Hooks

### repeaterDataRetrieved

This hook is triggered when the data is retrieved from the data source.

Attributes returned in the `options` object:

- `container`: the container element
- `entry`: the data source entry
- `vm`: the Vue instance of the widget

```js
Fliplet.Hooks.on('repeaterDataRetrieved', function(options) {
  // options contains "container", "entry" and "vm"
});
```

---

### `recordContainerBeforeRetrieveData`

This hook is triggered before the entry is retrieved from the data source. It can be used to modify the data source query.

Attributes returned in the `options` object:

- `container`: the container element
- `connection`: the data source connection
- `vm`: the Vue instance of the widget
- `dataSourceId`: the data source id used for the connection
- `dataSourceEntryId`: the data source entry id to be loaded

```js
Fliplet.Hooks.on('recordContainerBeforeRetrieveData', function () {
  // Modify the data source query used by "findOne" to retrieve the data
  return { where: { name: 'John' } };
});
```
