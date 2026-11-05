// İŞ KATMANI: kimlik doğrulama (kayıt, giriş, çıkış, oturum doğrulama, parola değiştirme)
import { randomUUID } from 'node:crypto';
import * as userRepository from '../repositories/userRepository.js';
import * as sessionRepository from '../repositories/sessionRepository.js';
import * as userService from './userService.js';
import { config } from '../config/env.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword, passwordProblem, DUMMY_HASH } from '../utils/password.js';
import { UnauthorizedError, ValidationError, TooManyAttemptsError } from '../utils/errors.js';

// Bilerek tek ve genel mesaj: "e-posta yok" ile "parola yanlış" ayırt edilemesin
// (aksi halde saldırgan hangi e-postaların kayıtlı olduğunu öğrenebilir).
const INVALID_LOGIN = 'E-posta veya parola hatalı';

async function startSession(user, userAgent) {
  const jti = randomUUID();
  const ttl = config.sessionTtlMinutes * 60;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  await sessionRepository.create({ id: jti, userId: user.id, expiresAt, userAgent });
  // Token içinde yalnızca kimlik ve rol; e-posta/parola gibi hassas veri yok.
  const token = signToken({ sub: String(user.id), role: user.role, jti }, config.jwtSecret, ttl);
  return { token, expiresAt: expiresAt.toISOString() };
}

// KAYIT: herkes yalnızca "gezgin" olarak kayıt olabilir; rol istekten okunmaz.
export async function register(body, { userAgent } = {}) {
  const user = await userService.createUser({ ...body, role: undefined }, { role: 'gezgin' });
  return { ...(await startSession(user, userAgent)), user };
}

// GİRİŞ
export async function login({ email, password } = {}, { userAgent } = {}) {
  if (!email || !password) throw new ValidationError('E-posta ve parola zorunludur');
  const auth = await userRepository.findAuthByEmail(String(email).trim().toLowerCase());

  if (!auth) {
    verifyPassword(password, DUMMY_HASH); // aynı süreyi harca (zamanlama saldırısı)
    throw new UnauthorizedError(INVALID_LOGIN);
  }

  if (auth.locked_until && new Date(auth.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(auth.locked_until) - Date.now()) / 60000);
    throw new TooManyAttemptsError(`Çok fazla hatalı deneme. ${mins} dakika sonra tekrar deneyin.`);
  }

  if (!verifyPassword(password, auth.password_hash)) {
    const r = await userRepository.recordFailedLogin(auth.id, config.maxFailedLogins, config.lockMinutes);
    if (r?.locked_until) {
      await sessionRepository.revokeAllForUser(auth.id); // kilitlenen hesabın açık oturumları kapanır
      throw new TooManyAttemptsError(
        `Çok fazla hatalı deneme. Hesap ${config.lockMinutes} dakika kilitlendi.`
      );
    }
    throw new UnauthorizedError(INVALID_LOGIN);
  }

  await userRepository.recordSuccessfulLogin(auth.id);
  const user = await userRepository.findById(auth.id);
  return { ...(await startSession(user, userAgent)), user };
}

// ÇIKIŞ: oturum kaydı iptal edilir; aynı token bir daha kullanılamaz.
export async function logout(actor) {
  await sessionRepository.revoke(actor.sessionId);
}

// Her korumalı istekte çağrılır: imza + süre + oturum kaydı + kullanıcı hâlâ var mı?
// Rol, token'dan değil veritabanından okunur: rolü değişen kullanıcı hemen etkilenir.
export async function authenticate(token) {
  const payload = verifyToken(token, config.jwtSecret);
  if (!payload?.jti || !payload.sub) throw new UnauthorizedError('Oturum geçersiz veya süresi dolmuş');

  const session = await sessionRepository.findActive(payload.jti);
  if (!session || String(session.user_id) !== payload.sub) {
    throw new UnauthorizedError('Oturum geçersiz veya süresi dolmuş');
  }
  const user = await userRepository.findById(Number(payload.sub));
  if (!user) throw new UnauthorizedError('Kullanıcı bulunamadı');

  return { id: user.id, role: user.role, sessionId: payload.jti, user };
}

// PAROLA DEĞİŞTİRME: mevcut parola doğrulanır, diğer tüm oturumlar kapatılır.
export async function changePassword(actor, { currentPassword, newPassword } = {}) {
  const stored = await userRepository.findPasswordHash(actor.id);
  if (!verifyPassword(currentPassword ?? '', stored)) throw new UnauthorizedError('Mevcut parola hatalı');
  const problem = passwordProblem(newPassword);
  if (problem) throw new ValidationError(problem);
  if (currentPassword === newPassword) throw new ValidationError('Yeni parola eskisiyle aynı olamaz');

  await userRepository.updatePassword(actor.id, hashPassword(newPassword));
  const closed = await sessionRepository.revokeAllForUser(actor.id, actor.sessionId);
  return { closedSessions: closed };
}
