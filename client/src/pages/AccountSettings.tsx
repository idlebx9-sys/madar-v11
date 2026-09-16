import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Trash2,
  Save,
  KeyRound,
  User,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "danger";

export default function AccountSettings() {
  const { user, loading, logout } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/",
  });
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const updateProfile = trpc.account.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الملف الشخصي");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const changePassword = trpc.account.changePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAccount = trpc.account.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("تم حذف الحساب");
      await logout();
      window.location.href = "/";
    },
    onError: (e) => toast.error(e.message),
  });



  if (loading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "الملف الشخصي", icon: User },
    { id: "security", label: "الأمان", icon: Shield },
    { id: "danger", label: "منطقة الخطر", icon: AlertTriangle },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto" dir="rtl">
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            إعدادات الحساب
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">إدارة ملفك الشخصي والأمان</p>
        </div>

        <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.02] mb-8 w-fit overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  tab === t.id
                    ? t.id === "danger"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-[#D4AF37] text-[#0B1220]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "profile" && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">الملف الشخصي</h2>
              <p className="text-sm text-slate-400">الاسم والبريد الظاهران في حسابك</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">الاسم</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="الاسم الكامل"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">البريد الإلكتروني</label>
                <input
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => updateProfile.mutate({ name, email })}
                disabled={updateProfile.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/25 font-medium text-sm transition-all disabled:opacity-50"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                حفظ التغييرات
              </button>
            </div>
          </section>
        )}

        {tab === "security" && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">تغيير كلمة المرور</h2>
              <p className="text-sm text-slate-400">استخدم كلمة مرور قوية لا تقل عن 8 أحرف</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">كلمة المرور الحالية</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs">كلمتا المرور غير متطابقتين</p>
              )}
              <button
                onClick={() => {
                  if (newPassword !== confirmPassword) {
                    toast.error("كلمتا المرور غير متطابقتين");
                    return;
                  }
                  changePassword.mutate({ currentPassword, newPassword });
                }}
                disabled={
                  changePassword.isPending ||
                  newPassword.length < 8 ||
                  newPassword !== confirmPassword
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-medium text-sm transition-all disabled:opacity-40"
              >
                {changePassword.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <KeyRound size={16} />
                )}
                تغيير كلمة المرور
              </button>
            </div>
          </section>
        )}

        {tab === "danger" && (
          <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-red-400 mb-1">حذف الحساب</h2>
              <p className="text-sm text-slate-400">
                حذف الحساب نهائي ولا يمكن التراجع عنه. سيتم حذف جميع مواقعك وبياناتك.
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                اكتب <span className="text-red-400 font-mono">DELETE</span> للتأكيد
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-red-500/20 text-white focus:outline-none focus:border-red-500/50"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                dir="ltr"
              />
            </div>
            <button
              onClick={() => {
                if (deleteConfirm !== "DELETE") {
                  toast.error("اكتب DELETE للتأكيد");
                  return;
                }
                deleteAccount.mutate({ confirmation: "DELETE" });
              }}
              disabled={deleteAccount.isPending || deleteConfirm !== "DELETE"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-medium text-sm transition-all disabled:opacity-40"
            >
              {deleteAccount.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              حذف الحساب نهائياً
            </button>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
