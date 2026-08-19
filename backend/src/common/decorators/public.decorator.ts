import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTE } from '../constants';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);