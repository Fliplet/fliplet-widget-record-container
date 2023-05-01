<template>
  <div>
    <Data-Source-Provider ref="dataSourceProvider" v-on:saved="dataSourceProviderSave"></Data-Source-Provider>
    <Load-Source-Option></Load-Source-Option>
    <Update-Type></Update-Type>
  </div>
</template>

<script>
import state from './state';
import DataSourceProvider from './components/DataSourceProvider';
import LoadSourceOption from './components/LoadSourceOption';
import UpdateType from './components/UpdateType';

export default {
  data() {
    return {};
  },
  components: {
    DataSourceProvider,
    LoadSourceOption,
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
