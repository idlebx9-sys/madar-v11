import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion, Reorder } from "framer-motion";
import {
  Globe, ArrowRight, GripVertical, Trash2, Plus, Save,
  Eye, EyeOff, ExternalLink, Image, Settings, ToggleLeft, ToggleRight,
  Monitor, Smartphone
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  hero: "قسم الهيرو",
  about: "من نحن",
  services: "الخدمات",
  gallery: "معرض الصور",
  contact: "تواصل معنا",
};



export default function SiteControl() {
  const params = useParams<{ id: string }>();
  const siteId = parseInt(params.id || "0");
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: site, isLoading } = trpc.sites.get.useQuery({ id: siteId }, { enabled: !!siteId && isAuthenticated });
  const toggleSection = trpc.sites.toggleSection.useMutation({
    onSuccess: () => utils.sites.get.invalidate({ id: siteId }),
    onError: () => toast.error("فشل تحديث القسم"),
  });
  const publishSite = trpc.sites.publish.useMutation({ onSuccess: () => { toast.success("تم نشر الموقع بنجاح"); utils.sites.get.invalidate({ id: siteId }); }, onError: (e) => toast.error(e.message || "فشل النشر") });
  const unpublishSite = trpc.sites.unpublish.useMutation({ onSuccess: () => { toast.success("تم إلغاء نشر الموقع"); utils.sites.get.invalidate({ id: siteId }); } });
  const updateGallery = trpc.sites.updateGallery.useMutation({
    onSuccess: () => { toast.success("تم حفظ المعرض"); utils.sites.get.invalidate({ id: siteId }); },
    onError: () => toast.error("فشل حفظ المعرض"),
  });
  const updateSite = trpc.sites.update.useMutation({
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); utils.sites.get.invalidate({ id: siteId }); },
  });
  const deleteSite = trpc.sites.delete.useMutation({
    onSuccess: () => navigate("/dashboard"),
  });

  const [sections, setSections] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"sections" | "gallery" | "settings" | "domains">("sections");
  const [dnsInstructions, setDnsInstructions] = useState<{ name: string; value: string } | null>(null);
  const { data: domains = [] } = trpc.domains.list.useQuery({ siteId }, { enabled: !!siteId && !!site });
  const addDomain = trpc.domains.add.useMutation({
    onSuccess: (result) => setDnsInstructions({ name: result.txtName, value: result.txtValue }),
  });
  const verifyDomain = trpc.domains.verify.useMutation({ onSuccess: () => utils.domains.list.invalidate({ siteId }) });

  useEffect(() => {
    if (site) {
      setSections((site.sections as Record<string, boolean>) || {});
      setImages((site.galleryImages as string[]) || []);
    }
  }, [site]);

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-white font-display text-xl">تسجيل الدخول مطلوب</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!site) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-white font-display text-xl mb-4">الموقع غير موجود</p>
          <button onClick={() => navigate("/dashboard")} className="px-6 py-2.5 rounded-xl bg-[#D4AF37] text-[#0B1220] font-semibold">
            العودة للوحة التحكم
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const handleToggleSection = (key: string) => {
    const newVal = !sections[key];
    setSections((prev) => ({ ...prev, [key]: newVal }));
    toggleSection.mutate({ siteId, section: key, enabled: newVal });
  };

  const handleSaveGallery = () => {
    updateGallery.mutate({ siteId, images });
  };

  const handleAddImageUrl = () => {
    const url = window.prompt("أدخل رابط الصورة (HTTPS)");
    if (!url || !/^https:\/\//i.test(url)) return toast.error("يجب أن يبدأ الرابط بـ HTTPS");
    if (images.length >= 20) return toast.error("الحد الأقصى 20 صورة");
    setImages((prev) => [...prev, url]);
  };

  const tabs = [
    { id: "sections", label: "أقسام الموقع", icon: ToggleLeft },
    { id: "gallery", label: "معرض الصور", icon: Image },
    { id: "settings", label: "الإعدادات", icon: Settings },
    { id: "domains", label: "الدومينات", icon: Globe },
  ] as const;

  const publishStatus = site.publishStatus || "draft";

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all flex-shrink-0">
              <ArrowRight size={18} />
            </button>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: (site.primaryColor || "#D4AF37") + "22" }}
            >
              <Globe size={18} style={{ color: site.primaryColor || "#D4AF37" }} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-white text-xl truncate">{site.name}</h1>
              <a
                href={`/s/${site.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D4AF37]/80 text-xs hover:underline flex items-center gap-1"
                dir="ltr"
              >
                {site.subdomain}.madar.app <ExternalLink size={10} />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={publishStatus} />
            <a
              href={`/s/${site.subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all"
              title="معاينة"
            >
              <Eye size={16} />
            </a>
            <button
              onClick={() => {
                if (publishStatus === "published") {
                  if (window.confirm("هل أنت متأكد من إلغاء نشر الموقع؟ سيصبح غير متاح للزوار.")) {
                    unpublishSite.mutate({ id: siteId });
                  }
                } else {
                  publishSite.mutate({ id: siteId });
                }
              }}
              disabled={publishSite.isPending || unpublishSite.isPending}
              className={cn(
                "px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all",
                publishStatus === "published"
                  ? "border border-white/15 text-slate-300 hover:bg-white/5"
                  : "bg-[#D4AF37] text-[#0B1220] hover:bg-[#C9A227]"
              )}
            >
              {publishStatus === "published" ? (
                <><EyeOff size={16} /> إلغاء النشر</>
              ) : (
                <><Globe size={16} /> نشر الموقع</>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.02] mb-8 w-fit overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id ? "bg-[#D4AF37] text-[#0B1220]" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sections Tab */}
        {activeTab === "sections" && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <h2 className="font-display font-bold text-white text-xl mb-6">إدارة أقسام الموقع</h2>
            <p className="text-[#64748B] text-sm mb-6">فعّل أو أخفِ أقسام موقعك بنقرة واحدة</p>
            <div className="space-y-3">
              {Object.entries(SECTION_LABELS).map(([key, label]) => {
                const enabled = sections[key] !== false;
                return (
                  <motion.div
                    key={key}
                    layout
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      enabled
                        ? "bg-[#D4AF37]/5 border-[#D4AF37]/30"
                        : "bg-white/3 border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full transition-colors ${enabled ? "bg-[#0F5132]" : "bg-[#64748B]/40"}`} />
                      <span className="text-white font-medium">{label}</span>
                    </div>
                    <button
                      onClick={() => handleToggleSection(key)}
                      className="transition-all"
                      disabled={toggleSection.isPending}
                    >
                      {enabled
                        ? <ToggleRight size={32} className="text-[#D4AF37]" />
                        : <ToggleLeft size={32} className="text-[#64748B]" />
                      }
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-white text-xl">معرض الصور</h2>
                <p className="text-[#64748B] text-sm mt-1">اسحب وأفلت لإعادة الترتيب</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddImageUrl}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm transition-all"
                >
                  <Plus size={14} /> إضافة رابط صورة
                </button>
                <button
                  onClick={handleSaveGallery}
                  disabled={updateGallery.isPending}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg btn-cyber text-white text-sm"
                >
                  <Save size={14} /> {updateGallery.isPending ? "جاري..." : "حفظ"}
                </button>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                <Image size={40} className="mx-auto mb-3 text-[#64748B]/40" />
                <p className="text-[#64748B] text-sm mb-3">لا توجد صور في المعرض</p>
                <button onClick={handleAddImageUrl} className="btn-neon px-4 py-2 rounded-lg text-sm">
                  إضافة صور
                </button>
              </div>
            ) : (
              <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-2">
                {images.map((img) => (
                  <Reorder.Item
                    key={img}
                    value={img}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 cursor-grab active:cursor-grabbing group"
                  >
                    <GripVertical size={16} className="text-[#64748B] flex-shrink-0" />
                    <img src={img} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#64748B] text-xs truncate font-mono">{img}</p>
                    </div>
                    <button
                      onClick={() => setImages((prev) => prev.filter((i) => i !== img))}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[#64748B] hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
        )}

        {activeTab === "domains" && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <h2 className="font-display font-bold text-white text-xl mb-2">Custom Domains</h2>
            <p className="text-[#64748B] text-sm mb-6">أضف نطاقك، ثم أنشئ سجل TXT للتحقق وبعدها وجّه A/AAAA أو CNAME إلى خادم MADAR.</p>
            {dnsInstructions && <div className="mb-6 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-4">
              <div className="text-white font-bold mb-2">أضف سجل TXT التالي في DNS</div>
              <div className="text-xs text-[#64748B] break-all">Name: <span className="text-white font-mono">{dnsInstructions.name}</span></div>
              <div className="text-xs text-[#64748B] break-all mt-1">Value: <span className="text-white font-mono">{dnsInstructions.value}</span></div>
            </div>}
            <div className="flex gap-2 mb-6">
              <input id="custom-domain" placeholder="example.com" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <button onClick={() => {
                const el = document.getElementById("custom-domain") as HTMLInputElement | null;
                if (!el?.value) return;
                addDomain.mutate({ siteId, hostname: el.value });
              }} className="btn-cyber px-5 rounded-xl text-white font-bold">إضافة</button>
            </div>
            <div className="space-y-3">
              {domains.map((domain) => (
                <div key={domain.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex justify-between items-center"><span className="text-white font-semibold">{domain.hostname}</span><span className="text-xs text-[#D4AF37]">{domain.status}</span></div>
                  {domain.status === "pending" || domain.status === "failed" ? (
                    <button onClick={() => verifyDomain.mutate({ id: domain.id })} className="mt-3 text-sm text-[#0F5132] hover:underline">تحقق من TXT</button>
                  ) : <div className="text-xs text-green-400 mt-2">تم التحقق — يمكنك الآن ربط DNS بالخادم.</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <h2 className="font-display font-bold text-white text-xl mb-6">إعدادات الموقع</h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm text-[#64748B] mb-1.5">اسم الموقع</label>
                <input
                  type="text"
                  defaultValue={site.name}
                  id="site-name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]/60"
                />
              </div>
              <div>
                <label className="block text-sm text-[#64748B] mb-1.5">رقم الواتساب</label>
                <input
                  type="text"
                  defaultValue={site.whatsapp || ""}
                  id="site-whatsapp"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37]/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#64748B] mb-1.5">اللون الرئيسي</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <input type="color" defaultValue={site.primaryColor || "#D4AF37"} id="site-primary-color" className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
                    <span className="text-white text-sm font-mono">{site.primaryColor || "#D4AF37"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#64748B] mb-1.5">اللون الثانوي</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <input type="color" defaultValue={site.secondaryColor || "#0F5132"} id="site-secondary-color" className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
                    <span className="text-white text-sm font-mono">{site.secondaryColor || "#0F5132"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const name = (document.getElementById("site-name") as HTMLInputElement)?.value;
                  const whatsapp = (document.getElementById("site-whatsapp") as HTMLInputElement)?.value;
                  const primaryColor = (document.getElementById("site-primary-color") as HTMLInputElement)?.value;
                  const secondaryColor = (document.getElementById("site-secondary-color") as HTMLInputElement)?.value;
                  updateSite.mutate({ id: siteId, data: { name, whatsapp, primaryColor, secondaryColor } });
                }}
                className="flex-1 btn-cyber py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
              >
                <Save size={16} /> حفظ التغييرات
              </button>
              <button
                onClick={() => { if (confirm("هل أنت متأكد من حذف هذا الموقع؟")) deleteSite.mutate({ id: siteId }); }}
                className="px-4 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
