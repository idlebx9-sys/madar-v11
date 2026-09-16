import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TemplatesSection from "@/components/TemplatesSection";

import { motion } from "framer-motion";
import { useLocation } from "wouter";

const features = [
  { icon: "⚡", title: "إنشاء فوري", desc: "أنشئ موقعك في أقل من 5 دقائق بدون أي خبرة تقنية" },
  { icon: "🎨", title: "تخصيص كامل", desc: "غيّر الألوان والخطوط والمحتوى بسهولة تامة" },
  { icon: "📱", title: "متجاوب 100%", desc: "موقعك يبدو رائعاً على جميع الأجهزة والشاشات" },
  { icon: "🔒", title: "آمن ومحمي", desc: "شهادة SSL مجانية وحماية متقدمة لبياناتك" },
  { icon: "📊", title: "إحصائيات حية", desc: "تابع زوارك ورسائلك من لوحة تحكم ذكية" },
  { icon: "🌐", title: "دومين مجاني", desc: "احصل على دومين فرعي مجاني فور إنشاء موقعك" },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Navbar />
      <HeroSection />

      {/* Features Section */}
      <section id="about" className="py-24 bg-[#080E1E] relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-4">
              لماذا <span className="text-cyber">مدار</span>؟
            </h2>
            <p className="text-[#64748B] max-w-xl mx-auto">
              كل ما تحتاجه لإنشاء حضور رقمي احترافي في مكان واحد
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-cyber rounded-2xl p-6 group"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TemplatesSection />


      {/* CTA Section */}
      <section className="py-24 bg-[#080E1E] relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(212, 175, 55,0.15) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl sm:text-5xl font-black text-white mb-6">
              جاهز لإنشاء <span className="text-cyber">موقعك الآن</span>؟
            </h2>
            <p className="text-[#64748B] text-lg mb-10 max-w-2xl mx-auto">
              انضم إلى أكثر من 100 مكتب زواج وخدمات يثقون بمدار لإدارة حضورهم الرقمي
            </p>
            <button
              onClick={() => navigate("/dashboard?tab=purchases")}
              className="btn-cyber px-12 py-5 rounded-2xl text-white font-bold text-xl inline-flex items-center gap-3"
            >
              <span>اطلب موقعك الآن</span>
              <span className="text-[#0F5132]">←</span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FFFFFF] border-t border-[#D4AF37]/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#D4AF37]/50 flex items-center justify-center">
                  <span className="font-display font-black text-[#D4AF37] text-xs">م</span>
                </div>
                <span className="font-display font-bold text-xl text-cyber">مدار</span>
              </div>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-xs">
                منصة مدار توفر قوالب مواقع جاهزة لمكاتب الزواج والخدمات في السعودية واليمن، بثقة واحترافية.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-[#1E293B] mb-3 text-sm">المنصة</h4>
              <ul className="space-y-2">
                {["القوالب", "الأسعار", "المميزات", "الشركاء"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#64748B] text-sm hover:text-[#0F5132] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#1E293B] mb-3 text-sm">الدعم</h4>
              <ul className="space-y-2">
                {["مركز المساعدة", "تواصل معنا", "سياسة الخصوصية", "شروط الاستخدام"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#64748B] text-sm hover:text-[#0F5132] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-[#D4AF37]/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#64748B] text-xs">© 2026 مدار. جميع الحقوق محفوظة.</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0F5132] animate-pulse" />
              <span className="text-[#64748B] text-xs">جميع الأنظمة تعمل بشكل طبيعي</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
