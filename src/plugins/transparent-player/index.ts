import is from 'electron-is';

import { t } from '@/i18n';
import { createPlugin } from '@/utils';
import { MaterialType, type TransparentPlayerConfig } from './types';
import style from './style.css?inline';

import type { BrowserWindow } from 'electron';

// A helper function to apply window materials
const setWindowMaterial = (window: BrowserWindow, type: MaterialType) => {
  if (type === MaterialType.NONE) {
    if (is.windows()) window.setBackgroundMaterial?.('none');
    else if (is.macOS()) window.setVibrancy?.(null);
    return;
  }

  if (is.windows()) {
    window.setBackgroundMaterial?.(
      type as Parameters<BrowserWindow['setBackgroundMaterial']>[0],
    );
  } else if (is.macOS()) {
    window.setVibrancy?.(type as Parameters<BrowserWindow['setVibrancy']>[0]);
  }
};

// Default values
const defaultConfig: TransparentPlayerConfig = {
  enabled: false,
  opacity: 0.5,
  type: is.windows()
    ? MaterialType.ACRYLIC
    : is.macOS()
      ? MaterialType.FULLSCREEN_UI
      : MaterialType.NONE,
};

// List of available values
const opacityList = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const typeList = is.windows()
  ? [
      MaterialType.MICA,
      MaterialType.ACRYLIC,
      MaterialType.TABBED,
      MaterialType.NONE,
    ]
  : is.macOS()
    ? [
        MaterialType.WINDOW,
        MaterialType.FULLSCREEN_UI,
        MaterialType.CONTENT,
        MaterialType.UNDER_WINDOW,
        MaterialType.UNDER_PAGE,
        MaterialType.NONE,
      ]
    : [MaterialType.NONE];

export default createPlugin({
  name: () => t('plugins.transparent-player.name'),
  description: () => t('plugins.transparent-player.description'),
  addedVersion: '3.11.x',
  restartNeeded: true,
  config: defaultConfig,
  stylesheets: [style],
  async menu({ getConfig, setConfig }) {
    const config = await getConfig();
    return [
      {
        label: t('plugins.transparent-player.menu.opacity.label'),
        submenu: opacityList.map((opacity) => ({
          label: t('plugins.transparent-player.menu.opacity.submenu.percent', {
            opacity: opacity * 100,
          }),
          type: 'radio',
          checked: config.opacity === opacity,
          click() {
            setConfig({ opacity });
          },
        })),
      },
      {
        label: t('plugins.transparent-player.menu.type.label'),
        submenu: typeList.map((type) => ({
          label: t(`plugins.transparent-player.menu.type.submenu.${type}`),
          type: 'radio',
          checked: config.type === type,
          click() {
            setConfig({ type });
          },
        })),
      },
    ];
  },
  backend: {
    mainWindow: null as BrowserWindow | null,
    async start({ window, getConfig }) {
      this.mainWindow = window;

      const config = await getConfig();
      setWindowMaterial(window, config.type);
      window.setBackgroundColor?.(`rgba(0, 0, 0, ${config.opacity})`);
    },
    onConfigChange(newConfig) {
      if (this.mainWindow) {
        setWindowMaterial(this.mainWindow, newConfig.type);
      }
    },
    stop({ window }) {
      setWindowMaterial(window, MaterialType.NONE);
    },
  },
  renderer: {
    props: {
      enabled: defaultConfig.enabled,
      opacity: defaultConfig.opacity,
      type: defaultConfig.type,
    } as TransparentPlayerConfig,
    async start({ getConfig }) {
      const config = await getConfig();
      this.props = config;
      if (config.enabled) {
        document.body.classList.add('transparent-background-color');
        document.body.classList.add('transparent-player-backdrop-filter');

        if (!(await window.mainConfig.plugins.isEnabled('album-color-theme'))) {
          document.body.classList.add('transparent-player');
        }
        this.applyVariables();
      }
    },
    onConfigChange(newConfig) {
      this.props = newConfig;
      this.applyVariables();
    },
    stop() {
      document.body.classList.remove('transparent-background-color');
      document.body.classList.remove('transparent-player-backdrop-filter');
      document.body.classList.remove('transparent-player');
      document.documentElement.style.removeProperty(
        '--ytmd-transparent-player-opacity',
      );
    },
    applyVariables(this: { props: TransparentPlayerConfig }) {
      const { opacity } = this.props;
      document.documentElement.style.setProperty(
        '--ytmd-transparent-player-opacity',
        opacity.toString(),
      );
    },
  },
});
