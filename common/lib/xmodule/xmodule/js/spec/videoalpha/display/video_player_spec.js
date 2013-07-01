// Generated by CoffeeScript 1.6.3
(function() {
  describe('VideoPlayerAlpha', function() {
    var playerVars;
    playerVars = {
      controls: 0,
      wmode: 'transparent',
      rel: 0,
      showinfo: 0,
      enablejsapi: 1,
      modestbranding: 1,
      html5: 1
    };
    beforeEach(function() {
      var part, _i, _len, _ref, _results;
      window.onTouchBasedDevice = jasmine.createSpy('onTouchBasedDevice').andReturn(false);
      _ref = ['VideoCaptionAlpha', 'VideoSpeedControlAlpha', 'VideoVolumeControlAlpha', 'VideoProgressSliderAlpha', 'VideoControlAlpha'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        _results.push(spyOn(window[part].prototype, 'initialize').andCallThrough());
      }
      return _results;
    });
    afterEach(function() {
      return YT.Player = void 0;
    });
    describe('constructor', function() {
      beforeEach(function() {
        return $.fn.qtip.andCallFake(function() {
          return $(this).data('qtip', true);
        });
      });
      describe('always', function() {
        beforeEach(function() {
          jasmine.stubVideoPlayerAlpha(this, [], false);
          $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
          return this.player = new VideoPlayerAlpha({
            video: this.video
          });
        });
        it('instanticate current time to zero', function() {
          return expect(this.player.currentTime).toEqual(0);
        });
        it('set the element', function() {
          return expect(this.player.el).toHaveId('video_id');
        });
        it('create video control', function() {
          expect(window.VideoControlAlpha.prototype.initialize).toHaveBeenCalled();
          expect(this.player.control).toBeDefined();
          return expect(this.player.control.el).toBe($('.video-controls', this.player.el));
        });
        it('create video caption', function() {
          expect(window.VideoCaptionAlpha.prototype.initialize).toHaveBeenCalled();
          expect(this.player.caption).toBeDefined();
          expect(this.player.caption.el).toBe(this.player.el);
          expect(this.player.caption.youtubeId).toEqual('normalSpeedYoutubeId');
          expect(this.player.caption.currentSpeed).toEqual('1.0');
          return expect(this.player.caption.captionAssetPath).toEqual('/static/subs/');
        });
        it('create video speed control', function() {
          expect(window.VideoSpeedControlAlpha.prototype.initialize).toHaveBeenCalled();
          expect(this.player.speedControl).toBeDefined();
          expect(this.player.speedControl.el).toBe($('.secondary-controls', this.player.el));
          expect(this.player.speedControl.speeds).toEqual(['0.75', '1.0']);
          return expect(this.player.speedControl.currentSpeed).toEqual('1.0');
        });
        it('create video progress slider', function() {
          expect(window.VideoSpeedControlAlpha.prototype.initialize).toHaveBeenCalled();
          expect(this.player.progressSlider).toBeDefined();
          return expect(this.player.progressSlider.el).toBe($('.slider', this.player.el));
        });
        it('bind to video control play event', function() {
          return expect($(this.player.control)).toHandleWith('play', this.player.play);
        });
        it('bind to video control pause event', function() {
          return expect($(this.player.control)).toHandleWith('pause', this.player.pause);
        });
        it('bind to video caption seek event', function() {
          return expect($(this.player.caption)).toHandleWith('caption_seek', this.player.onSeek);
        });
        it('bind to video speed control speedChange event', function() {
          return expect($(this.player.speedControl)).toHandleWith('speedChange', this.player.onSpeedChange);
        });
        it('bind to video progress slider seek event', function() {
          return expect($(this.player.progressSlider)).toHandleWith('slide_seek', this.player.onSeek);
        });
        it('bind to video volume control volumeChange event', function() {
          return expect($(this.player.volumeControl)).toHandleWith('volumeChange', this.player.onVolumeChange);
        });
        it('bind to key press', function() {
          return expect($(document.documentElement)).toHandleWith('keyup', this.player.bindExitFullScreen);
        });
        return it('bind to fullscreen switching button', function() {
          return expect($('.add-fullscreen')).toHandleWith('click', this.player.toggleFullScreen);
        });
      });
      it('create Youtube player', function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        spyOn(YT, 'Player');
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return expect(YT.Player).toHaveBeenCalledWith('id', {
          playerVars: playerVars,
          videoId: 'normalSpeedYoutubeId',
          events: {
            onReady: this.player.onReady,
            onStateChange: this.player.onStateChange,
            onPlaybackQualityChange: this.player.onPlaybackQualityChange
          }
        });
      });
      it('create HTML5 player', function() {
        jasmine.stubVideoPlayerAlpha(this, [], false, true);
        spyOn(HTML5Video, 'Player');
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return expect(HTML5Video.Player).toHaveBeenCalledWith(this.video.el, {
          playerVars: playerVars,
          videoSources: this.video.html5Sources,
          events: {
            onReady: this.player.onReady,
            onStateChange: this.player.onStateChange
          }
        });
      });
      describe('when not on a touch based device', function() {
        beforeEach(function() {
          jasmine.stubVideoPlayerAlpha(this, [], false);
          $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
          $('.add-fullscreen, .hide-subtitles').removeData('qtip');
          return this.player = new VideoPlayerAlpha({
            video: this.video
          });
        });
        it('add the tooltip to fullscreen and subtitle button', function() {
          expect($('.add-fullscreen')).toHaveData('qtip');
          return expect($('.hide-subtitles')).toHaveData('qtip');
        });
        return it('create video volume control', function() {
          expect(window.VideoVolumeControlAlpha.prototype.initialize).toHaveBeenCalled();
          expect(this.player.volumeControl).toBeDefined();
          return expect(this.player.volumeControl.el).toBe($('.secondary-controls', this.player.el));
        });
      });
      return describe('when on a touch based device', function() {
        beforeEach(function() {
          jasmine.stubVideoPlayerAlpha(this, [], false);
          $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
          window.onTouchBasedDevice.andReturn(true);
          $('.add-fullscreen, .hide-subtitles').removeData('qtip');
          return this.player = new VideoPlayerAlpha({
            video: this.video
          });
        });
        it('does not add the tooltip to fullscreen and subtitle button', function() {
          expect($('.add-fullscreen')).not.toHaveData('qtip');
          return expect($('.hide-subtitles')).not.toHaveData('qtip');
        });
        return it('does not create video volume control', function() {
          expect(window.VideoVolumeControlAlpha.prototype.initialize).not.toHaveBeenCalled();
          return expect(this.player.volumeControl).not.toBeDefined();
        });
      });
    });
    describe('onReady', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        spyOn(this.video, 'log');
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.video.embed();
        this.player = this.video.player;
        spyOnEvent(this.player, 'ready');
        spyOnEvent(this.player, 'updatePlayTime');
        return this.player.onReady();
      });
      it('log the load_video event', function() {
        return expect(this.video.log).toHaveBeenCalledWith('load_video');
      });
      describe('when not on a touch based device', function() {
        beforeEach(function() {
          spyOn(this.player, 'play');
          return this.player.onReady();
        });
        return it('autoplay the first video', function() {
          return expect(this.player.play).toHaveBeenCalled();
        });
      });
      return describe('when on a touch based device', function() {
        beforeEach(function() {
          window.onTouchBasedDevice.andReturn(true);
          spyOn(this.player, 'play');
          return this.player.onReady();
        });
        return it('does not autoplay the first video', function() {
          return expect(this.player.play).not.toHaveBeenCalled();
        });
      });
    });
    describe('onStateChange', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        return $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
      });
      describe('when the video is unstarted', function() {
        beforeEach(function() {
          this.player = new VideoPlayerAlpha({
            video: this.video
          });
          spyOn(this.player.control, 'pause');
          this.player.caption.pause = jasmine.createSpy('VideoCaptionAlpha.pause');
          return this.player.onStateChange({
            data: YT.PlayerState.UNSTARTED
          });
        });
        it('pause the video control', function() {
          return expect(this.player.control.pause).toHaveBeenCalled();
        });
        return it('pause the video caption', function() {
          return expect(this.player.caption.pause).toHaveBeenCalled();
        });
      });
      describe('when the video is playing', function() {
        beforeEach(function() {
          this.anotherPlayer = jasmine.createSpyObj('AnotherPlayer', ['onPause']);
          window.OldVideoPlayerAlpha = this.anotherPlayer;
          this.player = new VideoPlayerAlpha({
            video: this.video
          });
          spyOn(this.video, 'log');
          spyOn(window, 'setInterval').andReturn(100);
          spyOn(this.player.control, 'play');
          this.player.caption.play = jasmine.createSpy('VideoCaptionAlpha.play');
          this.player.progressSlider.play = jasmine.createSpy('VideoProgressSliderAlpha.play');
          this.player.player.getVideoEmbedCode.andReturn('embedCode');
          return this.player.onStateChange({
            data: YT.PlayerState.PLAYING
          });
        });
        it('log the play_video event', function() {
          return expect(this.video.log).toHaveBeenCalledWith('play_video', {
            currentTime: 0
          });
        });
        it('pause other video player', function() {
          return expect(this.anotherPlayer.onPause).toHaveBeenCalled();
        });
        it('set current video player as active player', function() {
          return expect(window.OldVideoPlayerAlpha).toEqual(this.player);
        });
        it('set update interval', function() {
          expect(window.setInterval).toHaveBeenCalledWith(this.player.update, 200);
          return expect(this.player.player.interval).toEqual(100);
        });
        it('play the video control', function() {
          return expect(this.player.control.play).toHaveBeenCalled();
        });
        it('play the video caption', function() {
          return expect(this.player.caption.play).toHaveBeenCalled();
        });
        return it('play the video progress slider', function() {
          return expect(this.player.progressSlider.play).toHaveBeenCalled();
        });
      });
      describe('when the video is paused', function() {
        beforeEach(function() {
          this.player = new VideoPlayerAlpha({
            video: this.video
          });
          spyOn(this.video, 'log');
          spyOn(window, 'clearInterval');
          spyOn(this.player.control, 'pause');
          this.player.caption.pause = jasmine.createSpy('VideoCaptionAlpha.pause');
          this.player.player.interval = 100;
          this.player.player.getVideoEmbedCode.andReturn('embedCode');
          return this.player.onStateChange({
            data: YT.PlayerState.PAUSED
          });
        });
        it('log the pause_video event', function() {
          return expect(this.video.log).toHaveBeenCalledWith('pause_video', {
            currentTime: 0
          });
        });
        it('clear update interval', function() {
          expect(window.clearInterval).toHaveBeenCalledWith(100);
          return expect(this.player.player.interval).toBeNull();
        });
        it('pause the video control', function() {
          return expect(this.player.control.pause).toHaveBeenCalled();
        });
        return it('pause the video caption', function() {
          return expect(this.player.caption.pause).toHaveBeenCalled();
        });
      });
      return describe('when the video is ended', function() {
        beforeEach(function() {
          this.player = new VideoPlayerAlpha({
            video: this.video
          });
          spyOn(this.player.control, 'pause');
          this.player.caption.pause = jasmine.createSpy('VideoCaptionAlpha.pause');
          return this.player.onStateChange({
            data: YT.PlayerState.ENDED
          });
        });
        it('pause the video control', function() {
          return expect(this.player.control.pause).toHaveBeenCalled();
        });
        return it('pause the video caption', function() {
          return expect(this.player.caption.pause).toHaveBeenCalled();
        });
      });
    });
    describe('onSeek', function() {
      var conf;
      conf = [
        {
          desc: 'check if seek_video is logged with slide_seek type',
          type: 'slide_seek',
          obj: 'progressSlider'
        }, {
          desc: 'check if seek_video is logged with caption_seek type',
          type: 'caption_seek',
          obj: 'caption'
        }
      ];
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        spyOn(window, 'clearInterval');
        this.player.player.interval = 100;
        spyOn(this.player, 'updatePlayTime');
        return spyOn(this.video, 'log');
      });
      $.each(conf, function(key, value) {
        return it(value.desc, function() {
          var new_time, old_time, type;
          type = value.type;
          old_time = 0;
          new_time = 60;
          $(this.player[value.obj]).trigger(value.type, new_time);
          return expect(this.video.log).toHaveBeenCalledWith('seek_video', {
            old_time: old_time,
            new_time: new_time,
            type: value.type
          });
        });
      });
      it('seek the player', function() {
        $(this.player.progressSlider).trigger('slide_seek', 60);
        return expect(this.player.player.seekTo).toHaveBeenCalledWith(60, true);
      });
      it('call updatePlayTime on player', function() {
        $(this.player.progressSlider).trigger('slide_seek', 60);
        return expect(this.player.updatePlayTime).toHaveBeenCalledWith(60);
      });
      describe('when the player is playing', function() {
        beforeEach(function() {
          $(this.player.progressSlider).trigger('slide_seek', 60);
          this.player.player.getPlayerState.andReturn(YT.PlayerState.PLAYING);
          return this.player.onSeek({}, 60);
        });
        return it('reset the update interval', function() {
          return expect(window.clearInterval).toHaveBeenCalledWith(100);
        });
      });
      return describe('when the player is not playing', function() {
        beforeEach(function() {
          $(this.player.progressSlider).trigger('slide_seek', 60);
          this.player.player.getPlayerState.andReturn(YT.PlayerState.PAUSED);
          return this.player.onSeek({}, 60);
        });
        return it('set the current time', function() {
          return expect(this.player.currentTime).toEqual(60);
        });
      });
    });
    describe('onSpeedChange', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        this.player.currentTime = 60;
        spyOn(this.player, 'updatePlayTime');
        spyOn(this.video, 'setSpeed').andCallThrough();
        return spyOn(this.video, 'log');
      });
      describe('always', function() {
        beforeEach(function() {
          return this.player.onSpeedChange({}, '0.75', false);
        });
        it('check if speed_change_video is logged', function() {
          return expect(this.video.log).toHaveBeenCalledWith('speed_change_video', {
            currentTime: this.player.currentTime,
            old_speed: '1.0',
            new_speed: '0.75'
          });
        });
        it('convert the current time to the new speed', function() {
          return expect(this.player.currentTime).toEqual('80.000');
        });
        it('set video speed to the new speed', function() {
          return expect(this.video.setSpeed).toHaveBeenCalledWith('0.75', false);
        });
        return it('tell video caption that the speed has changed', function() {
          return expect(this.player.caption.currentSpeed).toEqual('0.75');
        });
      });
      describe('when the video is playing', function() {
        beforeEach(function() {
          this.player.player.getPlayerState.andReturn(YT.PlayerState.PLAYING);
          return this.player.onSpeedChange({}, '0.75');
        });
        it('load the video', function() {
          return expect(this.player.player.loadVideoById).toHaveBeenCalledWith('slowerSpeedYoutubeId', '80.000');
        });
        return it('trigger updatePlayTime event', function() {
          return expect(this.player.updatePlayTime).toHaveBeenCalledWith('80.000');
        });
      });
      return describe('when the video is not playing', function() {
        beforeEach(function() {
          this.player.player.getPlayerState.andReturn(YT.PlayerState.PAUSED);
          return this.player.onSpeedChange({}, '0.75');
        });
        it('cue the video', function() {
          return expect(this.player.player.cueVideoById).toHaveBeenCalledWith('slowerSpeedYoutubeId', '80.000');
        });
        return it('trigger updatePlayTime event', function() {
          return expect(this.player.updatePlayTime).toHaveBeenCalledWith('80.000');
        });
      });
    });
    describe('onVolumeChange', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return this.player.onVolumeChange(void 0, 60);
      });
      return it('set the volume on player', function() {
        return expect(this.player.player.setVolume).toHaveBeenCalledWith(60);
      });
    });
    describe('update', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return spyOn(this.player, 'updatePlayTime');
      });
      describe('when the current time is unavailable from the player', function() {
        beforeEach(function() {
          this.player.player.getCurrentTime.andReturn(void 0);
          return this.player.update();
        });
        return it('does not trigger updatePlayTime event', function() {
          return expect(this.player.updatePlayTime).not.toHaveBeenCalled();
        });
      });
      return describe('when the current time is available from the player', function() {
        beforeEach(function() {
          this.player.player.getCurrentTime.andReturn(60);
          return this.player.update();
        });
        return it('trigger updatePlayTime event', function() {
          return expect(this.player.updatePlayTime).toHaveBeenCalledWith(60);
        });
      });
    });
    describe('updatePlayTime', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        spyOn(this.video, 'getDuration').andReturn(1800);
        this.player.caption.updatePlayTime = jasmine.createSpy('VideoCaptionAlpha.updatePlayTime');
        this.player.progressSlider.updatePlayTime = jasmine.createSpy('VideoProgressSliderAlpha.updatePlayTime');
        return this.player.updatePlayTime(60);
      });
      it('update the video playback time', function() {
        return expect($('.vidtime')).toHaveHtml('1:00 / 30:00');
      });
      it('update the playback time on caption', function() {
        return expect(this.player.caption.updatePlayTime).toHaveBeenCalledWith(60);
      });
      return it('update the playback time on progress slider', function() {
        return expect(this.player.progressSlider.updatePlayTime).toHaveBeenCalledWith(60, 1800);
      });
    });
    describe('toggleFullScreen', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return this.player.caption.resize = jasmine.createSpy('VideoCaptionAlpha.resize');
      });
      describe('when the video player is not full screen', function() {
        beforeEach(function() {
          spyOn(this.video, 'log');
          this.player.el.removeClass('fullscreen');
          return this.player.toggleFullScreen(jQuery.Event("click"));
        });
        it('log the fullscreen event', function() {
          return expect(this.video.log).toHaveBeenCalledWith('fullscreen', {
            currentTime: this.player.currentTime
          });
        });
        it('replace the full screen button tooltip', function() {
          return expect($('.add-fullscreen')).toHaveAttr('title', 'Exit fill browser');
        });
        it('add the fullscreen class', function() {
          return expect(this.player.el).toHaveClass('fullscreen');
        });
        return it('tell VideoCaption to resize', function() {
          return expect(this.player.caption.resize).toHaveBeenCalled();
        });
      });
      return describe('when the video player already full screen', function() {
        beforeEach(function() {
          spyOn(this.video, 'log');
          this.player.el.addClass('fullscreen');
          return this.player.toggleFullScreen(jQuery.Event("click"));
        });
        it('log the not_fullscreen event', function() {
          return expect(this.video.log).toHaveBeenCalledWith('not_fullscreen', {
            currentTime: this.player.currentTime
          });
        });
        it('replace the full screen button tooltip', function() {
          return expect($('.add-fullscreen')).toHaveAttr('title', 'Fill browser');
        });
        it('remove exit full screen button', function() {
          return expect(this.player.el).not.toContain('a.exit');
        });
        it('remove the fullscreen class', function() {
          return expect(this.player.el).not.toHaveClass('fullscreen');
        });
        return it('tell VideoCaption to resize', function() {
          return expect(this.player.caption.resize).toHaveBeenCalled();
        });
      });
    });
    describe('play', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        return this.player = new VideoPlayerAlpha({
          video: this.video
        });
      });
      describe('when the player is not ready', function() {
        beforeEach(function() {
          this.player.player.playVideo = void 0;
          return this.player.play();
        });
        return it('does nothing', function() {
          return expect(this.player.player.playVideo).toBeUndefined();
        });
      });
      return describe('when the player is ready', function() {
        beforeEach(function() {
          this.player.player.playVideo.andReturn(true);
          return this.player.play();
        });
        return it('delegate to the Youtube player', function() {
          return expect(this.player.player.playVideo).toHaveBeenCalled();
        });
      });
    });
    describe('isPlaying', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        return this.player = new VideoPlayerAlpha({
          video: this.video
        });
      });
      describe('when the video is playing', function() {
        beforeEach(function() {
          return this.player.player.getPlayerState.andReturn(YT.PlayerState.PLAYING);
        });
        return it('return true', function() {
          return expect(this.player.isPlaying()).toBeTruthy();
        });
      });
      return describe('when the video is not playing', function() {
        beforeEach(function() {
          return this.player.player.getPlayerState.andReturn(YT.PlayerState.PAUSED);
        });
        return it('return false', function() {
          return expect(this.player.isPlaying()).toBeFalsy();
        });
      });
    });
    describe('pause', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return this.player.pause();
      });
      return it('delegate to the Youtube player', function() {
        return expect(this.player.player.pauseVideo).toHaveBeenCalled();
      });
    });
    describe('duration', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        spyOn(this.video, 'getDuration');
        return this.player.duration();
      });
      return it('delegate to the video', function() {
        return expect(this.video.getDuration).toHaveBeenCalled();
      });
    });
    describe('currentSpeed', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return this.video.speed = '3.0';
      });
      return it('delegate to the video', function() {
        return expect(this.player.currentSpeed()).toEqual('3.0');
      });
    });
    return describe('volume', function() {
      beforeEach(function() {
        jasmine.stubVideoPlayerAlpha(this, [], false);
        $('.video').append($('<div class="add-fullscreen" /><div class="hide-subtitles" />'));
        this.player = new VideoPlayerAlpha({
          video: this.video
        });
        return this.player.player.getVolume.andReturn(42);
      });
      describe('without value', function() {
        return it('return current volume', function() {
          return expect(this.player.volume()).toEqual(42);
        });
      });
      return describe('with value', function() {
        return it('set player volume', function() {
          this.player.volume(60);
          return expect(this.player.player.setVolume).toHaveBeenCalledWith(60);
        });
      });
    });
  });

}).call(this);
