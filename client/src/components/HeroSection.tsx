import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";
import { startLogin } from "@/const";
import { useLocation } from "wouter";

export default function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Three.js setup
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 4;

    // Icosahedron geometry (main 3D object)
    const geometry = new THREE.IcosahedronGeometry(1.5, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1E293B,
      emissive: 0x0F172A,
      specular: 0xD4AF37,
      shininess: 100,
      wireframe: false,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xD4AF37, wireframe: true, transparent: true, opacity: 0.25 });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    scene.add(wireMesh);

    // Particle system
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xD4AF37, size: 0.03, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const pointLight1 = new THREE.PointLight(0xD4AF37, 3, 10);
    pointLight1.position.set(3, 3, 3);
    scene.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0x0F5132, 2, 10);
    pointLight2.position.set(-3, -2, 2);
    scene.add(pointLight2);

    // Mouse tracking
    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation loop
    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mesh.rotation.x += (mouseY * 0.5 - mesh.rotation.x) * 0.05;
      mesh.rotation.y += (mouseX * 0.5 - mesh.rotation.y) * 0.05;
      mesh.rotation.z = t * 0.1;
      wireMesh.rotation.copy(mesh.rotation);
      particles.rotation.y = t * 0.02;
      particles.rotation.x = t * 0.01;
      pointLight1.position.x = Math.sin(t * 0.7) * 3;
      pointLight1.position.y = Math.cos(t * 0.5) * 3;
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white bg-cyber-grid">
      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.10) 0%, transparent 60%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(15,81,50,0.06) 0%, transparent 60%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0F5132]/25 bg-[#0F5132]/5 text-[#0F5132] text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] animate-pulse" />
                قوالب مخصصة لمكاتب الزواج والخدمات
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
            >
              <span className="text-[#1E293B]">مدار .. منصتك لبناء</span>
              <br />
              <span className="text-cyber">هويتك الرقمية</span>
              <br />
              <span className="text-[#1E293B] text-3xl sm:text-4xl lg:text-5xl">بثقة واحترافية</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="font-subhead text-[#64748B] text-lg leading-relaxed mb-8 max-w-lg"
            >
              اختر قالبك المخصص لمكتب الزواج أو الخدمات، وقم بتخصيصه بلمساتك خلال دقائق — دون الحاجة لأي خبرة تقنية.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={() => navigate("/builder")}
                className="btn-cyber px-8 py-4 rounded-xl text-white font-bold text-lg"
              >
                ابدأ الآن مجاناً ←
              </button>
              <button
                onClick={() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-neon px-8 py-4 rounded-xl font-bold text-lg"
              >
                استعرض القوالب
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex gap-8 mt-12"
            >
              {[
                { value: "4.9/5", label: "تقييم العملاء" },
                { value: "100+", label: "مكتب يثق بمدار" },
                { value: "50+", label: "قالب احترافي" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl font-black text-cyber">{stat.value}</div>
                  <div className="text-[#64748B] text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* 3D Canvas */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="order-1 lg:order-2 relative flex items-center justify-center"
          >
            <div className="relative w-full aspect-square max-w-lg">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full border border-[#D4AF37]/20 animate-spin" style={{ animationDuration: "20s" }} />
              <div className="absolute inset-4 rounded-full border border-[#0F5132]/15 animate-spin" style={{ animationDuration: "15s", animationDirection: "reverse" }} />
              <div className="absolute inset-8 rounded-full border border-[#D4AF37]/10 animate-spin" style={{ animationDuration: "25s" }} />
              {/* Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ filter: "drop-shadow(0 0 40px rgba(212, 175, 55, 0.35))" }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[#64748B] text-xs">اسحب للأسفل</span>
        <div className="w-5 h-8 rounded-full border border-[#D4AF37]/40 flex items-start justify-center pt-1.5">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-2 rounded-full bg-[#0F5132]"
          />
        </div>
      </motion.div>
    </section>
  );
}

