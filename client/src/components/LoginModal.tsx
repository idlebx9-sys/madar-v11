import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Mail, Chrome, Loader2 } from "lucide-react";
import { startGoogleLogin } from "@/const";
import { trpc } from "@/lib/trpc";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "حدث خطأ، حاول مرة أخرى");
        return;
      }
      await utils.auth.me.invalidate();
      onClose();
      window.location.href = "/dashboard";
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-md glass-light rounded-2xl border border-[#D4AF37]/40 p-8 shadow-2xl"
              style={{ background: "rgba(11, 17, 36, 0.85)", backdropFilter: "blur(24px)" }}
              dir="rtl"
            >
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-2 rounded-lg text-[#64748B] hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#0F5132] flex items-center justify-center">
                  <span className="font-display font-black text-white text-xl">م</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-white mb-2">
                  {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
                </h2>
                <p className="text-[#64748B] text-sm">
                  {mode === "login"
                    ? "سجّل دخولك لمتابعة إدارة مواقعك"
                    : "أنشئ حساباً جديداً وابدأ بناء موقعك"}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === "register" && (
                  <input
                    type="text"
                    required
                    minLength={2}
                    placeholder="الاسم"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#D4AF37]/50"
                  />
                )}
                <input
                  type="email"
                  required
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#D4AF37]/50"
                  dir="ltr"
                />
                <input
                  type="password"
                  required
                  minLength={mode === "register" ? 8 : 1}
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#D4AF37]/50"
                  dir="ltr"
                />
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-white font-medium transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {mode === "login" ? "دخول" : "تسجيل"}
                </button>
              </form>

              <div className="relative flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#D4AF37]/20" />
                <span className="text-[#64748B] text-xs">أو</span>
                <div className="flex-1 h-px bg-[#D4AF37]/20" />
              </div>

              <button
                type="button"
                onClick={() => startGoogleLogin()}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200"
              >
                <Chrome size={18} className="text-[#0F5132]" />
                <span className="font-medium">الدخول بـ Google</span>
              </button>

              <p className="mt-4 text-center text-sm text-[#64748B]">
                {mode === "login" ? (
                  <>
                    ليس لديك حساب؟{" "}
                    <button
                      type="button"
                      className="text-[#D4AF37] hover:underline"
                      onClick={() => { setMode("register"); setError(null); }}
                    >
                      إنشاء حساب
                    </button>
                  </>
                ) : (
                  <>
                    لديك حساب؟{" "}
                    <button
                      type="button"
                      className="text-[#D4AF37] hover:underline"
                      onClick={() => { setMode("login"); setError(null); }}
                    >
                      تسجيل الدخول
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
