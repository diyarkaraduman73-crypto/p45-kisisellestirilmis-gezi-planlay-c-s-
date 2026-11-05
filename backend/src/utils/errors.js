export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}
export class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}
// 401: kimliği doğrulanmamış (giriş yapılmamış / token geçersiz)
export class UnauthorizedError extends AppError {
  constructor(message = 'Bu işlem için giriş yapmalısınız') { super(message, 401); }
}
// 403: kimlik belli ama yetkisi yok
export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok') { super(message, 403); }
}
export class NotFoundError extends AppError {
  constructor(message) { super(message, 404); }
}
export class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}
export class TooManyAttemptsError extends AppError {
  constructor(message) { super(message, 429); }
}
