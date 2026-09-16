import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import * as THREE from "three";
import { Check, ChevronRight, Upload, Palette, Globe, Phone, Sparkles, Moon, Sun } from "lucide-react";
import Navbar from "@/components/Navbar";
import DashboardLayout from "@/components/DashboardLayout";

const templates = [
  { id: "modern", name: "مودرن بيزنس", color: "#D4AF37", category: "أعمال" },
  { id: "minimal", name: "مينيمال كريتف", color: "#0F5132", category: "إبداعي" },
  { id: "bold", name: "بولد ستور", color: "#FF6B35", category: "متجر" },
  { id: "elegant", name: "إيليغانت سبا", color: "#C084FC", category: "خدمات" },
  { id: "tech", name: "تك ستارتب", color: "#0F5132", category: "تقنية" },
  { id: "restaurant", name: "ريستو ديلوكس", color: "#F59E0B", category: "مطاعم" },
];

// ─── Step 1: Template & Plan ──────────────────────────────────────────────────
function Step1({ data, onChange, onNext }: { data: any; onChange: (d: any) => void; onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-bold text-white text-xl mb-4">اختر القالب</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onChange({ ...data, template: tpl.id })}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-right ${
                data.template === tpl.id
                  ? "border-[#D4AF37] bg-[#D4AF37]/10"
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
            >
              {data.template === tpl.id && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
              <div className="w-full h-16 rounded-lg mb-3" style={{ background: `linear-gradient(135deg, ${tpl.color}30, ${tpl.color}10)`, border: `1px solid ${tpl.color}40` }} />
              <div className="font-semibold text-white text-sm">{tpl.name}</div>
              <div className="text-xs mt-0.5" style={{ color: tpl.color }}>{tpl.category}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-display font-bold text-white text-xl mb-2">موقعك المشتَرى</h3>
        <p className="text-[#64748B] text-sm">الموقع أصبح متاحًا لك لأن عملية الشراء تمت من خلال المحفظة. لا توجد اشتراكات أو باقات شهرية.</p>
      </div>

      <button
        onClick={onNext}
        disabled={!data.template}
        className="w-full btn-cyber py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        التالي <ChevronRight size={20} />
      </button>
    </div>
  );
}

// ─── Step 2: Site Data Form + Live Preview ────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }: { data: any; onChange: (d: any) => void; onNext: () => void; onBack: () => void }) {
  const tpl = templates.find((t) => t.id === data.template) || templates[0];
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const uploadLogo = trpc.media.upload.useMutation({
    onSuccess: (result) => onChange({ ...data, logoUrl: result.url }),
  });
  const generateSuggestions = trpc.ai.generateSuggestions.useMutation({
    onSuccess: (result) => {
      onChange({
        ...data,
        name: result.name || data.name,
        description: result.description || data.description,
        tagline: result.tagline || data.tagline,
        primaryColor: result.primaryColor || data.primaryColor,
        secondaryColor: result.secondaryColor || data.secondaryColor,
      });
      setIsGenerating(false);
    },
    onError: () => setIsGenerating(false),
  });

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Form */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-xl mb-2">بيانات موقعك</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsGenerating(true);
              generateSuggestions.mutate({ template: data.template });
            }}
            disabled={isGenerating || generateSuggestions.isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#0F5132] hover:border-[#D4AF37]/60 text-xs font-medium transition-all disabled:opacity-50"
          >
            <Sparkles size={14} />
            {isGenerating ? "جاري..." : "مساعد التصميم"}
          </motion.button>
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">اسم الموقع *</label>
          <div className="relative">
            <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={data.name || ""}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="مثال: متجر الأناقة"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-9 text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AF37]/60 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">الدومين الفرعي *</label>
          <div className="flex items-center gap-0">
            <input
              type="text"
              value={data.subdomain || ""}
              onChange={(e) => onChange({ ...data, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              placeholder="my-store"
              className="flex-1 bg-white/5 border border-white/10 rounded-r-xl px-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AF37]/60 transition-colors border-l-0"
            />
            <div className="px-3 py-3 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-l-xl text-[#64748B] text-sm whitespace-nowrap">
              .madar.app
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">رقم الواتساب</label>
          <div className="relative">
            <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={data.whatsapp || ""}
              onChange={(e) => onChange({ ...data, whatsapp: e.target.value })}
              placeholder="+966 5X XXX XXXX"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-9 text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AF37]/60 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">الشعار (Tagline)</label>
          <input
            type="text"
            value={data.tagline || ""}
            onChange={(e) => onChange({ ...data, tagline: e.target.value })}
            placeholder="جودة عالية وخدمة متميزة"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AF37]/60 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">وصف الموقع</label>
          <textarea
            value={data.description || ""}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="اكتب وصفاً قصيراً لموقعك..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#64748B] focus:outline-none focus:border-[#D4AF37]/60 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-[#64748B] mb-1.5 flex items-center gap-1.5">
              <Palette size={13} /> اللون الرئيسي
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
              <input
                type="color"
                value={data.primaryColor || "#D4AF37"}
                onChange={(e) => onChange({ ...data, primaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-white text-sm font-mono">{data.primaryColor || "#D4AF37"}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#64748B] mb-1.5 flex items-center gap-1.5">
              <Palette size={13} /> اللون الثانوي
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
              <input
                type="color"
                value={data.secondaryColor || "#0F5132"}
                onChange={(e) => onChange({ ...data, secondaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-white text-sm font-mono">{data.secondaryColor || "#0F5132"}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#64748B] mb-1.5">اللوجو (اختياري)</label>
          <label className="flex items-center justify-center gap-3 w-full py-4 rounded-xl border-2 border-dashed border-white/20 hover:border-[#D4AF37]/50 cursor-pointer transition-colors bg-white/5">
            <Upload size={18} className="text-[#64748B]" />
            <span className="text-[#64748B] text-sm">اضغط لرفع اللوجو</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || file.size > 8 * 1024 * 1024) return;
                const reader = new FileReader();
                reader.onload = () => uploadLogo.mutate({
                  fileName: file.name,
                  dataUrl: String(reader.result),
                  contentType: file.type as any,
                });
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/20 text-[#64748B] hover:text-white hover:border-white/40 transition-all">
            رجوع
          </button>
          <button
            onClick={onNext}
            disabled={!data.name || !data.subdomain}
            className="flex-1 btn-cyber py-3 rounded-xl text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            إنشاء الموقع <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Live Preview */}
      <div className="hidden lg:block">
        <h3 className="font-display font-bold text-white text-xl mb-4">معاينة مباشرة</h3>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#080E1E]">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1E293B] border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 text-center text-xs text-[#64748B] font-mono">
              {data.subdomain || "your-site"}.madar.app
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-[#64748B] hover:text-white transition-colors"
              title={isDarkMode ? "الوضع الفاتح" : "الوضع المظلم"}
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </motion.button>
          </div>
          {/* Preview content */}
          <div className="p-6 min-h-64" style={{ background: isDarkMode ? `linear-gradient(135deg, ${data.primaryColor || "#D4AF37"}15, #080E1E)` : `linear-gradient(135deg, ${data.primaryColor || "#D4AF37"}10, #F5F5F5)` }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: data.primaryColor || "#D4AF37" }}>
                <span style={{ color: isDarkMode ? "white" : "white" }} className="font-bold text-sm">{(data.name || "M")[0]}</span>
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: isDarkMode ? "white" : "#FFFFFF" }}>{data.name || "اسم موقعك"}</div>
                <div className="text-xs" style={{ color: isDarkMode ? (data.secondaryColor || "#0F5132") : (data.primaryColor || "#D4AF37") }}>
                  {tpl.name}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-[#64748B]">{data.tagline || "شعار الموقع"}</div>
              <div className="h-8 rounded-lg w-3/4" style={{ background: (data.primaryColor || "#D4AF37") + "30" }} />
              <div className="text-xs text-white/70 line-clamp-2">{data.description || "وصف الموقع"}</div>
              <div className="h-3 rounded bg-white/10 w-full" />
              <div className="h-3 rounded bg-white/10 w-4/5" />
              <div className="h-3 rounded bg-white/10 w-3/5" />
              <div className="mt-4 h-10 rounded-xl w-36 flex items-center justify-center" style={{ background: data.primaryColor || "#D4AF37" }}>
                <span className="text-white text-xs font-semibold">تواصل معنا</span>
              </div>
            </div>
            {data.whatsapp && (
              <div className="mt-4 flex items-center gap-2 text-xs text-[#64748B]">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone size={10} className="text-green-400" />
                </div>
                {data.whatsapp}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Loading + Result ─────────────────────────────────────────────────
function Step3({ data, onReset, siteId }: { data: any; onReset: () => void; siteId?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"loading" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const [siteUrl, setSiteUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [, navigate] = useLocation();

  const createSite = trpc.sites.create.useMutation({ onSuccess: (site) => { if (site) setSiteUrl(`https://${site.subdomain}.madar.app`); setPhase("done"); }, onError: (error) => { setPhase("done"); setStatusMessage(error.message || "فشل إنشاء الموقع"); setSiteUrl(""); } });
  const updateSite = trpc.sites.update.useMutation({ onSuccess: (site) => { if (site) setSiteUrl(`https://${site.subdomain}.madar.app`); setPhase("done"); }, onError: (error) => { setPhase("done"); setStatusMessage(error.message || "فشل تحديث الموقع"); setSiteUrl(""); } });

  useEffect(() => {
    // Animate progress with dynamic status messages
    const steps = [
      { msg: "جاري تجهيز النطاق والدومين...", target: 20, duration: 1200 },
      { msg: "إعداد قاعدة البيانات والجداول...", target: 40, duration: 1000 },
      { msg: "تطبيق القالب والتصاميم...", target: 60, duration: 1200 },
      { msg: "تثبيت المكونات والإضافات...", target: 80, duration: 1000 },
      { msg: "تفعيل الموقع والخدمات...", target: 95, duration: 800 },
      { msg: "إنهاء التجهيزات النهائية...", target: 100, duration: 600 },
    ];
    let stepIdx = 0;
    let currentTime = 0;
    
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        const step = steps[stepIdx];
        setProgress(step.target);
        setStatusMessage(step.msg);
        currentTime += step.duration;
        stepIdx++;
      } else {
        clearInterval(interval);
        setStatusMessage("جاري الانتهاء من الإعدادات...");
        setTimeout(() => siteId ? updateSite.mutate({ id: siteId, data }) : createSite.mutate(data), 500);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Three.js loading animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === "done") return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 3;
    const geo = new THREE.TorusKnotGeometry(0.8, 0.25, 100, 16);
    const mat = new THREE.MeshPhongMaterial({ color: 0x1E293B, emissive: 0x1a0a40, specular: 0xD4AF37, shininess: 120, wireframe: false, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xD4AF37, wireframe: true, transparent: true, opacity: 0.2 });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    scene.add(wireMesh);
    scene.add(new THREE.AmbientLight(0x1a0a40, 0.5));
    const pl1 = new THREE.PointLight(0x1E293B, 3, 10);
    pl1.position.set(3, 3, 3);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0xD4AF37, 2, 10);
    pl2.position.set(-3, -2, 2);
    scene.add(pl2);
    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mesh.rotation.x = t * 0.5;
      mesh.rotation.y = t * 0.7;
      wireMesh.rotation.copy(mesh.rotation);
      renderer.render(scene, camera);
    };
    animate();
    return () => { cancelAnimationFrame(animId); renderer.dispose(); };
  }, [phase]);

  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#0F5132] flex items-center justify-center"
        >
          <Check size={40} className="text-white" />
        </motion.div>
        <h3 className="font-display text-3xl font-black text-white mb-3">{siteUrl ? (siteId ? "تم حفظ تعديلات موقعك! 🎉" : "تم إنشاء موقعك! 🎉") : (siteId ? "تعذر حفظ التعديلات" : "تعذر إنشاء الموقع")}</h3>
        <p className="text-[#64748B] mb-6">{siteUrl ? "موقعك جاهز ويمكنك الوصول إليه الآن" : statusMessage}</p>
        {siteUrl && <div className="glass rounded-xl p-4 mb-6 border border-[#0F5132]/30 inline-block">
          <p className="text-[#0F5132] font-mono text-lg">{siteUrl}</p>
        </div>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {siteUrl && <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-neon px-8 py-3 rounded-xl font-bold"
          >
            زيارة الموقع ←
          </a>}
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-cyber px-8 py-3 rounded-xl text-white font-bold"
          >
            لوحة التحكم
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="relative w-48 h-48 mx-auto mb-8">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl font-black text-cyber">{progress}%</span>
        </div>
      </div>
      <h3 className="font-display text-2xl font-bold text-white mb-3">جاري إنشاء موقعك...</h3>
      <motion.p
        key={statusMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-[#0F5132] mb-6 font-medium text-sm"
      >
        {statusMessage || "يرجى الانتظار، نحن نجهّز موقعك الاحترافي"}
      </motion.p>
      <div className="max-w-xs mx-auto">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #D4AF37, #0F5132)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main SiteBuilder Page ────────────────────────────────────────────────────
export default function SiteBuilder() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const siteId = params.get("siteId") ? Number(params.get("siteId")) : undefined;
  const { data: existingSites, isLoading: sitesLoading } = trpc.sites.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: editSite } = trpc.sites.get.useQuery({ id: siteId! }, { enabled: Boolean(isAuthenticated && siteId) });
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    template: params.get("template") || "modern",
    name: "",
    subdomain: "",
    primaryColor: "#D4AF37",
    secondaryColor: "#0F5132",
    whatsapp: "",
    tagline: "",
    description: "",
    logoUrl: "",
  });

  useEffect(() => {
    if (editSite) setData({ template: editSite.template, name: editSite.name, subdomain: editSite.subdomain, primaryColor: editSite.primaryColor || "#D4AF37", secondaryColor: editSite.secondaryColor || "#0F5132", whatsapp: editSite.whatsapp || "", tagline: editSite.tagline || "", description: editSite.description || "", logoUrl: editSite.logoUrl || "" });
  }, [editSite]);

  const steps = [
    { num: 1, label: "القالب" },
    { num: 2, label: "بيانات الموقع" },
    { num: 3, label: "إنشاء الموقع" },
  ];

  if (isAuthenticated && !siteId && !sitesLoading && existingSites && existingSites.length > 0) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-center" dir="rtl">
          <div className="max-w-lg">
            <div className="text-cyan-300 text-sm font-semibold mb-3">الموقع جاهز</div>
            <h1 className="text-white text-3xl font-black mb-3">لديك موقع مُفعّل بالفعل</h1>
            <p className="text-slate-400 mb-6">إدارة وتخصيص الموقع تتم من لوحة الموقع. لا يتم إنشاء مواقع إضافية بدون عملية شراء جديدة.</p>
            <button onClick={() => navigate(`/builder?siteId=${existingSites[0].id}`)} className="px-6 py-3 rounded-xl bg-[#6C3CE1] text-white font-bold">فتح المصمم</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1E293B]">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-white mb-4">سجّل دخولك أولاً</div>
            <p className="text-[#64748B] mb-6">تحتاج لتسجيل الدخول لإنشاء موقعك</p>
            <button onClick={() => startLogin()} className="btn-cyber px-8 py-3 rounded-xl text-white font-bold">
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E293B]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white mb-2">
            {siteId ? "عدّل " : "أنشئ "}<span className="text-cyber">{siteId ? "موقعك" : "موقعك الآن"}</span>
          </h1>
          <p className="text-[#64748B]">3 خطوات بسيطة لموقع احترافي</p>
        </motion.div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                step === s.num ? "bg-[#D4AF37]/20 border border-[#D4AF37]/50" :
                step > s.num ? "text-[#0F5132]" : "text-[#64748B]"
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s.num ? "bg-[#0F5132] text-[#FFFFFF]" :
                  step === s.num ? "bg-[#D4AF37] text-white" :
                  "bg-white/10 text-[#64748B]"
                }`}>
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${step === s.num ? "text-white" : step > s.num ? "text-[#0F5132]" : "text-[#64748B]"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px transition-colors ${step > s.num ? "bg-[#0F5132]" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="card-cyber rounded-2xl p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && <Step1 data={data} onChange={setData} onNext={() => setStep(2)} />}
              {step === 2 && <Step2 data={data} onChange={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
              {step === 3 && <Step3 siteId={siteId} data={data} onReset={() => { setStep(1); setData({ template: "modern", name: "", subdomain: "", primaryColor: "#D4AF37", secondaryColor: "#0F5132", whatsapp: "", tagline: "", description: "", logoUrl: "" }); }} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
