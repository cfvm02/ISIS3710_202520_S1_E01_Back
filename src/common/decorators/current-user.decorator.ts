import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserOptions {
  optional?: boolean;
}

export const CurrentUser = createParamDecorator(
  (
    data: string | CurrentUserOptions | undefined,
    ctx: ExecutionContext,
  ): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If data is a string, it's a property name to extract
    if (typeof data === 'string') {
      return user?.[data];
    }

    // If data is an object with options
    if (typeof data === 'object' && data !== null) {
      // Handle optional users - they might not be authenticated
      return user;
    }

    // Default: return the whole user object
    return user;
  },
);
