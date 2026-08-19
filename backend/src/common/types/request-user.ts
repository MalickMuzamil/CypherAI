import { Role } from '../../users/schemas/user.schema';
export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionId: string;
}