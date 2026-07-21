import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler and passes any errors to the Express error handling middleware.
 * This eliminates the need for try-catch blocks in every controller method.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
