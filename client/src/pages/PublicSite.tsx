import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useParams } from "wouter";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";

export default function PublicSite() {
  const params = useParams<{ subdomain?: string }>();
  const subdomain = params.subdomain;
  const hostnameQuery = trpc.publicSite.byHostname.useQuery(undefined, { enabled: !subdomain });
  const subdomainQuery = trpc.publicSite.bySubdomain.useQuery({ subdomain: subdomain || "" }, { enabled: !!subdomain });
  const site = subdomain ? subdomainQuery.data : hostnameQuery.data;
  const isLoading = subdomain ? subdomainQuery.isLoading : hostnameQuery.isLoading;
  const error = subdomain ? subdomainQuery.error : hostnameQuery.error;
  const track = trpc.publicSite.trackVisit.useMutation();
  const sendMessage = trpc.messages.send.useMutation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", content: "", honeypot: "" });

  useEffect(() => {
    if (!site) return;
    track.mutate({ siteId: site.id, path: window.location.pathname });
    document.title = `${site.name} | ${site.tagline || ""}`.replace(/\s+\|\s*$/, "");
    const upsertMeta = (name: string, content: string) => {
      let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    upsertMeta("description", site.description || site.tagline || site.name);
    const canonical = document.head.querySelector("link[rel=canonical]") || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    (canonical as HTMLLinkElement).href = window.location.href.split("#")[0];
    const schema = document.getElementById("madar-structured-data") || document.head.appendChild(Object.assign(document.createElement("script"), { id: "madar-structured-data", type: "application/ld+json" }));
    schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: site.name, description: site.description || undefined, url: window.location.href });
  }, [site]);

  if (isLoading) return <div className="min-h-screen grid place-items-center bg-[#0b1124] text-white">جاري تحميل الموقع…</div>;
  if (error || !site) return <div className="min-h-screen grid place-items-center bg-[#0b1124] text-white"><div className="text-center"><h1 className="text-3xl font-bold mb-2">الموقع غير متاح</h1><p className="text-white/60">قد يكون الموقع غير منشور أو تم إيقافه.</p></div></div>;

  const content = (site.publishedContent || {}) as Record<string, any>;
  const sections = (site.sections || {}) as Record<string, boolean>;
  const services = Array.isArray(content.services) ? content.services : [
    { title: "خدمات احترافية", description: "حلول مصممة لتقديم تجربة موثوقة ومميزة لعملائك." },
    { title: "تجربة سهلة", description: "معلومات واضحة وتواصل مباشر من أي جهاز." },
    { title: "دعم سريع", description: "قنوات تواصل مباشرة لمساعدتك في الوصول لما تحتاجه." },
  ];
  const heroTitle = content.heroTitle || content.tagline || site.name;
  const heroLayout = site.template === "minimal" ? "max-w-2xl py-24 md:py-32" : site.template === "bold" ? "max-w-5xl py-32 md:py-48" : site.template === "elegant" ? "max-w-3xl py-36 md:py-44 text-center mx-auto" : "max-w-3xl py-28 md:py-40";
  const heroTitleClass = site.template === "bold" ? "text-6xl md:text-8xl" : site.template === "minimal" ? "text-4xl md:text-6xl" : "text-5xl md:text-7xl";
  const heroDescription = content.heroDescription || content.description || "نقدم لك تجربة احترافية بخدمة موثوقة وتصميم حديث.";
  const whatsapp = site.whatsapp ? `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(content.whatsappMessage || `مرحباً ${site.name}`)}` : null;

  const templateClass = `template-${site.template}`;

  return <main dir="rtl" data-template={site.template} style={{ "--primary": site.primaryColor || "#D4AF37", "--secondary": site.secondaryColor || "#0F5132" } as CSSProperties} className={`min-h-screen bg-[#07101f] text-white ${templateClass}`}>
    <section className="relative overflow-hidden px-6" style={{ background: `radial-gradient(circle at 80% 20%, ${site.primaryColor || "#D4AF37"}22, transparent 35%), radial-gradient(circle at 10% 80%, ${site.secondaryColor || "#0F5132"}30, transparent 40%)` }}>
      <div className="max-w-6xl mx-auto">
        <div className={heroLayout}>
          {site.logoUrl && <img src={site.logoUrl} alt={site.name} className="h-16 w-16 object-contain mb-8 rounded-2xl" />}
          {sections.hero !== false && <><p className="text-sm font-semibold mb-4" style={{ color: site.primaryColor || "#D4AF37" }}>{site.name}</p><h1 className={`${heroTitleClass} font-black leading-tight`}>{heroTitle}</h1><p className="text-lg md:text-xl text-white/65 mt-6 leading-9">{heroDescription}</p></>}
          <div className="flex flex-wrap gap-3 mt-9">
            {sections.contact !== false && <a href="#contact" className="px-6 py-3 rounded-xl font-bold text-black" style={{ background: site.primaryColor || "#D4AF37" }}>تواصل معنا</a>}
            {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-xl border border-white/15 bg-white/5 font-bold flex items-center gap-2"><MessageCircle size={18}/> واتساب</a>}
          </div>
        </div>
      </div>
    </section>

    {sections.about !== false && <section className="px-6 py-20"><div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10"><div><p className="text-sm mb-3" style={{ color: site.primaryColor || "#D4AF37" }}>من نحن</p><h2 className="text-4xl font-black">نبني الثقة قبل أي شيء</h2></div><p className="text-white/65 text-lg leading-9">{content.about || heroDescription}</p></div></section>}

    {sections.services !== false && <section className="px-6 py-20 bg-white/[.025]"><div className="max-w-6xl mx-auto"><p className="text-sm mb-3" style={{ color: site.primaryColor || "#D4AF37" }}>الخدمات</p><h2 className="text-4xl font-black mb-10">خدماتنا</h2><div className="grid md:grid-cols-3 gap-5">{services.map((service: any, i: number) => <article key={i} className="rounded-2xl border border-white/10 bg-white/[.03] p-7"><h3 className="text-xl font-bold mb-3">{service.title}</h3><p className="text-white/55 leading-8">{service.description}</p></article>)}</div></div></section>}

    {sections.gallery !== false && Array.isArray(site.galleryImages) && site.galleryImages.length > 0 && <section className="px-6 py-20"><div className="max-w-6xl mx-auto"><h2 className="text-4xl font-black mb-10">المعرض</h2><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{site.galleryImages.map((src, i) => <img key={i} src={src} alt={`${site.name} ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-2xl" />)}</div></div></section>}

    {sections.contact !== false && <section id="contact" className="px-6 py-24 bg-white/[.025]"><div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10"><div><h2 className="text-4xl font-black mb-5">تواصل معنا</h2><p className="text-white/55 leading-8 mb-8">نحن جاهزون للإجابة عن استفساراتك.</p><div className="flex flex-wrap gap-3">{site.whatsapp && <a href={whatsapp!} target="_blank" rel="noreferrer" className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2"><MessageCircle size={18}/> واتساب</a>}{content.phone && <a href={`tel:${content.phone}`} className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2"><Phone size={18}/> {content.phone}</a>}{content.email && <a href={`mailto:${content.email}`} className="px-5 py-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2"><Mail size={18}/> البريد الإلكتروني</a>}</div></div><form onSubmit={(e) => { e.preventDefault(); if (!form.name.trim() || !form.content.trim()) return; sendMessage.mutate({ siteId: site.id, ...form }, { onSuccess: () => setForm({ name: "", email: "", phone: "", content: "", honeypot: "" }) }); }} className="rounded-2xl border border-white/10 bg-white/[.03] p-6 space-y-3"><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="الاسم" className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none"/><input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="البريد الإلكتروني" className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none"/><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="رقم الهاتف" className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none"/><textarea required value={form.content} onChange={e => setForm({...form,content:e.target.value})} placeholder="رسالتك" rows={5} className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none resize-none"/><input tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={e => setForm({...form,honeypot:e.target.value})} className="hidden" aria-hidden="true"/><button disabled={sendMessage.isPending} className="w-full rounded-xl py-3 font-bold text-black" style={{background: site.primaryColor || "#D4AF37"}}>{sendMessage.isPending ? "جاري الإرسال…" : "إرسال الرسالة"}</button></form></div></section>}

    <footer className="px-6 py-10 border-t border-white/10"><div className="max-w-6xl mx-auto flex justify-between gap-4 text-sm text-white/45"><span>{site.name}</span><span>© {new Date().getFullYear()} جميع الحقوق محفوظة</span></div></footer>
  </main>;
}
