import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/** skip JWT / role checks — use on auth routes etc. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
