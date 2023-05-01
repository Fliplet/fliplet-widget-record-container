<template>
  <div class="form-group clearfix">
    <div class="col-sm-4 control-label">
      <label>Choose how the data source entry is loaded</label>
    </div>
    <div class="col-sm-8">
      <div class="radio radio-icon">
        <input type="radio" id="render-query" v-model="loadSource" value="query">
        <label for="render-query">
          <span class="check"><i class="fa fa-circle"></i></span> Automatically from query parameters<br /><p class="small">This option will load the data source entry from the <code>dataSourceQueryId</code> query parameter, when found.</p>
        </label>
      </div>
      <div class="radio radio-icon">
        <input type="radio" id="render-custom" v-model="loadSource" value="custom">
        <label for="render-custom">
          <span class="check"><i class="fa fa-circle"></i></span> Custom implementation<br /><p class="small">Do not load the data source entry. You can load it manually using the data record <strong>JS API</strong>.</p>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import state from '../state.js';

export default {
  data() {
    return {
      loadSource: state.loadSource || 'query'
    };
  },
  watch: {
    loadSource(val) {
      state.loadSource = val;
    }
  },
  mounted() {

  }
};
</script>


