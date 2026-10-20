import type { AmeiseResource } from '../../shared/types';
import { archiveEntry } from './entry';
import { archiveFile, archiveTag } from './fileAndTag';

export const archiveResources: AmeiseResource[] = [archiveEntry, archiveFile, archiveTag];
