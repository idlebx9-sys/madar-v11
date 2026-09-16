import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function PricingSection() {
  const [, navigate] = useLocation();
  const { data: settings } = trpc.purchaseRequests.config.useQuery();
  const price = settings?.price ?? "500.00";
  const currency = settings?.currency ?? "USD";
  return (
    <section className="py-24 bg-[#0B1124]" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="rounded-3xl border border-[#6C3CE1]/30 bg-white/[0.03] p-8 shadow-2xl">
          <div className="text-cyan-300 text-sm font-semibold mb-3">شراء مرة واحدة</div>
          <h2 className="text-white text-3xl sm:text-4xl font-black mb-3">أنشئ موقعك الاحترافي</h2>
          <div className="text-5xl font-black text-white my-6">{price} <span className="text-lg text-slate-400">{currency}</span></div>
          <p className="text-slate-400 mb-7">بدون اشتراك شهري، وبدون ترقية باقات. السعر الحالي تديره إدارة MADAR.</p>
          <button onClick={()=>navigate("/dashboard?tab=purchases")} className="px-7 py-3 rounded-xl bg-[#6C3CE1] text-white font-bold">اطلب موقعك الآن</button>
        </motion.div>
      </div>
    </section>
  );
}
