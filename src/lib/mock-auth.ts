export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    first_name: string;
    last_name: string;
  };
  role: string;
}

const MOCK_ADMIN_KEY = "bmc_mock_admin_session";

export function getMockAdminUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMockAdminUser(email?: string): MockUser {
  const user: MockUser = {
    id: "mock-admin-id-123",
    email: email && email.trim() ? email.trim() : "admin@example.com",
    user_metadata: {
      full_name: "Admin User",
      first_name: "Admin",
      last_name: "User",
    },
    role: "super_admin",
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MOCK_ADMIN_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Failed to save mock admin user", e);
    }
  }
  return user;
}

export function clearMockAdminUser() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(MOCK_ADMIN_KEY);
    } catch (e) {
      console.error("Failed to clear mock admin user", e);
    }
  }
}
