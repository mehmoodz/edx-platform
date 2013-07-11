(function() {
  describe('VideoCaptionAlpha', function() {
    beforeEach(function() {
      spyOn(VideoCaptionAlpha.prototype, 'fetchCaption').andCallThrough();
      spyOn($, 'ajaxWithPrefix').andCallThrough();
      window.onTouchBasedDevice = jasmine.createSpy('onTouchBasedDevice').andReturn(false);
    });

    afterEach(function() {
      YT.Player = void 0;
      $.fn.scrollTo.reset();
      $('.subtitles').remove();
    });

    describe('constructor', function() {
      describe('always', function() {
        beforeEach(function() {
          this.player = jasmine.stubVideoPlayerAlpha(this);
          this.caption = this.player.caption;
        });

        it('set the youtube id', function() {
          expect(this.caption.youtubeId).toEqual('normalSpeedYoutubeId');
        });

        it('create the caption element', function() {
          expect($('.video')).toContain('ol.subtitles');
        });

        it('add caption control to video player', function() {
          expect($('.video')).toContain('a.hide-subtitles');
        });

        it('fetch the caption', function() {
          expect(this.caption.loaded).toBeTruthy();
          expect(this.caption.fetchCaption).toHaveBeenCalled();
          expect($.ajaxWithPrefix).toHaveBeenCalledWith({
            url: this.caption.captionURL(),
            notifyOnError: false,
            success: jasmine.any(Function)
          });
        });

        it('bind window resize event', function() {
          expect($(window)).toHandleWith('resize', this.caption.resize);
        });

        it('bind the hide caption button', function() {
          expect($('.hide-subtitles')).toHandleWith('click', this.caption.toggle);
        });

        it('bind the mouse movement', function() {
          expect($('.subtitles')).toHandleWith('mouseover', this.caption.onMouseEnter);
          expect($('.subtitles')).toHandleWith('mouseout', this.caption.onMouseLeave);
          expect($('.subtitles')).toHandleWith('mousemove', this.caption.onMovement);
          expect($('.subtitles')).toHandleWith('mousewheel', this.caption.onMovement);
          expect($('.subtitles')).toHandleWith('DOMMouseScroll', this.caption.onMovement);
        });
      });

      describe('when on a non touch-based device', function() {
        beforeEach(function() {
          this.player = jasmine.stubVideoPlayerAlpha(this);
          this.caption = this.player.caption;
        });

        it('render the caption', function() {
          var captionsData,
            _this = this;
          captionsData = jasmine.stubbedCaption;
          $('.subtitles li[data-index]').each(function(index, link) {
            expect($(link)).toHaveData('index', index);
            expect($(link)).toHaveData('start', captionsData.start[index]);
            expect($(link)).toHaveText(captionsData.text[index]);
          });
        });

        it('add a padding element to caption', function() {
          expect($('.subtitles li:first')).toBe('.spacing');
          expect($('.subtitles li:last')).toBe('.spacing');
        });

        it('bind all the caption link', function() {
          var _this = this;
          $('.subtitles li[data-index]').each(function(index, link) {
            expect($(link)).toHandleWith('click', _this.caption.seekPlayer);
          });
        });

        it('set rendered to true', function() {
          expect(this.caption.rendered).toBeTruthy();
        });
      });

      describe('when on a touch-based device', function() {
        beforeEach(function() {
          window.onTouchBasedDevice.andReturn(true);
          this.player = jasmine.stubVideoPlayerAlpha(this);
          this.caption = this.player.caption;
        });

        it('show explaination message', function() {
          expect($('.subtitles li')).toHaveHtml("Caption will be displayed when you start playing the video.");
        });

        it('does not set rendered to true', function() {
          expect(this.caption.rendered).toBeFalsy();
        });
      });
    });

    describe('mouse movement', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
        window.setTimeout.andReturn(100);
        return spyOn(window, 'clearTimeout');
      });

      describe('when cursor is outside of the caption box', function() {
        beforeEach(function() {
          $(window).trigger(jQuery.Event('mousemove'));
        });
        
        it('does not set freezing timeout', function() {
          expect(this.caption.frozen).toBeFalsy();
        });
      });

      describe('when cursor is in the caption box', function() {
        beforeEach(function() {
          $('.subtitles').trigger(jQuery.Event('mouseenter'));
        });

        it('set the freezing timeout', function() {
          expect(this.caption.frozen).toEqual(100);
        });
        describe('when the cursor is moving', function() {
          beforeEach(function() {
            $('.subtitles').trigger(jQuery.Event('mousemove'));
          });
          
          it('reset the freezing timeout', function() {
            expect(window.clearTimeout).toHaveBeenCalledWith(100);
          });
        });
        
        describe('when the mouse is scrolling', function() {
          beforeEach(function() {
            $('.subtitles').trigger(jQuery.Event('mousewheel'));
          });
          
          it('reset the freezing timeout', function() {
            expect(window.clearTimeout).toHaveBeenCalledWith(100);
          });
        });
      });

      describe('when cursor is moving out of the caption box', function() {
        beforeEach(function() {
          this.caption.frozen = 100;
          $.fn.scrollTo.reset();
        });

        describe('always', function() {
          beforeEach(function() {
            $('.subtitles').trigger(jQuery.Event('mouseout'));
          });

          it('reset the freezing timeout', function() {
            expect(window.clearTimeout).toHaveBeenCalledWith(100);
          });

          it('unfreeze the caption', function() {
            expect(this.caption.frozen).toBeNull();
          });
        });

        describe('when the player is playing', function() {
          beforeEach(function() {
            this.caption.playing = true;
            $('.subtitles li[data-index]:first').addClass('current');
            $('.subtitles').trigger(jQuery.Event('mouseout'));
          });

          it('scroll the caption', function() {
            expect($.fn.scrollTo).toHaveBeenCalled();
          });
        });
        
        describe('when the player is not playing', function() {
          beforeEach(function() {
            this.caption.playing = false;
            $('.subtitles').trigger(jQuery.Event('mouseout'));
          });
          
          it('does not scroll the caption', function() {
            expect($.fn.scrollTo).not.toHaveBeenCalled();
          });
        });
      });
    });

    describe('search', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
      });

      it('return a correct caption index', function() {
        expect(this.caption.search(0)).toEqual(0);
        expect(this.caption.search(9999)).toEqual(0);
        expect(this.caption.search(10000)).toEqual(1);
        expect(this.caption.search(15000)).toEqual(1);
        expect(this.caption.search(30000)).toEqual(3);
        expect(this.caption.search(30001)).toEqual(3);
      });
    });

    describe('play', function() {
      describe('when the caption was not rendered', function() {
        beforeEach(function() {
          window.onTouchBasedDevice.andReturn(true);
          this.player = jasmine.stubVideoPlayerAlpha(this);
          this.caption = this.player.caption;
          this.caption.play();
        });

        it('render the caption', function() {
          var captionsData,
            _this = this;
          captionsData = jasmine.stubbedCaption;
          $('.subtitles li[data-index]').each(function(index, link) {
            expect($(link)).toHaveData('index', index);
            expect($(link)).toHaveData('start', captionsData.start[index]);
            expect($(link)).toHaveText(captionsData.text[index]);
          });
        });

        it('add a padding element to caption', function() {
          expect($('.subtitles li:first')).toBe('.spacing');
          expect($('.subtitles li:last')).toBe('.spacing');
        });

        it('bind all the caption link', function() {
          var _this = this;
          $('.subtitles li[data-index]').each(function(index, link) {
            expect($(link)).toHandleWith('click', _this.caption.seekPlayer);
          });
        });

        it('set rendered to true', function() {
          expect(this.caption.rendered).toBeTruthy();
        });
        
        it('set playing to true', function() {
          expect(this.caption.playing).toBeTruthy();
        });
      });
    });

    describe('pause', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
        this.caption.playing = true;
        this.caption.pause();
      });

      it('set playing to false', function() {
        expect(this.caption.playing).toBeFalsy();
      });
    });

    describe('updatePlayTime', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
      });

      describe('when the video speed is 1.0x', function() {
        beforeEach(function() {
          this.caption.currentSpeed = '1.0';
          this.caption.updatePlayTime(25.000);
        });

        it('search the caption based on time', function() {
          expect(this.caption.currentIndex).toEqual(2);
        });
      });

      describe('when the video speed is not 1.0x', function() {
        beforeEach(function() {
          this.caption.currentSpeed = '0.75';
          this.caption.updatePlayTime(25.000);
        });

        it('search the caption based on 1.0x speed', function() {
          expect(this.caption.currentIndex).toEqual(1);
        });
      });

      describe('when the index is not the same', function() {
        beforeEach(function() {
          this.caption.currentIndex = 1;
          $('.subtitles li[data-index=1]').addClass('current');
          this.caption.updatePlayTime(25.000);
        });

        it('deactivate the previous caption', function() {
          expect($('.subtitles li[data-index=1]')).not.toHaveClass('current');
        });

        it('activate new caption', function() {
          expect($('.subtitles li[data-index=2]')).toHaveClass('current');
        });

        it('save new index', function() {
          expect(this.caption.currentIndex).toEqual(2);
        });

        it('scroll caption to new position', function() {
          expect($.fn.scrollTo).toHaveBeenCalled();
        });
      });

      describe('when the index is the same', function() {
        beforeEach(function() {
          this.caption.currentIndex = 1;
          $('.subtitles li[data-index=1]').addClass('current');
          this.caption.updatePlayTime(15.000);
        });
        
        it('does not change current subtitle', function() {
          expect($('.subtitles li[data-index=1]')).toHaveClass('current');
        });
      });
    });

    describe('resize', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
        $('.subtitles li[data-index=1]').addClass('current');
        this.caption.resize();
      });

      it('set the height of caption container', function() {
        expect(parseInt($('.subtitles').css('maxHeight'))).toBeCloseTo($('.video-wrapper').height(), 2);
      });

      it('set the height of caption spacing', function() {
        var firstSpacing, lastSpacing;
        firstSpacing = Math.abs(parseInt($('.subtitles .spacing:first').css('height')));
        lastSpacing = Math.abs(parseInt($('.subtitles .spacing:last').css('height')));
        expect(firstSpacing - this.caption.topSpacingHeight()).toBeLessThan(1);
        expect(lastSpacing - this.caption.bottomSpacingHeight()).toBeLessThan(1);
      });

      it('scroll caption to new position', function() {
        expect($.fn.scrollTo).toHaveBeenCalled();
      });
    });

    describe('scrollCaption', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
      });

      describe('when frozen', function() {
        beforeEach(function() {
          this.caption.frozen = true;
          $('.subtitles li[data-index=1]').addClass('current');
          this.caption.scrollCaption();
        });
        
        it('does not scroll the caption', function() {
          expect($.fn.scrollTo).not.toHaveBeenCalled();
        });
      });
      
      describe('when not frozen', function() {
        beforeEach(function() {
          this.caption.frozen = false;
        });

        describe('when there is no current caption', function() {
          beforeEach(function() {
            this.caption.scrollCaption();
          });
          
          it('does not scroll the caption', function() {
            expect($.fn.scrollTo).not.toHaveBeenCalled();
          });
        });

        describe('when there is a current caption', function() {
          beforeEach(function() {
            $('.subtitles li[data-index=1]').addClass('current');
            this.caption.scrollCaption();
          });

          it('scroll to current caption', function() {
            var offset;
            offset = -0.5 * ($('.video-wrapper').height() - $('.subtitles .current:first').height());
            expect($.fn.scrollTo).toHaveBeenCalledWith($('.subtitles .current:first', this.caption.el), {
              offset: offset
            });
          });
        });
      });
    });

    describe('seekPlayer', function() {
      beforeEach(function() {
        var _this = this;
        this.player = jasmine.stubVideoPlayerAlpha(this);
        this.caption = this.player.caption;
        $(this.caption).bind('seek', function(event, time) {
          _this.time = time;
        });
      });

      describe('when the video speed is 1.0x', function() {
        beforeEach(function() {
          this.caption.currentSpeed = '1.0';
          $('.subtitles li[data-start="30000"]').trigger('click');
        });
        
        it('trigger seek event with the correct time', function() {
          expect(this.player.currentTime).toEqual(30.000);
        });
      });
      
      describe('when the video speed is not 1.0x', function() {
        beforeEach(function() {
          this.caption.currentSpeed = '0.75';
          $('.subtitles li[data-start="30000"]').trigger('click');
        });

        it('trigger seek event with the correct time', function() {
          expect(this.player.currentTime).toEqual(40.000);
        });
      });
    });
    
    describe('toggle', function() {
      beforeEach(function() {
        this.player = jasmine.stubVideoPlayerAlpha(this);
        spyOn(this.video, 'log');
        this.caption = this.player.caption;
        $('.subtitles li[data-index=1]').addClass('current');
      });

      describe('when the caption is visible', function() {
        beforeEach(function() {
          this.caption.el.removeClass('closed');
          this.caption.toggle(jQuery.Event('click'));
        });

        it('log the hide_transcript event', function() {
          expect(this.video.log).toHaveBeenCalledWith('hide_transcript', {
            currentTime: this.player.currentTime
          });
        });
        
        it('hide the caption', function() {
          expect(this.caption.el).toHaveClass('closed');
        });
      });
      
      describe('when the caption is hidden', function() {
        beforeEach(function() {
          this.caption.el.addClass('closed');
          this.caption.toggle(jQuery.Event('click'));
        });

        it('log the show_transcript event', function() {
          expect(this.video.log).toHaveBeenCalledWith('show_transcript', {
            currentTime: this.player.currentTime
          });
        });

        it('show the caption', function() {
          expect(this.caption.el).not.toHaveClass('closed');
        });

        it('scroll the caption', function() {
          expect($.fn.scrollTo).toHaveBeenCalled();
        });
      });
    });
  });

}).call(this);
