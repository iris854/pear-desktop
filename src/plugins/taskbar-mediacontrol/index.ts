import { type NativeImage, nativeImage } from 'electron';

import playIcon from '@assets/media-icons-black/play.png?asset&asarUnpack';
import pauseIcon from '@assets/media-icons-black/pause.png?asset&asarUnpack';
import nextIcon from '@assets/media-icons-black/next.png?asset&asarUnpack';
import previousIcon from '@assets/media-icons-black/previous.png?asset&asarUnpack';

import { createPlugin } from '@/utils';
import { getSongControls } from '@/providers/song-controls';
import {
  registerCallback,
  type SongInfo,
  SongInfoEvent,
} from '@/providers/song-info';
import { type mediaIcons } from '@/types/media-icons';
import { t } from '@/i18n';
import { Platform } from '@/types/plugins';

export default createPlugin({
  name: () => t('plugins.taskbar-mediacontrol.name'),
  description: () => t('plugins.taskbar-mediacontrol.description'),
  restartNeeded: true,
  platform: Platform.Windows,
  config: {
    enabled: false,
  },

  backend({ window }) {
    let currentSongInfo: SongInfo;

    const { playPause, next, previous } = getSongControls(window);

    // Util
    const getImagePath = (kind: keyof typeof mediaIcons): string => {
      switch (kind) {
        case 'play':
          return playIcon;
        case 'pause':
          return pauseIcon;
        case 'next':
          return nextIcon;
        case 'previous':
          return previousIcon;
        default:
          return '';
      }
    };

    const getNativeImage = (kind: keyof typeof mediaIcons): NativeImage => {
      const imagePath = getImagePath(kind);

      if (imagePath) {
        return nativeImage.createFromPath(imagePath);
      }

      // return empty image
      return nativeImage.createEmpty();
    };

    const images = {
      play: getNativeImage('play'),
      pause: getNativeImage('pause'),
      next: getNativeImage('next'),
      previous: getNativeImage('previous'),
    };

    const setThumbar = (songInfo: SongInfo) => {
      // Wait for song to start before setting thumbar
      if (!songInfo?.title) {
        return;
      }

      // Win32 require full rewrite of components
      window.setThumbarButtons([
        {
          tooltip: 'Previous',
          icon: images.previous,
          click() {
            previous();
          },
        },
        {
          tooltip: 'Play/Pause',
          // Update icon based on play state
          icon: songInfo.isPaused ? images.play : images.pause,
          click() {
            playPause();
          },
        },
        {
          tooltip: 'Next',
          icon: images.next,
          click() {
            next();
          },
        },
      ]);
    };

    registerCallback((songInfo, event) => {
      if (event !== SongInfoEvent.TimeChanged) {
        // Update currentsonginfo for win.on('show')
        currentSongInfo = songInfo;
        // Update thumbar
        setThumbar(songInfo);
      }
    });

    // Need to set thumbar again after win.show
    window.on('show', () => setThumbar(currentSongInfo));
  },
});
