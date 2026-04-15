import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import { signToken } from '../utils/jwt';

export async function login(email: string, password: string) {
  const employee = db.employees.byEmail(email);
  if (!employee) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, employee.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = signToken({ employeeId: employee.employeeId, role: employee.role });
  return {
    token,
    user: {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      role: employee.role,
      costCentre: employee.costCentre,
    },
  };
}
