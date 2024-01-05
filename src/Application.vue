<template>
  <div>
    <Data-Source-Provider ref="dataSourceProvider" v-on:saved="dataSourceProviderSave"></Data-Source-Provider>
    <Update-Type></Update-Type>
  </div>
</template>

<script>
import state from './state';
import DataSourceProvider from './components/DataSourceProvider';
import UpdateType from './components/UpdateType';

export default {
  data() {
    return {};
  },
  components: {
    DataSourceProvider,
    UpdateType
  },
  methods: {
    dataSourceProviderSave() {
      Fliplet.Widget.save(state).then(() => {
        Fliplet.Widget.complete();
      });
    }
  },
  mounted() {
    Fliplet.Widget.onSaveRequest(() => {
      this.$refs.dataSourceProvider.forwardSaveRequest();
    });
  }
};
</script>
