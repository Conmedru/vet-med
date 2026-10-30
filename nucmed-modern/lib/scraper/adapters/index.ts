import { BaseAdapter, SourceConfig } from '../types';
import { RSSAdapter } from './rss';
import { PlaywrightAdapter } from './playwright';
import { DoajAdapter } from './doaj';
import { CrossrefAdapter } from './crossref';
import { OaiAdapter } from './oai';
import { CegAdapter } from './ceg';
import { VetTimesAdapter } from './vettimes';

export function getAdapter(config: SourceConfig): BaseAdapter {
  switch (config.adapterType) {
    case 'rss':
      return new RSSAdapter(config);
    case 'playwright':
    case 'html':
      return new PlaywrightAdapter(config);
    case 'doaj':
      return new DoajAdapter(config);
    case 'crossref':
      return new CrossrefAdapter(config);
    case 'oai':
      return new OaiAdapter(config);
    case 'ceg':
      return new CegAdapter(config);
    case 'vettimes':
      return new VetTimesAdapter(config);
    default:
      throw new Error(`Unknown adapter type: ${config.adapterType}`);
  }
}
