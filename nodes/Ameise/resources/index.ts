import type { AmeiseResource } from '../shared/types';
import { archiveResources } from './archive';
import { pandaResources } from './panda';
import { stocksResources } from './stocks';

/**
 * All resources of the node. To support another Ameise API, create a folder
 * next to `panda`, `stocks` and `archive` and add its resources here.
 */
export const resources: AmeiseResource[] = [
	...archiveResources,
	...pandaResources,
	...stocksResources,
];
