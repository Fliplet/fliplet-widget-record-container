<template>
  <div class="form-group clearfix">
    <div class="col-sm-4 control-label">
      <label>Choose how the data source entry is updated while the user is on the screen</label>
    </div>
    <div class="col-sm-8">
      <div class="radio radio-icon">
        <input type="radio" id="render-default" v-model="updateType" value="none">
        <label for="render-default">
          <span class="check"><i class="fa fa-circle"></i></span> Do not update (default)<br /><p class="small">The data source entry will not be updated while the user is on the screen.</p>
        </label>
      </div>
      <div class="radio radio-icon">
        <input type="radio" id="render-informed" v-model="updateType" value="informed">
        <label for="render-informed">
          <span class="check"><i class="fa fa-circle"></i></span> Informed update<br /><p class="small">The data source entry will be updated while the user is on the screen. The user will be informed of the update.</p>
        </label>
      </div>
      <div class="radio radio-icon">
        <input type="radio" id="render-live" v-model="updateType" value="live">
        <label for="render-live">
          <span class="check"><i class="fa fa-circle"></i></span> Real-time update<br /><p class="small">The data source entry will be updated while the user is on the screen. The user will not be informed of the update. The contents in the screen will be updated automatically.</p>
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
      updateType: state.updateType || 'none'
    };
  },
  watch: {
    updateType(val) {
      state.updateType = val;
    }
  },
  mounted() {

  }
};
</script>


