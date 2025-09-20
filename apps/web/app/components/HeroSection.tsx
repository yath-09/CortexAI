"use client";
import React from "react";
import { ContainerScroll } from "./ui/compentsScroll";
import { motion } from "framer-motion"; // Changed from "motion/react" to "framer-motion"
import { FaRegFilePdf, FaBrain } from "react-icons/fa";

export const HeroSection = () => {
  return (
    <div className="bg-black text-white">
      <ContainerScroll
        titleComponent={
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-7xl font-bold tracking-tight"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
                NextGen AI
              </span>{" "}
              to Securely Unlock Your Organization’s Knowledge
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto"
            >
              A context-aware assistant built for universities and enterprises,
              lowering inference costs while delivering accurate, trusted answers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex gap-4 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium text-base"
              >
                Get Started
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-full border border-zinc-700 text-white font-medium text-base hover:bg-zinc-800"
              >
                Learn More
              </motion.button>
            </motion.div>
          </motion.div>
        }
      >
        <CardContent />
      </ContainerScroll>
    </div>
  );
};

export const CardContent = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 p-4 md:p-12 h-full gap-6">
      {/* Text Content */}
      <div className="flex flex-col justify-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-zinc-800 p-6 rounded-2xl flex items-center gap-4"
        >
          <FaRegFilePdf className="text-cyan-500 text-4xl" />
          <div>
            <div className="text-cyan-500 text-2xl font-bold mb-1">Organizational Knowledge</div>
            <p className="text-zinc-300 text-lg">
              Interact securely with academic and corporate documents using AI-driven conversations tailored for your institution.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-zinc-800 p-6 rounded-2xl flex items-center gap-4"
        >
          <FaBrain className="text-purple-500 text-4xl" />
          <div>
            <div className="text-purple-500 text-2xl font-bold mb-1">Context-Aware AI Insights</div>
            <p className="text-zinc-300 text-lg">
              Get accurate answers, intelligent summaries, and key insights—all grounded in your organization's private data.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Animated Icon Section */}
      <div className="flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          viewport={{ once: true }}
          className="relative w-full max-w-md aspect-square"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-10 bg-zinc-800 rounded-full flex items-center justify-center">
            <div className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-cyan-500">
              📄💬
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
