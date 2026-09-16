import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Globe,
  MessageSquare,
  TrendingUp,
  Wallet,
  Plus,
  Download,
  Eye,
  CheckCheck,
  ExternalLink,
  Search,
  Calendar,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function InboxTab() {
  const { data: messages, isLoading, refetch } = trpc.messages.list.useQuery();
  const markRead = trpc.messages.markRead.useMutation({ onSuccess: () => refetch() });
  const markAllRead = trpc.messages.markAllRead.useMutation({ onSuccess: () => refetch() });
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter((msg) => {
      const matchesSearch =
        searchQuery === "" ||
        msg.senderName.includes(searchQuery) ||
        msg.senderEmail?.includes(searchQuery) ||
        msg.content.includes(searchQuery);
      const matchesDate =
        dateFilter === "" ||
        new Date(msg.createdAt).toLocaleDateString("ar-SA") ===
          new Date(dateFilter).toLocaleDateString("ar-SA");
      return matchesSearch && matchesDate;
    });
  }, [messages, searchQuery, dateFilter]);

  const exportCSV = () => {
    if (!messages?.length) return;
    const headers = ["الاسم", "البريد", "الهاتف", "الرسالة", "التاريخ", "مقروء"];
    const rows = messages.map((m) => [
      m.senderName,
      m.senderEmail || "",
      m.senderPhone || "",
      `"${m.content.replace(/"/g, '""')}"`,
      new Date(m.createdAt).toLocaleDateString("ar-SA"),
      m.isRead ? "نعم" : "لا",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="font-display font-bold text-white text-xl">صندوق الرسائل</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm transition-all"
          >
            <CheckCheck size={14} /> تحديد الكل كمقروء
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm transition-all"
          >
            <Download size={14} /> تصدير CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو البريد أو المحتوى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
          />
        </div>
        <div className="relative">
          <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
          />
        </div>
        {(searchQuery || dateFilter) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setDateFilter("");
            }}
            className="px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm"
          >
            مسح
          </button>
        )}
      </div>

      {!filteredMessages.length ? (
        <EmptyState
          icon={MessageSquare}
          title="لا توجد رسائل"
          description="عندما يرسل زوار مواقعك رسائل عبر نموذج التواصل ستظهر هنا."
        />
      ) : (
        <div className="space-y-2">
          {filteredMessages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                "rounded-xl p-4 border transition-all",
                msg.isRead
                  ? "bg-white/[0.02] border-white/[0.04] opacity-75"
                  : "bg-[#D4AF37]/[0.06] border-[#D4AF37]/20"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#0F5132] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    {msg.senderName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{msg.senderName}</span>
                      {msg.senderEmail && (
                        <span className="text-slate-500 text-xs" dir="ltr">
                          {msg.senderEmail}
                        </span>
                      )}
                      {!msg.isRead && <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />}
                    </div>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{msg.content}</p>
                    <div className="text-xs text-slate-600 mt-1.5">
                      {new Date(msg.createdAt).toLocaleString("ar-SA")}
                    </div>
                  </div>
                </div>
                {!msg.isRead && (
                  <button
                    onClick={() => markRead.mutate({ id: msg.id })}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                    title="تحديد كمقروء"
                  >
                    <Eye size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalletTab() {
  const utils = trpc.useUtils();
  const { data: wallet, isLoading } = trpc.wallet.summary.useQuery();
  const { data: txns } = trpc.wallet.transactions.useQuery();
  const { data: paymentMethods } = trpc.wallet.paymentMethods.useQuery();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD"|"SAR"|"TRY">("SAR");
  const [paymentMethodId, setPaymentMethodId] = useState<number | "">("");
  const [txId, setTxId] = useState("");
  const [screenshot, setScreenshot] = useState<{key:string;url:string}|null>(null);
  const [note, setNote] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [from, setFrom] = useState<"SAR"|"TRY">("SAR");
  const [to, setTo] = useState<"SAR"|"TRY">("TRY");
  const upload = trpc.wallet.deposit.createUpload.useMutation();
  const deposit = trpc.wallet.deposit.create.useMutation({ onSuccess: () => { toast.success("تم إرسال طلب الإيداع للمراجعة"); setAmount(""); setTxId(""); setScreenshot(null); setNote(""); utils.wallet.summary.invalidate(); utils.wallet.transactions.invalidate(); } });
  const convert = trpc.currency.convert.useMutation({ onSuccess: (r) => { toast.success(`تم التحويل: ${r.convertedAmount} ${r.toCurrency}`); setConvertAmount(""); utils.wallet.summary.invalidate(); utils.wallet.transactions.invalidate(); } });
  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("اختر صورة فقط");
    const meta = await upload.mutateAsync({ fileName: file.name, contentType: file.type as "image/png"|"image/jpeg"|"image/webp", sizeBytes: file.size });
    await fetch(meta.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    setScreenshot({ key: meta.key, url: meta.publicUrl });
  };
  return <div className="space-y-6" dir="rtl">
    <div className="grid sm:grid-cols-3 gap-4">
      {(["USD","SAR","TRY"] as const).map(c => <div key={c} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="text-slate-400 text-xs mb-2">الرصيد {c}</div><div className="text-white text-2xl font-black tabular-nums">{isLoading ? "—" : wallet?.balances[c]}</div></div>)}
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div><h2 className="text-white font-bold text-lg">إضافة رصيد</h2><p className="text-slate-500 text-sm mt-1">اختر طريقة الدفع، حوّل المبلغ يدويًا، ثم أرسل إثبات التحويل.</p></div>
        <div className="grid grid-cols-2 gap-3"><input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="المبلغ" className="field"/><select value={currency} onChange={e=>setCurrency(e.target.value as any)} className="field"><option>USD</option><option>SAR</option><option>TRY</option></select></div>
        <select value={paymentMethodId} onChange={e=>setPaymentMethodId(e.target.value ? Number(e.target.value) : "")} className="field w-full"><option value="">اختر طريقة الدفع</option>{paymentMethods?.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
        {paymentMethodId && (()=>{const m=paymentMethods?.find(x=>x.id===paymentMethodId); return m ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-3"><div className="text-white font-bold">{m.name}</div>{m.accountImageUrl && <img src={m.accountImageUrl} alt={m.name} className="w-24 h-24 rounded-xl object-cover border border-white/10"/>}<div className="text-sm text-slate-300">رقم الحساب: <span className="text-white font-bold" dir="ltr">{m.accountNumber}</span></div>{m.accountName && <div className="text-sm text-slate-400">اسم الحساب: <span className="text-white">{m.accountName}</span></div>}</div> : null})()}
        <input value={txId} onChange={e=>setTxId(e.target.value)} placeholder="Binance TxID / Payment Number" className="field w-full"/>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>e.target.files?.[0] && handleFile(e.target.files[0])} className="field w-full"/>
        {screenshot && <div className="text-xs text-emerald-400">تم رفع الإثبات بنجاح</div>}
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="ملاحظة اختيارية" className="field w-full min-h-20"/>
        <button disabled={deposit.isPending || !screenshot || !paymentMethodId} onClick={()=>deposit.mutate({amount,currency,paymentMethodId:Number(paymentMethodId),txId,screenshotKey:screenshot!.key,screenshotUrl:screenshot!.url,note})} className="w-full btn-cyber py-3 rounded-xl text-white font-bold disabled:opacity-40">إرسال طلب الإيداع</button>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div><h2 className="text-white font-bold text-lg">تحويل SAR ↔ TRY</h2><p className="text-slate-500 text-sm mt-1">رسوم التحويل الحالية 2% ويحسبها الخادم.</p></div>
        <div className="grid grid-cols-2 gap-3"><select value={from} onChange={e=>{setFrom(e.target.value as any);setTo(e.target.value === "SAR" ? "TRY":"SAR")}} className="field"><option>SAR</option><option>TRY</option></select><select value={to} onChange={e=>setTo(e.target.value as any)} className="field"><option>SAR</option><option>TRY</option></select></div>
        <input value={convertAmount} onChange={e=>setConvertAmount(e.target.value)} placeholder="المبلغ" className="field w-full"/>
        <button disabled={convert.isPending} onClick={()=>convert.mutate({fromCurrency:from,toCurrency:to,amount:convertAmount})} className="w-full border border-cyan-400/30 text-cyan-300 py-3 rounded-xl font-bold disabled:opacity-40">تحويل العملة</button>
      </section>
    </div>
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-white font-bold mb-4">آخر المعاملات</h2><div className="space-y-2">{!txns?.length ? <EmptyState icon={Wallet} title="لا توجد معاملات بعد"/> : txns.slice(0,20).map(t=><div key={t.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3"><div><div className="text-white text-sm">{t.description || t.type}</div><div className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleString("ar-SA")}</div></div><div className={cn("font-bold tabular-nums", String(t.amount).startsWith("-") ? "text-red-400":"text-emerald-400")}>{t.amount} {t.currency}</div></div>)}</div></section>
  </div>;
}

function PurchaseRequestsTab() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.purchaseRequests.listMine.useQuery();
  const config = trpc.purchaseRequests.config.useQuery();
  const utils = trpc.useUtils();
  const [fullName,setFullName]=useState(user?.name||""); const [email,setEmail]=useState(user?.email||""); const [whatsapp,setWhatsapp]=useState(""); const [phone,setPhone]=useState("");
  const create = trpc.purchaseRequests.create.useMutation({onSuccess:()=>{toast.success("تم إرسال طلب شراء الموقع");utils.purchaseRequests.listMine.invalidate();},onError:e=>toast.error(e.message)});
  const pay = trpc.purchaseRequests.pay.useMutation({ onSuccess: r => { toast.success("تم شراء الموقع"); window.location.href = `/site/${r.siteId}`; }, onError: e => toast.error(e.message) });
  return <div className="space-y-6" dir="rtl"><div><h2 className="text-white font-display font-bold text-xl">شراء موقعك</h2><p className="text-slate-500 text-sm mt-1">السعر الحالي {config.data?.price} {config.data?.currency}. أرسل الطلب أولًا، ثم بعد الموافقة ادفع من المحفظة.</p></div>
  <section className="rounded-2xl border border-[#6C3CE1]/30 bg-white/[0.03] p-5"><div className="grid md:grid-cols-2 gap-4"><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="الاسم الكامل *" className="field"/><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني *" className="field"/><input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="رقم WhatsApp *" className="field"/><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="رقم اتصال اختياري" className="field"/></div><button disabled={create.isPending || !fullName || !email || !whatsapp} onClick={()=>create.mutate({fullName,email,whatsapp,phone:phone||undefined})} className="mt-4 px-6 py-3 rounded-xl bg-[#6C3CE1] text-white font-bold disabled:opacity-40">إرسال طلب شراء</button></section>
  {isLoading ? <div className="h-40 rounded-2xl bg-white/[0.03] animate-pulse"/> : !data?.length ? <EmptyState icon={Globe} title="لا توجد طلبات سابقة"/> : <div className="space-y-3">{data.map(r=><div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-wrap justify-between gap-3"><div><div className="text-white font-semibold">طلب #{r.id}</div><div className="text-slate-500 text-sm">{r.amount} {r.currency}</div></div><StatusBadge status={r.status}/></div>{r.rejectionReason && <div className="mt-3 text-sm text-red-300">سبب الرفض: {r.rejectionReason}</div>}{r.status === "approved" && <button onClick={()=>pay.mutate({purchaseRequestId:r.id})} disabled={pay.isPending} className="mt-4 px-4 py-2.5 rounded-xl bg-[#FBBF24] text-[#0B1124] font-bold disabled:opacity-40">دفع وفتح الموقع</button>}</div>)}</div>}</div>;
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab");

  const initialTab =
    tabParam === "inbox" || tabParam === "wallet" || tabParam === "purchases" || tabParam === "sites"
      ? tabParam
      : "overview";

  const [activeTab, setActiveTab] = useState<"overview" | "inbox" | "wallet" | "purchases" | "sites">(
    initialTab as "overview" | "inbox" | "wallet" | "purchases" | "sites"
  );

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-white mb-4">تسجيل الدخول مطلوب</div>
          <button
            onClick={() => startLogin()}
            className="px-8 py-3 rounded-xl bg-[#D4AF37] text-[#0B1220] font-bold hover:bg-[#C9A227] transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as const, label: "نظرة عامة", icon: TrendingUp },
    { id: "sites" as const, label: "مواقعي", icon: Globe },
    { id: "inbox" as const, label: "الرسائل", icon: MessageSquare },
    { id: "wallet" as const, label: "المحفظة", icon: Wallet },
    { id: "purchases" as const, label: "طلبات الشراء", icon: Globe },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            مرحباً، <span className="text-cyber">{user?.name || "المستخدم"}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">لوحة تحكم مدار — تابع أداء مواقعك ورسائلك</p>
        </div>
        <button
          onClick={() => navigate("/builder")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-semibold text-sm hover:bg-[#C9A227] transition-colors shadow-lg shadow-[#D4AF37]/10"
        >
          <Plus size={16} /> موقع جديد
        </button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.02] mb-8 w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-[#D4AF37] text-[#0B1220] shadow-sm"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Globe}
              label="إجمالي المواقع"
              value={stats?.totalSites ?? 0}
              color="#D4AF37"
              loading={statsLoading}
            />
            <StatCard
              icon={TrendingUp}
              label="إجمالي الزوار"
              value={stats?.totalVisitors ?? 0}
              color="#10B981"
              loading={statsLoading}
            />
            <StatCard
              icon={MessageSquare}
              label="رسائل غير مقروءة"
              value={stats?.unreadMessages ?? 0}
              color="#A78BFA"
              loading={statsLoading}
            />
            <StatCard
              icon={Wallet}
              label="الرصيد"
              value={stats?.wallet?.SAR ?? "0.00"}
              color="#F59E0B"
              loading={statsLoading}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <h3 className="font-semibold text-white mb-4 text-sm">الزوار — آخر 7 أيام</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats?.chartData || []}>
                  <defs>
                    <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(212,175,55,0.25)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="visitors" stroke="#D4AF37" fill="url(#visitorsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <h3 className="font-semibold text-white mb-4 text-sm">الرسائل — آخر 7 أيام</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{
                      background: "#0F172A",
                      border: "1px solid rgba(15,81,50,0.3)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="messages" fill="#0F5132" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">مواقعي</h3>
              <button
                onClick={() => navigate("/builder")}
                className="text-[#D4AF37] text-sm hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> إضافة موقع
              </button>
            </div>
            <SitesSection />
          </div>
        </div>
      )}

      {activeTab === "sites" && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-white text-xl">مواقعي</h2>
            <button
              onClick={() => navigate("/builder")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 text-sm font-medium hover:bg-[#D4AF37]/25"
            >
              <Plus size={14} /> موقع جديد
            </button>
          </div>
          <SitesSection />
        </div>
      )}

      {activeTab === "inbox" && <InboxTab />}
      {activeTab === "wallet" && <WalletTab />}
      {activeTab === "purchases" && <PurchaseRequestsTab />}
    </DashboardLayout>
  );
}
