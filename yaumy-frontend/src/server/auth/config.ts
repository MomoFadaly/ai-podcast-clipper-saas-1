interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  user?: User;
  expires?: string;
}

export const auth = async (): Promise<Session | null> => {
  // Stub auth function - returns null in test/build environment
  return null;
};