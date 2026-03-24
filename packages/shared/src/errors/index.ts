export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Resource not found') {
    super(msg, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(msg = 'Unauthorized') {
    super(msg, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') {
    super(msg, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(msg: string) {
    super(msg, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(msg: string) {
    super(msg, 409, 'CONFLICT');
  }
}

export class InsufficientStockError extends AppError {
  constructor(msg = 'Insufficient stock') {
    super(msg, 409, 'INSUFFICIENT_STOCK');
  }
}

export class PaymentError extends AppError {
  constructor(msg: string) {
    super(msg, 402, 'PAYMENT_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(msg = 'Service unavailable') {
    super(msg, 503, 'SERVICE_UNAVAILABLE');
  }
}
