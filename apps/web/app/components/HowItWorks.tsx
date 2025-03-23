"use client";
import { motion } from "framer-motion";
import { Upload, MessageSquare, FolderOpen } from "lucide-react";

const steps = [
  {
    icon: <Upload className="w-6 h-6 text-white" />,
    title: "Upload Your Documents",
    description: "Start by uploading any PDF document you'd like to analyze or extract information from.",
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-white" />,
    title: "Chat With Your Data",
    description: "Ask questions and get instant insights from your documents using advanced AI.",
  },
  {
    icon: <FolderOpen className="w-6 h-6 text-white" />,
    title: "Manage Documents",
    description: "Organize, search, and access all your documents in one secure location.",
  },
];

export function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 2 }}
      className="space-y-12 w-full mx-auto px-4 sm:px-6 lg:px-8 bg-black md:pb-20 pb-10"
    >
      <div className="text-center space-y-4 max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          How It {" "}
          <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
             Works
          </span>
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Extract insights from your documents and interact with your data in three simple steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5 }}
          >
            <div className="relative text-center p-6 rounded-xl bg-zinc-900 border border-gray-700 shadow-lg hover:cursor-pointer hover:scale-105 transition-all duration-300 group">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center transition-transform group-hover:rotate-12">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mt-4">
                {step.title}
              </h3>
              <p className="text-gray-400 mt-2">{step.description}</p>

              {/* Step number indicator */}
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {index + 1}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default HowItWorks;
