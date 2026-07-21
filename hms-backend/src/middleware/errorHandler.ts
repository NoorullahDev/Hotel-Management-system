import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || 500;
  
  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this value already exists.' });
  }
  
  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.' });
  }

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
