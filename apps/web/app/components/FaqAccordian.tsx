"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { faqs } from '../../constants';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-700 bg-zinc-900">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
      >
        <span className="text-white text-lg font-semibold">{question}</span>
        <ChevronDown 
          className={`w-6 h-6 text-white transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 text-gray-300">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function FAQAccordian() {

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 md:pb-20 bg-gradient-to-b from-gray-50 to-black py-12 dark:from-zinc-900 dark:to-black">
      <motion.div 
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        viewport={{ once: false, amount: 0.2 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Frequently Asked {" "}
          <span className="bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
            Questions
          </span>
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Get quick answers to common queries about CortexAI and its document interaction capabilities.
        </p>
      </motion.div>
      <motion.div
      whileInView={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      viewport={{ once: false, amount: 0.2 }}
      className="border-b border-gray-700 bg-zinc-900 rounded-xl overflow-hidden border max-w-7xl mx-auto"
    >
      
        {faqs.map((faq, index) => (
          <FAQItem 
            key={index} 
            question={faq.question} 
            answer={faq.answer} 
          />
        ))}
      </motion.div>
    </div>
  );
}

export default FAQAccordian;