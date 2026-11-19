import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD 환경값이 필요합니다.",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("ADMIN_PASSWORD는 8자 이상이어야 합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

let user = created.user;
if (createError) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (!user) throw createError;

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (updateError) throw updateError;
  user = updated.user;
}

if (!user) throw new Error("관리자 계정을 생성하지 못했습니다.");

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  email,
  nickname: "관리자",
  role: "admin",
});
if (profileError) throw profileError;

console.log(`관리자 계정 준비 완료: ${email}`);
