<template>
  <div class="form-group clearfix">
    <div class="col-sm-4 control-label">
      <label>Select data update mode</label>
    </div>
    <div class="col-sm-8">
      <div class="radio radio-icon">
        <input type="radio" id="render-default" v-model="updateType" value="none">
        <label for="render-default">
          <span class="check"><i class="fa fa-circle"></i></span> No update<br />
          <p class="small">Updates are not silently applied and users won't see the changes until they load the list for the next time.</p>
        </label>
      </div>
      <div class="radio radio-icon">
        <input type="radio" id="render-informed" v-model="updateType" value="informed">
        <label for="render-informed">
          <span class="check"><i class="fa fa-circle"></i></span> Informed update<br />
          <p class="small">Users are informed if an update is available. When the user chooses to apply it, changes are applied in-situ, i.e. without a complete reload.</p>
        </label>
      </div>
      <div class="radio radio-icon">
        <input type="radio" id="render-live" v-model="updateType" value="live">
        <label for="render-live">
          <span class="check"><i class="fa fa-circle"></i></span> Real-time update<br />
          <p class="small">Updates are automatically applied when they are available. Detail view can be directly loaded (via query parameter) without loading the list first.</p>
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


