"use client";
import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";
import { useTheme } from "@/components/theme-context";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.75, 0.95] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[58rem] sm:h-[68rem] md:h-[82rem] flex flex-col items-center justify-start relative pt-6 sm:pt-10 md:pt-12 px-2 sm:px-6 md:px-12 overflow-hidden"
      ref={containerRef}
    >
      <div
        className="pt-2 sm:pt-4 pb-12 sm:pb-20 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-5xl mx-auto text-center relative z-20"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  const { isDark } = useTheme();

  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow: isDark
          ? "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003"
          : "0 2px 8px rgba(0, 0, 0, 0.03), 0 8px 20px rgba(0, 0, 0, 0.03), 0 20px 40px -15px rgba(0, 0, 0, 0.02)",
      }}
      className="max-w-6xl mt-4 sm:mt-8 mx-auto h-[36rem] sm:h-[42rem] md:h-[48rem] w-full border-2 sm:border-4 border-border/80 dark:border-white/10 p-2 sm:p-4 bg-card/95 dark:bg-zinc-950/90 rounded-[24px] sm:rounded-[32px] shadow-sm dark:shadow-2xl transition-all"
    >
      <div className="h-full w-full overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border/60 text-card-foreground">
        {children}
      </div>
    </motion.div>
  );
};

export default ContainerScroll;
