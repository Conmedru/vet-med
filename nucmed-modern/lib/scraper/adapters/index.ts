import { BaseAdapter, SourceConfig } from '../types';
import { RSSAdapter } from './rss';
import { PlaywrightAdapter } from './playwright';
import { DoajAdapter } from './doaj';

export function getAdapter(config: SourceConfig): BaseAdapter {
  switch (config.adapterType) {
    case 'rss':
      return new RSSAdapter(config);
    case 'playwright':
    case 'html':
      return new PlaywrightAdapter(config);
    case 'doaj':
      return new DoajAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${config.adapterType}`);
  }
}
