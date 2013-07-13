(function() {
  describe('VideoQualityControlAlpha', function() {
    var state, videoControl, videoQualityControl;

    function initialize() {
      loadFixtures('videoalpha_all.html');
      state = new VideoAlpha('#example');
      videoControl = state.videoControl;
      videoQualityControl = state.videoQualityControl;
    }

    describe('constructor', function() {
      beforeEach(function() {
        initialize();
      });

      it('render the quality control', function() {
        expect(videoControl.secondaryControlsEl.html()).toContain("<a href=\"#\" class=\"quality_control\" title=\"HD\">");
      });

      it('bind the quality control', function() {
        expect($('.quality_control')).toHandleWith('click', videoQualityControl.toggleQuality);
      });
    });
  });

}).call(this);
