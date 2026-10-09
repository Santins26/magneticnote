"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/page.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function checkUser () {
      const{data} = await supabase.auth.getUser();

      if (data.user) {
        window.location.href = "/";
      }
    }
    checkUser();
  }, []);

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log(error);
      return;
    }

    console.log("Conta Criada");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(error);
      return;
    }

    window.location.href = "/";


    
  }

  return (
    <main>
        <div className={styles.login}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={signUp}>
        Cadastrar
      </button>

      <button onClick={login}>
        Logar
      </button>
      </div>
    </main>
  );
}