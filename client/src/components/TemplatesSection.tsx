import { motion } from "framer-motion";
import { Eye, MousePointerClick } from "lucide-react";
import { useLocation } from "wouter";

const templates = [
  {
    id: "modern",
    name: "مودرن بيزنس",
    category: "أعمال",
    desc: "تصميم عصري احترافي مناسب للشركات والمؤسسات",
    color: "#D4AF37",
    accent: "#0F5132",
    preview: "bg-gradient-to-br from-[#D4AF37] to-[#FFFFFF]",
    features: ["صفحة هبوط", "معرض أعمال", "نموذج تواصل", "خريطة"],
  },
  {
    id: "minimal",
    name: "مينيمال كريتف",
    category: "إبداعي",
    desc: "تصميم بسيط وأنيق للمصورين والمصممين",
    color: "#0F5132",
    accent: "#D4AF37",
    preview: "bg-gradient-to-br from-[#0F5132]/20 to-[#FFFFFF]",
    features: ["معرض صور", "بيوغرافي", "روابط سوشيال", "تواصل"],
  },
  {
    id: "bold",
    name: "بولد ستور",
    category: "متجر",
    desc: "تصميم قوي وجذاب لمتاجر التجزئة والمنتجات",
    color: "#FF6B35",
    accent: "#0F5132",
    preview: "bg-gradient-to-br from-orange-600/30 to-[#FFFFFF]",
    features: ["عرض منتجات", "سلة تسوق", "كوبونات", "تتبع طلبات"],
  },
  {
    id: "elegant",
    name: "إيليغانت سبا",
    category: "خدمات",
    desc: "تصميم فاخر لصالونات ومراكز التجميل والعافية",
    color: "#C084FC",
    accent: "#0F5132",
    preview: "bg-gradient-to-br from-purple-400/20 to-[#FFFFFF]",
    features: ["حجز مواعيد", "قائمة خدمات", "آراء العملاء", "معرض"],
  },
  {
    id: "tech",
    name: "تك ستارتب",
    category: "تقنية",
    desc: "تصميم مستقبلي لشركات التقنية والناشئة",
    color: "#0F5132",
    accent: "#D4AF37",
    preview: "bg-gradient-to-br from-[#0F5132]/20 to-[#D4AF37]/20",
    features: ["ميزات المنتج", "خطط الأسعار", "فريق العمل", "API Docs"],
  },
  {
    id: "restaurant",
    name: "ريستو ديلوكس",
    category: "مطاعم",
    desc: "تصميم شهي لمطاعم وكافيهات ومحلات الطعام",
    color: "#F59E0B",
    accent: "#EF4444",
    preview: "bg-gradient-to-br from-amber-500/20 to-[#FFFFFF]",
    features: ["قائمة الطعام", "حجز طاولة", "عروض اليوم", "التوصيل"],
  },
];

export default function TemplatesSection() {
  const [, navigate] = useLocation();

  return (
    <section id="templates" className="py-24 bg-[#0F172A] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-cyber-grid opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[#D4AF37] text-xs font-medium mb-4">
            معرض القوالب
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-4">
            اختر قالبك <span className="text-cyber">المثالي</span>
          </h2>
          <p className="text-[#64748B] max-w-xl mx-auto">
            أكثر من 50 قالب احترافي قابل للتخصيص الكامل بألوانك وهويتك البصرية
          </p>
        </motion.div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flip-card h-72 cursor-pointer"
            >
              <div className="flip-card-inner w-full h-full relative">
                {/* Front */}
                <div className={`flip-card-front absolute inset-0 rounded-2xl overflow-hidden ${tpl.preview} border border-white/10`}>
                  <div className="absolute inset-0 flex flex-col justify-between p-6">
                    {/* Mock browser UI */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                      <div className="flex-1 h-4 rounded bg-white/10 mx-2" />
                    </div>
                    {/* Mock content */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-6 rounded" style={{ background: tpl.color + "40", width: "60%" }} />
                      <div className="h-3 rounded bg-white/10 w-full" />
                      <div className="h-3 rounded bg-white/10 w-4/5" />
                      <div className="h-3 rounded bg-white/10 w-3/5" />
                      <div className="mt-2 h-8 rounded-lg w-28" style={{ background: tpl.color + "80" }} />
                    </div>
                    {/* Label */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="font-display font-bold text-white text-lg">{tpl.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: tpl.accent }}>{tpl.category}</div>
                      </div>
                      <div className="text-[#64748B] text-xs">اسحب للمعاينة →</div>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div className="flip-card-back absolute inset-0 rounded-2xl overflow-hidden card-cyber p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-bold text-white text-lg">{tpl.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium border" style={{ borderColor: tpl.color + "60", color: tpl.color }}>
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-[#64748B] text-sm mb-4">{tpl.desc}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {tpl.features.map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-[#64748B]">
                          <div className="w-1 h-1 rounded-full" style={{ background: tpl.accent }} />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10 transition-all">
                      <Eye size={14} />
                      معاينة
                    </button>
                    <button
                      onClick={() => navigate(`/builder?template=${tpl.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold transition-all"
                      style={{ background: `linear-gradient(135deg, ${tpl.color}, ${tpl.accent})` }}
                    >
                      <MousePointerClick size={14} />
                      اختر هذا
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
