"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import { cn } from "../../lib/utils";
import { testimonials } from "../../constants";



// Testimonial Card Component
export const TestimonialCard = ({
  testimonial,
  index,
  hovered,
  setHovered,
}: {
  testimonial: any;
  index: number;
  hovered: number | null;
  setHovered: React.Dispatch<React.SetStateAction<number | null>>;
}) => (
  <motion.div
    whileInView={{ opacity: 1, y: 0 }}
    initial={{ opacity: 0, y: 40 }}
    transition={{ duration: 0.6, delay: index * 0.2 }}
    viewport={{ once: false, amount: 0.2 }}
    onMouseEnter={() => setHovered(index)}
    onMouseLeave={() => setHovered(null)}
    className={cn(
      "rounded-lg relative bg-gray-100 dark:bg-neutral-900 overflow-hidden h-80 md:h-96 w-full transition-all duration-300 ease-out",
      hovered !== null && hovered !== index && "blur-sm scale-[0.98] opacity-70"
    )}
  >
    {/* Overlay content */}
    <div
      className={cn(
        "absolute inset-0 bg-black/60 flex flex-col justify-between p-6 transition-opacity duration-300",
        hovered === index ? "opacity-100" : "opacity-90"
      )}
    >
      {/* Top section with avatar and rating */}
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500">
            <img
              src={testimonial.avatar}
              alt={testimonial.author}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="ml-3">
            <p className="font-bold text-white">{testimonial.author}</p>
            <p className="text-sm text-gray-300">{testimonial.role}</p>
          </div>
        </div>
        {/* Star rating */}
        <div className="flex">
          {Array(testimonial.rating)
            .fill(0)
            .map((_, i) => (
              <Star key={i} className="text-yellow-500 w-4 h-4 fill-yellow-500" />
            ))}
        </div>
      </div>
      {/* Testimonial text */}
      <div className="my-4">
        <p className="text-white text-lg leading-relaxed">"{testimonial.text}"</p>
      </div>
      {/* Title at bottom */}
      <div className="mt-auto">
        <div className="text-xl md:text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
          {testimonial.title}
        </div>
      </div>
    </div>
  </motion.div>
);

// Main Testimonials Component
export function FocusTestimonials() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-zinc-900">
      <motion.div
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        viewport={{ once: false, amount: 0.2 }}
        className="mb-10"
      >
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
          Trusted by Document Professionals
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-12 text-lg max-w-3xl mx-auto">
          Join thousands of researchers, legal professionals, and educators who have transformed
          their document workflows with CortexAI.
        </p>
      </motion.div>

      {/* Testimonial Cards with motion effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard
            key={index}
            testimonial={testimonial}
            index={index}
            hovered={hovered}
            setHovered={setHovered}
          />
        ))}
      </div>
    </div>
  );
}

export default FocusTestimonials;
