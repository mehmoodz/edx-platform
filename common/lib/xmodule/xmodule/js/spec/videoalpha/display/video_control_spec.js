(function() {
  describe('VideoControlAlpha', function() {
    beforeEach(function() {
      window.onTouchBasedDevice = jasmine.createSpy('onTouchBasedDevice').andReturn(false);
      loadFixtures('videoalpha.html');
      $('.video-controls').html('');
    });

    describe('constructor', function() {
      it('render the video controls', function() {
        this.control = new window.VideoControlAlpha({
          el: $('.video-controls')
        });
        expect($('.video-controls')).toContain;
        ['.slider', 'ul.vcr', 'a.play', '.vidtime', '.add-fullscreen'].join(',');
        expect($('.video-controls').find('.vidtime')).toHaveText('0:00 / 0:00');
      });

      it('bind the playback button', function() {
        this.control = new window.VideoControlAlpha({
          el: $('.video-controls')
        });
        expect($('.video_control')).toHandleWith('click', this.control.togglePlayback);
      });

      describe('when on a touch based device', function() {
        beforeEach(function() {
          window.onTouchBasedDevice.andReturn(true);
          this.control = new window.VideoControlAlpha({
            el: $('.video-controls')
          });
        });

        it('does not add the play class to video control', function() {
          expect($('.video_control')).not.toHaveClass('play');
          expect($('.video_control')).not.toHaveHtml('Play');
        });
      });
      
      describe('when on a non-touch based device', function() {
        beforeEach(function() {
          this.control = new window.VideoControlAlpha({
            el: $('.video-controls')
          });
        });

        it('add the play class to video control', function() {
          expect($('.video_control')).toHaveClass('play');
          expect($('.video_control')).toHaveHtml('Play');
        });
      });
    });

    describe('play', function() {
      beforeEach(function() {
        this.control = new window.VideoControlAlpha({
          el: $('.video-controls')
        });
        this.control.play();
      });

      it('switch playback button to play state', function() {
        expect($('.video_control')).not.toHaveClass('play');
        expect($('.video_control')).toHaveClass('pause');
        expect($('.video_control')).toHaveHtml('Pause');
      });
    });
    describe('pause', function() {
      beforeEach(function() {
        this.control = new window.VideoControlAlpha({
          el: $('.video-controls')
        });
        this.control.pause();
      });

      it('switch playback button to pause state', function() {
        expect($('.video_control')).not.toHaveClass('pause');
        expect($('.video_control')).toHaveClass('play');
        expect($('.video_control')).toHaveHtml('Play');
      });
    });

    describe('togglePlayback', function() {
      beforeEach(function() {
        this.control = new window.VideoControlAlpha({
          el: $('.video-controls')
        });
      });

      describe('when the control does not have play or pause class', function() {
        beforeEach(function() {
          $('.video_control').removeClass('play').removeClass('pause');
        });

        describe('when the video is playing', function() {
          beforeEach(function() {
            $('.video_control').addClass('play');
            spyOnEvent(this.control, 'pause');
            this.control.togglePlayback(jQuery.Event('click'));
          });

          it('does not trigger the pause event', function() {
            expect('pause').not.toHaveBeenTriggeredOn(this.control);
          });
        });

        describe('when the video is paused', function() {
          beforeEach(function() {
            $('.video_control').addClass('pause');
            spyOnEvent(this.control, 'play');
            this.control.togglePlayback(jQuery.Event('click'));
          });

          it('does not trigger the play event', function() {
            expect('play').not.toHaveBeenTriggeredOn(this.control);
          });
        });

        describe('when the video is playing', function() {
          beforeEach(function() {
            spyOnEvent(this.control, 'pause');
            $('.video_control').addClass('pause');
            this.control.togglePlayback(jQuery.Event('click'));
          });

          it('trigger the pause event', function() {
            expect('pause').toHaveBeenTriggeredOn(this.control);
          });
        });

        describe('when the video is paused', function() {
          beforeEach(function() {
            spyOnEvent(this.control, 'play');
            $('.video_control').addClass('play');
            this.control.togglePlayback(jQuery.Event('click'));
          });
          
          it('trigger the play event', function() {
            expect('play').toHaveBeenTriggeredOn(this.control);
          });
        });
      });
    });
  });

}).call(this);
