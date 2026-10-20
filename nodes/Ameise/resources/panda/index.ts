import type { AmeiseResource } from '../../shared/types';
import { pandaIndustry, pandaInsuranceCompany, pandaInsuranceLine } from './catalog';
import { pandaContract, pandaFile } from './contract';
import { pandaCustomer } from './customer';
import { pandaCustomerLink } from './customerLink';
import { pandaTender } from './tender';

export const pandaResources: AmeiseResource[] = [
	pandaContract,
	pandaCustomer,
	pandaCustomerLink,
	pandaFile,
	pandaIndustry,
	pandaInsuranceCompany,
	pandaInsuranceLine,
	pandaTender,
];
