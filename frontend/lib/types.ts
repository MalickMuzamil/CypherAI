export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export type CredentialCategory =
  | "EMAIL"
  | "SOCIAL"
  | "BANK"
  | "CLOUD"
  | "DATABASE"
  | "SERVER"
  | "VPN"
  | "API"
  | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  mfaEnabled: boolean;
  disabled?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
}

export interface Credential {
  id: string;
  name: string;
  username: string;
  category: CredentialCategory;
  url?: string;
  notes?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId: string;
  actorName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  ipAddress?: string;
  lastActiveAt: string;
  expiresAt?: string;
  current: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PasswordHealthAggregate {
  score: number;
  total: number;
  weakCount: number;
  reuseCount: number;
  oldCount: number;
  strongCount: number;
}

export interface AnalyzedCredential {
  id: string;
  name: string;
  username: string;
  category: CredentialCategory;
  url?: string;
  updatedAt: string;
  score: number;
  isWeak: boolean;
  isReused: boolean;
  isOld: boolean;
}

export interface PasswordHealthResponse {
  aggregate: PasswordHealthAggregate;
  credentials: AnalyzedCredential[];
  recommendations: string[];
}

export interface BreachItem {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
}

export interface BreachStatusResponse {
  email: string;
  breaches: BreachItem[];
  pwnedPasswordCount: number;
  checkedAt: string;
}

export interface Passkey {
  id: string;
  name: string;
  deviceType?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export type SharePermission = "READ" | "READ_WRITE";
export type ShareStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

export interface CredentialShare {
  id: string;
  credentialId: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  recipientEmail: string;
  recipientId?: string;
  permission: SharePermission;
  status: ShareStatus;
  expiresAt?: string;
  createdAt: string;
  acceptedAt?: string;
  credential?: {
    id: string;
    name: string;
    username: string;
    category: CredentialCategory;
    url?: string;
  };
}

export interface SharesListResponse {
  sharedByMe: CredentialShare[];
  sharedWithMe: CredentialShare[];
}

export interface CredentialHistoryVersion {
  id: string;
  credentialId: string;
  version: number;
  name: string;
  username: string;
  category: CredentialCategory;
  url?: string;
  hasNotes: boolean;
  notes?: string;
  changedAt: string;
  changeType: "CREATE" | "UPDATE" | "RESTORE";
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

