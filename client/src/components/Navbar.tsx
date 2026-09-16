import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import LoginModal from "./LoginModal";

const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "القوالب", href: "#templates" },
  { label: "الأسعار", href: "#pricing" },
  { label: "عن المنصة", href: "#about" },
];

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [, navigate] = useLocation();

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#D4AF37]/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#0F5132] opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display font-black text-white text-sm tracking-wider">م</span>
                </div>
              </div>
              <span className="font-display font-bold text-xl tracking-wider text-cyber">مدار</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-[#64748B] hover:text-[#0F5132] transition-colors duration-200 font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="btn-neon px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    لوحة التحكم
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="text-sm text-[#64748B] hover:text-white transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => setLoginOpen(true)}
                    className="btn-cyber px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  >
                    ابدأ مجاناً
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg border border-[#D4AF37]/30 text-[#64748B]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 bg-current transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden glass border-t border-[#D4AF37]/20"
            >
              <div className="px-4 py-4 space-y-3">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-[#64748B] hover:text-[#0F5132] py-2 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-2 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <button onClick={() => navigate("/dashboard")} className="btn-neon w-full py-2 rounded-lg text-sm">
                      لوحة التحكم
                    </button>
                  ) : (
                    <button onClick={() => setLoginOpen(true)} className="btn-cyber w-full py-2 rounded-lg text-sm text-white">
                      ابدأ مجاناً
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
