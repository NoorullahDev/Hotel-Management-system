import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface CreateStaffParams {
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  department: string;
  role: string;
  shift?: string;
  status: string;
  hireDate?: string | Date;
}

export const createStaffAccount = async (tx: TxClient, params: CreateStaffParams) => {
  const { name, email, username, phone, department, role, shift, status, hireDate } = params;

  let finalEmail = email ? String(email).trim().toLowerCase() : undefined;
  let finalUsername = username ? String(username).trim().toLowerCase() : undefined;

  // Preserve housekeeping fallback logic
  if (!finalEmail && department === 'Housekeeping') {
    finalUsername = finalUsername || `hsk_${Date.now()}`;
    finalEmail = `${finalUsername}@grandparkhotel.com`;
  } else if (!finalEmail) {
    finalUsername = finalUsername || `user_${Date.now()}`;
    finalEmail = `${finalUsername}@grandparkhotel.com`;
  }

  if (!finalUsername) {
    finalUsername = finalEmail.split('@')[0];
  }

  const existingUser = await tx.user.findFirst({
    where: { OR: [{ email: finalEmail }, { username: finalUsername }] }
  });

  if (existingUser) {
    const isHousekeeping = department === 'Housekeeping';
    throw new Error(isHousekeeping ? 'User with this email already exists' : 'User with this email or username already exists');
  }

  let systemRoleName = 'Receptionist';
  const dept = String(department).toLowerCase();
  if (dept === 'housekeeping') systemRoleName = 'Housekeeping';
  else if (dept === 'restaurant') systemRoleName = 'Restaurant';
  else if (dept === 'management') systemRoleName = 'Manager';

  let systemRole = await tx.role.findUnique({ where: { name: systemRoleName } });
  if (!systemRole) systemRole = await tx.role.findFirst();

  if (!systemRole) {
    throw new Error('System roles not configured properly');
  }

  const temporaryPassword = crypto.randomBytes(6).toString('hex');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(temporaryPassword, salt);

  const user = await tx.user.create({
    data: {
      username: finalUsername,
      email: finalEmail,
      name: String(name),
      phone: phone ? String(phone) : null,
      passwordHash,
      roleId: systemRole.id,
    }
  });

  const staff = await tx.staff.create({
    data: {
      userId: user.id,
      department: String(department),
      role: String(role),
      shift: shift ? String(shift) : 'Morning (8AM - 4PM)',
      attendance: 100,
      status: String(status),
      hireDate: hireDate ? new Date(String(hireDate)) : new Date(),
    }
  });

  return { user, staff, temporaryPassword };
};
