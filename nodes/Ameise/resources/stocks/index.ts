import type { AmeiseResource } from '../../shared/types';
import { stocksBroker, stocksCompany, stocksDictionary, stocksEmployee } from './broker';
import { stocksContract } from './contract';
import { stocksCustomer, stocksCustomerNote } from './customer';
import {
	stocksCustomerAddress,
	stocksCustomerCommunication,
	stocksCustomerRelation,
	stocksSuggestedTag,
} from './customerDetails';

export const stocksResources: AmeiseResource[] = [
	stocksBroker,
	stocksEmployee,
	stocksCompany,
	stocksContract,
	stocksCustomer,
	stocksCustomerAddress,
	stocksCustomerCommunication,
	stocksCustomerNote,
	stocksCustomerRelation,
	stocksSuggestedTag,
	stocksDictionary,
];
