export type LoginResponse = {
    message: string;
    user?: {
      id: string;
      email: string;
      name: string;
      roles: string[];
    };
  };
  
  export async function login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  
    const data = (await res.json()) as LoginResponse;
  
    if (!res.ok) {
      throw new Error(data.message || "Gagal login");
    }
  
    return data;
  }
  