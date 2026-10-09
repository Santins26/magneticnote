
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage("Erro ao carregar perfil!");
        console.error(error);
      } else if (data) {
        setUsername(data.username);
      } else {
        setMessage("Seu perfil não foi criado ainda.");
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  async function saveUsername() {
    const cleanedUsername = username.trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanedUsername)) {
      setMessage(
        "Use de 3 a 20 caracteres: letras e números"
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Por favor faça login novamente!");
      setSaving(false);
      return;
    }

    const { error } = await supabase
  .from("profiles")
  .upsert(
    {
      id: user.id,
      username: cleanedUsername,
    },
    { onConflict: "id" }
  );

    if (error) {
      if (error.code === "23505") {
        setMessage("Esse usuário já existe.");
      } else {
        console.error(error);
        setMessage("Erro ao salvar usuário");
      }
    } else {
      setUsername(cleanedUsername);
      setMessage("Usuário salvo com sucesso!");
    }

    setSaving(false);
  }

  if (loading) return <main>Loading profile...</main>;

  return (
    <main style={{ maxWidth: "500px", margin: "50px auto", padding: "20px" }}>
      <h1>Meu perfil</h1>
      <p>Escolha o nome de usuário que outras pessoas irão ver.</p>

      <label htmlFor="username">Usuário:</label>

      <input
        id="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        maxLength={20}
        placeholder="Seu Usuário"
        style={{
          display: "block",
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          marginTop: "8px",
          marginBottom: "15px",
          background: "black"
        }}
      />

      <button onClick={saveUsername} disabled={saving} style={{background: "black", padding: "5px"}}>
        {saving ? "Saving..." : "Salvar"}
      </button>

      {message && <p role="status">{message}</p>}

      <p style={{ marginTop: "25px" }}>
        <button onClick={() => router.push("/")}>Voltar pra tela inicial</button>
      </p>
    </main>
  );
}